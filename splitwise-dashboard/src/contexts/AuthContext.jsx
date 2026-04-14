/**
 * AuthContext - Unified Authentication Context
 * Manages both Firebase Auth and Splitwise API key authentication
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { subscribeToAuthState, signUpWithEmail, signInWithEmail, signOutUser, resetPassword } from '../firebase/authService';
import { getConfig, saveConfig, clearConfig } from '../utils/config';
import { getCurrentUser } from '../api/splitwise';
import { createOrUpdateFirebaseAuthUser } from '../firebase/userService';

const AuthContext = createContext(null);

/**
 * Auth types enum
 */
export const AUTH_TYPES = {
  FIREBASE: 'firebase',
  SPLITWISE: 'splitwise',
  NONE: 'none',
};

/**
 * AuthProvider component
 * Wraps the app and provides auth state and methods
 */
export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [splitwiseConfig, setSplitwiseConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authType, setAuthType] = useState(AUTH_TYPES.NONE);

  // Initialize auth state on mount
  useEffect(() => {
    // Check Splitwise config from localStorage
    const config = getConfig();
    if (config?.apiKey && config?.userId) {
      setSplitwiseConfig(config);
      setAuthType(AUTH_TYPES.SPLITWISE);
    }

    // Subscribe to Firebase auth state
    const unsubscribe = subscribeToAuthState((user) => {
      setFirebaseUser(user);
      
      // If no Splitwise auth, check if Firebase user exists
      if (user && !config?.apiKey) {
        setAuthType(AUTH_TYPES.FIREBASE);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Unified current user object
  const currentUser = (() => {
    if (authType === AUTH_TYPES.SPLITWISE && splitwiseConfig) {
      return {
        uid: String(splitwiseConfig.userId),
        authType: AUTH_TYPES.SPLITWISE,
        email: null,
        displayName: splitwiseConfig.userName || 'User',
        canAccessFullDashboard: true,
        splitwiseUserId: splitwiseConfig.userId,
      };
    }
    
    if (authType === AUTH_TYPES.FIREBASE && firebaseUser) {
      return {
        uid: firebaseUser.uid,
        authType: AUTH_TYPES.FIREBASE,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        canAccessFullDashboard: false,
        splitwiseUserId: null,
      };
    }
    
    return null;
  })();

  // Sign up with email/password
  const signUp = useCallback(async (email, password) => {
    const result = await signUpWithEmail(email, password);
    if (result.user) {
      // Clear any existing Splitwise config to ensure clean state for new Firebase user
      clearConfig();
      setSplitwiseConfig(null);
      // Set both firebaseUser and authType immediately to avoid race condition
      // (onAuthStateChanged callback may fire later)
      setFirebaseUser(result.user);
      setAuthType(AUTH_TYPES.FIREBASE);
      // Create user profile in Firestore (non-blocking)
      createOrUpdateFirebaseAuthUser(result.user).catch(console.error);
    }
    return result;
  }, []);

  // Sign in with email/password
  const signIn = useCallback(async (email, password) => {
    const result = await signInWithEmail(email, password);
    if (result.user) {
      // Clear any existing Splitwise config to ensure clean state for Firebase user
      // User can reconnect their Splitwise account after login if needed
      clearConfig();
      setSplitwiseConfig(null);
      // Set both firebaseUser and authType immediately to avoid race condition
      // (onAuthStateChanged callback may fire later)
      setFirebaseUser(result.user);
      setAuthType(AUTH_TYPES.FIREBASE);
      // Update user profile in Firestore (non-blocking)
      createOrUpdateFirebaseAuthUser(result.user).catch(console.error);
    }
    return result;
  }, []);

  // Sign out (handles both auth types)
  const logout = useCallback(async () => {
    // Sign out from Firebase if signed in
    if (firebaseUser) {
      await signOutUser();
      setFirebaseUser(null);
    }
    
    // Clear Splitwise config if exists
    if (splitwiseConfig) {
      clearConfig();
      setSplitwiseConfig(null);
    }
    
    setAuthType(AUTH_TYPES.NONE);
    return { success: true };
  }, [firebaseUser, splitwiseConfig]);

  // Connect Splitwise account (for Firebase users who want to add Splitwise)
  const connectSplitwise = useCallback(async (apiKey) => {
    // Temporarily save the API key so the API client can use it
    saveConfig({ apiKey, userId: 0 });
    
    try {
      const user = await getCurrentUser();
      if (!user || !user.id) {
        clearConfig();
        return { success: false, error: 'Could not retrieve user data from Splitwise' };
      }
      
      const config = saveConfig({
        apiKey,
        userId: user.id,
        userName: `${user.first_name} ${user.last_name || ''}`.trim(),
      });
      
      setSplitwiseConfig(config);
      setAuthType(AUTH_TYPES.SPLITWISE);
      
      return { success: true, user };
    } catch (error) {
      clearConfig();
      return { success: false, error: error.message || 'Failed to connect Splitwise' };
    }
  }, []);

  // Disconnect Splitwise (but keep Firebase auth if exists)
  const disconnectSplitwise = useCallback(() => {
    clearConfig();
    setSplitwiseConfig(null);
    
    if (firebaseUser) {
      setAuthType(AUTH_TYPES.FIREBASE);
    } else {
      setAuthType(AUTH_TYPES.NONE);
    }
  }, [firebaseUser]);

  // Password reset
  const sendPasswordReset = useCallback(async (email) => {
    return await resetPassword(email);
  }, []);

  const value = {
    // State
    currentUser,
    loading,
    authType,
    firebaseUser,
    splitwiseConfig,
    
    // Auth methods
    signUp,
    signIn,
    logout,
    sendPasswordReset,
    
    // Splitwise methods
    connectSplitwise,
    disconnectSplitwise,
    
    // Helpers
    isAuthenticated: currentUser !== null,
    canAccessFullDashboard: currentUser?.canAccessFullDashboard ?? false,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth hook
 * Access auth state and methods from any component
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
