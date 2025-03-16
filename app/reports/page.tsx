"use client";
import '../styles/globals.css';
import '../styles/reports.css';
import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, query, orderBy, writeBatch, where, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { Timestamp } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import Link from 'next/link';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PieController,
  ArcElement,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Bar, Pie } from 'react-chartjs-2';
import { FaSort, FaSortUp, FaSortDown, FaDownload, FaFilter, FaFileExcel } from 'react-icons/fa';
import FaultAnalytics from '../components/FaultAnalytics';
import NavBar from '../components/NavBar';
import TableHeader from '../components/TableHeader';
import { useTableColumns } from '../hooks/useTableColumns';
import LocationField from '../components/LocationField';
import { Location } from '@/lib/utils/location';
import { Incident } from '../types/incident';
import { isUserAdmin } from '@/app/services/authService';
import { runTransaction, serverTimestamp } from 'firebase/firestore';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PieController,
  ArcElement,
  ChartDataLabels
);

const morningTeamMembers = [
  'A. Rehman Splicer',
  'A. Shahid Splicer',
  'Adnan AM',
  'Adnan Splicer',
  'Akhtar Labor',
  'Faizan Splicer',
  'Ghazi Team Lead',
  'Gulshan Splicer',
  'Hafeez Splicer',
  'Hassan Splicer',
  'Hasnain Splicer',
  'Junaid Splicer',
  'Kaleem Ansari Sb',
  'Kareem Splicer',
  'Owais Team Lead',
  'Rasheed Splicer',
  'S. Alam AM',
  'Safeer Splicer',
  'Sameer Splicer',
  'Usama Splicer',
  'Uzair Splicer',
  'Zain Splicer',
  'Zubair Splicer'
];

const nightTeamMembers = [...morningTeamMembers];

const switchAccessTicketGenerators = [
  'Absheer',
  'Aalay Ahmed',
  'Ali Haider',
  'Akhtar',
  'Asif',
  'Fahad',
  'Kamran',
  'Muneer',
  'Syed Raza',
  'Syed Jaffar',
  'Saad',
  'Sania',
  'Shahzad',
  'Taimoor',
  'Talib'
];

const transportTicketGenerators = [...switchAccessTicketGenerators];

const ticketGenerators = [
  'Absheer', 'Ahmed', 'Akhtar', 'Ali', 'Asif', 'Fahad', 'Jaffar',
  'Kamran', 'Muneer', 'Raza', 'Saad', 'Sania', 'Shahzad', 'Talib', 'Taimoor'
];

// Add this helper function before the ReportsPage component
const formatNodePath = (nodes: any, outageNodes: any) => {
  const nodeArray = [nodes.nodeA, nodes.nodeB];
  if (nodes.nodeC) nodeArray.push(nodes.nodeC);
  if (nodes.nodeD) nodeArray.push(nodes.nodeD);
  
  return nodeArray.map((node, index) => {
    const isOutage = outageNodes?.[`node${String.fromCharCode(65 + index)}`];
    return isOutage ? `${node} (outage)` : node;
  }).join(' → ');
};

