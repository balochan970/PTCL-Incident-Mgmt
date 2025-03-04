"use client";
import { useState, useEffect, Suspense } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import NavBar from '@/app/components/NavBar';

interface Fault {
  id: string;
  incidentNumber?: string;
  faultType?: string;
  domain?: string;
  equipmentType?: string;
  exchangeName?: string;
  status: string;
  timestamp: any;
  faultEndTime?: any;
  nodeA?: string;
  nodeB?: string;
  nodes?: {
    nodeA?: string;
    nodeB?: string;
  };
  fdh?: string;
  fats?: Array<{ id?: string; value?: string }>;
  fsps?: Array<{ id?: string; value?: string }>;
  oltIp?: string;
  remarks?: string;
  ticketGenerator?: string;
  isOutage?: boolean;
  stakeholders?: string[];
}

// Loading component to display while the main content is loading
function LoadingFaults() {
  return (
    <div className="min-h-screen bg-[#FFF8E8] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-[#4A4637]">Active Faults</h1>
        </div>
        <div className="bg-white rounded-lg shadow-lg border-2 border-[#D4C9A8] overflow-hidden">
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A4637] mx-auto"></div>
            <p className="mt-4 text-[#4A4637]">Loading faults...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component content
function ActiveFaultsContent() {
  const [activeTab, setActiveTab] = useState<'gpon' | 'switch'>('gpon');
  const [faults, setFaults] = useState<Fault[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  }>({ key: 'timestamp', direction: 'desc' });
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = searchParams.get('source') || 'navbar';
  const isFromLogin = source === 'login';

  useEffect(() => {
    fetchFaults();
  }, [activeTab]);

  const handleBackToLogin = () => {
    // Check if user is authenticated
    const auth = localStorage.getItem('auth');
    const authCookie = document.cookie.includes('auth=');
    
    if (auth && authCookie) {
      try {
        const authData = JSON.parse(auth);
        if (authData.isAuthenticated) {
          // If authenticated, go to home
          router.push('/');
          return;
        }
      } catch (error) {
        // If error parsing auth data, clear it
        localStorage.removeItem('auth');
        document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; max-age=0';
      }
    }
    
    // If not authenticated or error occurred, go to login
    router.push('/login');
  };

  const fetchFaults = async () => {
    try {
      setLoading(true);
      setError(null);

      const collectionName = activeTab === 'gpon' ? 'gponIncidents' : 'incidents';

      const faultsRef = collection(db, collectionName);
      
      const q = query(
        faultsRef,
        where('status', 'in', [
          'In Progress',
          'in progress',
          'IN PROGRESS',
          'InProgress',
          'In-Progress',
          'Pending',
          'pending',
          'PENDING'
        ])
      );

      const snapshot = await getDocs(q);

      const faultsData = snapshot.docs.map(doc => {
        const data = doc.data();
        const fault: Fault = {
          id: doc.id,
          status: data.status,
          timestamp: data.timestamp,
          ...data,
          // For GPON faults, use the value field from fats and fsps arrays
          nodeA: data.nodes?.nodeA || data.nodeA || '-',
          nodeB: data.nodes?.nodeB || data.nodeB || '-'
        };
        return fault;
      });

      faultsData.sort((a, b) => {
        const dateA = a.timestamp?.toDate?.() || new Date(0);
        const dateB = b.timestamp?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      setFaults(faultsData);

    } catch (err) {
      console.error('Error fetching faults:', err);
      setError('Failed to load active faults. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate();
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const handleSort = (key: string) => {
    setSortConfig((prevConfig) => ({
      key,
      direction:
        prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc',
    }));

    const sortedFaults = [...faults].sort((a, b) => {
      let aValue = a[key as keyof Fault];
      let bValue = b[key as keyof Fault];

      // Handle nested properties for nodes
      if (key === 'nodes') {
        aValue = `${a.nodeA || ''} ${a.nodeB || ''}`.trim();
        bValue = `${b.nodeA || ''} ${b.nodeB || ''}`.trim();
      }

      // Handle FAT values
      if (key === 'fats') {
        aValue = a.fats?.[0]?.value || '';
        bValue = b.fats?.[0]?.value || '';
      }

      // Handle FSP values
      if (key === 'fsps') {
        aValue = a.fsps?.[0]?.value || '';
        bValue = b.fsps?.[0]?.value || '';
      }

      // Handle timestamp separately
      if (key === 'timestamp') {
        const dateA = a.timestamp?.toDate?.() || new Date(0);
        const dateB = b.timestamp?.toDate?.() || new Date(0);
        return sortConfig.direction === 'asc'
          ? dateA.getTime() - dateB.getTime()
          : dateB.getTime() - dateA.getTime();
      }

      // Handle string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      // Handle undefined values
      if (aValue === undefined) return sortConfig.direction === 'asc' ? -1 : 1;
      if (bValue === undefined) return sortConfig.direction === 'asc' ? 1 : -1;

      // Default comparison
      return sortConfig.direction === 'asc'
        ? (aValue > bValue ? 1 : -1)
        : (bValue > aValue ? 1 : -1);
    });

    setFaults(sortedFaults);
  };

  const getSortIndicator = (key: string) => {
    if (sortConfig.key !== key) return '↕';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="min-h-screen bg-[#FFF8E8]">
      {!isFromLogin && <NavBar topOffset="0px" />}
      
      <div className="p-6" style={{ paddingTop: !isFromLogin ? '60px' : '20px' }}>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-[#4A4637]">Active Faults</h1>
            {isFromLogin && (
              <button 
                onClick={handleBackToLogin}
                className="px-4 py-2 bg-[#4A4637] text-white rounded-lg hover:bg-[#635C48] transition-colors"
              >
                Back to Login
              </button>
            )}
            {!isFromLogin && (
              <Link href="/">
                <button className="px-4 py-2 bg-[#4A4637] text-white rounded-lg hover:bg-[#635C48] transition-colors">
                  Back to Home
                </button>
              </Link>
            )}
          </div>

          {/* Tab Buttons */}
          <div className="flex justify-center gap-4 mb-8">
            <button
              onClick={() => setActiveTab('gpon')}
              className={`px-6 py-3 rounded-lg text-lg font-semibold transition-all duration-200 ${
                activeTab === 'gpon'
                  ? 'bg-[#4A4637] text-white shadow-lg transform scale-105'
                  : 'bg-white text-[#4A4637] border-2 border-[#4A4637] hover:bg-[#4A4637] hover:text-white'
              }`}
            >
              GPON Active Faults
            </button>
            <button
              onClick={() => setActiveTab('switch')}
              className={`px-6 py-3 rounded-lg text-lg font-semibold transition-all duration-200 ${
                activeTab === 'switch'
                  ? 'bg-[#4A4637] text-white shadow-lg transform scale-105'
                  : 'bg-white text-[#4A4637] border-2 border-[#4A4637] hover:bg-[#4A4637] hover:text-white'
              }`}
            >
              Switch/Metro Active Faults
            </button>
          </div>

          {/* Content Area */}
          <div className="bg-white rounded-lg shadow-lg border-2 border-[#D4C9A8] overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A4637] mx-auto"></div>
                <p className="mt-4 text-[#4A4637]">Loading faults...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-600 bg-red-50">
                {error}
              </div>
            ) : faults.length === 0 ? (
              <div className="p-8 text-center text-[#4A4637]">
                No active faults found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#4A4637] text-white">
                      <th 
                        className="px-4 py-3 text-left cursor-pointer hover:bg-[#635C48]"
                        onClick={() => handleSort('incidentNumber')}
                      >
                        Ticket # {getSortIndicator('incidentNumber')}
                      </th>
                      <th 
                        className="px-4 py-3 text-left cursor-pointer hover:bg-[#635C48]"
                        onClick={() => handleSort('timestamp')}
                      >
                        Fault Occurred {getSortIndicator('timestamp')}
                      </th>
                      {activeTab === 'gpon' ? (
                        <>
                          <th 
                            className="px-4 py-3 text-left cursor-pointer hover:bg-[#635C48]"
                            onClick={() => handleSort('exchangeName')}
                          >
                            Exchange {getSortIndicator('exchangeName')}
                          </th>
                          <th 
                            className="px-4 py-3 text-left cursor-pointer hover:bg-[#635C48]"
                            onClick={() => handleSort('fdh')}
                          >
                            FDH {getSortIndicator('fdh')}
                          </th>
                          <th 
                            className="px-4 py-3 text-left cursor-pointer hover:bg-[#635C48]"
                            onClick={() => handleSort('fats')}
                          >
                            FAT {getSortIndicator('fats')}
                          </th>
                          <th 
                            className="px-4 py-3 text-left cursor-pointer hover:bg-[#635C48]"
                            onClick={() => handleSort('oltIp')}
                          >
                            OLT IP {getSortIndicator('oltIp')}
                          </th>
                          <th 
                            className="px-4 py-3 text-left cursor-pointer hover:bg-[#635C48]"
                            onClick={() => handleSort('fsps')}
                          >
                            F/S/P {getSortIndicator('fsps')}
                          </th>
                        </>
                      ) : (
                        <>
                          <th 
                            className="px-4 py-3 text-left cursor-pointer hover:bg-[#635C48]"
                            onClick={() => handleSort('domain')}
                          >
                            Domain {getSortIndicator('domain')}
                          </th>
                          <th 
                            className="px-4 py-3 text-left cursor-pointer hover:bg-[#635C48]"
                            onClick={() => handleSort('exchangeName')}
                          >
                            Exchange {getSortIndicator('exchangeName')}
                          </th>
                          <th 
                            className="px-4 py-3 text-left cursor-pointer hover:bg-[#635C48]"
                            onClick={() => handleSort('faultType')}
                          >
                            Fault Type {getSortIndicator('faultType')}
                          </th>
                          <th 
                            className="px-4 py-3 text-left cursor-pointer hover:bg-[#635C48]"
                            onClick={() => handleSort('nodes')}
                          >
                            Nodes {getSortIndicator('nodes')}
                          </th>
                        </>
                      )}
                      <th 
                        className="px-4 py-3 text-left cursor-pointer hover:bg-[#635C48]"
                        onClick={() => handleSort('status')}
                      >
                        Status {getSortIndicator('status')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {faults.map((fault) => (
                      <tr 
                        key={fault.id}
                        className="border-b border-[#D4C9A8] hover:bg-[#FFF8E8] transition-colors"
                      >
                        <td className="px-4 py-3">{fault.incidentNumber || `TICKET-${fault.id.slice(0, 6)}`}</td>
                        <td className="px-4 py-3">{formatDate(fault.timestamp)}</td>
                        {activeTab === 'gpon' ? (
                          <>
                            <td className="px-4 py-3">{fault.exchangeName || '-'}</td>
                            <td className="px-4 py-3">{fault.fdh || '-'}</td>
                            <td className="px-4 py-3">{fault.fats?.[0]?.value || fault.fats?.[0]?.id || '-'}</td>
                            <td className="px-4 py-3">{fault.oltIp || '-'}</td>
                            <td className="px-4 py-3">{fault.fsps?.[0]?.value || fault.fsps?.[0]?.id || '-'}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3">{fault.domain || '-'}</td>
                            <td className="px-4 py-3">{fault.exchangeName || '-'}</td>
                            <td className="px-4 py-3">{fault.faultType || '-'}</td>
                            <td className="px-4 py-3">
                              {(fault.nodes?.nodeA || fault.nodeA) && (fault.nodes?.nodeB || fault.nodeB)
                                ? `${fault.nodes?.nodeA || fault.nodeA} ⟶ ${fault.nodes?.nodeB || fault.nodeB}`
                                : fault.nodes?.nodeA || fault.nodeA || fault.nodes?.nodeB || fault.nodeB || '-'}
                            </td>
                          </>
                        )}
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-sm ${
                            fault.status?.toLowerCase().includes('in progress') 
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {fault.status || 'Unknown'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Export the main component with Suspense boundary
export default function ActiveFaultsPage() {
  return (
    <Suspense fallback={<LoadingFaults />}>
      <ActiveFaultsContent />
    </Suspense>
  );
} 