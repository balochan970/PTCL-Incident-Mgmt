"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import Image from 'next/image';

// Constants for redirect handling
const REDIRECT_COOLDOWN = 2000; // 2 seconds between redirects
const MAX_REDIRECT_ATTEMPTS = 3; // Maximum number of redirect attempts
const LOGIN_REDIRECT_DELAY = 800; // Delay after successful login before redirect

// Loading component for the login page
const LoginPageLoading = () => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
    <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
      <div className="flex justify-center">
        <div className="animate-pulse h-12 w-32 bg-gray-300 rounded"></div>
      </div>
      <div className="space-y-4">
        <div className="animate-pulse h-10 bg-gray-300 rounded"></div>
        <div className="animate-pulse h-10 bg-gray-300 rounded"></div>
        <div className="animate-pulse h-10 bg-gray-300 rounded"></div>
      </div>
    </div>
  </div>
);

// Client component that uses useSearchParams
const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [redirectAttempts, setRedirectAttempts] = useState(0);
  
  const { login, isAuthenticated, loading, error, initialized } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Handle redirect after successful login
  useEffect(() => {
    // Skip if not initialized, still loading, or not authenticated
    if (!initialized || loading) {
      return;
    }
    
    // If authenticated, prepare to redirect
    if (isAuthenticated) {
      console.log('User authenticated, preparing redirect');
      
      // Get redirect path from URL parameters
      const redirectTo = searchParams?.get('redirect') || '/';
      const decodedRedirect = decodeURIComponent(redirectTo);
      
      // Check if we've exceeded max redirect attempts
      if (redirectAttempts >= MAX_REDIRECT_ATTEMPTS) {
        console.warn(`Exceeded maximum redirect attempts (${MAX_REDIRECT_ATTEMPTS})`);
        setErrorMessage('Too many redirect attempts. Please try navigating manually.');
        
        // Reset redirect attempts after a cooldown
        setTimeout(() => {
          setRedirectAttempts(0);
          sessionStorage.removeItem('loginRedirectAttempts');
        }, REDIRECT_COOLDOWN * 2);
        
        return;
      }
      
      // Check if we're in a cooldown period
      const lastRedirectStr = sessionStorage.getItem('lastLoginRedirect');
      if (lastRedirectStr) {
        const lastRedirect = parseInt(lastRedirectStr, 10);
        const now = Date.now();
        
        if (now - lastRedirect < REDIRECT_COOLDOWN) {
          console.log('In redirect cooldown period, waiting...');
          return;
        }
      }
      
      // Set redirect flag and increment attempts
      sessionStorage.setItem('lastLoginRedirect', Date.now().toString());
      const newAttempts = redirectAttempts + 1;
      setRedirectAttempts(newAttempts);
      sessionStorage.setItem('loginRedirectAttempts', newAttempts.toString());
      
      console.log(`Redirecting to ${decodedRedirect} after login (attempt ${newAttempts})`);
      
      // Use a timeout to allow state to settle before redirect
      setTimeout(() => {
        router.push(decodedRedirect);
      }, LOGIN_REDIRECT_DELAY);
    }
  }, [isAuthenticated, loading, initialized, router, searchParams, redirectAttempts]);
  
  // Load saved redirect attempts on mount
  useEffect(() => {
    try {
      const savedAttempts = sessionStorage.getItem('loginRedirectAttempts');
      if (savedAttempts) {
        setRedirectAttempts(parseInt(savedAttempts, 10));
      }
    } catch (e) {
      console.error('Error loading redirect attempts from sessionStorage:', e);
    }
  }, []);
  
  // Handle login form submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading) return;
    
    setErrorMessage('');
    setIsLoading(true);
    
    try {
      // Validate input
      if (!username.trim() || !password.trim()) {
        setErrorMessage('Please enter both username and password');
        setIsLoading(false);
        return;
      }
      
      console.log('Attempting login for user:', username);
      await login(username, password);
      
      // The redirect will be handled by the useEffect above
    } catch (err) {
      console.error('Login error:', err);
      setErrorMessage(error || 'Login failed. Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="flex justify-center">
          <Image
            src="/ptcl-logo.png"
            alt="PTCL Logo"
            width={150}
            height={50}
            priority
          />
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
          Incident Management System
        </h2>
        
        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{errorMessage}</span>
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                isLoading ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Export the main component with Suspense fallback
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageLoading />}>
      <LoginForm />
    </Suspense>
  );
} 