// Update the calculateOutageTime function to handle undefined
const calculateOutageTime = (startTime: Timestamp, endTime: Timestamp | undefined | null) => {
  if (!endTime) return '-';
  const start = startTime.toDate();
  const end = endTime.toDate();
  const diffInMs = end.getTime() - start.getTime();
  const hours = Math.floor(diffInMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

const ViewIncidentModal = ({ incident, onClose, onUpdate }: { incident: Incident; onClose: () => void; onUpdate: () => Promise<void> }) => {
  const [editingRemarks, setEditingRemarks] = useState(false);
  const [remarksValue, setRemarksValue] = useState(incident.remarks || '');
  const [updatingRemarks, setUpdatingRemarks] = useState(false);
  const [currentIncident, setCurrentIncident] = useState(incident);
  const [showLocationField, setShowLocationField] = useState(false);

  const handleRemarksUpdate = async () => {
    try {
      setUpdatingRemarks(true);
      const incidentRef = doc(db, 'incidents', currentIncident.id);
      await updateDoc(incidentRef, {
        remarks: remarksValue
      });
      
      // Get the updated incident data
      const updatedDoc = await getDoc(incidentRef);
      if (updatedDoc.exists()) {
        const updatedIncident = { id: updatedDoc.id, ...updatedDoc.data() } as Incident;
        setCurrentIncident(updatedIncident);
      }
      
      setEditingRemarks(false);
    } catch (error) {
      console.error('Error updating remarks:', error);
    } finally {
      setUpdatingRemarks(false);
    }
  };

  const handleLocationUpdate = async (location: Location | null) => {
    try {
      const incidentRef = doc(db, 'incidents', currentIncident.id);
      await updateDoc(incidentRef, {
        location: location || null,
        locationUpdatedAt: new Date().toISOString()
      });
      
      // Get the updated incident data
      const updatedDoc = await getDoc(incidentRef);
      if (updatedDoc.exists()) {
        const updatedIncident = { id: updatedDoc.id, ...updatedDoc.data() } as Incident;
        setCurrentIncident(updatedIncident);
        await onUpdate();
      }
      
      setShowLocationField(false);
    } catch (error) {
      console.error('Error updating location:', error);
      alert('Failed to update location. Please try again.');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Incident Details - {currentIncident.incidentNumber}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="detail-row">
            <strong>Domain:</strong>
            <span>{currentIncident.domain}</span>
          </div>
          <div className="detail-row">
            <strong>Equipment Type:</strong>
            <span>{currentIncident.equipmentType}</span>
          </div>
          <div className="detail-row">
            <strong>Exchange Name:</strong>
            <span>{currentIncident.exchangeName}</span>
          </div>
          <div className="detail-row">
            <strong>Fault Type:</strong>
            <span>{currentIncident.faultType}</span>
          </div>
          <div className="detail-row">
            <strong>Fault Occurrence Time:</strong>
            <span>{currentIncident.timestamp?.toDate().toLocaleString()}</span>
          </div>
          {currentIncident.status === 'Completed' && (
            <div className="detail-row">
              <strong>Fault End Time:</strong>
              <span>{currentIncident.faultEndTime?.toDate().toLocaleString()}</span>
            </div>
          )}
          <div className="detail-row">
            <strong>Nodes:</strong>
            <span>{formatNodePath(currentIncident.nodes, currentIncident.outageNodes)}</span>
          </div>
          <div className="detail-row remarks-section">
              <strong>Remarks:</strong>
            {editingRemarks ? (
              <div className="remarks-edit-container">
                <textarea
                  value={remarksValue}
                  onChange={(e) => setRemarksValue(e.target.value)}
                  className="remarks-textarea"
                  placeholder="Enter remarks..."
                  rows={3}
                />
                <div className="remarks-buttons">
                  <button
                    onClick={handleRemarksUpdate}
                    disabled={updatingRemarks}
                    className="update-btn"
                  >
                    {updatingRemarks ? 'Updating...' : 'Update'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingRemarks(false);
                      setRemarksValue(currentIncident.remarks || '');
                    }}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="remarks-display">
                <span>{currentIncident.remarks || 'No remarks added'}</span>
                <button
                  onClick={() => setEditingRemarks(true)}
                  className="edit-btn"
                >
                  Edit
                </button>
            </div>
          )}
          </div>
          <div className="detail-row">
            <strong>Stakeholders:</strong>
            <span>{currentIncident.stakeholders?.join(', ') || '-'}</span>
          </div>
          <div className="detail-row">
            <strong>Ticket Generator:</strong>
            <span>{currentIncident.ticketGenerator}</span>
          </div>
          <div className="detail-row">
            <strong>Status:</strong>
            <span>{currentIncident.status}</span>
          </div>
          {currentIncident.status === 'Completed' && (
            <div className="detail-row">
              <strong>Closed By:</strong>
              <span>{currentIncident.closedBy || '-'}</span>
            </div>
          )}
          <div className="detail-row location-section">
            <strong>Location:</strong>
            <div className="location-content">
              {showLocationField ? (
                <LocationField
                  initialLocation={currentIncident.location}
                  onUpdate={handleLocationUpdate}
                  onCancel={() => setShowLocationField(false)}
                />
              ) : (
                <div className="location-display">
                  {currentIncident.location ? (
                    <>
                      <span className="location-coordinates">
                        {currentIncident.location.latitude}, {currentIncident.location.longitude}
                      </span>
                      {currentIncident.locationUpdatedAt && (
                        <span className="location-timestamp">
                          Last updated: {new Date(currentIncident.locationUpdatedAt).toLocaleString()}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="no-location">No location set</span>
                  )}
                  <button
                    onClick={() => setShowLocationField(true)}
                    className="location-btn"
                  >
                    {currentIncident.location ? 'Update Location' : 'Add Location'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .remarks-section {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }

        .remarks-edit-container {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
        }

        .remarks-textarea {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          resize: vertical;
          min-height: 80px;
          background-color: white;
        }

        .remarks-buttons {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        .remarks-display {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          width: 100%;
        }

        .update-btn, .cancel-btn, .edit-btn {
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
          border: none;
          transition: background-color 0.2s;
        }

        .update-btn {
          background-color: #4CAF50;
          color: white;
        }

        .update-btn:hover {
          background-color: #45a049;
        }

        .update-btn:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }

        .cancel-btn {
          background-color: #f44336;
          color: white;
        }

        .cancel-btn:hover {
          background-color: #da190b;
        }

        .edit-btn {
          background-color: #2196F3;
          color: white;
          margin-left: 10px;
        }

        .edit-btn:hover {
          background-color: #0b7dda;
        }

        .location-section {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }

        .location-content {
          flex: 1;
        }

        .location-display {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          width: 100%;
        }

        .location-coordinates {
          font-family: monospace;
        }

        .location-timestamp {
          display: block;
          font-size: 0.85em;
          color: #666;
          margin-top: 4px;
        }

        .no-location {
          color: #666;
          font-style: italic;
        }

        .location-btn {
          padding: 6px 12px;
          background-color: #2196F3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }

        .location-btn:hover {
          background-color: #0b7dda;
        }
      `}</style>
    </div>
  );
};

export default function ReportsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState({ key: '', direction: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    domain: '',
    faultType: '',
    status: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedIncidents, setSelectedIncidents] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState('all');
  const [customDateRange, setCustomDateRange] = useState({
    start: '',
    end: ''
  });
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [selectedCloser, setSelectedCloser] = useState<string>('');
  const [statusChangeId, setStatusChangeId] = useState<string | null>(null);
  const [editingFaultEndTime, setEditingFaultEndTime] = useState<string | null>(null);
  const [selectedDateTime, setSelectedDateTime] = useState<string>('');
  const [editingTimestamp, setEditingTimestamp] = useState<string | null>(null);
  const [selectedTimestamp, setSelectedTimestamp] = useState<string>('');
  const { columns, handleColumnResize, getColumnWidth } = useTableColumns('regular');
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [tableTheme, setTableTheme] = useState('theme-modern-blue');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchIncidents();
    const auth = localStorage.getItem('auth');
    if (auth) {
      const authData = JSON.parse(auth);
      setIsAdmin(isUserAdmin(authData));
    }
  }, []);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const incidentsRef = collection(db, 'incidents');
      let q = query(incidentsRef);

      // Apply time range filter
      if (timeRange !== 'all') {
        const now = new Date();
        let startDate = new Date();

        if (timeRange === 'custom' && customDateRange.start && customDateRange.end) {
          startDate = new Date(customDateRange.start);
          now.setTime(new Date(customDateRange.end).getTime());
        } else {
          switch (timeRange) {
            case 'today':
              startDate.setHours(0, 0, 0, 0);
              break;
            case 'week':
              startDate.setDate(now.getDate() - 7);
              break;
            case 'month':
              startDate.setMonth(now.getMonth() - 1);
              break;
          }
        }

        q = query(
          incidentsRef,
          where('timestamp', '>=', startDate),
          where('timestamp', '<=', now)
        );
      }

      const querySnapshot = await getDocs(q);
      
      const fetchedIncidents = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          incidentNumber: data.incidentNumber || '',
          exchangeName: data.exchangeName || '',
          faultType: data.faultType || '',
          equipmentType: data.equipmentType || '',
          domain: data.domain || '',
          nodes: {
            nodeA: data.nodes?.nodeA || '',
            nodeB: data.nodes?.nodeB || '',
            nodeC: data.nodes?.nodeC,
            nodeD: data.nodes?.nodeD,
          },
          outageNodes: data.outageNodes || {
            nodeA: false,
            nodeB: false,
            nodeC: false,
            nodeD: false,
          },
          stakeholders: data.stakeholders || [],
          ticketGenerator: data.ticketGenerator || '',
          timestamp: data.timestamp || Timestamp.now(),
          faultEndTime: data.faultEndTime,
          status: data.status || 'Pending',
          closedBy: data.closedBy,
          remarks: data.remarks,
          location: data.location,
          locationUpdatedAt: data.locationUpdatedAt,
        };
      });

      setIncidents(fetchedIncidents);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching incidents:', error);
      setError('Failed to fetch incidents. Please try again later.');
      setLoading(false);
    }
  };

  const handleSort = (key: string) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedIncidents = () => {
    let sortedData = [...incidents];
    
    // Apply time range filter first
    if (timeRange !== 'all') {
      const now = new Date();
      const startDate = new Date();

      switch (timeRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
      }

      sortedData = sortedData.filter(incident => {
        const incidentDate = incident.timestamp.toDate();
        return incidentDate >= startDate && incidentDate <= now;
      });
    }
    
    // Apply other filters
    if (filters.domain) {
      sortedData = sortedData.filter(incident => incident.domain === filters.domain);
    }
    if (filters.faultType) {
      sortedData = sortedData.filter(incident => incident.faultType === filters.faultType);
    }
    if (filters.status) {
      sortedData = sortedData.filter(incident => {
        const incidentStatus = incident.status?.toLowerCase() || '';
        const filterStatus = filters.status.toLowerCase();
        if (filterStatus === 'in progress') {
          return incidentStatus === 'in progress' || incidentStatus === 'pending' || incidentStatus === 'in-progress';
        }
        return incidentStatus === filterStatus;
      });
    }

    // Enhanced search functionality
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      sortedData = sortedData.filter(incident => {
        // Search in basic fields
        if (
          incident.incidentNumber?.toLowerCase().includes(searchLower) ||
          incident.domain?.toLowerCase().includes(searchLower) ||
          incident.exchangeName?.toLowerCase().includes(searchLower) ||
          incident.faultType?.toLowerCase().includes(searchLower) ||
          incident.equipmentType?.toLowerCase().includes(searchLower) ||
          incident.status?.toLowerCase().includes(searchLower) ||
          incident.closedBy?.toLowerCase().includes(searchLower) ||
          incident.ticketGenerator?.toLowerCase().includes(searchLower)
        ) {
          return true;
        }

        // Search in nodes
        const nodesString = formatNodePath(incident.nodes, incident.outageNodes).toLowerCase();
        if (nodesString.includes(searchLower)) {
          return true;
        }

        // Search in stakeholders
        if (incident.stakeholders?.some(s => s.toLowerCase().includes(searchLower))) {
          return true;
        }

        // Search in dates
        if (incident.timestamp) {
          const startDate = incident.timestamp.toDate().toLocaleString().toLowerCase();
          if (startDate.includes(searchLower)) {
            return true;
          }
        }
        
        if (incident.faultEndTime) {
          const endDate = incident.faultEndTime.toDate().toLocaleString().toLowerCase();
          if (endDate.includes(searchLower)) {
            return true;
          }
        }

        // Search in total outage time
        if (incident.timestamp) {
          const outageTime = calculateOutageTime(incident.timestamp, incident.faultEndTime).toLowerCase();
          if (outageTime.includes(searchLower)) {
            return true;
          }
        }

        return false;
      });
    }

    // Apply sorting
    if (sortConfig.key) {
      sortedData.sort((a, b) => {
        if (sortConfig.key === 'timestamp' || sortConfig.key === 'faultEndTime') {
          const aDate = a[sortConfig.key]?.toDate() || new Date(0);
          const bDate = b[sortConfig.key]?.toDate() || new Date(0);
          return sortConfig.direction === 'asc' 
            ? aDate.getTime() - bDate.getTime()
            : bDate.getTime() - aDate.getTime();
        }

        // Add sorting for total outage time
        if (sortConfig.key === 'totalTime') {
          const getOutageTimeInMinutes = (incident: Incident) => {
            if (!incident.faultEndTime) return 0;
            const start = incident.timestamp.toDate();
            const end = incident.faultEndTime.toDate();
            return (end.getTime() - start.getTime()) / (1000 * 60);
          };

          const aTime = getOutageTimeInMinutes(a);
          const bTime = getOutageTimeInMinutes(b);
          return sortConfig.direction === 'asc' ? aTime - bTime : bTime - aTime;
        }

        const aValue = (a[sortConfig.key as keyof Incident] || '') as string;
        const bValue = (b[sortConfig.key as keyof Incident] || '') as string;

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return sortedData;
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <FaSort />;
    return sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />;
  };

  const exportToExcel = () => {
      const data = getSortedIncidents().map(incident => ({
      'Incident Number': incident.incidentNumber,
      'Exchange Name': incident.exchangeName,
        'Domain': incident.domain,
        'Equipment Type': incident.equipmentType,
      'Fault Type': incident.faultType,
      'Nodes': `${incident.nodes.nodeA} → ${incident.nodes.nodeB}`,
        'Stakeholders': incident.stakeholders?.join(', ') || '-',
        'Ticket Generator': incident.ticketGenerator,
      'Start Time': incident.timestamp.toDate().toLocaleString(),
      'End Time': incident.faultEndTime ? incident.faultEndTime.toDate().toLocaleString() : '-',
      'Status': incident.status,
      'Closed By': incident.closedBy || '-',
      'Remarks': incident.remarks || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Incidents');
    XLSX.writeFile(wb, 'incidents_report.xlsx');
  };

  const getChartData = () => {
    // Get the filtered and sorted incidents that are currently displayed in the table
    const displayedIncidents = getSortedIncidents();
    
    // Count incidents by status
    const statusCounts = displayedIncidents.reduce((acc, incident) => {
      const status = incident.status?.toLowerCase() || '';
      if (status === 'in progress' || status === 'pending' || status === 'in-progress') {
        acc.inProgress = (acc.inProgress || 0) + 1;
      } else if (status === 'completed') {
        acc.completed = (acc.completed || 0) + 1;
      }
      return acc;
    }, { inProgress: 0, completed: 0 });

    return {
      labels: ['In Progress', 'Completed'],
      datasets: [{
        label: 'Fault Status Distribution',
        data: [statusCounts.inProgress, statusCounts.completed],
        backgroundColor: [
          '#ffc107', // Yellow for In Progress
          '#28a745', // Green for Completed
        ],
      }]
    };
  };

  const handleStatusChange = async (newStatus: string, incidentId: string) => {
    try {
      setUpdatingStatus(true);
      const docRef = doc(db, 'incidents', incidentId);

      // If status is "Completed" and no closer is selected, show closer selection
      if (newStatus === 'Completed') {
        setStatusChangeId(incidentId);
        setUpdatingStatus(false);
        return;
      }

      // For "In Progress" or "Pending" status
      const updateData = {
        status: newStatus,
        lastUpdated: new Date()
      };

      await updateDoc(docRef, updateData);
      await fetchIncidents();
      setUpdatingStatus(false);
    } catch (error) {
      console.error('Error updating incident:', error);
      alert('Error updating incident. Please try again.');
      setUpdatingStatus(false);
    }
  };

  const handleCloserSelection = async () => {
    if (!selectedCloser) {
      alert('Please select the person who resolved this incident');
      return;
    }

    try {
      setUpdatingStatus(true);
      const docRef = doc(db, 'incidents', statusChangeId!);
      
      const updateData = {
        status: 'Completed',
        lastUpdated: new Date(),
        faultEndTime: new Date(),
        closedBy: selectedCloser
      };

      await updateDoc(docRef, updateData);
      await fetchIncidents();
      
      // Reset states
      setSelectedCloser('');
      setStatusChangeId(null);
      setUpdatingStatus(false);
    } catch (error) {
      console.error('Error completing incident:', error);
      alert('Error completing incident. Please try again.');
      setUpdatingStatus(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    if (checked) {
      setSelectedIncidents(incidents.map(i => i.id));
    } else {
      setSelectedIncidents([]);
    }
  };

  const handleIncidentSelect = (incidentId: string, checked: boolean) => {
    if (checked) {
      setSelectedIncidents([...selectedIncidents, incidentId]);
    } else {
      setSelectedIncidents(selectedIncidents.filter(id => id !== incidentId));
    }
  };

  const handleFaultEndTimeUpdate = async (incidentId: string) => {
    try {
      const docRef = doc(db, 'incidents', incidentId);
      await updateDoc(docRef, {
        faultEndTime: new Date(selectedDateTime)
      });
      
      setEditingFaultEndTime(null);
      setSelectedDateTime('');
      await fetchIncidents();
    } catch (error) {
      console.error('Error updating fault end time:', error);
      alert('Error updating fault end time. Please try again.');
    }
  };

  const handleCustomRangeConfirm = () => {
    if (customDateRange.start && customDateRange.end) {
      setTimeRange('custom');
      fetchIncidents();
    }
  };

  const handleTimestampUpdate = async (incidentId: string) => {
    try {
      const docRef = doc(db, 'incidents', incidentId);
      await updateDoc(docRef, {
        timestamp: new Date(selectedTimestamp)
      });
      
      setEditingTimestamp(null);
      setSelectedTimestamp('');
      await fetchIncidents();
    } catch (error) {
      console.error('Error updating fault occurred time:', error);
      alert('Error updating fault occurred time. Please try again.');
    }
  };

  const getPaginatedData = () => {
    const sortedData = getSortedIncidents();
    const startIndex = (currentPage - 1) * entriesPerPage;
    return sortedData.slice(startIndex, startIndex + entriesPerPage);
  };

  const totalPages = Math.ceil(getSortedIncidents().length / entriesPerPage);

  // Add delete functionality
  const handleDelete = async (incident: any) => {
    if (!isAdmin) return;

    const confirmDelete = window.confirm(`Are you sure you want to delete Ticket #${incident.incidentNumber} from Reports and its Database entry?`);
    if (!confirmDelete) return;

    try {
      const incidentRef = doc(db, 'incidents', incident.id);
      const counterRef = doc(db, 'counters', 'deletedTickets');
      
      await runTransaction(db, async (transaction) => {
        // Get the current counter value
        const counterDoc = await transaction.get(counterRef);
        const newCount = (counterDoc.exists() ? counterDoc.data().count : 0) + 1;
        
        // Create the deleted ticket entry
        const deletedTicketRef = doc(collection(db, 'deletedTickets'));
        const auth = localStorage.getItem('auth');
        const authData = auth ? JSON.parse(auth) : null;
        
        // Clean up the incident data
        const cleanedIncident = {
          ...incident,
          nodes: {
            nodeA: incident.nodes?.nodeA || '',
            nodeB: incident.nodes?.nodeB || '',
            nodeC: incident.nodes?.nodeC || '',
            nodeD: incident.nodes?.nodeD || ''
          },
          outageNodes: incident.outageNodes || {
            nodeA: false,
            nodeB: false,
            nodeC: false,
            nodeD: false
          },
          stakeholders: incident.stakeholders || [],
          remarks: incident.remarks || '',
          location: incident.location || null,
          locationUpdatedAt: incident.locationUpdatedAt || null,
          closedBy: incident.closedBy || null,
          faultEndTime: incident.faultEndTime || null,
          timestamp: incident.timestamp || serverTimestamp()
        };
        
        transaction.set(deletedTicketRef, {
          deletedTicketId: newCount,
          originalTicketNumber: incident.incidentNumber,
          sourceCollection: 'incidents',
          deletedAt: serverTimestamp(),
          deletedBy: authData?.username || 'Unknown',
          ...cleanedIncident
        });
        
        // Update the counter
        transaction.set(counterRef, { count: newCount }, { merge: true });
        
        // Delete the original incident
        transaction.delete(incidentRef);
      });

      // Update local state
      setIncidents(prev => prev.filter(inc => inc.id !== incident.id));
      
      alert('Ticket deleted successfully');
    } catch (error) {
      console.error('Error deleting ticket:', error);
      alert('Failed to delete ticket. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading incidents...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={fetchIncidents}>Retry</button>
      </div>
    );
  }

  return (
    <>
      <NavBar />
      <div className="reports-container" style={{ paddingTop: '32px' }}>
      <div className="header">
        <div className="title-section">
          <h1>Incident Reports</h1>
          <Link href="/">
            <button style={{
              backgroundColor: '#4d4fb8',
              color: '#ffffff',
              padding: '15px 30px',
              borderRadius: '5px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              marginTop: '10px'
            }}>
              <span className="icon">🏠</span>
              Back to Home
            </button>
          </Link>
        </div>

        <div className="chart-section">
          <div className="mini-chart">
            <Pie 
              data={getChartData()} 
              options={{
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      boxWidth: 12,
                      padding: 8,
                      font: {
                        size: 10
                      }
                    },
                  },
                  title: {
                    display: true,
                    text: 'Fault Status Distribution',
                    font: {
                      size: 12
                    }
                  },
                  datalabels: {
                    display: true,
                    color: '#fff',
                    font: {
                      weight: 'bold',
                      size: 14
                    },
                    formatter: (value) => value
                  }
                },
              }} 
            />
          </div>
        </div>

        <div className="actions">
          <button
            className="action-btn"
            onClick={() => setShowAnalytics(true)}
            style={{
              backgroundColor: '#007bff',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span className="icon">📊</span>Fault Analytics
          </button>
          <button className="action-btn" onClick={() => setShowFilters(!showFilters)}>
            <FaFilter /> Filters
          </button>
          <button className="action-btn" onClick={exportToExcel}>
            <FaDownload /> Export to Excel
          </button>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            marginTop: '10px',
            width: '100%'
          }}>
            <label htmlFor="theme-select" style={{ 
              fontWeight: 700, 
              color: '#000000',
              fontSize: '15px'
            }}>
              Table Theme:
            </label>
            <select
              id="theme-select"
              value={tableTheme}
              onChange={(e) => setTableTheme(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                backgroundColor: 'white',
                color: '#000000',
                cursor: 'pointer',
                fontWeight: 600,
                minWidth: '150px'
              }}
            >
              <option value="theme-modern-blue">Modern Blue</option>
              <option value="theme-pro-gray">Professional Gray</option>
              <option value="theme-corporate-purple">Corporate Purple</option>
              <option value="theme-elegant-dark">Elegant Dark</option>
              <option value="theme-soft-green">Soft Green</option>
              <option value="theme-warm-earth">Warm Earth</option>
              <option value="theme-ocean-blue">Ocean Blue</option>
              <option value="theme-classic-enterprise">Classic Enterprise</option>
            </select>
          </div>
        </div>
      </div>

     

      {showFilters && (
        <div className="filters">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={filters.domain}
            onChange={(e) => setFilters({ ...filters, domain: e.target.value })}
          >
            <option value="">All Domains</option>
            <option value="Switch/Access">Switch/Access</option>
            <option value="Transport/Transmission">Transport/Transmission</option>
          </select>
          <select
            value={filters.faultType}
            onChange={(e) => setFilters({ ...filters, faultType: e.target.value })}
          >
            <option value="">All Fault Types</option>
            <option value="Fiber Break">Fiber Break</option>
            <option value="Outage">Outage</option>
            <option value="Corporate Fault">Corporate Fault</option>
            <option value="MMBB Fault">MMBB Fault</option>
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All Status</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>

          {showCustomRange && (
            <div className="custom-range-controls">
              <div className="datetime-input-container">
                <input
                  type="datetime-local"
                  value={customDateRange.start}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="form-input"
                />
              </div>
              <div className="datetime-input-container">
                <input
                  type="datetime-local"
                  value={customDateRange.end}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="form-input"
                />
              </div>
              <button 
                className="btn btn-primary"
                onClick={handleCustomRangeConfirm}
                disabled={!customDateRange.start || !customDateRange.end}
              >
                Apply Range
              </button>
            </div>
          )}
        </div>
      )}

      <div className={`table-container ${tableTheme}`}>
        <table className={tableTheme}>
          <thead>
            <tr>
                {columns.map((column, index) => (
                  <TableHeader
                    key={column.key}
                    width={getColumnWidth(column.key)}
                    minWidth={column.minWidth}
                    onResize={(width) => handleColumnResize(column.key, index, width)}
                    tableId="regular-reports"
                    columnIndex={index}
                    sortKey={column.sortable ? column.key : undefined}
                    onSort={column.sortable ? () => handleSort(column.key) : undefined}
                    sortDirection={sortConfig.key === column.key ? sortConfig.direction as 'asc' | 'desc' : null}
                  >
                    {column.key === 'selection' ? (
                <input
                  type="checkbox"
                  checked={selectedIncidents.length === incidents.length}
                        onChange={handleSelectAll}
                      />
                    ) : (
                      column.label
                    )}
                  </TableHeader>
                ))}
            </tr>
          </thead>
          <tbody>
            {getPaginatedData().map((incident) => (
              <tr key={incident.id}>
                  {columns.map((column) => (
                    <td 
                      key={column.key}
                      style={{ 
                        width: getColumnWidth(column.key),
                        minWidth: column.minWidth,
                        whiteSpace: ['nodes', 'faultOccurred', 'exchange', 'faultEnd', 'totalTime'].includes(column.key) ? 'normal' : 'nowrap',
                        wordBreak: ['nodes', 'faultOccurred', 'exchange', 'faultEnd', 'totalTime'].includes(column.key) ? 'break-word' : 'normal'
                      }}
                    >
                      {renderCell(incident, column.key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add pagination controls */}
        <div className={`pagination-controls ${tableTheme}`}>
          <div className="pagination-info">
            <span>Show</span>
            <select 
              className="entries-select"
              value={entriesPerPage}
              onChange={(e) => {
                setEntriesPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              {[5,10, 25, 50, 100].map(value => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
            <span>entries</span>
          </div>

          <div className="pagination-info">
            <button
              className="pagination-button"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span className="page-info">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="pagination-button"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>

        {/* Incident Details Modal */}
        {selectedIncident && (
          <ViewIncidentModal
            incident={selectedIncident}
            onClose={() => {
              setSelectedIncident(null);
              fetchIncidents();
            }}
            onUpdate={fetchIncidents}
          />
        )}

        {showAnalytics && (
          <div className="analytics-overlay">
            <div className="analytics-content">
              <div className="analytics-header">
                <h2>Fault Analytics</h2>
                <button 
                  className="close-btn"
                  onClick={() => setShowAnalytics(false)}
                >
                  ×
                </button>
              </div>
              <FaultAnalytics incidents={incidents} />
            </div>
          </div>
        )}
      </div>
    </>
  );

  function renderCell(incident: any, key: string) {
    switch (key) {
      case 'selection':
        return (
                  <input
                    type="checkbox"
                    checked={selectedIncidents.includes(incident.id)}
                    onChange={(e) => handleIncidentSelect(incident.id, e.target.checked)}
                  />
        );
      case 'incidentNumber':
        return incident.incidentNumber;
      case 'timestamp':
        return renderTimestampCell(incident);
      case 'domain':
        return incident.domain;
      case 'exchangeName':
        return incident.exchangeName;
      case 'faultType':
        return incident.faultType;
      case 'equipmentType':
        return incident.equipmentType;
      case 'nodes':
        return `${incident.nodes.nodeA} → ${incident.nodes.nodeB}`;
      case 'faultEndTime':
        return renderFaultEndTimeCell(incident);
      case 'status':
        return renderStatusCell(incident);
      case 'closedBy':
        return incident.closedBy || '-';
      case 'totalTime':
        return calculateTotalTime(incident);
      case 'actions':
        return (
          <div className="flex gap-2 justify-center">
            <button
              className="view-btn"
              onClick={() => setSelectedIncident(incident)}
            >
              View
            </button>
            {isAdmin && (
              <button
                className="delete-btn"
                onClick={() => handleDelete(incident)}
              >
                Delete
              </button>
            )}
          </div>
        );
      default:
        return '';
    }
  }

  function renderTimestampCell(incident: Incident) {
    if (editingTimestamp === incident.id) {
      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px',
          width: '100%'
        }}>
                      <div style={{ position: 'relative', width: '100%' }}>
                        <input
                          type="text"
                          value={selectedTimestamp ? new Date(selectedTimestamp).toLocaleString() : ''}
                          onClick={(e) => {
                            const input = document.createElement('input');
                            input.type = 'datetime-local';
                            input.value = selectedTimestamp;
                            input.style.position = 'absolute';
                            input.style.left = '-9999px';
                            document.body.appendChild(input);
                            input.showPicker();
                            input.addEventListener('change', (e) => {
                              setSelectedTimestamp((e.target as HTMLInputElement).value);
                              document.body.removeChild(input);
                            });
                          }}
                          readOnly
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid #AAB396',
                            width: '100%',
                            cursor: 'pointer',
                            backgroundColor: 'white'
                          }}
                        />
                        <button
                          onClick={(e) => {
                            const input = document.createElement('input');
                            input.type = 'datetime-local';
                            input.value = selectedTimestamp;
                            input.style.position = 'absolute';
                            input.style.left = '-9999px';
                            document.body.appendChild(input);
                            input.showPicker();
                            input.addEventListener('change', (e) => {
                              setSelectedTimestamp((e.target as HTMLInputElement).value);
                              document.body.removeChild(input);
                            });
                          }}
                          style={{
                            position: 'absolute',
                            right: '4px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          📅
                        </button>
                      </div>
          <div style={{ 
            display: 'flex', 
            gap: '4px', 
            width: '100%',
            justifyContent: 'space-between'
          }}>
                        <button
                          onClick={() => handleTimestampUpdate(incident.id)}
                          style={{
                            backgroundColor: '#28a745',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: 'none',
                            cursor: 'pointer',
                fontSize: '12px',
                width: '48%'
                          }}
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => {
                            setEditingTimestamp(null);
                            setSelectedTimestamp('');
                          }}
                          style={{
                            backgroundColor: '#dc3545',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: 'none',
                            cursor: 'pointer',
                fontSize: '12px',
                width: '48%'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
      );
    } else {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span>{incident.timestamp?.toDate().toLocaleString()}</span>
                      <button
                        onClick={() => {
                          setEditingTimestamp(incident.id);
                          setSelectedTimestamp(
                            incident.timestamp 
                              ? new Date(incident.timestamp.toDate()).toISOString().slice(0, 16)
                              : new Date().toISOString().slice(0, 16)
                          );
                        }}
                        style={{
                          backgroundColor: '#6c757d',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <span>✏️</span>
                        Edit
                      </button>
                    </div>
      );
    }
  }

  function renderFaultEndTimeCell(incident: Incident) {
    if (editingFaultEndTime === incident.id) {
      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px',
          width: '100%'
        }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type="text"
              value={selectedDateTime ? new Date(selectedDateTime).toLocaleString() : ''}
              onClick={(e) => {
                const input = document.createElement('input');
                input.type = 'datetime-local';
                input.value = selectedDateTime;
                input.style.position = 'absolute';
                input.style.left = '-9999px';
                document.body.appendChild(input);
                input.showPicker();
                input.addEventListener('change', (e) => {
                  setSelectedDateTime((e.target as HTMLInputElement).value);
                  document.body.removeChild(input);
                });
              }}
              readOnly
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid #AAB396',
                width: '100%',
                cursor: 'pointer',
                backgroundColor: 'white'
              }}
            />
            <button
              onClick={(e) => {
                const input = document.createElement('input');
                input.type = 'datetime-local';
                input.value = selectedDateTime;
                input.style.position = 'absolute';
                input.style.left = '-9999px';
                document.body.appendChild(input);
                input.showPicker();
                input.addEventListener('change', (e) => {
                  setSelectedDateTime((e.target as HTMLInputElement).value);
                  document.body.removeChild(input);
                });
              }}
              style={{
                position: 'absolute',
                right: '4px',
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              📅
            </button>
          </div>
          <div style={{ 
            display: 'flex', 
            gap: '4px', 
            width: '100%',
            justifyContent: 'space-between'
          }}>
            <button
              onClick={() => handleFaultEndTimeUpdate(incident.id)}
              style={{
                backgroundColor: '#28a745',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                width: '48%'
              }}
            >
              Confirm
            </button>
            <button
              onClick={() => {
                setEditingFaultEndTime(null);
                setSelectedDateTime('');
              }}
              style={{
                backgroundColor: '#dc3545',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                width: '48%'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span>{incident.faultEndTime?.toDate().toLocaleString() || '-'}</span>
        {incident.status === 'Completed' && (
          <button
            onClick={() => {
              setEditingFaultEndTime(incident.id);
              setSelectedDateTime(
                incident.faultEndTime 
                  ? new Date(incident.faultEndTime.toDate()).toISOString().slice(0, 16)
                  : new Date().toISOString().slice(0, 16)
              );
            }}
            style={{
              backgroundColor: '#6c757d',
              color: 'white',
              padding: '2px 8px',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>✏️</span>
            Edit
          </button>
        )}
      </div>
    );
  }

  function renderStatusCell(incident: Incident) {
    if (statusChangeId === incident.id) {
      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px', 
          width: '100%'
        }}>
                      <select
                        value={selectedCloser}
                        onChange={(e) => setSelectedCloser(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #D4C9A8',
              backgroundColor: 'white'
            }}
                      >
                        <option value="">Select Ticket Closer</option>
                        {incident.domain === 'Switch/Access' && switchAccessTicketGenerators.map((person) => (
                          <option key={person} value={person}>{person}</option>
                        ))}
                        {incident.domain === 'Transport/Transmission' && transportTicketGenerators.map((person) => (
                          <option key={person} value={person}>{person}</option>
                        ))}
                      </select>
          <div style={{ 
            display: 'flex', 
            gap: '4px', 
            width: '100%',
            justifyContent: 'space-between'
          }}>
                      <button 
                        onClick={handleCloserSelection}
                        disabled={!selectedCloser}
                        style={{
                          backgroundColor: selectedCloser ? '#28a745' : '#6c757d',
                          color: 'white',
                          padding: '4px 8px',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: selectedCloser ? 'pointer' : 'not-allowed',
                fontSize: '12px',
                width: '48%'
                        }}
                      >
                        Confirm
                      </button>
            <button
              onClick={() => {
                setStatusChangeId(null);
                setSelectedCloser('');
              }}
              style={{
                backgroundColor: '#dc3545',
                color: 'white',
                padding: '4px 8px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                width: '48%'
              }}
            >
              Cancel
            </button>
                    </div>
        </div>
      );
    } else {
      return (
                  <select
                      value={incident.status}
                      onChange={(e) => handleStatusChange(e.target.value, incident.id)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #D4C9A8',
                        backgroundColor: 'white'
                      }}
                  >
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                  </select>
      );
    }
  }

  function calculateTotalTime(incident: Incident) {
    return calculateOutageTime(incident.timestamp, incident.faultEndTime);
  }
}