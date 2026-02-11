import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  increment,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';

// Helper to detect device type
const getDeviceType = () => {
  const width = window.innerWidth;
  return width < 768 ? 'mobile' : 'desktop';
};

// Helper to check if PWA is installed
const isPWAInstalled = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
};

/**
 * Create or update user document on login
 * @param {Object} userData - User data from Splitwise API
 * @param {number} userData.id - Splitwise user ID
 * @param {string} userData.first_name - User's first name
 * @param {string} userData.last_name - User's last name (optional)
 * @param {string} userData.email - User's email (optional)
 */
export async function createOrUpdateUser(userData) {
  if (!isFirebaseConfigured() || !db) {
    console.warn('Firebase not configured - skipping user creation');
    return null;
  }

  const userId = String(userData.id);
  const userRef = doc(db, 'users', userId);

  try {
    const userDoc = await getDoc(userRef);
    const now = serverTimestamp();
    const device = getDeviceType();
    const isInstalled = isPWAInstalled();

    if (userDoc.exists()) {
      // User exists - update login info
      await updateDoc(userRef, {
        'profile.name': `${userData.first_name} ${userData.last_name || ''}`.trim(),
        'profile.lastLoginAt': now,
        'profile.loginCount': increment(1),
        'device.lastDevice': device,
        'device.isInstalled': isInstalled,
      });
      console.log('User updated:', userId);
    } else {
      // New user - create document
      await setDoc(userRef, {
        profile: {
          name: `${userData.first_name} ${userData.last_name || ''}`.trim(),
          splitwiseId: userData.id,
          email: userData.email || null,
          firstLoginAt: now,
          lastLoginAt: now,
          loginCount: 1,
        },
        preferences: {
          defaultTab: 'overview',
          theme: 'dark',
        },
        analytics: {
          tabViews: {
            overview: 0,
            groups: 0,
            friends: 0,
            settle: 0,
            budget: 0,
            beta: 0,
          },
          wrappedViews: 0,
          wrappedShares: 0,
          groupsViewed: 0,
          friendsViewed: 0,
        },
        device: {
          lastDevice: device,
          isInstalled: isInstalled,
        },
      });
      console.log('New user created:', userId);
    }

    return userId;
  } catch (error) {
    console.error('Error creating/updating user:', error);
    return null;
  }
}

/**
 * Update last login timestamp
 * @param {number|string} userId - Splitwise user ID
 */
export async function updateLastLogin(userId) {
  if (!isFirebaseConfigured() || !db || !userId) return;

  const userRef = doc(db, 'users', String(userId));

  try {
    await updateDoc(userRef, {
      'profile.lastLoginAt': serverTimestamp(),
      'device.lastDevice': getDeviceType(),
      'device.isInstalled': isPWAInstalled(),
    });
  } catch (error) {
    // User might not exist yet - ignore silently
    console.debug('Could not update last login:', error.message);
  }
}

/**
 * Track tab view
 * @param {number|string} userId - Splitwise user ID
 * @param {string} tabId - Tab identifier (overview, groups, friends, settle, beta)
 */
export async function trackTabView(userId, tabId) {
  if (!isFirebaseConfigured() || !db || !userId) return;

  const userRef = doc(db, 'users', String(userId));
  const fieldPath = `analytics.tabViews.${tabId}`;

  try {
    await updateDoc(userRef, {
      [fieldPath]: increment(1),
    });
  } catch (error) {
    console.debug('Could not track tab view:', error.message);
  }
}

/**
 * Track Year in Review view
 * @param {number|string} userId - Splitwise user ID
 */
export async function trackWrappedView(userId) {
  if (!isFirebaseConfigured() || !db || !userId) return;

  const userRef = doc(db, 'users', String(userId));

  try {
    await updateDoc(userRef, {
      'analytics.wrappedViews': increment(1),
    });
  } catch (error) {
    console.debug('Could not track wrapped view:', error.message);
  }
}

/**
 * Track Year in Review share
 * @param {number|string} userId - Splitwise user ID
 */
export async function trackWrappedShare(userId) {
  if (!isFirebaseConfigured() || !db || !userId) return;

  const userRef = doc(db, 'users', String(userId));

  try {
    await updateDoc(userRef, {
      'analytics.wrappedShares': increment(1),
    });
  } catch (error) {
    console.debug('Could not track wrapped share:', error.message);
  }
}

/**
 * Track group detail view
 * @param {number|string} userId - Splitwise user ID
 */
export async function trackGroupView(userId) {
  if (!isFirebaseConfigured() || !db || !userId) return;

  const userRef = doc(db, 'users', String(userId));

  try {
    await updateDoc(userRef, {
      'analytics.groupsViewed': increment(1),
    });
  } catch (error) {
    console.debug('Could not track group view:', error.message);
  }
}

/**
 * Track friend detail view
 * @param {number|string} userId - Splitwise user ID
 */
export async function trackFriendView(userId) {
  if (!isFirebaseConfigured() || !db || !userId) return;

  const userRef = doc(db, 'users', String(userId));

  try {
    await updateDoc(userRef, {
      'analytics.friendsViewed': increment(1),
    });
  } catch (error) {
    console.debug('Could not track friend view:', error.message);
  }
}

/**
 * Get user preferences
 * @param {number|string} userId - Splitwise user ID
 * @returns {Object|null} User preferences or null
 */
export async function getUserPreferences(userId) {
  if (!isFirebaseConfigured() || !db || !userId) return null;

  const userRef = doc(db, 'users', String(userId));

  try {
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      return userDoc.data().preferences || null;
    }
    return null;
  } catch (error) {
    console.debug('Could not get user preferences:', error.message);
    return null;
  }
}

/**
 * Save user preferences
 * @param {number|string} userId - Splitwise user ID
 * @param {Object} preferences - Preferences to save
 */
export async function saveUserPreferences(userId, preferences) {
  if (!isFirebaseConfigured() || !db || !userId) return;

  const userRef = doc(db, 'users', String(userId));

  try {
    await updateDoc(userRef, {
      preferences: preferences,
    });
  } catch (error) {
    console.debug('Could not save user preferences:', error.message);
  }
}
