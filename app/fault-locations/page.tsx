"use client";
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { Incident } from '../types/incident';
import dynamic from 'next/dynamic';
import NavBar from '../components/NavBar';
import Link from 'next/link';

// Dynamically import the map component to avoid SSR issues
const IncidentMap = dynamic(() => import('../components/IncidentMap'), {
  ssr: false,
  loading: () => <div className="h-[600px] w-full bg-gray-100 animate-pulse" />
});

type IncidentType = 'gpon' | 'switch';

export default function FaultLocationsPage() {
  const [incidentType, setIncidentType] = useState<IncidentType | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncidents, setSelectedIncidents] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null
  });

  // Fetch incidents based on type and filters
  const fetchIncidents = async () => {
    if (!incidentType) return;

    setLoading(true);
    try {
      const incidentsRef = collection(db, incidentType === 'gpon' ? 'gpon_incidents' : 'incidents');
      let q = query(
        incidentsRef,
        where('status', '==', 'completed'),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const fetchedIncidents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Incident[];

      // Apply date filter if set
      const filteredIncidents = fetchedIncidents.filter(incident => {
        if (!dateRange.start && !dateRange.end) return true;
        
        const incidentDate = incident.timestamp?.toDate?.() || new Date(incident.timestamp);
        
        if (dateRange.start && dateRange.end) {
          return incidentDate >= dateRange.start && incidentDate <= dateRange.end;
        }
        
        if (dateRange.start) {
          return incidentDate >= dateRange.start;
        }
        
        if (dateRange.end) {
          return incidentDate <= dateRange.end;
        }

        return true;
      });

      setIncidents(filteredIncidents);
    } catch (error) {
      console.error('Error fetching incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (incidentType) {
      fetchIncidents();
    }
  }, [incidentType, dateRange]);

  const handleIncidentSelect = (id: string) => {
    setSelectedIncidents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else if (newSet.size < 30) {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedIncidents.size === incidents.length) {
      setSelectedIncidents(new Set());
    } else {
      const newSelection = new Set(
        incidents.slice(0, 30).map(incident => incident.id)
      );
      setSelectedIncidents(newSelection);
    }
  };

  const handlePlot = () => {
    setShowMap(true);
  };

  const handleCancel = () => {
    setShowMap(false);
    setSelectedIncidents(new Set());
  };

  return (
    <>
      <NavBar />
      <div className="container mx-auto px-4 py-8" style={{ paddingTop: '60px' }}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Fault Locations</h1>
          <Link href="/">
            <button className="btn btn-primary">Back to Home</button>
          </Link>
        </div>

        {/* Incident Type Selection */}
        <div className="flex gap-4 mb-6">
          <button
            className={`btn ${incidentType === 'gpon' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setIncidentType('gpon')}
          >
            GPON Faults
          </button>
          <button
            className={`btn ${incidentType === 'switch' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setIncidentType('switch')}
          >
            Switch/Metro Faults
          </button>
        </div>

        {/* Date Range Filter */}
        <div className="flex gap-4 mb-6">
          <input
            type="date"
            className="form-input"
            onChange={(e) => setDateRange(prev => ({
              ...prev,
              start: e.target.value ? new Date(e.target.value) : null
            }))}
          />
          <input
            type="date"
            className="form-input"
            onChange={(e) => setDateRange(prev => ({
              ...prev,
              end: e.target.value ? new Date(e.target.value) : null
            }))}
          />
          <button
            className="btn btn-secondary"
            onClick={() => setDateRange({ start: null, end: null })}
          >
            Clear Dates
          </button>
        </div>

        {/* Incidents Table */}
        {loading ? (
          <div>Loading...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr>
                    <th className="px-4 py-2">Select</th>
                    <th className="px-4 py-2">Incident #</th>
                    <th className="px-4 py-2">Exchange</th>
                    <th className="px-4 py-2">Type</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map(incident => (
                    <tr key={incident.id}>
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIncidents.has(incident.id)}
                          onChange={() => handleIncidentSelect(incident.id)}
                          disabled={!selectedIncidents.has(incident.id) && selectedIncidents.size >= 30}
                        />
                      </td>
                      <td className="px-4 py-2">{incident.incidentNumber}</td>
                      <td className="px-4 py-2">{incident.exchangeName}</td>
                      <td className="px-4 py-2">{incident.faultType}</td>
                      <td className="px-4 py-2">{incident.status}</td>
                      <td className="px-4 py-2">
                        {incident.timestamp?.toDate?.()?.toLocaleDateString() ||
                          new Date(incident.timestamp).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex gap-4">
              <button className="btn btn-secondary" onClick={handleSelectAll}>
                {selectedIncidents.size === incidents.length ? 'Deselect All' : 'Select All'}
              </button>
              <button
                className="btn btn-primary"
                onClick={handlePlot}
                disabled={selectedIncidents.size === 0}
              >
                Plot Selected ({selectedIncidents.size})
              </button>
              {showMap && (
                <button className="btn btn-danger" onClick={handleCancel}>
                  Clear Map
                </button>
              )}
            </div>
          </>
        )}

        {/* Map Section */}
        {showMap && (
          <div className="mt-6">
            <IncidentMap
              incidents={incidents.filter(incident => selectedIncidents.has(incident.id))}
            />
          </div>
        )}
      </div>
    </>
  );
} 