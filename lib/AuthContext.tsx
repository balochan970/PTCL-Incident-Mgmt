'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import * as authService from './authService';

// Define the shape of our auth context
interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  role: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  username: null,
  role: null,
  login: async () => {},
  logout: () => {},
  loading: true,
});

// List of public routes that don't require authentication
const publicRoutes = ['/login', '/active-faults'];

// Hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const lastRedirectTime = useRef(0);
  const pendingRedirectRef = useRef<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Constants for redirect protection
  const REDIRECT_COOLDOWN = 1500; // 1.5 second cooldown between redirects
  const REDIRECT_TIMEOUT = 500; // 500ms timeout before redirect

  // Check if we can redirect (prevent rapid redirects)
  const canRedirect = () => {
    const now = Date.now();
    if (redirecting || now - lastRedirectTime.current < REDIRECT_COOLDOWN) {
      console.log('Redirect prevented: too soon or already redirecting');
      return false;
    }
    return true;
  };

  // Safe redirect function
  const safeRedirect = (path: string, reason: string) => {
    if (!canRedirect()) {
      // Store the pending redirect for later
      pendingRedirectRef.current = path;
      console.log(`Storing pending redirect to ${path} for later: ${reason}`);
      return;
    }
    
    // Clear any pending redirects
    pendingRedirectRef.current = null;
    
    console.log(`Redirecting to ${path}: ${reason}`);
    setRedirecting(true);
    lastRedirectTime.current = Date.now();
    
    // Use a timeout to prevent rapid redirects
    setTimeout(() => {
      // Add a flag to sessionStorage to track the redirect source
      sessionStorage.setItem('redirectSource', 'authContext');
      sessionStorage.setItem('redirectTime', Date.now().toString());
      
      // Check if we're already on this path to prevent unnecessary redirects
      if (pathname !== path) {
        router.replace(path);
      } else {
        console.log(`Already at ${path}, skipping redirect`);
      }
      
      // Reset redirecting state after a delay
      setTimeout(() => {
        setRedirecting(false);
        
        // Check for pending redirects
        if (pendingRedirectRef.current) {
          const pendingPath = pendingRedirectRef.current;
          pendingRedirectRef.current = null;
          console.log(`Processing pending redirect to ${pendingPath}`);
          safeRedirect(pendingPath, 'processing pending redirect');
        }
      }, REDIRECT_COOLDOWN);
    }, REDIRECT_TIMEOUT);
  };

  // Process any pending redirects
  useEffect(() => {
    if (!redirecting && pendingRedirectRef.current) {
      const pendingPath = pendingRedirectRef.current;
      pendingRedirectRef.current = null;
      console.log(`Processing pending redirect to ${pendingPath} after cooldown`);
      safeRedirect(pendingPath, 'processing pending redirect after cooldown');
    }
  }, [redirecting]);

  // Handle authentication changes
  const handleAuthChange = (action: 'login' | 'logout') => {
    console.log(`Auth change detected: ${action}`);
    
    if (action === 'logout') {
      setIsAuthenticated(false);
      setUsername(null);
      setRole(null);
      
      // Only redirect if we're not already on a public route
      if (pathname && !publicRoutes.some(route => pathname === route || pathname.startsWith(route))) {
        safeRedirect('/login', 'logout action');
      }
    } else if (action === 'login') {
      // Refresh auth state on login
      const authData = authService.getAuthData();
      if (authData) {
        setIsAuthenticated(true);
        setUsername(authData.username);
        setRole(authData.role);
        
        // Check if we need to redirect from login page
        if (pathname === '/login') {
          // Get the redirect path from URL params if available
          const params = new URLSearchParams(window.location.search);
          const redirectPath = params.get('redirect') || '/';
          safeRedirect(decodeURIComponent(redirectPath), 'login action from login page');
        }
      }
    }
  };

  // Initialize auth on component mount - only once
  useEffect(() => {
    if (initialized) return;
    
    console.log('Initializing auth system');
    setLoading(true);
    
    try {
      // Initialize auth and set up listeners
      const cleanup = authService.initAuth(handleAuthChange);
      
      // Check if user is authenticated
      if (authService.isAuthenticated()) {
        console.log('User is authenticated during initialization');
        const authData = authService.getAuthData();
        if (authData) {
          setIsAuthenticated(true);
          setUsername(authData.username);
          setRole(authData.role);
        }
      } else {
        console.log('User is not authenticated during initialization');
        // We'll let the middleware handle redirects for unauthenticated users
      }
      
      // Clean up listeners on unmount
      return cleanup;
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [initialized]); // Only depend on initialized state

  // Handle route changes - separate from initialization
  useEffect(() => {
    // Skip checks during initialization or loading
    if (!initialized || loading || redirecting) return;
    
    // Skip if we're coming from a redirect
    const redirectSource = sessionStorage.getItem('redirectSource');
    const redirectTime = sessionStorage.getItem('redirectTime');
    
    if (redirectSource === 'authContext' && redirectTime) {
      const timeSinceRedirect = Date.now() - parseInt(redirectTime);
      if (timeSinceRedirect < 2000) { // 2 seconds grace period
        console.log('Skipping route check - coming from recent redirect');
        return;
      }
      // Clear the redirect source after the grace period
      sessionStorage.removeItem('redirectSource');
      sessionStorage.removeItem('redirectTime');
    }
    
    // Check if we're on a protected route and not authenticated
    const isProtectedRoute = pathname && 
      !publicRoutes.some(route => pathname === route || pathname.startsWith(route));
    
    if (!isAuthenticated && isProtectedRoute) {
      console.log(`Protected route detected: ${pathname}, redirecting to login`);
      safeRedirect(`/login?redirect=${encodeURIComponent(pathname)}`, 'unauthenticated on protected route');
    }
    
    // Handle login page redirect if already authenticated
    if (isAuthenticated && pathname === '/login') {
      // Get the redirect path from URL params if available
      const params = new URLSearchParams(window.location.search);
      const redirectPath = params.get('redirect') || '/';
      console.log(`Already authenticated on login page, redirecting to: ${redirectPath}`);
      safeRedirect(decodeURIComponent(redirectPath), 'already authenticated on login page');
    }
  }, [pathname, isAuthenticated, initialized, loading, redirecting]);

  // Login function
  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      console.log('Attempting login');
      const authData = await authService.loginUser(username, password);
      
      // Update state with auth data
      setIsAuthenticated(true);
      setUsername(authData.username);
      setRole(authData.role);
      
      // Return without redirecting - let the login page or route change handler handle redirects
      return;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    if (redirecting) return; // Prevent logout during redirect
    
    console.log('Logging out user');
    authService.logoutUser();
    setIsAuthenticated(false);
    setUsername(null);
    setRole(null);
    
    safeRedirect('/login', 'logout function called');
  };

  // Provide the auth context to children
  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        username,
        role,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 