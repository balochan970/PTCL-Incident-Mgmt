"use client";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Menu } from "lucide-react";

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
  { href: '/active-faults?source=navbar', label: 'Active Faults' },
  { href: '/fault-locations', label: 'Fault Locations' },
  { href: '/knowledgebase', label: 'KnowledgeBase' }
];

export default function NavBar({ topOffset = '0px' }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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

  const isActive = (path: string) => pathname === path;

  if (!isAuthenticated) {
    return null;
  }

  const NavLinks = () => (
    <>
      {navItems.map((item) => (
        <Link 
          key={item.href}
          href={item.href}
          className={`
            relative px-2.5 py-1 text-sm font-medium rounded transition-all duration-200
            ${isActive(item.href) 
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' 
              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }
          `}
        >
          {item.label}
        </Link>
      ))}
    </>
  );

  return (
    <nav 
      className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm h-8" 
      style={{ top: topOffset }}
    >
      <div className="h-full flex items-center justify-center px-2">
        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center space-x-1">
          <NavLinks />
        </div>

        {/* Mobile Menu Button */}
        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="hover:bg-gray-100 h-6 w-6">
                <Menu className="h-3.5 w-3.5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <ScrollArea className="h-[calc(100vh-4rem)] pb-10">
                <div className="flex flex-col space-y-2 mt-4">
                  <NavLinks />
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}