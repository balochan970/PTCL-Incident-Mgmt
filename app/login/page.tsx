"use client";
import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';

// Loading component to show while the page is loading
function LoginPageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF8E8]">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg border-2 border-[#D4C9A8]">
        <div className="text-center">
          <div className="mt-6 text-3xl font-extrabold text-[#4A4637]">
            Loading...
          </div>
          <div className="mt-4 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A4637]"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// The actual login page component
function LoginPageContent() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  const [redirectCount, setRedirectCount] = useState(0);
  const lastRedirectTime = useRef(0);
  const loginAttemptTime = useRef(0);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  
  // Get the redirect path from URL params if available
  const redirectPath = searchParams.get('redirect') || '/';

  // Constants for redirect protection
  const REDIRECT_COOLDOWN = 2000; // 2 second cooldown between redirects
  const MAX_REDIRECT_ATTEMPTS = 3; // Maximum number of redirect attempts
  const LOGIN_REDIRECT_DELAY = 800; // Delay after login before redirect

  // Check if we can redirect (prevent rapid redirects)
  const canRedirect = () => {
    const now = Date.now();
    
    // Don't redirect if we've tried too many times
    if (redirectCount >= MAX_REDIRECT_ATTEMPTS) {
      console.log('Login page: Redirect prevented - too many attempts');
      return false;
    }
    
    // Don't redirect if we've redirected recently
    if (now - lastRedirectTime.current < REDIRECT_COOLDOWN) {
      console.log('Login page: Redirect prevented - too soon');
      return false;
    }
    
    // Don't redirect if we're still loading
    if (loading || authLoading) {
      console.log('Login page: Redirect prevented - still loading');
      return false;
    }
    
    return true;
  };

  // Handle manual redirect to home after login
  const redirectAfterLogin = () => {
    if (redirectAttempted || !isAuthenticated) return;
    if (!canRedirect()) return;
    
    console.log(`Login page: User is authenticated, redirecting to: ${redirectPath}`);
    setRedirectAttempted(true);
    setRedirectCount(prev => prev + 1);
    lastRedirectTime.current = Date.now();
    
    // Add a flag to sessionStorage to indicate we're redirecting from login
    sessionStorage.setItem('redirectingFromLogin', 'true');
    sessionStorage.setItem('loginRedirectTime', Date.now().toString());
    
    // Use a timeout to prevent rapid redirects
    setTimeout(() => {
      // Check if we're still on the login page before redirecting
      if (window.location.pathname.includes('/login')) {
        router.replace(decodeURIComponent(redirectPath));
      }
      
      // Reset the redirect attempted flag after a delay to allow for retries if needed
      setTimeout(() => {
        setRedirectAttempted(false);
      }, REDIRECT_COOLDOWN);
    }, LOGIN_REDIRECT_DELAY);
  };

  // Redirect if already authenticated - with safeguards
  useEffect(() => {
    // Skip if auth is still loading
    if (authLoading) return;
    
    // If we just logged in, wait a bit before redirecting
    const timeSinceLogin = Date.now() - loginAttemptTime.current;
    if (loginAttemptTime.current > 0 && timeSinceLogin < LOGIN_REDIRECT_DELAY) {
      console.log(`Login page: Waiting for login to complete (${timeSinceLogin}ms)`);
      return;
    }
    
    // If authenticated, redirect to the intended destination
    if (isAuthenticated) {
      redirectAfterLogin();
    }
  }, [isAuthenticated, authLoading, redirectPath]);

  // Clear redirect flags when component mounts
  useEffect(() => {
    // Clear any previous redirect flags
    sessionStorage.removeItem('redirectingFromLogin');
    sessionStorage.removeItem('loginRedirectTime');
    
    // Reset redirect count when component mounts
    setRedirectCount(0);
    setRedirectAttempted(false);
    
    return () => {
      // Clean up when component unmounts
      sessionStorage.removeItem('redirectingFromLogin');
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    loginAttemptTime.current = Date.now();

    try {
      console.log('Attempting login from login page');
      await login(username.trim(), password);
      // Login successful - redirect will happen via the useEffect
      console.log('Login successful, waiting for redirect');
    } catch (err) {
      console.error('Login error:', err);
      setError('Invalid username or password');
      loginAttemptTime.current = 0;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF8E8]">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg border-2 border-[#D4C9A8]">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-[#4A4637]">
            ROC Incident Management
          </h2>
          <p className="mt-2 text-center text-sm text-[#635C48]">
            "Please sign in to continue"
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md -space-y-px">
            <div className="mb-4">
              <label htmlFor="username" className="block text-sm font-medium text-[#4A4637] mb-1">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-[#D4C9A8] placeholder-[#AAB396] text-[#4A4637] rounded-md focus:outline-none focus:ring-2 focus:ring-[#4A4637] focus:border-[#4A4637] sm:text-sm bg-[#FFF8E8]"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#4A4637] mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-[#D4C9A8] placeholder-[#AAB396] text-[#4A4637] rounded-md focus:outline-none focus:ring-2 focus:ring-[#4A4637] focus:border-[#4A4637] sm:text-sm bg-[#FFF8E8]"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#4A4637] hover:text-[#635C48] focus:outline-none"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading || authLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#4A4637] hover:bg-[#635C48] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4A4637] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading || authLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t-2 border-[#D4C9A8]">
          <Link 
            href="/active-faults?source=login" 
            className="block w-full text-center py-3 px-4 rounded-lg bg-white border-2 border-[#4A4637] text-[#4A4637] hover:bg-[#4A4637] hover:text-white transition-all duration-200 shadow-md"
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-xl">📊</span>
              <span className="font-medium">View Active Faults</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

// Export the main component with Suspense
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageLoading />}>
      <LoginPageContent />
    </Suspense>
  );
} 