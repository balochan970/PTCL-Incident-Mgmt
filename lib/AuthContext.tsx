'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { 
  loginUser, 
  logoutUser, 
  isAuthenticated, 
  getAuthData, 
  setupAuthListener, 
  checkAuthOnLoad,
  AuthData
} from './authService';

// Constants for redirect handling
const REDIRECT_COOLDOWN = 2000; // 2 seconds between redirects
const REDIRECT_TIMEOUT = 800; // 800ms timeout for redirect execution
const MAX_REDIRECT_ATTEMPTS = 3; // Maximum number of redirect attempts

// Define the shape of our authentication context
interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthData | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  login: async () => {},
  logout: () => {},
  loading: true,
  error: null,
  initialized: false
});

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Provider component to wrap our app
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [redirecting, setRedirecting] = useState<boolean>(false);
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Refs for tracking redirect state
  const lastRedirectTime = useRef<number>(0);
  const redirectAttempts = useRef<number>(0);
  const pendingRedirectRef = useRef<string | null>(null);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Check if we can redirect (not too soon after last redirect)
  const canRedirect = useCallback((): boolean => {
    const now = Date.now();
    const timeSinceLastRedirect = now - lastRedirectTime.current;
    
    // Don't redirect if we're already redirecting
    if (redirecting) {
      console.log('Redirect prevented: already redirecting');
      return false;
    }
    
    // Don't redirect if we've tried too many times
    if (redirectAttempts.current >= MAX_REDIRECT_ATTEMPTS) {
      console.log(`Redirect prevented: exceeded maximum attempts (${MAX_REDIRECT_ATTEMPTS})`);
      redirectAttempts.current = 0; // Reset after a while
      setTimeout(() => {
        redirectAttempts.current = 0;
      }, REDIRECT_COOLDOWN * 2);
      return false;
    }
    
    // Don't redirect if it's too soon after the last redirect
    if (timeSinceLastRedirect < REDIRECT_COOLDOWN) {
      console.log(`Redirect prevented: too soon (${timeSinceLastRedirect}ms since last redirect)`);
      
      // Store this redirect for later processing
      return false;
    }
    
    return true;
  }, [redirecting]);
  
  // Safe redirect function to prevent loops
  const safeRedirect = useCallback((path: string) => {
    // Clear any pending redirect timeout
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }
    
    // Store the path for later if we can't redirect now
    if (!canRedirect()) {
      pendingRedirectRef.current = path;
      
      // Try again after cooldown
      setTimeout(() => {
        if (pendingRedirectRef.current) {
          const pendingPath = pendingRedirectRef.current;
          pendingRedirectRef.current = null;
          safeRedirect(pendingPath);
        }
      }, REDIRECT_COOLDOWN);
      
      return;
    }
    
    // Update redirect state
    setRedirecting(true);
    lastRedirectTime.current = Date.now();
    redirectAttempts.current += 1;
    
    // Store redirect flag in sessionStorage to help prevent loops
    try {
      sessionStorage.setItem('lastRedirect', Date.now().toString());
      sessionStorage.setItem('redirectPath', path);
      sessionStorage.setItem('redirectAttempts', redirectAttempts.current.toString());
    } catch (e) {
      console.error('Failed to store redirect info in sessionStorage:', e);
    }
    
    console.log(`Redirecting to: ${path}`);
    
    // Execute the redirect after a short delay
    redirectTimeoutRef.current = setTimeout(() => {
      router.push(path);
      
      // Reset redirecting state after a delay
      setTimeout(() => {
        setRedirecting(false);
      }, REDIRECT_TIMEOUT);
    }, 100);
  }, [canRedirect, router]);
  
  // Handle authentication changes
  const handleAuthChange = useCallback((action: 'login' | 'logout') => {
    console.log(`Auth change detected: ${action}`);
    
    if (action === 'login') {
      const authData = getAuthData();
      setUser(authData);
      setAuthenticated(true);
      setLoading(false);
      
      // Check if we need to redirect after login
      if (pathname === '/login') {
        // Get redirect path from URL parameters if available
        const redirectTo = searchParams?.get('redirect') || '/';
        const decodedRedirect = decodeURIComponent(redirectTo);
        
        // Redirect to the target path
        safeRedirect(decodedRedirect);
      }
    } else {
      setUser(null);
      setAuthenticated(false);
      setLoading(false);
      
      // Only redirect to login if not already there and not a public route
      if (pathname !== '/login' && !isPublicRoute(pathname)) {
        // Encode current path for redirect back after login
        const encodedPath = encodeURIComponent(pathname);
        safeRedirect(`/login?redirect=${encodedPath}`);
      }
    }
  }, [pathname, safeRedirect, searchParams]);
  
  // Check if a route is public (doesn't require authentication)
  const isPublicRoute = useCallback((path: string): boolean => {
    const publicRoutes = ['/login', '/active-faults'];
    return publicRoutes.some(route => path === route || path.startsWith(`${route}/`));
  }, []);
  
  // Login function
  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await loginUser(username, password);
      
      // Auth change will be handled by the listener
      // No need to manually redirect here, it will be handled in handleAuthChange
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
      setLoading(false);
    }
  }, []);
  
  // Logout function
  const logout = useCallback(() => {
    setLoading(true);
    logoutUser();
    // Auth change will be handled by the listener
  }, []);
  
  // Check authentication on mount and setup listener
  useEffect(() => {
    console.log('AuthProvider initializing...');
    
    // Check for recent redirects to avoid immediate route checks
    let skipRouteCheck = false;
    try {
      const lastRedirectStr = sessionStorage.getItem('lastRedirect');
      if (lastRedirectStr) {
        const lastRedirect = parseInt(lastRedirectStr, 10);
        const now = Date.now();
        
        // If we redirected recently, skip route check
        if (now - lastRedirect < REDIRECT_COOLDOWN) {
          skipRouteCheck = true;
          console.log('Skipping initial route check due to recent redirect');
        }
      }
      
      // Restore redirect attempts counter
      const attemptsStr = sessionStorage.getItem('redirectAttempts');
      if (attemptsStr) {
        redirectAttempts.current = parseInt(attemptsStr, 10);
      }
    } catch (e) {
      console.error('Error checking sessionStorage for redirect info:', e);
    }
    
    // Check initial authentication
    const isAuth = checkAuthOnLoad();
    console.log('Initial auth check:', isAuth);
    
    if (isAuth) {
      const authData = getAuthData();
      setUser(authData);
      setAuthenticated(true);
    } else {
      setUser(null);
      setAuthenticated(false);
    }
    
    // Setup listener for auth changes
    const cleanup = setupAuthListener(handleAuthChange);
    
    // Check if we need to redirect based on current route
    if (!skipRouteCheck) {
      setTimeout(() => {
        const isAuth = isAuthenticated();
        
        if (!isAuth && !isPublicRoute(pathname)) {
          console.log('Protected route detected:', pathname, 'redirecting to login');
          const encodedPath = encodeURIComponent(pathname);
          safeRedirect(`/login?redirect=${encodedPath}`);
        } else if (isAuth && pathname === '/login') {
          console.log('Authenticated user on login page, redirecting to home');
          safeRedirect('/');
        }
        
        // Mark as initialized after initial checks
        setInitialized(true);
        setLoading(false);
      }, 100);
    } else {
      // Mark as initialized immediately if skipping route check
      setInitialized(true);
      setLoading(false);
    }
    
    return () => {
      cleanup();
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, [handleAuthChange, isPublicRoute, pathname, safeRedirect]);
  
  // Provide the auth context to children
  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: authenticated,
        user,
        login,
        logout,
        loading,
        error,
        initialized
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 