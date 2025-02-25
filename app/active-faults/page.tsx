"use client";
import { useState, useEffect, Suspense } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import NavBar from '../components/NavBar';
import ClientWrapper from '../components/ClientWrapper';

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

// Client component that uses useSearchParams
function ActiveFaultsContent() {
  const [activeTab, setActiveTab] = useState<'gpon' | 'switch'>('gpon');
  const [faults, setFaults] = useState<Fault[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
                      <th className="px-4 py-3 text-left">Ticket #</th>
                      <th className="px-4 py-3 text-left">Fault Occurred</th>
                      {activeTab === 'gpon' ? (
                        <>
                          <th className="px-4 py-3 text-left">Exchange</th>
                          <th className="px-4 py-3 text-left">FDH</th>
                          <th className="px-4 py-3 text-left">FAT</th>
                          <th className="px-4 py-3 text-left">OLT IP</th>
                          <th className="px-4 py-3 text-left">F/S/P</th>
                        </>
                      ) : (
                        <>
                          <th className="px-4 py-3 text-left">Domain</th>
                          <th className="px-4 py-3 text-left">Exchange</th>
                          <th className="px-4 py-3 text-left">Fault Type</th>
                          <th className="px-4 py-3 text-left">Nodes</th>
                        </>
                      )}
                      <th className="px-4 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {faults.map((fault) => (
                      <tr 
                        key={fault.id}
                        className="border-b border-[#D4C9A8] hover:bg-[#FFF8E8] transition-colors"
                      >
                        <td className="px-4 py-3">
                          <Link href={`/single-fault?id=${fault.id}&type=${activeTab === 'gpon' ? 'gpon' : 'switch'}`} className="text-blue-600 hover:underline">
                            {fault.incidentNumber || 'N/A'}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{formatDate(fault.timestamp)}</td>
                        {activeTab === 'gpon' ? (
                          <>
                            <td className="px-4 py-3">{fault.exchangeName || 'N/A'}</td>
                            <td className="px-4 py-3">{fault.fdh || 'N/A'}</td>
                            <td className="px-4 py-3">
                              {fault.fats && fault.fats.length > 0
                                ? fault.fats.map(fat => fat.value).join(', ')
                                : 'N/A'}
                            </td>
                            <td className="px-4 py-3">{fault.oltIp || 'N/A'}</td>
                            <td className="px-4 py-3">
                              {fault.fsps && fault.fsps.length > 0
                                ? fault.fsps.map(fsp => fsp.value).join(', ')
                                : 'N/A'}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3">{fault.domain || 'N/A'}</td>
                            <td className="px-4 py-3">{fault.exchangeName || 'N/A'}</td>
                            <td className="px-4 py-3">{fault.faultType || 'N/A'}</td>
                            <td className="px-4 py-3">
                              {fault.nodeA && fault.nodeB
                                ? `${fault.nodeA} - ${fault.nodeB}`
                                : 'N/A'}
                            </td>
                          </>
                        )}
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                            {fault.status}
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

// Main export with ClientWrapper
export default function ActiveFaultsPage() {
  return (
    <ClientWrapper fallback={<LoadingFaults />}>
      <ActiveFaultsContent />
    </ClientWrapper>
  );
} 