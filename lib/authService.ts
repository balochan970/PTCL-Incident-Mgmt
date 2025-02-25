import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { comparePassword } from './utils/password';

// Authentication event for cross-tab communication
export const AUTH_STORAGE_KEY = 'auth';
export const AUTH_COOKIE_NAME = 'auth';
export const AUTH_EVENT = 'ptcl-auth-event';
export const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Interface for authentication data
export interface AuthData {
  username: string;
  role: string;
  isAuthenticated: boolean;
  timestamp: number;
}

/**
 * Login user with username and password
 */
export const loginUser = async (username: string, password: string): Promise<AuthData> => {
  const trimmedUsername = username.trim();
  
  // Clear any existing auth data before attempting login
  clearAuthData();

  const authUsersRef = collection(db, 'auth_users');
  const q = query(authUsersRef, where('username', '==', trimmedUsername));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    throw new Error('Invalid username or password');
  }

  const userDoc = querySnapshot.docs[0];
  const userData = userDoc.data();

  const isValidPassword = await comparePassword(password, userData.password);

  if (!isValidPassword) {
    throw new Error('Invalid username or password');
  }

  const authData: AuthData = {
    username: userData.username,
    role: userData.role,
    isAuthenticated: true,
    timestamp: new Date().getTime()
  };

  // Store auth data
  storeAuthData(authData);
  
  // Broadcast auth change to other tabs
  broadcastAuthChange('login');
  
  return authData;
};

/**
 * Logout user and clear all auth data
 */
export const logoutUser = (): void => {
  clearAuthData();
  
  // Broadcast auth change to other tabs
  broadcastAuthChange('logout');
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  try {
    const authData = getAuthData();
    if (!authData) return false;
    
    // Check if auth data is valid
    if (!authData.isAuthenticated || !authData.username || !authData.role) {
      return false;
    }
    
    // Check for session expiry
    const now = new Date().getTime();
    const timestamp = authData.timestamp || 0;
    
    if (now - timestamp > SESSION_DURATION) {
      // Session expired
      clearAuthData();
      return false;
    }
    
    return true;
  } catch (error) {
    clearAuthData();
    return false;
  }
};

/**
 * Get authentication data from storage
 */
export const getAuthData = (): AuthData | null => {
  try {
    const authJson = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!authJson) return null;
    
    return JSON.parse(authJson);
  } catch (error) {
    return null;
  }
};

/**
 * Store authentication data in storage and cookies
 */
export const storeAuthData = (authData: AuthData): void => {
  // Store in sessionStorage (cleared when browser is closed)
  sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
  
  // Set cookie with same expiry (24 hours)
  document.cookie = `${AUTH_COOKIE_NAME}=${JSON.stringify(authData)}; path=/; max-age=${SESSION_DURATION / 1000}; samesite=strict`;
};

/**
 * Clear all authentication data
 */
export const clearAuthData = (): void => {
  // Clear from localStorage (legacy)
  localStorage.removeItem(AUTH_STORAGE_KEY);
  
  // Clear from sessionStorage
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem('fromProtected');
  
  // Clear all sessionStorage
  sessionStorage.clear();
  
  // Clear cookie
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; max-age=0; domain=${window.location.hostname}`;
};

/**
 * Broadcast authentication change to other tabs
 */
export const broadcastAuthChange = (action: 'login' | 'logout'): void => {
  try {
    localStorage.setItem('auth_broadcast', JSON.stringify({
      action,
      timestamp: new Date().getTime()
    }));
    
    // Dispatch custom event for same-tab listeners
    window.dispatchEvent(new CustomEvent(AUTH_EVENT, { 
      detail: { action } 
    }));
  } catch (error) {
    console.error('Failed to broadcast auth change:', error);
  }
};

/**
 * Setup cross-tab authentication listener
 */
export const setupAuthListener = (onAuthChange: (action: 'login' | 'logout') => void): () => void => {
  // Listen for storage events (cross-tab)
  const storageListener = (event: StorageEvent) => {
    if (event.key === 'auth_broadcast') {
      try {
        const data = JSON.parse(event.newValue || '{}');
        if (data.action === 'logout') {
          clearAuthData();
          onAuthChange('logout');
        } else if (data.action === 'login') {
          onAuthChange('login');
        }
      } catch (error) {
        console.error('Error processing auth broadcast:', error);
      }
    }
  };
  
  // Listen for custom events (same-tab)
  const customEventListener = (event: Event) => {
    const customEvent = event as CustomEvent;
    if (customEvent.detail?.action) {
      onAuthChange(customEvent.detail.action);
    }
  };
  
  window.addEventListener('storage', storageListener);
  window.addEventListener(AUTH_EVENT, customEventListener);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('storage', storageListener);
    window.removeEventListener(AUTH_EVENT, customEventListener);
  };
};

/**
 * Check authentication on page load/refresh
 */
export const checkAuthOnLoad = (): boolean => {
  // First check if we have auth data in sessionStorage
  const authInSession = sessionStorage.getItem(AUTH_STORAGE_KEY);
  
  // Then check if we have auth cookie
  const authCookie = document.cookie.includes(`${AUTH_COOKIE_NAME}=`);
  
  // If either is missing, clear everything to be safe
  if (!authInSession || !authCookie) {
    clearAuthData();
    return false;
  }
  
  // Verify the auth data
  return isAuthenticated();
};

/**
 * Initialize auth system
 */
export const initAuth = (onAuthChange: (action: 'login' | 'logout') => void): () => void => {
  // Check auth on load
  const isAuth = checkAuthOnLoad();
  
  // If not authenticated, trigger logout action
  if (!isAuth) {
    onAuthChange('logout');
  }
  
  // Setup listener for auth changes
  return setupAuthListener(onAuthChange);
}; 