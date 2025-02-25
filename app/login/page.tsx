"use client";
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated } = useAuth();
  
  // Get the redirect path from URL params if available
  const redirectPath = searchParams.get('redirect') || '/';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace(redirectPath);
    }
  }, [isAuthenticated, router, redirectPath]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username.trim(), password);
      // Login successful - redirect will happen automatically via the useEffect
    } catch (err) {
      console.error('Login error:', err);
      setError('Invalid username or password');
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
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#4A4637] hover:bg-[#635C48] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4A4637] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
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