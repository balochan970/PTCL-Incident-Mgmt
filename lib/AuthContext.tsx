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
  const router = useRouter();
  const pathname = usePathname();

  // Handle authentication changes
  const handleAuthChange = (action: 'login' | 'logout') => {
    if (action === 'logout') {
      setIsAuthenticated(false);
      setUsername(null);
      setRole(null);
      
      // Only redirect if we're not already on a public route
      if (pathname && !publicRoutes.includes(pathname)) {
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

  // Initialize auth on component mount
  useEffect(() => {
    setLoading(true);
    
    // Initialize auth and set up listeners
    const cleanup = authService.initAuth(handleAuthChange);
    
    // Check if user is authenticated
    if (authService.isAuthenticated()) {
      const authData = authService.getAuthData();
      if (authData) {
        setIsAuthenticated(true);
        setUsername(authData.username);
        setRole(authData.role);
      }
    } else {
      // If not authenticated and on a protected route, redirect to login
      if (pathname && !publicRoutes.includes(pathname)) {
        router.replace('/login');
      }
    }
    
    setLoading(false);
    
    // Clean up listeners on unmount
    return cleanup;
  }, []);

  // Login function
  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      const authData = await authService.loginUser(username, password);
      setIsAuthenticated(true);
      setUsername(authData.username);
      setRole(authData.role);
      router.replace('/');
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    authService.logoutUser();
    setIsAuthenticated(false);
    setUsername(null);
    setRole(null);
    router.replace('/login');
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