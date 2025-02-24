"use client";
import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, Timestamp, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import Link from 'next/link';
import '../styles/reports.css';
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
import { Bar, Pie } from 'react-chartjs-2';
import { FaSort, FaSortUp, FaSortDown, FaDownload, FaFilter } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import FaultAnalytics from '../components/FaultAnalytics';
import GPONFaultAnalytics from '../components/GPONFaultAnalytics';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import NavBar from '../components/NavBar';
import TableHeader from '../components/TableHeader';
import { useTableColumns } from '../hooks/useTableColumns';

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

interface GPONIncident {
  id: string;
  incidentNumber: string;
  exchangeName: string;
  fdh: string;
  fats: { id: string; value: string }[];
  oltIp: string;
  fsps: { id: string; value: string }[];
  isOutage: boolean;
  stakeholders: string[];
  ticketGenerator: string;
  timestamp: Timestamp;
  faultEndTime?: Timestamp;
  status: string;
  closedBy?: string;
  remarks?: string;
  equipmentType?: string;
  domain?: string;
  faultType?: string;
  totalTime?: number;
}

interface SortConfig {
  key: keyof GPONIncident | 'totalTime' | '';
  direction: 'asc' | 'desc';
}

interface ColumnKey {
  selection: never;
  incidentNumber: keyof GPONIncident;
  timestamp: keyof GPONIncident;
  exchangeName: keyof GPONIncident;
  fdh: keyof GPONIncident;
  fats: keyof GPONIncident;
  oltIp: keyof GPONIncident;
  fsps: keyof GPONIncident;
  faultEndTime: keyof GPONIncident;
  status: keyof GPONIncident;
  closedBy: keyof GPONIncident;
  totalTime: 'totalTime';
  actions: never;
}

const columnKeyToIncidentKey: { [K in keyof ColumnKey]: K extends never ? never : keyof GPONIncident | 'totalTime' } = {
  selection: 'id' as never,
  incidentNumber: 'incidentNumber',
  timestamp: 'timestamp',
  exchangeName: 'exchangeName',
  fdh: 'fdh',
  fats: 'fats',
  oltIp: 'oltIp',
  fsps: 'fsps',
  faultEndTime: 'faultEndTime',
  status: 'status',
  closedBy: 'closedBy',
  totalTime: 'totalTime',
  actions: 'id' as never
};

