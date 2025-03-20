"use client";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Menu } from "lucide-react";
import { isUserAdmin } from '@/app/services/authService';
import { useTheme } from '../contexts/ThemeContext';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import { useDefaultShortcuts } from '../hooks/useKeyboardShortcuts';

// Helper function to verify authentication
const verifyAuthentication = (): boolean => {
  const auth = localStorage.getItem('auth');
  const authCookie = document.cookie.includes('auth=');
  
  if (!auth || !authCookie) return false;
  
  try {
    const authData = JSON.parse(auth);
    const now = new Date().getTime();
    const timestamp = authData.timestamp || 0;
    const expiryTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    return (
      authData.isAuthenticated && 
      authData.username && 
      authData.role &&
      (now - timestamp <= expiryTime)
    );
  } catch {
    return false;
  }
};

const navItems = [
  { href: '/single-fault', label: 'Single Fault' },
  { href: '/multiple-faults', label: 'Multiple Faults' },
  { href: '/gpon-faults', label: 'GPON Faults' },
  { href: '/reports', label: 'Reports' },
  { href: '/gpon-reports', label: 'GPON Reports' },
  { href: '/analytics-dashboard', label: 'Analytics Dashboard' },
  { href: '/active-faults?source=navbar', label: 'Active Faults' },
  { href: '/fault-locations', label: 'Fault Locations' },
  { href: '/knowledgebase', label: 'Database' },
  { href: '/knowledgebase-hub', label: 'Knowledge Base' }
];

export default function NavBar({ topOffset = '0px' }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { theme, toggleTheme } = useTheme();
  
  // Enable default keyboard shortcuts
  useDefaultShortcuts();

  useEffect(() => {
    const checkAuth = () => {
      const isAuth = verifyAuthentication();
      setIsAuthenticated(isAuth);
      
      if (!isAuth) {
        // Clear auth data and redirect to login
        localStorage.removeItem('auth');
        document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; max-age=0; domain=' + window.location.hostname;
        router.replace('/login');
      }
    };

    checkAuth();
    
    // Check authentication status periodically
    const interval = setInterval(checkAuth, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [router]);

  useEffect(() => {
    const auth = localStorage.getItem('auth');
    if (auth) {
      const authData = JSON.parse(auth);
      setIsAdmin(isUserAdmin(authData));
    }
  }, []);

  const isActive = (path: string) => pathname === path;

  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    // Clear auth data
    localStorage.removeItem('auth');
    document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; max-age=0; domain=' + window.location.hostname;
    router.replace('/login');
  };

  const NavLinks = () => (
    <>
      {navItems.map((item) => (
        <Link 
          key={item.href}
          href={item.href}
          className={`
            relative px-2.5 py-1 text-sm font-medium rounded transition-all duration-200
            ${isActive(item.href) 
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white dark:from-dark-primary dark:to-blue-700' 
              : 'text-gray-700 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-surface/80 hover:text-gray-900 dark:hover:text-white'
            }
          `}
        >
          {item.label}
        </Link>
      ))}
      {isAdmin && (
        <Link 
          href="/deleted-tickets"
          className={`
            relative px-2.5 py-1 text-sm font-medium rounded transition-all duration-200 text-red-600 dark:text-red-400
          `}
        >
          Deleted Tickets
        </Link>
      )}
    </>
  );

  return (
    <nav 
      className="fixed top-0 left-0 right-0 z-[9999] bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border shadow-md h-8" 
      style={{ top: topOffset }}
    >
      <div className="h-full flex items-center justify-between px-2">
        {/* Mobile Menu Button */}
        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="hover:bg-gray-100 dark:hover:bg-dark-surface/80 h-6 w-6 dark:bg-dark-surface dark:text-dark-text dark:border-dark-border">
                <Menu className="h-3.5 w-3.5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 dark:bg-dark-surface dark:text-dark-text dark:border-dark-border">
              <ScrollArea className="h-[calc(100vh-4rem)] pb-10">
                <div className="flex flex-col space-y-2 mt-4">
                  <NavLinks />
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop Navigation - Centered */}
        <div className="hidden lg:flex items-center space-x-1 mx-auto">
          <NavLinks />
        </div>

        {/* Right side controls */}
        <div className="flex items-center space-x-2">
          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="px-2 py-0.5 text-xs font-medium rounded bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors"
            aria-label="Logout"
          >
            Logout
          </button>
          
          {/* Keyboard shortcuts help */}
          <KeyboardShortcutsHelp />
          
          {/* Theme toggle button */}
          <button
            onClick={toggleTheme}
            className="p-1 rounded-lg bg-gray-100 dark:bg-dark-primary hover:bg-gray-200 dark:hover:bg-dark-primary/90 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}