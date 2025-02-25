"use client";
import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import HomePage from './home/page';
import ClientWrapper from './components/ClientWrapper';

// Client component that handles authentication
function RootContent() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check authentication on component mount
    const auth = localStorage.getItem('auth');
    const authCookie = document.cookie.includes('auth=');
    
    if (!auth || !authCookie) {
      // Clear any partial auth data
      localStorage.removeItem('auth');
      document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; max-age=0; domain=' + window.location.hostname;
      sessionStorage.setItem('fromProtected', 'true');
      router.replace('/login');
      return;
    }

    try {
      const authData = JSON.parse(auth);
      if (!authData.isAuthenticated || !authData.username || !authData.role) {
        localStorage.removeItem('auth');
        document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; max-age=0; domain=' + window.location.hostname;
        sessionStorage.setItem('fromProtected', 'true');
        router.replace('/login');
      } else {
        // Check for session expiry (24 hours)
        const now = new Date().getTime();
        const timestamp = authData.timestamp || 0;
        const expiryTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        if (now - timestamp > expiryTime) {
          // Session expired
          localStorage.removeItem('auth');
          document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; max-age=0; domain=' + window.location.hostname;
          sessionStorage.setItem('fromProtected', 'true');
          router.replace('/login');
          return;
        }
        
        setIsAuthenticated(true);
      }
    } catch (error) {
      localStorage.removeItem('auth');
      document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; max-age=0; domain=' + window.location.hostname;
      sessionStorage.setItem('fromProtected', 'true');
      router.replace('/login');
    }
  }, [router]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FFF8E8] flex items-center justify-center">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A4637] mx-auto"></div>
          <p className="mt-4 text-[#4A4637]">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return <HomePage />;
}

// Main export with ClientWrapper
export default function RootPage() {
  return (
    <ClientWrapper>
      <RootContent />
    </ClientWrapper>
  );
}