const ViewIncidentModal = ({ incident, onClose }: { incident: GPONIncident; onClose: () => void }) => {
  const [editingRemarks, setEditingRemarks] = useState(false);
  const [remarksValue, setRemarksValue] = useState(incident.remarks || '');
  const [updatingRemarks, setUpdatingRemarks] = useState(false);
  const [currentIncident, setCurrentIncident] = useState(incident);

  const handleRemarksUpdate = async () => {
    try {
      setUpdatingRemarks(true);
      const incidentRef = doc(db, 'gponIncidents', currentIncident.id);
      await updateDoc(incidentRef, {
        remarks: remarksValue
      });
      
      // Get the updated incident data
      const updatedDoc = await getDoc(incidentRef);
      if (updatedDoc.exists()) {
        const updatedIncident = { id: updatedDoc.id, ...updatedDoc.data() } as GPONIncident;
        setCurrentIncident(updatedIncident);
      }
      
      setEditingRemarks(false);
    } catch (error) {
      console.error('Error updating remarks:', error);
    } finally {
      setUpdatingRemarks(false);
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
            <span>{currentIncident.domain || 'Switch/Access'}</span>
          </div>
          <div className="detail-row">
            <strong>Equipment Type:</strong>
            <span>{currentIncident.equipmentType || '-'}</span>
          </div>
          <div className="detail-row">
            <strong>Exchange:</strong>
            <span>{currentIncident.exchangeName}</span>
          </div>
          <div className="detail-row">
            <strong>OLT IP:</strong>
            <span>{currentIncident.oltIp}</span>
          </div>
          <div className="detail-row">
            <strong>FDH:</strong>
            <span>{currentIncident.fdh}</span>
          </div>
          <div className="detail-row">
            <strong>FATs:</strong>
            <span>{currentIncident.fats.map(fat => fat.value).join(', ')}</span>
          </div>
          <div className="detail-row">
            <strong>F/S/P:</strong>
            <span>{currentIncident.fsps.map(fsp => fsp.value).join(', ')}</span>
          </div>
          <div className="detail-row">
            <strong>Fault Occurred:</strong>
            <span>{currentIncident.timestamp.toDate().toLocaleString()}</span>
          </div>
          {currentIncident.status === 'Completed' && currentIncident.faultEndTime && (
            <div className="detail-row">
              <strong>Fault End Time:</strong>
              <span>{currentIncident.faultEndTime.toDate().toLocaleString()}</span>
            </div>
          )}
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
            <span>{currentIncident.stakeholders.join(', ')}</span>
          </div>
          <div className="detail-row">
            <strong>Ticket Generator:</strong>
            <span>{currentIncident.ticketGenerator}</span>
          </div>
          <div className="detail-row">
            <strong>Status:</strong>
            <span className={`status-badge ${currentIncident.status.toLowerCase()}`}>
              {currentIncident.status}
            </span>
          </div>
          {currentIncident.closedBy && (
            <div className="detail-row">
              <strong>Closed By:</strong>
              <span>{currentIncident.closedBy}</span>
            </div>
          )}
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
      `}</style>
    </div>
  );
};

export default function GPONReportsPage() {
  const [incidents, setIncidents] = useState<GPONIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: 'asc' });
  const [selectedIncidents, setSelectedIncidents] = useState<string[]>([]);
  const [selectedCloser, setSelectedCloser] = useState('');
  const [showCloserSelection, setShowCloserSelection] = useState(false);
  const [allIncidents, setAllIncidents] = useState<GPONIncident[]>([]); // Store all incidents for client-side filtering
  const [editingTimestamp, setEditingTimestamp] = useState<string | null>(null);
  const [selectedTimestamp, setSelectedTimestamp] = useState<string>('');

  // New state variables
  const [error, setError] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({
    start: '',
    end: ''
  });
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<GPONIncident | null>(null);
  const [editingFaultEndTime, setEditingFaultEndTime] = useState<string | null>(null);
  const [selectedDateTime, setSelectedDateTime] = useState<string>('');
  const [filters, setFilters] = useState({
    domain: '',
    faultType: '',
    equipmentType: '',
  });

  // Add these state variables at the beginning of the component
  const [fdhFilter, setFdhFilter] = useState<string>('');
  const [fatFilter, setFatFilter] = useState<string>('');
  const [uniqueFdhs, setUniqueFdhs] = useState<string[]>([]);
  const [uniqueFats, setUniqueFats] = useState<string[]>([]);

  const closerOptions = [
    'Ahmed', 'Akhtar', 'Ali', 'Asif', 'Fahad', 'Jaffar',
    'Kamran', 'Muneer', 'Raza', 'Saad', 'Sania', 'Shahzad', 'Talib', 'Taimoor'
  ];

  const [showViewModal, setShowViewModal] = useState(false);
  const [statusChangeId, setStatusChangeId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const { columns, handleColumnResize, getColumnWidth } = useTableColumns('gpon');

  useEffect(() => {
    fetchIncidents();
  }, [timeRange, statusFilter]);

  // Apply client-side filters
  useEffect(() => {
    if (allIncidents.length > 0) {
      let filtered = [...allIncidents];

      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filtered = filtered.filter(incident => 
          incident.incidentNumber.toLowerCase().includes(searchLower) ||
          incident.exchangeName.toLowerCase().includes(searchLower) ||
          incident.oltIp.toLowerCase().includes(searchLower) ||
          incident.fats.some(fat => fat.value.toLowerCase().includes(searchLower)) ||
          incident.fsps.some(fsp => fsp.value.toLowerCase().includes(searchLower))
        );
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        filtered = filtered.filter(incident => {
          const incidentStatus = incident.status?.toLowerCase() || '';
          const filterStatus = statusFilter.toLowerCase();
          if (filterStatus === 'in progress') {
            return incidentStatus === 'in progress' || incidentStatus === 'pending' || incidentStatus === 'in-progress';
          }
          return incidentStatus === filterStatus;
        });
      }

      // Apply FDH filter
      if (fdhFilter) {
        filtered = filtered.filter(incident => incident.fdh === fdhFilter);
      }

      // Apply FAT filter
      if (fatFilter) {
        filtered = filtered.filter(incident => 
          incident.fats.some(fat => fat.value === fatFilter)
        );
      }

      setIncidents(filtered);
    }
  }, [searchTerm, allIncidents, statusFilter, fdhFilter, fatFilter]);

  // Add this function to get unique FDHs and FATs
  const updateUniqueFilters = (incidents: GPONIncident[]) => {
    const fdhs = new Set<string>();
    const fats = new Set<string>();

    incidents.forEach(incident => {
      if (incident.fdh) {
        fdhs.add(incident.fdh);
      }
      incident.fats.forEach(fat => {
        if (fat.value) {
          fats.add(fat.value);
        }
      });
    });

    setUniqueFdhs(Array.from(fdhs).sort());
    setUniqueFats(Array.from(fats).sort());
  };

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      setError(null);
      const incidentsRef = collection(db, 'gponIncidents');
      
      let queryConstraints: any[] = [];

      // Time range filter
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
            case 'year':
              startDate.setFullYear(now.getFullYear() - 1);
              break;
          }
        }

        queryConstraints.push(
          where('timestamp', '>=', Timestamp.fromDate(startDate)),
          where('timestamp', '<=', Timestamp.fromDate(now))
        );
      }

      // Domain filter
      if (filters.domain) {
        queryConstraints.push(where('domain', '==', filters.domain));
      }

      // Equipment type filter
      if (filters.equipmentType) {
        queryConstraints.push(where('equipmentType', '==', filters.equipmentType));
      }

      // Fault type filter
      if (filters.faultType) {
        queryConstraints.push(where('faultType', '==', filters.faultType));
      }

      // Always add the orderBy constraint last
      queryConstraints.push(orderBy('timestamp', 'desc'));

      const q = query(incidentsRef, ...queryConstraints);
      const snapshot = await getDocs(q);
      
      const fetchedIncidents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GPONIncident[];

      setAllIncidents(fetchedIncidents);
      setIncidents(fetchedIncidents);
      updateUniqueFilters(fetchedIncidents);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching incidents:', error);
      setError('Failed to fetch incidents. Please try again later.');
      setLoading(false);
    }
  };

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value);
    fetchIncidents();
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setSearchTerm(''); // Reset search when changing status
  };

  const handleSort = (key: keyof ColumnKey) => {
    if (!columnKeyToIncidentKey[key] || key === 'selection' || key === 'actions') return;

    const incidentKey = columnKeyToIncidentKey[key];
    if (incidentKey === 'id') return;

    setSortConfig(prevConfig => ({
      key: incidentKey,
      direction: prevConfig.key === incidentKey && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key: keyof ColumnKey) => {
    const incidentKey = columnKeyToIncidentKey[key];
    if (!incidentKey || incidentKey === 'id') return <FaSort />;
    if (sortConfig.key !== incidentKey) return <FaSort />;
    return sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />;
  };

  const getSortedIncidents = () => {
    let sortedData = [...incidents];

    // Apply sorting
    if (sortConfig.key !== '') {
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
          const getOutageTimeInMinutes = (incident: GPONIncident) => {
            if (!incident.faultEndTime) return 0;
            const start = incident.timestamp.toDate();
            const end = incident.faultEndTime.toDate();
            return (end.getTime() - start.getTime()) / (1000 * 60);
          };

          const aTime = getOutageTimeInMinutes(a);
          const bTime = getOutageTimeInMinutes(b);
          return sortConfig.direction === 'asc' ? aTime - bTime : bTime - aTime;
        }

        // Handle special cases for array fields
        if (sortConfig.key === 'fats') {
          const aFats = a.fats.map(fat => fat.value).join(', ');
          const bFats = b.fats.map(fat => fat.value).join(', ');
          return sortConfig.direction === 'asc'
            ? aFats.localeCompare(bFats)
            : bFats.localeCompare(aFats);
        }

        if (sortConfig.key === 'fsps') {
          const aFsps = a.fsps.map(fsp => fsp.value).join(', ');
          const bFsps = b.fsps.map(fsp => fsp.value).join(', ');
          return sortConfig.direction === 'asc'
            ? aFsps.localeCompare(bFsps)
            : bFsps.localeCompare(aFsps);
        }

        // Handle regular string fields
        const aValue = String(a[sortConfig.key as keyof GPONIncident] || '');
        const bValue = String(b[sortConfig.key as keyof GPONIncident] || '');
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      });
    }

    return sortedData;
  };

  const handleStatusChange = async (newStatus: string, incidentId: string) => {
    try {
      setUpdatingStatus(true);
      const docRef = doc(db, 'gponIncidents', incidentId);

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
      const docRef = doc(db, 'gponIncidents', statusChangeId!);
      
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
    if (e.target.checked) {
      setSelectedIncidents(incidents.map(incident => incident.id));
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

  const calculateOutageTime = (startTime: Timestamp, endTime: Timestamp | undefined) => {
    if (!endTime) return 'Ongoing';
    
    const diffInMinutes = (endTime.seconds - startTime.seconds) / 60;
    const hours = Math.floor(diffInMinutes / 60);
    const minutes = Math.floor(diffInMinutes % 60);
    
    return `${hours}h ${minutes}m`;
  };

  const handleTimestampUpdate = async (incidentId: string) => {
    try {
      const docRef = doc(db, 'gponIncidents', incidentId);
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

  const exportToExcel = () => {
      const data = getSortedIncidents().map(incident => ({
      'Incident Number': incident.incidentNumber,
      'Exchange Name': incident.exchangeName,
      'Domain': incident.domain || '-',
      'Equipment Type': incident.equipmentType || '-',
      'Fault Type': incident.faultType || '-',
        'FDH': incident.fdh,
        'FATs': incident.fats.map(fat => fat.value).join(', '),
      'OLT IP': incident.oltIp,
        'F/S/P': incident.fsps.map(fsp => fsp.value).join(', '),
        'Stakeholders': incident.stakeholders.join(', '),
        'Ticket Generator': incident.ticketGenerator,
      'Start Time': incident.timestamp.toDate().toLocaleString(),
      'End Time': incident.faultEndTime ? incident.faultEndTime.toDate().toLocaleString() : '-',
      'Status': incident.status,
      'Closed By': incident.closedBy || '-',
        'Remarks': incident.remarks || '-'
      }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'GPON Incidents');
    XLSX.writeFile(wb, 'gpon_incidents_report.xlsx');
  };

  const handleCustomRangeConfirm = () => {
    if (customDateRange.start && customDateRange.end) {
      setTimeRange('custom');
      fetchIncidents();
    }
  };

  const handleFaultEndTimeUpdate = async (incidentId: string) => {
    try {
      const docRef = doc(db, 'gponIncidents', incidentId);
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

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading reports...</p>
      </div>
    );
  }

  return (
    <>
      <NavBar />
      <div className="gpon-reports-container" style={{ paddingTop: '32px' }}>
      <div className="header">
        <div className="title-section">
          <Link href="/gpon-faults">
          </Link>
          <h1>GPON Faults Reports</h1>
          <Link href="/">
            <button style={{
              backgroundColor: '#4d4fb8',
              color: '#ffffff',
              padding: '15px 30px',
              borderRadius: '5px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px'
            }}>
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
            className="btn btn-primary"
            onClick={() => setShowAnalytics(true)}
          >
            <span className="icon">📊</span> Fault Analytics
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FaFilter /> Filters
          </button>
          <button 
            className="btn btn-primary"
            onClick={exportToExcel}
          >
            <FaDownload /> Export to Excel
          </button>
          {selectedIncidents.length > 0 && (
            <button
              className="btn btn-primary"
              onClick={() => setShowCloserSelection(true)}
            >
              Close Selected
            </button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="controls-section">
          <div className="time-range-controls">
            <div className="custom-range-controls">
              <div className="datetime-inputs">
                <div className="datetime-input-container">
                  <input
                    type="datetime-local"
                    className="datetime-input"
                    value={customDateRange.start}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                  />
                </div>
                <div className="datetime-input-container">
                  <input
                    type="datetime-local"
                    className="datetime-input"
                    value={customDateRange.end}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="filters">
            <input
              type="text"
              placeholder="Search incidents..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <select
              className="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>

            <select
              className="status-filter"
              value={fdhFilter}
              onChange={(e) => setFdhFilter(e.target.value)}
            >
              <option value="">All FDH</option>
              {uniqueFdhs.map((fdh) => (
                <option key={fdh} value={fdh}>{fdh}</option>
              ))}
            </select>

            <select
              className="status-filter"
              value={fatFilter}
              onChange={(e) => setFatFilter(e.target.value)}
            >
              <option value="">All FATs</option>
              {uniqueFats.map((fat) => (
                <option key={fat} value={fat}>{fat}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
                {columns.map((column, index) => (
                  <TableHeader
                    key={column.key}
                    width={getColumnWidth(column.key)}
                    minWidth={column.minWidth}
                    onResize={(width) => handleColumnResize(column.key, index, width)}
                    tableId="gpon-reports"
                    columnIndex={index}
                    sortKey={column.sortable ? column.key : undefined}
                    onSort={column.sortable ? () => handleSort(column.key as keyof ColumnKey) : undefined}
                    sortDirection={sortConfig.key === columnKeyToIncidentKey[column.key as keyof ColumnKey] ? sortConfig.direction : null}
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
            {getSortedIncidents().map((incident) => (
              <tr key={incident.id}>
                  {columns.map((column) => (
                    <td 
                      key={column.key}
                      style={{ 
                        width: getColumnWidth(column.key),
                        minWidth: column.minWidth,
                        whiteSpace: ['fats', 'fsps', 'faultOccurred', 'exchange', 'faultEnd', 'totalTime'].includes(column.key) ? 'normal' : 'nowrap',
                        wordBreak: ['fats', 'fsps', 'faultOccurred', 'exchange', 'faultEnd', 'totalTime'].includes(column.key) ? 'break-word' : 'normal'
                      }}
                    >
                      {renderCell(incident, column.key as keyof ColumnKey)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Incident Details Modal */}
        {selectedIncident && (
          <ViewIncidentModal
            incident={selectedIncident}
            onClose={() => {
              setSelectedIncident(null);
              fetchIncidents(); // Refresh the incidents list when modal is closed
            }}
          />
        )}

        {showCloserSelection && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2>Select Closer</h2>
                <button className="close-btn" onClick={() => setShowCloserSelection(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="closer-selection">
                  <select
                    className="closer-select"
                    value={selectedCloser}
                    onChange={(e) => setSelectedCloser(e.target.value)}
                  >
                    <option value="">Select Closer</option>
                    {closerOptions.map(closer => (
                      <option key={closer} value={closer}>{closer}</option>
                    ))}
                  </select>
                  <button
                    className="btn btn-primary"
                    onClick={handleCloserSelection}
                    disabled={!selectedCloser}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showAnalytics && (
          <div className="analytics-overlay">
            <div className="analytics-content">
              <div className="analytics-header">
                <h2>GPON Fault Analytics</h2>
                <button 
                  className="close-btn"
                  onClick={() => setShowAnalytics(false)}
                >
                  ×
                </button>
              </div>
              <GPONFaultAnalytics incidents={allIncidents} />
            </div>
          </div>
        )}
      </div>
    </>
  );

  function renderCell(incident: GPONIncident, key: keyof ColumnKey) {
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
      case 'exchangeName':
        return incident.exchangeName;
      case 'fdh':
        return incident.fdh;
      case 'fats':
        return incident.fats.map(fat => fat.value).join(', ');
      case 'oltIp':
        return incident.oltIp;
      case 'fsps':
        return incident.fsps.map(fsp => fsp.value).join(', ');
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
          <button
            className="view-btn"
            onClick={() => setSelectedIncident(incident)}
          >
            View
          </button>
        );
      default:
        return '';
    }
  }

  function renderTimestampCell(incident: GPONIncident) {
    if (editingTimestamp === incident.id) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
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
                      </div>
          <div style={{ display: 'flex', gap: '4px', width: '100%', justifyContent: 'space-between' }}>
                        <button
              onClick={(e) => {
                e.stopPropagation();
                handleTimestampUpdate(incident.id);
              }}
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
              onClick={(e) => {
                e.stopPropagation();
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
    }
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span>{incident.timestamp?.toDate().toLocaleString()}</span>
                      <button
          onClick={(e) => {
            e.stopPropagation();
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

  function renderFaultEndTimeCell(incident: GPONIncident) {
    if (editingFaultEndTime === incident.id) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
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
                      </div>
          <div style={{ display: 'flex', gap: '4px', width: '100%', justifyContent: 'space-between' }}>
                        <button
              onClick={(e) => {
                e.stopPropagation();
                handleFaultEndTimeUpdate(incident.id);
              }}
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
              onClick={(e) => {
                e.stopPropagation();
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
            onClick={(e) => {
              e.stopPropagation();
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

  function renderStatusCell(incident: GPONIncident) {
    if (statusChangeId === incident.id) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
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
                        {closerOptions.map((person) => (
                          <option key={person} value={person}>{person}</option>
                        ))}
                      </select>
          <div style={{ display: 'flex', gap: '4px', width: '100%', justifyContent: 'space-between' }}>
                        <button 
              onClick={(e) => {
                e.stopPropagation();
                handleCloserSelection();
              }}
                          disabled={!selectedCloser || updatingStatus}
                          style={{
                            backgroundColor: selectedCloser ? '#28a745' : '#6c757d',
                            color: 'white',
                            padding: '4px 8px',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: selectedCloser && !updatingStatus ? 'pointer' : 'not-allowed',
                fontSize: '12px',
                width: '48%'
                          }}
                        >
                          {updatingStatus ? 'Updating...' : 'Confirm'}
                        </button>
                        <button
              onClick={(e) => {
                e.stopPropagation();
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
    }
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
                      disabled={updatingStatus}
                    >
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
    );
  }

  function calculateTotalTime(incident: GPONIncident) {
    if (!incident.faultEndTime) return '-';
    
    const diffInMinutes = (incident.faultEndTime.seconds - incident.timestamp.seconds) / 60;
    const hours = Math.floor(diffInMinutes / 60);
    const minutes = Math.floor(diffInMinutes % 60);
    
    return `${hours}h ${minutes}m`;
  }
} 