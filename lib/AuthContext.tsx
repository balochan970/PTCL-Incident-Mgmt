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
  const router = useRouter();
  const pathname = usePathname();

  // Constants for redirect protection
  const REDIRECT_COOLDOWN = 1000; // 1 second cooldown between redirects
  const REDIRECT_TIMEOUT = 300; // 300ms timeout before redirect

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
    if (!canRedirect()) return;
    
    console.log(`Redirecting to ${path}: ${reason}`);
    setRedirecting(true);
    lastRedirectTime.current = Date.now();
    
    // Use a timeout to prevent rapid redirects
    setTimeout(() => {
      router.replace(path);
      // Reset redirecting state after a delay
      setTimeout(() => {
        setRedirecting(false);
      }, REDIRECT_COOLDOWN);
    }, REDIRECT_TIMEOUT);
  };

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
    } else {
      // Refresh auth state on login
      const authData = authService.getAuthData();
      if (authData) {
        setIsAuthenticated(true);
        setUsername(authData.username);
        setRole(authData.role);
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
    
    // Check if we're on a protected route and not authenticated
    const isProtectedRoute = pathname && 
      !publicRoutes.some(route => pathname === route || pathname.startsWith(route));
    
    if (!isAuthenticated && isProtectedRoute) {
      console.log(`Protected route detected: ${pathname}, redirecting to login`);
      safeRedirect(`/login?redirect=${encodeURIComponent(pathname)}`, 'unauthenticated on protected route');
    }
  }, [pathname, isAuthenticated, initialized, loading, redirecting]);

  // Login function
  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      console.log('Attempting login');
      const authData = await authService.loginUser(username, password);
      setIsAuthenticated(true);
      setUsername(authData.username);
      setRole(authData.role);
      
      // Let the login page handle the redirect based on the redirect param
      // Don't redirect here to prevent competing with the login page redirect
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