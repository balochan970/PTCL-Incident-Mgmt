"use client";
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import HomePage from './home/page';
import Link from 'next/link';
import NavBar from './components/NavBar';
import { useDefaultShortcuts } from './hooks/useKeyboardShortcuts';
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp';
import Script from 'next/script';
import EnhancedAIAssistant from './components/EnhancedAIAssistant';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { Button } from './components/ui/button';
import { Bot } from 'lucide-react';

// Add external anime.js types
declare global {
  interface Window {
    anime: any;
    gsap: any;
    AOS: any;
  }
}

// Define window gsap property to avoid TypeScript errors
declare global {
  interface Window {
    gsap: any;
    anime: any;
    AOS: any;
  }
}

export default function RootPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  
  // Define AI name to be consistent across the application
  const aiName = "ROC Genie";
  
  // Remove unused animation states and refs
  const titleRef = useRef<HTMLHeadingElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
        setShowAIAssistant(true);
      }
    } catch (error) {
      localStorage.removeItem('auth');
      document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; max-age=0; domain=' + window.location.hostname;
      sessionStorage.setItem('fromProtected', 'true');
      router.replace('/login');
    }
  }, []);

  // Fetch incident data for AI Assistant
  useEffect(() => {
    if (isAuthenticated) {
      fetchRecentIncidents();
    }
  }, [isAuthenticated]);

  // Function to fetch recent incidents for AI context
  const fetchRecentIncidents = async () => {
    try {
      // Fetch regular incidents
      const incidentsRef = collection(db, 'incidents');
      const incidentsQuery = query(
        incidentsRef,
        orderBy('timestamp', 'desc'),
        limit(30) // Increased limit to provide more context
      );
      const incidentsSnapshot = await getDocs(incidentsQuery);
      const incidentsList = incidentsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: 'standard', // Add type identifier
          ...data,
          // Add derived fields that might be useful for analysis
          resolutionTimeHours: data.faultEndTime && data.timestamp 
            ? ((data.faultEndTime.seconds - data.timestamp.seconds) / 3600).toFixed(1) 
            : undefined
        };
      });

      // Fetch GPON incidents
      const gponIncidentsRef = collection(db, 'gponIncidents');
      const gponIncidentsQuery = query(
        gponIncidentsRef,
        orderBy('timestamp', 'desc'),
        limit(20) // Increased limit to provide more context
      );
      const gponIncidentsSnapshot = await getDocs(gponIncidentsQuery);
      const gponIncidentsList = gponIncidentsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: 'gpon', // Add type identifier
          ...data,
          // Add derived fields that might be useful for analysis
          resolutionTimeHours: data.faultEndTime && data.timestamp 
            ? ((data.faultEndTime.seconds - data.timestamp.seconds) / 3600).toFixed(1) 
            : undefined
        };
      });

      // Calculate some summary statistics to add to the context
      const allIncidents = [...incidentsList, ...gponIncidentsList];
      
      // Add summary data at the beginning of the incidents array
      const summaryData = {
        id: 'summary',
        type: 'summary',
        totalIncidents: allIncidents.length,
        standardIncidents: incidentsList.length,
        gponIncidents: gponIncidentsList.length,
        activeIncidents: allIncidents.filter(inc => (inc as any).status === 'In Progress' || (inc as any).status === 'Pending').length,
        resolvedIncidents: allIncidents.filter(inc => (inc as any).status === 'Resolved').length,
        topExchanges: getTopExchanges(allIncidents, 5),
        timestamp: new Date()
      };

      // Combine and set incidents with summary at the beginning
      setIncidents([summaryData, ...incidentsList, ...gponIncidentsList]);
    } catch (error) {
      console.error('Error fetching incidents for AI:', error);
    }
  };

  // Helper function to get top exchanges by incident count
  const getTopExchanges = (incidents: any[], limit: number) => {
    const exchangeCounts: Record<string, number> = {};
    
    // Count incidents per exchange
    incidents.forEach(incident => {
      if (incident.exchangeName) {
        exchangeCounts[incident.exchangeName] = (exchangeCounts[incident.exchangeName] || 0) + 1;
      }
    });
    
    // Convert to array and sort
    return Object.entries(exchangeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([exchange, count]) => ({ exchange, count }));
  };

  // Enable keyboard shortcuts
  useDefaultShortcuts();

  // Simple card hover effect
  useEffect(() => {
    if (isAuthenticated) {
      const cards = document.querySelectorAll('.card');
      
      cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
          (card as HTMLElement).style.transform = 'translateY(-8px)';
          (card as HTMLElement).style.boxShadow = '0 12px 20px rgba(0, 0, 0, 0.15)';
        });
        
        card.addEventListener('mouseleave', () => {
          (card as HTMLElement).style.transform = 'translateY(0)';
          (card as HTMLElement).style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        });
      });
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#FFF8E8] dark:bg-dark-background">
      <style jsx global>{`
        .card {
          background-color: white;
          border-radius: 8px;
          padding: 1.5rem;
          border: 2px solid #D4C9A8;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .dark .card {
          background-color: var(--dark-surface);
          border-color: var(--dark-border);
        }
        
        .admin-card {
          border-color: #FCA5A5;
        }
        
        .dark .admin-card {
          border-color: #7F1D1D;
        }
      `}</style>
      
      <NavBar />
      <div ref={containerRef} className="container mx-auto px-4 pt-16">
        <div className="text-center mb-12 pt-8">
          <h1 
            ref={titleRef}
            className="text-4xl font-bold text-[#4A4637] dark:text-dark-text mb-4"
          >
            ROC Incident Management System
          </h1>
          <p className="text-lg text-[#635C48] dark:text-dark-text/80 mb-6">
            Welcome, {username}! Select an option below to get started.
          </p>
          <Button 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center gap-2 transition-colors mx-auto mb-6"
            onClick={() => setShowAIAssistant(prev => !prev)}
          >
            <Bot size={18} />
            {showAIAssistant ? `Hide ${aiName}` : `Show ${aiName}`}
          </Button>
        </div>

        {/* Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Single Fault Card */}
          <Link href="/single-fault">
            <div className="card">
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
            <div className="card">
              <div className="text-3xl mb-4">📊</div>
              <h2 className="text-xl font-semibold text-[#4A4637] dark:text-dark-text mb-2">Multiple Faults</h2>
              <p className="text-[#635C48] dark:text-dark-text/80">Manage multiple network incidents at once.</p>
              <div className="mt-4 text-xs text-gray-500 dark:text-dark-text/60">
                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-dark-background border border-gray-300 dark:border-dark-border rounded">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-dark-background border border-gray-300 dark:border-dark-border rounded">M</kbd>
              </div>
            </div>
          </Link>

          {/* GPON Faults */}
          <Link href="/gpon-faults">
            <div className="card">
              <div className="text-3xl mb-4">🔌</div>
              <h2 className="text-xl font-semibold text-[#4A4637] dark:text-dark-text mb-2">GPON Faults</h2>
              <p className="text-[#635C48] dark:text-dark-text/80">Manage GPON network incidents.</p>
              <div className="mt-4 text-xs text-gray-500 dark:text-dark-text/60">
                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-dark-background border border-gray-300 dark:border-dark-border rounded">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-dark-background border border-gray-300 dark:border-dark-border rounded">G</kbd>
              </div>
            </div>
          </Link>

          {/* Reports */}
          <Link href="/reports">
            <div className="card">
              <div className="text-3xl mb-4">📈</div>
              <h2 className="text-xl font-semibold text-[#4A4637] dark:text-dark-text mb-2">Reports</h2>
              <p className="text-[#635C48] dark:text-dark-text/80">View and generate incident reports.</p>
              <div className="mt-4 text-xs text-gray-500 dark:text-dark-text/60">
                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-dark-background border border-gray-300 dark:border-dark-border rounded">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-dark-background border border-gray-300 dark:border-dark-border rounded">R</kbd>
              </div>
            </div>
          </Link>

          {/* GPON Reports */}
          <Link href="/gpon-reports">
            <div className="card">
              <div className="text-3xl mb-4">📊</div>
              <h2 className="text-xl font-semibold text-[#4A4637] dark:text-dark-text mb-2">GPON Reports</h2>
              <p className="text-[#635C48] dark:text-dark-text/80">View and generate GPON incident reports.</p>
            </div>
          </Link>

          {/* Active Faults */}
          <Link href="/active-faults?source=navbar">
            <div className="card">
              <div className="text-3xl mb-4">🔔</div>
              <h2 className="text-xl font-semibold text-[#4A4637] dark:text-dark-text mb-2">Active Faults</h2>
              <p className="text-[#635C48] dark:text-dark-text/80">View all active network incidents.</p>
              <div className="mt-4 text-xs text-gray-500 dark:text-dark-text/60">
                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-dark-background border border-gray-300 dark:border-dark-border rounded">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-dark-background border border-gray-300 dark:border-dark-border rounded">A</kbd>
              </div>
            </div>
          </Link>

          {/* Fault Locations */}
          <Link href="/fault-locations">
            <div className="card">
              <div className="text-3xl mb-4">🗺️</div>
              <h2 className="text-xl font-semibold text-[#4A4637] dark:text-dark-text mb-2">Fault Locations</h2>
              <p className="text-[#635C48] dark:text-dark-text/80">View fault locations on a map.</p>
              <div className="mt-4 text-xs text-gray-500 dark:text-dark-text/60">
                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-dark-background border border-gray-300 dark:border-dark-border rounded">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-dark-background border border-gray-300 dark:border-dark-border rounded">L</kbd>
              </div>
            </div>
          </Link>

          {/* Database */}
          <Link href="/knowledgebase">
            <div className="card">
              <div className="text-3xl mb-4">📚</div>
              <h2 className="text-xl font-semibold text-[#4A4637] dark:text-dark-text mb-2">Database</h2>
              <p className="text-[#635C48] dark:text-dark-text/80">Access troubleshooting guides and documentation.</p>
              <div className="mt-4 text-xs text-gray-500 dark:text-dark-text/60">
                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-dark-background border border-gray-300 dark:border-dark-border rounded">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-dark-background border border-gray-300 dark:border-dark-border rounded">K</kbd>
              </div>
            </div>
          </Link>

          {/* Analytics Dashboard */}
          <Link href="/analytics-dashboard">
            <div className="card">
              <div className="text-3xl mb-4">📊</div>
              <h2 className="text-xl font-semibold text-[#4A4637] dark:text-dark-text mb-2">Analytics Dashboard</h2>
              <p className="text-[#635C48] dark:text-dark-text/80">View performance metrics and incident trends.</p>
              <div className="mt-4 text-xs text-gray-500 dark:text-dark-text/60">
                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-dark-background border border-gray-300 dark:border-dark-border rounded">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-dark-background border border-gray-300 dark:border-dark-border rounded">D</kbd>
              </div>
            </div>
          </Link>

          {/* Knowledge Base */}
          <Link href="/knowledgebase-hub">
            <div className="card">
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
              <div className="card admin-card">
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

      {/* AI Assistant */}
      {showAIAssistant && incidents.length > 0 && (
        <EnhancedAIAssistant 
          incidents={incidents} 
          username={username}
        />
      )}
    </main>
  );
}
