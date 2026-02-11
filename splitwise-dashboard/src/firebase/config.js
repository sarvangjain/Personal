import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

// Firebase configuration - uses environment variables for security
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if Firebase is configured
const isFirebaseConfigured = () => {
  return firebaseConfig.apiKey && 
         firebaseConfig.projectId && 
         firebaseConfig.appId;
};

// Initialize Firebase only if configured
let app = null;
let db = null;

if (isFirebaseConfigured()) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('Firebase initialized successfully');
    console.log('Project ID:', firebaseConfig.projectId);
  } catch (error) {
    console.warn('Firebase initialization failed:', error.message);
  }
} else {
  console.warn('Firebase not configured - analytics disabled');
}

// Diagnostic function to test Firestore connectivity
async function testFirestoreConnection() {
  if (!db) {
    console.error('❌ Firestore not initialized');
    return false;
  }
  
  console.log('🔄 Testing Firestore connection...');
  const testRef = doc(db, '_connectivity_test', 'test');
  
  try {
    // Try to write a test document
    await setDoc(testRef, { 
      timestamp: new Date().toISOString(),
      test: true 
    });
    console.log('✅ Firestore WRITE successful!');
    
    // Try to read it back
    const snapshot = await getDoc(testRef);
    if (snapshot.exists()) {
      console.log('✅ Firestore READ successful!');
      return true;
    }
  } catch (error) {
    console.error('❌ Firestore connection test FAILED:', error.code, error.message);
    
    if (error.code === 'permission-denied') {
      console.error('   → Check your Firestore security rules');
    } else if (error.code === 'unavailable') {
      console.error('   → Firestore is unavailable. Check if database exists in Firebase Console');
    } else if (error.message?.includes('not-found') || error.code === 'not-found') {
      console.error('   → Firestore database may not exist. Create it in Firebase Console.');
    }
    return false;
  }
}

// Export for manual testing from browser console
if (typeof window !== 'undefined') {
  window.testFirestore = testFirestoreConnection;
}

export { db, isFirebaseConfigured, testFirestoreConnection };
export default app;
