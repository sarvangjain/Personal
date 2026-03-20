/**
 * Firebase Authentication Service
 * Handles email/password authentication for ExpenseSight
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './config';

/**
 * Sign up a new user with email and password
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<{user: object, error: string|null}>}
 */
export async function signUpWithEmail(email, password) {
  if (!isFirebaseConfigured() || !auth) {
    return { user: null, error: 'Firebase is not configured' };
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error) {
    let errorMessage = 'Failed to create account';
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage = 'An account with this email already exists';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address';
        break;
      case 'auth/operation-not-allowed':
        errorMessage = 'Email/password accounts are not enabled. Please contact support.';
        break;
      case 'auth/weak-password':
        errorMessage = 'Password is too weak. Use at least 6 characters.';
        break;
      default:
        errorMessage = error.message;
    }
    
    return { user: null, error: errorMessage };
  }
}

/**
 * Sign in an existing user with email and password
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<{user: object, error: string|null}>}
 */
export async function signInWithEmail(email, password) {
  if (!isFirebaseConfigured() || !auth) {
    return { user: null, error: 'Firebase is not configured' };
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error) {
    let errorMessage = 'Failed to sign in';
    
    switch (error.code) {
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address';
        break;
      case 'auth/user-disabled':
        errorMessage = 'This account has been disabled';
        break;
      case 'auth/user-not-found':
        errorMessage = 'No account found with this email';
        break;
      case 'auth/wrong-password':
        errorMessage = 'Incorrect password';
        break;
      case 'auth/invalid-credential':
        errorMessage = 'Invalid email or password';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Too many failed attempts. Please try again later.';
        break;
      default:
        errorMessage = error.message;
    }
    
    return { user: null, error: errorMessage };
  }
}

/**
 * Sign out the current user
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function signOutUser() {
  if (!isFirebaseConfigured() || !auth) {
    return { success: false, error: 'Firebase is not configured' };
  }

  try {
    await signOut(auth);
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Send a password reset email
 * @param {string} email 
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function resetPassword(email) {
  if (!isFirebaseConfigured() || !auth) {
    return { success: false, error: 'Firebase is not configured' };
  }

  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, error: null };
  } catch (error) {
    let errorMessage = 'Failed to send reset email';
    
    switch (error.code) {
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address';
        break;
      case 'auth/user-not-found':
        errorMessage = 'No account found with this email';
        break;
      default:
        errorMessage = error.message;
    }
    
    return { success: false, error: errorMessage };
  }
}

/**
 * Update user's display name
 * @param {string} displayName 
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function updateUserDisplayName(displayName) {
  if (!isFirebaseConfigured() || !auth || !auth.currentUser) {
    return { success: false, error: 'No user signed in' };
  }

  try {
    await updateProfile(auth.currentUser, { displayName });
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Subscribe to auth state changes
 * @param {function} callback - Called with user object or null
 * @returns {function} Unsubscribe function
 */
export function subscribeToAuthState(callback) {
  if (!isFirebaseConfigured() || !auth) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(auth, callback);
}

/**
 * Get the current Firebase auth user
 * @returns {object|null}
 */
export function getCurrentFirebaseUser() {
  if (!isFirebaseConfigured() || !auth) {
    return null;
  }
  return auth.currentUser;
}
