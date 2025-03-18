"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import HomePage from './home/page';
import Link from 'next/link';
import NavBar from './components/NavBar';
import { useDefaultShortcuts } from './hooks/useKeyboardShortcuts';
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp';

export default function RootPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

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
        setUsername(authData.username || 'User');
        setIsAdmin(authData.role === 'admin');
      }
    } catch (error) {
      localStorage.removeItem('auth');
      document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; max-age=0; domain=' + window.location.hostname;
      sessionStorage.setItem('fromProtected', 'true');
      router.replace('/login');
    }
  }, []);

  // Enable keyboard shortcuts
  useDefaultShortcuts();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#FFF8E8] dark:bg-dark-background">
      <NavBar />
      <div className="container mx-auto px-4 pt-16">
        <div className="text-center mb-12 pt-8">
          <h1 className="text-4xl font-bold text-[#4A4637] dark:text-dark-text mb-4">
            ROC Incident Management System
          </h1>
          <p className="text-lg text-[#635C48] dark:text-dark-text/80">
            Welcome, {username}! Select an option below to get started.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Single Fault Card */}
          <Link href="/single-fault">
            <div className="bg-white dark:bg-dark-surface rounded-lg shadow-lg border-2 border-[#D4C9A8] dark:border-dark-border hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-6">
              <div className="text-3xl mb-4">📝</div>
              <h2 className="text-xl font-semibold text-[#4A4637] dark:text-dark-text mb-2">Single Fault</h2>
              <p className="text-[#635C48] dark:text-dark-text/80">Create and manage individual network incidents.</p>
              <div className="mt-4 text-xs text-gray-500 dark:text-dark-text/60">
                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-dark-background border border-gray-300 dark:border-dark-border rounded">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-dark-background border border-gray-300 dark:border-dark-border rounded">Q</kbd>
              </div>
            </div>
          </Link>

          {/* Multiple Faults Card */}
          <Link href="/multiple-faults">
            <div className="bg-white dark:bg-dark-surface rounded-lg shadow-lg border-2 border-[#D4C9A8] dark:border-dark-border hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-6">
              <div className="text-3xl mb-4">📊</div>
              <h2 className="text-xl font-semibold text-[#4A4637] dark:text-dark-text mb-2">Multiple Faults</h2>
              <p className="text-[#635C48] dark:text-dark-text/80">Manage multiple network incidents at once.</p>
              <div className="mt-4 text-xs text-gray-500 dark:text-dark-text/60">
                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-dark-background border border-gray-300 dark:border-dark-border rounded">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-dark-background border border-gray-300 dark:border-dark-border rounded">M</kbd>
              </div>
            </div>
          </Link>

          {/* GPON Faults Card */}
          <Link href="/gpon-faults">
            <div className="bg-white dark:bg-dark-surface rounded-lg shadow-lg border-2 border-[#D4C9A8] dark:border-dark-border hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-6">
              <div className="text-3xl mb-4">🔌</div>
              <h2 className="text-xl font-semibold text-[#4A4637] dark:text-dark-text mb-2">GPON Faults</h2>
              <p className="text-[#635C48] dark:text-dark-text/80">Manage GPON network incidents.</p>
              <div className="mt-4 text-xs text-gray-500 dark:text-dark-text/60">
                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-dark-background border border-gray-300 dark:border-dark-border rounded">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-dark-background border border-gray-300 dark:border-dark-border rounded">G</kbd>
              </div>
            </div>
          </Link>

          {/* Reports Card */}
          <Link href="/reports">
            <div className="bg-white dark:bg-dark-surface rounded-lg shadow-lg border-2 border-[#D4C9A8] dark:border-dark-border hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-6">
              <div className="text-3xl mb-4">📈</div>
              <h2 className="text-xl font-semibold text-[#4A4637] dark:text-dark-text mb-2">Reports</h2>
              <p className="text-[#635C48] dark:text-dark-text/80">View and generate incident reports.</p>
              <div className="mt-4 text-xs text-gray-500 dark:text-dark-text/60">
                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-dark-background border border-gray-300 dark:border-dark-border rounded">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-dark-background border border-gray-300 dark:border-dark-border rounded">R</kbd>
              </div>
            </div>
          </Link>

          {/* GPON Reports Card */}
          <Link href="/gpon-reports">
            <div className="bg-white dark:bg-dark-surface rounded-lg shadow-lg border-2 border-[#D4C9A8] dark:border-dark-border hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-6">
              <div className="text-3xl mb-4">📊</div>
              <h2 className="text-xl font-semibold text-[#4A4637] dark:text-dark-text mb-2">GPON Reports</h2>
              <p className="text-[#635C48] dark:text-dark-text/80">View and generate GPON incident reports.</p>
            </div>
          </Link>

          {/* Active Faults Card */}
          <Link href="/active-faults?source=navbar">
            <div className="bg-white dark:bg-dark-surface rounded-lg shadow-lg border-2 border-[#D4C9A8] dark:border-dark-border hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-6">
              <div className="text-3xl mb-4">🔔</div>
              <h2 className="text-xl font-semibold text-[#4A4637] dark:text-dark-text mb-2">Active Faults</h2>
              <p className="text-[#635C48] dark:text-dark-text/80">View all active network incidents.</p>
              <div className="mt-4 text-xs text-gray-500 dark:text-dark-text/60">
                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-dark-background border border-gray-300 dark:border-dark-border rounded">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-dark-background border border-gray-300 dark:border-dark-border rounded">A</kbd>
              </div>
            </div>
          </Link>

          {/* Fault Locations Card */}
          <Link href="/fault-locations">
            <div className="bg-white dark:bg-dark-surface rounded-lg shadow-lg border-2 border-[#D4C9A8] dark:border-dark-border hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-6">
              <div className="text-3xl mb-4">🗺️</div>
              <h2 className="text-xl font-semibold text-[#4A4637] dark:text-dark-text mb-2">Fault Locations</h2>
              <p className="text-[#635C48] dark:text-dark-text/80">View fault locations on a map.</p>
              <div className="mt-4 text-xs text-gray-500 dark:text-dark-text/60">
                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-dark-background border border-gray-300 dark:border-dark-border rounded">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-dark-background border border-gray-300 dark:border-dark-border rounded">L</kbd>
              </div>
            </div>
          </Link>

          {/* Knowledge Base Card */}
          <Link href="/knowledgebase">
            <div className="bg-white dark:bg-dark-surface rounded-lg shadow-lg border-2 border-[#D4C9A8] dark:border-dark-border hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-6">
              <div className="text-3xl mb-4">📚</div>
              <h2 className="text-xl font-semibold text-[#4A4637] dark:text-dark-text mb-2">Database</h2>
              <p className="text-[#635C48] dark:text-dark-text/80">Access troubleshooting guides and documentation.</p>
              <div className="mt-4 text-xs text-gray-500 dark:text-dark-text/60">
                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-dark-background border border-gray-300 dark:border-dark-border rounded">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-dark-background border border-gray-300 dark:border-dark-border rounded">K</kbd>
              </div>
            </div>
          </Link>

          {/* Knowledge Base Hub Card */}
          <Link href="/knowledgebase-hub">
            <div className="bg-white dark:bg-dark-surface rounded-lg shadow-lg border-2 border-[#D4C9A8] dark:border-dark-border hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-6">
              <div className="text-3xl mb-4">📖</div>
              <h2 className="text-xl font-semibold text-[#4A4637] dark:text-dark-text mb-2">Knowledge Base</h2>
              <p className="text-[#635C48] dark:text-dark-text/80">Access centralized knowledge resources and guides.</p>
              <div className="mt-4 text-xs text-gray-500 dark:text-dark-text/60">
                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-dark-background border border-gray-300 dark:border-dark-border rounded">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-dark-background border border-gray-300 dark:border-dark-border rounded">B</kbd>
              </div>
            </div>
          </Link>

          {/* Admin Only: Deleted Tickets Card */}
          {isAdmin && (
            <Link href="/deleted-tickets">
              <div className="bg-white dark:bg-dark-surface rounded-lg shadow-lg border-2 border-red-300 dark:border-red-700 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-6">
                <div className="text-3xl mb-4">🗑️</div>
                <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">Deleted Tickets</h2>
                <p className="text-[#635C48] dark:text-dark-text/80">View and restore deleted tickets (Admin only).</p>
              </div>
            </Link>
          )}
        </div>

        <div className="mt-12 text-center">
          <div className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors relative group">
            <span>Powered By</span>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-white dark:bg-dark-surface p-2 rounded shadow-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 mb-2">
              <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">taimoor2</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
