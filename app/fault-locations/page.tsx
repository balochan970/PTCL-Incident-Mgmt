"use client";
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import NavBar from '../components/NavBar';
import { Location, DEFAULT_CENTER } from '@/lib/utils/location';
import { exchanges } from '@/lib/utils/exchanges';
import '../styles/globals.css';

// Dynamically import the Map component to avoid SSR issues with Leaflet
const Map = dynamic(() => import('../components/Map'), {
  ssr: false,
  loading: () => <div className="h-[500px] bg-gray-100 animate-pulse rounded-lg"></div>
});

interface Incident {
  id: string;
  incidentNumber: string;
  exchangeName: string;
  faultType: string;
  status: string;
  timestamp: Timestamp;
  location?: Location;
  [key: string]: any;
}

export default function FaultLocationsPage() {
  const [incidentType, setIncidentType] = useState<'gpon' | 'switch' | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncidents, setSelectedIncidents] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterExchange, setFilterExchange] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (incidentType) {
      fetchIncidents();
    }
  }, [incidentType, startDate, endDate, filterExchange]);

  // Clear selections when changing incident type
  useEffect(() => {
    setSelectedIncidents(new Set());
    setShowMap(false);
  }, [incidentType]);

  const handleIncidentTypeChange = (type: 'gpon' | 'switch') => {
    setIncidentType(type);
    setSelectedIncidents(new Set());
    setShowMap(false);
  };

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const collectionName = incidentType === 'gpon' ? 'gponIncidents' : 'incidents';
      console.log('Fetching from collection:', collectionName);
      
      let q = query(
        collection(db, collectionName),
        where('status', '==', 'Completed')
      );

      if (startDate && endDate) {
        const startTimestamp = Timestamp.fromDate(new Date(startDate));
        const endTimestamp = Timestamp.fromDate(new Date(endDate));
        q = query(q, 
          where('timestamp', '>=', startTimestamp),
          where('timestamp', '<=', endTimestamp)
        );
      }

      if (filterExchange !== 'all') {
        q = query(q, where('exchangeName', '==', filterExchange));
      }

      console.log('Executing query with filters:', {
        startDate,
        endDate,
        filterExchange,
        incidentType
      });

      const querySnapshot = await getDocs(q);
      const fetchedIncidents: Incident[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Found incident:', doc.id, data.incidentNumber, data.location);
        fetchedIncidents.push({ id: doc.id, ...data } as Incident);
      });

      console.log('Total incidents fetched:', fetchedIncidents.length);
      setIncidents(fetchedIncidents);
    } catch (error) {
      console.error('Error fetching incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedIncidents.size === incidents.length) {
      setSelectedIncidents(new Set());
    } else {
      setSelectedIncidents(new Set(incidents.map(incident => incident.id)));
    }
  };

  const handleIncidentSelect = (id: string) => {
    const newSelected = new Set(selectedIncidents);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      if (newSelected.size >= 30) {
        alert('Maximum 30 incidents can be plotted at once');
        return;
      }
      newSelected.add(id);
    }
    setSelectedIncidents(newSelected);
  };

  const selectedIncidentsData = incidents.filter(incident => 
    selectedIncidents.has(incident.id) && incident.location
  );

  // Filter incidents based on search query
  const filteredIncidents = incidents.filter(incident => {
    const searchLower = searchQuery.toLowerCase();
    return (
      incident.incidentNumber.toLowerCase().includes(searchLower) ||
      incident.exchangeName.toLowerCase().includes(searchLower) ||
      incident.faultType?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <>
      <NavBar />
      <div className="min-h-screen bg-[#0f172a] py-8">
        <div className="container mx-auto px-4 mt-12">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Fault Locations
                </h1>
                <p className="text-gray-600 mt-1">View and plot incident locations on the map</p>
              </div>
              <Link href="/">
                <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg">
                  Back to Home
                </button>
              </Link>
            </div>

            {/* Incident Type Selection */}
            <div className="flex flex-wrap gap-4 mb-6">
              <button
                onClick={() => handleIncidentTypeChange('gpon')}
                className={`px-6 py-2.5 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg ${
                  incidentType === 'gpon'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                GPON Faults
              </button>
              <button
                onClick={() => handleIncidentTypeChange('switch')}
                className={`px-6 py-2.5 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg ${
                  incidentType === 'switch'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                Switch/Metro Faults
              </button>
            </div>

            {incidentType && (
              <>
                {/* Search and Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {/* Search Bar */}
                  <div className="md:col-span-2">
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search incidents by number, exchange, or type..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        🔍
                      </span>
                    </div>
                  </div>

                  {/* Date Range */}
                  <div>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      placeholder="Start Date"
                    />
                  </div>
                  <div>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      placeholder="End Date"
                    />
                  </div>

                  {/* Exchange Filter */}
                  <div className="md:col-span-2">
                    <select
                      value={filterExchange}
                      onChange={(e) => setFilterExchange(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    >
                      <option value="all">All Exchanges</option>
                      {exchanges.map(exchange => (
                        <option key={exchange} value={exchange}>
                          {exchange}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Incidents Table */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-md mb-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <input
                              type="checkbox"
                              checked={selectedIncidents.size === filteredIncidents.length}
                              onChange={handleSelectAll}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Incident ID
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Exchange
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fault Type
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Location
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredIncidents.map((incident) => (
                          <tr key={incident.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedIncidents.has(incident.id)}
                                onChange={() => handleIncidentSelect(incident.id)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                              {incident.incidentNumber}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                              {incident.exchangeName}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                              {incident.faultType}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                              {incident.timestamp.toDate().toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {incident.location ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  📍 Available
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  ❌ Not Set
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Table Controls */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleSelectAll}
                      className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all shadow-sm"
                    >
                      {selectedIncidents.size === filteredIncidents.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-lg">
                      {selectedIncidents.size} selected
                    </span>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setShowMap(true)}
                      disabled={selectedIncidents.size === 0}
                      className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Plot Selected
                    </button>
                    <button
                      onClick={() => {
                        setSelectedIncidents(new Set());
                        setShowMap(false);
                      }}
                      className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-md hover:shadow-lg"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Map */}
                {showMap && selectedIncidentsData.length > 0 && (
                  <div className="rounded-lg overflow-hidden shadow-xl border-4 border-white">
                    <Map
                      incidents={selectedIncidentsData}
                      center={DEFAULT_CENTER}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
} 