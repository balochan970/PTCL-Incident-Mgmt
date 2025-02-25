'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  const router = useRouter();
  const pathname = usePathname();

  // Handle authentication changes
  const handleAuthChange = (action: 'login' | 'logout') => {
    console.log(`Auth change detected: ${action}`);
    
    if (action === 'logout') {
      setIsAuthenticated(false);
      setUsername(null);
      setRole(null);
      
      // Only redirect if we're not already on a public route
      if (pathname && !publicRoutes.some(route => pathname.startsWith(route))) {
        console.log(`Redirecting to login from ${pathname} after logout`);
        router.replace('/login');
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
      // If not authenticated and on a protected route, redirect to login
      // But we'll let the middleware handle this instead of doing it here
      // to prevent potential redirect loops
    }
    
    setLoading(false);
    setInitialized(true);
    
    // Clean up listeners on unmount
    return cleanup;
  }, [initialized]); // Only depend on initialized state

  // Handle route changes - separate from initialization
  useEffect(() => {
    if (!initialized || loading) return;
    
    // Don't redirect during initial load or when loading
    // Only check on pathname changes after initialization
    if (!isAuthenticated && pathname && !publicRoutes.some(route => pathname.startsWith(route))) {
      console.log(`Protected route detected: ${pathname}, redirecting to login`);
      // Add a small delay to prevent rapid redirects
      const redirectTimer = setTimeout(() => {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      }, 100);
      
      return () => clearTimeout(redirectTimer);
    }
  }, [pathname, isAuthenticated, initialized, loading, router]);

  // Login function
  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      console.log('Attempting login');
      const authData = await authService.loginUser(username, password);
      setIsAuthenticated(true);
      setUsername(authData.username);
      setRole(authData.role);
      
      // Small delay to ensure state is updated before redirect
      setTimeout(() => {
        console.log('Login successful, redirecting to home');
        router.replace('/');
      }, 100);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    console.log('Logging out user');
    authService.logoutUser();
    setIsAuthenticated(false);
    setUsername(null);
    setRole(null);
    
    // Small delay to ensure state is updated before redirect
    setTimeout(() => {
      router.replace('/login');
    }, 100);
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