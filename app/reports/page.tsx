"use client";
import '../styles/globals.css';
import '../styles/reports.css';
import React, { useState, useEffect, useRef } from 'react';
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
import ExportButton from '../components/ExportButton';

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

const ViewIncidentModal = ({ 
  incident, 
  onClose, 
  onUpdate,
  onGenerateRestoreMessage
}: { 
  incident: Incident; 
  onClose: () => void; 
  onUpdate: () => Promise<void>;
  onGenerateRestoreMessage?: (incident: Incident) => void;
}) => {
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
    <div 
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      tabIndex={0}
    >
      <div className="modal-content animate-dialog">
        <div className="modal-header">
          <h2>Incident Details - {currentIncident.incidentNumber}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {/* Add Generate Restore Message button below the title */}
          {currentIncident.status === 'Completed' && onGenerateRestoreMessage && (
            <div className="message-button-container">
              <button
                onClick={() => onGenerateRestoreMessage(currentIncident)}
                className="restore-message-btn"
              >
                Generate Restore Message
              </button>
            </div>
          )}

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
            <>
            <div className="detail-row">
              <strong>Closed By:</strong>
              <span>{currentIncident.closedBy || '-'}</span>
              </div>
              {currentIncident.faultRestorer && (
                <div className="detail-row">
                  <strong>Fault Restorer:</strong>
                  <span>{currentIncident.faultRestorer}</span>
            </div>
              )}
            </>
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

        .action-section {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          display: flex;
          justify-content: center;
        }
        
        .restore-message-btn {
          background-color: #4A6741;
          color: white;
          padding: 10px 15px;
          border-radius: 4px;
          border: none;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;
        }
        
        .restore-message-btn:hover {
          background-color: #3A5331;
          transform: translateY(-1px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .restore-message-btn:active {
          transform: translateY(0);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .message-button-container {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid #eee;
        }
      `}</style>
    </div>
  );
};

export default function ReportsAppWithStyles() {
  return (
    <>
      <ReportsPage />
      <style jsx global>{`
        /* ... existing styles ... */
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.6);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          overflow-y: auto;
          padding: 20px;
          backdrop-filter: blur(3px);
          outline: none;
        }
        
        .modal-content {
          background-color: #FFF8E8;
          border-radius: 12px;
          width: 90%;
          max-width: 800px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
          position: relative;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .animate-dialog {
          animation: dialogEntry 0.3s ease-out forwards;
        }
        
        @keyframes dialogEntry {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .modal-header {
          padding: 16px 20px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
          background-color: #F0E6D2;
          border-radius: 12px 12px 0 0;
          text-align: center;
        }
        
        .modal-header h2 {
          margin: 0;
          font-size: 1.5rem;
          color: #4A6741;
          font-weight: 700;
          text-align: center;
          width: 100%;
          padding: 0;
        }
        
        .modal-header .close-btn {
          position: absolute;
          right: 15px;
          top: 50%;
          transform: translateY(-50%);
        }
        
        .modal-body {
          padding: 25px;
        }
        
        /* Status Change Dialog Styles */
        .status-change-dialog {
          background-color: #FFF8E8;
          max-width: 600px;
        }
        
        .form-fields-row {
          display: flex;
          gap: 20px;
          margin-bottom: 30px;
        }
        
        .form-fields-row .form-group {
          flex: 1;
          min-width: 0;
          position: relative;
        }
        
        .status-change-dialog .form-group {
          margin-bottom: 25px;
        }
        
        .status-change-dialog label {
          display: block;
          margin-bottom: 12px;
          font-weight: 600;
          color: #333;
        }
        
        .field-label {
          font-weight: 800 !important;
          color: #1a5fb4 !important;
          font-size: 1.05rem;
          display: block;
          margin-bottom: 12px;
          padding-left: 2px;
        }
        
        .debug-info {
          display: none; /* Hide in production */
          font-size: 12px;
          color: #666;
          margin-top: 5px;
        }
        
        .restorer-select {
          max-height: 300px !important;
          overflow-y: auto !important;
        }
        
        .status-change-dialog .form-select {
          width: 100%;
          height: 50px;
          padding: 12px 15px;
          border-radius: 8px;
          border: 1px solid #D4C9A8;
          background-color: white;
          font-size: 16px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.05);
          transition: all 0.2s ease;
          margin-top: 5px;
          appearance: menulist;
          -webkit-appearance: menulist;
          -moz-appearance: menulist;
        }
        
        .status-change-dialog .form-select option {
          padding: 10px;
          font-size: 16px;
          height: auto;
        }
        
        .status-change-dialog .form-select:focus {
          border-color: #4A6741;
          box-shadow: 0 0 0 2px rgba(74, 103, 65, 0.2);
          outline: none;
        }
        
        .status-change-dialog .dialog-actions {
          display: flex;
          justify-content: flex-end;
          gap: 15px;
          margin-top: 25px;
        }
        
        .incident-summary {
          background-color: rgba(255, 255, 255, 0.7);
          border-radius: 8px;
          padding: 20px;
          margin-top: 10px;
          border: 1px solid #D4C9A8;
        }
        
        .incident-summary h3 {
          margin-top: 0;
          margin-bottom: 15px;
          font-size: 18px;
          color: #4A6741;
          padding-bottom: 10px;
          border-bottom: 1px solid #D4C9A8;
          text-align: center;
          font-weight: 700;
        }
        
        .summary-row {
          display: flex;
          margin-bottom: 12px;
        }
        
        .summary-label {
          font-weight: 600;
          width: 120px;
          flex-shrink: 0;
        }
        
        .summary-value {
          color: #555;
          font-weight: 500;
        }
        
        /* Restore Message Dialog Styles */
        .restore-message-dialog {
          background-color: #FFF8E8;
          max-width: 650px;
        }
        
        .restore-message-dialog .modal-body {
          padding: 25px;
        }
        
        .restore-message-dialog .form-group {
          margin-bottom: 20px;
        }
        
        .section-label {
          display: block;
          margin-bottom: 12px;
          font-weight: 700;
          color: #3a5331;
          font-size: 1.05rem;
          border-bottom: 1px dashed #D4C9A8;
          padding-bottom: 8px;
        }
        
        .stakeholder-section {
          margin-bottom: 25px;
        }
        
        .stakeholders-selection {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 20px;
          background-color: white;
          padding: 15px;
          border-radius: 8px;
          border: 1px solid #D4C9A8;
          box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }
        
        .stakeholder-checkbox {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-right: 15px;
          padding: 8px 12px;
          background-color: #eef2ff;
          border-radius: 20px;
          transition: all 0.2s ease;
          border: 1px solid #c7d2fe;
          font-weight: 600;
        }
        
        .stakeholder-checkbox:hover {
          background-color: #dbeafe;
          transform: translateY(-2px);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .stakeholder-checkbox label {
          font-weight: 600;
          color: #4338ca;
        }
        
        .stakeholder-checkbox input[type="checkbox"] {
          accent-color: #4A6741;
          width: 16px;
          height: 16px;
        }
        
        .message-preview {
          margin-top: 20px;
          background-color: white;
          padding: 20px;
          border-radius: 8px;
          border: 1px solid #D4C9A8;
          box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }
        
        .message-text {
          background-color: #f8f8f8;
          padding: 25px;
          border-radius: 8px;
          border: 1px solid #eee;
          white-space: pre-wrap;
          margin: 15px 0;
          font-family: monospace;
          font-size: 16px;
          line-height: 1.8;
          color: #000;
          font-weight: 600;
          text-align: center;
          box-shadow: inset 0 0 6px rgba(0,0,0,0.05);
        }
        
        .help-text {
          font-size: 12px;
          color: #666;
          margin-bottom: 15px;
          text-align: center;
          font-style: italic;
        }
        
        kbd {
          background-color: #f7f7f7;
          border: 1px solid #ccc;
          border-radius: 3px;
          box-shadow: 0 1px 0 rgba(0,0,0,0.2);
          color: #333;
          display: inline-block;
          font-size: 11px;
          line-height: 1.4;
          margin: 0 0.1em;
          padding: 0.1em 0.6em;
          white-space: nowrap;
        }
        
        .dialog-actions {
          display: flex;
          justify-content: flex-end;
          gap: 15px;
          margin-top: 25px;
        }
        
        .btn {
          padding: 10px 20px;
          border-radius: 8px;
          border: none;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        
        .btn:active {
          transform: translateY(0);
        }
        
        .btn-primary {
          background-color: #4A6741;
          color: white;
        }
        
        .btn-primary:hover {
          background-color: #3A5331;
        }
        
        .btn-primary:disabled {
          background-color: #94a990;
          cursor: not-allowed;
          transform: none;
        }
        
        .btn-secondary {
          background-color: #6c757d;
          color: white;
        }
        
        .btn-secondary:hover {
          background-color: #5a6268;
        }
        
        .pulse-animation {
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(74, 103, 65, 0.4);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(74, 103, 65, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(74, 103, 65, 0);
          }
        }
        
        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          transition: all 0.2s;
        }
        
        .close-btn:hover {
          background-color: rgba(0, 0, 0, 0.1);
          color: #333;
          transform: rotate(90deg);
        }
      `}</style>
    </>
  );
}

function ReportsPage() {
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
  const [selectedFaultRestorer, setSelectedFaultRestorer] = useState<string>('');
  const [statusChangeId, setStatusChangeId] = useState<string | null>(null);
  const [showStatusChangeDialog, setShowStatusChangeDialog] = useState(false);
  const [statusChangeIncident, setStatusChangeIncident] = useState<Incident | null>(null);
  const [editingFaultEndTime, setEditingFaultEndTime] = useState<string | null>(null);
  const [selectedDateTime, setSelectedDateTime] = useState<string>('');
  const [editingTimestamp, setEditingTimestamp] = useState<string | null>(null);
  const [selectedTimestamp, setSelectedTimestamp] = useState<string>('');
  const { columns, handleColumnResize, getColumnWidth } = useTableColumns('regular');
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [tableTheme, setTableTheme] = useState('theme-modern-blue');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showRestoreMessageDialog, setShowRestoreMessageDialog] = useState(false);
  const [restoreMessageIncident, setRestoreMessageIncident] = useState<Incident | null>(null);
  const [selectedThanksTo, setSelectedThanksTo] = useState<string[]>([]);
  const analyticsOverlayRef = useRef<HTMLDivElement>(null);

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

      // If status is "Completed", show the ticket closer and fault restorer dialog
      if (newStatus === 'Completed') {
        // Get current incident data to pass to dialog
        const incidentDoc = await getDoc(docRef);
        if (incidentDoc.exists()) {
          const incident = { id: incidentDoc.id, ...incidentDoc.data() } as Incident;
          
          // Ensure we load all stakeholders from the database for this incident
          setStatusChangeIncident(incident);
        setStatusChangeId(incidentId);
          setShowStatusChangeDialog(true);
          
          // Log stakeholders to verify they're being loaded
          console.log("Loaded stakeholders for incident:", incident.stakeholders);
        }
        setUpdatingStatus(false);
        return;
      }

      // For "In Progress" or other statuses
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
      alert('Please select the person who closed this ticket');
      return;
    }

    if (!selectedFaultRestorer) {
      alert('Please select the person who restored the fault');
      return;
    }

    try {
      setUpdatingStatus(true);
      const docRef = doc(db, 'incidents', statusChangeId!);
      
      const updateData = {
        status: 'Completed',
        lastUpdated: new Date(),
        faultEndTime: new Date(),
        closedBy: selectedCloser,
        faultRestorer: selectedFaultRestorer
      };

      await updateDoc(docRef, updateData);
      await fetchIncidents();
      
      // Reset states
      setSelectedCloser('');
      setSelectedFaultRestorer('');
      setStatusChangeId(null);
      setStatusChangeIncident(null);
      setShowStatusChangeDialog(false);
      setUpdatingStatus(false);
    } catch (error) {
      console.error('Error completing incident:', error);
      alert('Error completing incident. Please try again.');
      setUpdatingStatus(false);
    }
  };

  const handleCancelStatusChange = () => {
    setStatusChangeId(null);
    setStatusChangeIncident(null);
    setSelectedCloser('');
    setSelectedFaultRestorer('');
    setShowStatusChangeDialog(false);
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

  // Generate restore message for a completed incident
  const generateRestoreMessage = (incident: Incident) => {
    if (!incident || incident.status !== 'Completed' || !incident.faultEndTime) {
      return '';
    }

    const totalTime = calculateTotalTime(incident);
    const faultType = incident.faultType || 'Fault';
    const exchange = incident.exchangeName || '';
    const nodeA = incident.nodes?.nodeA || '';
    const nodeB = incident.nodes?.nodeB || '';
    
    const message = `***The ${faultType} in ${exchange}***
${nodeA} -------- ${nodeB}
has been restored

Total Fault Time: ${totalTime}

Thanks to ${selectedThanksTo.join(', ')}`;
    
    return message;
  };

  // Function to copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        alert('Message copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        alert('Failed to copy to clipboard. Please try again.');
      });
  };

  // Handle showing the restore message dialog
  const handleShowRestoreMessage = (incident: Incident) => {
    setRestoreMessageIncident(incident);
    setSelectedThanksTo(incident.stakeholders || []);
    setShowRestoreMessageDialog(true);
  };

  // Add effect to focus the analytics overlay when it appears
  useEffect(() => {
    if (showAnalytics && analyticsOverlayRef.current) {
      analyticsOverlayRef.current.focus();
    }
  }, [showAnalytics]);

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
          <ExportButton 
            data={getSortedIncidents().map(incident => ({
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
            }))}
            filename="incidents_report"
            label="Export Data"
            className="action-btn"
          />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            marginTop: '10px',
            width: '100%'
          }} className="theme-select-container">
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
            onGenerateRestoreMessage={handleShowRestoreMessage}
          />
        )}

        {showAnalytics && (
          <div 
            className="analytics-overlay"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowAnalytics(false);
              }
            }}
            tabIndex={0}
            ref={analyticsOverlayRef}
          >
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

        {/* Status Change Dialog */}
        {showStatusChangeDialog && statusChangeIncident && (
          <div 
            className="modal-overlay" 
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCancelStatusChange();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                handleCancelStatusChange();
              }
            }}
            tabIndex={0}
          >
            <div className="modal-content status-change-dialog animate-dialog">
              <div className="modal-header">
                <h2>Complete Incident</h2>
                <button className="close-btn" onClick={handleCancelStatusChange}>×</button>
              </div>
              <div className="modal-body">
                <div className="form-fields-row">
                  <div className="form-group">
                    <label htmlFor="ticket-closer" className="field-label">Ticket Closer:</label>
                    <select
                      id="ticket-closer"
                      value={selectedCloser}
                      onChange={(e) => setSelectedCloser(e.target.value)}
                      className="form-select"
                    >
                      <option value="">Select Ticket Closer</option>
                      {statusChangeIncident.domain === 'Switch/Access' && switchAccessTicketGenerators.map((person) => (
                        <option key={person} value={person}>{person}</option>
                      ))}
                      {statusChangeIncident.domain === 'Transport/Transmission' && transportTicketGenerators.map((person) => (
                        <option key={person} value={person}>{person}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="fault-restorer" className="field-label">Fault Restorer:</label>
                    <select
                      id="fault-restorer"
                      value={selectedFaultRestorer}
                      onChange={(e) => setSelectedFaultRestorer(e.target.value)}
                      className="form-select restorer-select"
                    >
                      <option value="">Select Fault Restorer</option>
                      {statusChangeIncident.stakeholders && Array.isArray(statusChangeIncident.stakeholders) && 
                        statusChangeIncident.stakeholders.map((person) => (
                          <option key={person} value={person}>{person}</option>
                        ))
                      }
                      {morningTeamMembers.map((person) => (
                        !statusChangeIncident.stakeholders?.includes(person) && (
                          <option key={`morning-${person}`} value={person}>{person}</option>
                        )
                      ))}
                    </select>
                    {/* Show stakeholder count for debugging */}
                    <div className="debug-info">
                      Available stakeholders: {statusChangeIncident.stakeholders?.length || 0}
                    </div>
                  </div>
                </div>
                <div className="incident-summary">
                  <h3>Incident Summary</h3>
                  <div className="summary-row">
                    <span className="summary-label">Incident #:</span>
                    <span className="summary-value">{statusChangeIncident.incidentNumber}</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Fault Type:</span>
                    <span className="summary-value">{statusChangeIncident.faultType}</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Exchange:</span>
                    <span className="summary-value">{statusChangeIncident.exchangeName}</span>
                  </div>
                </div>
                <div className="dialog-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={handleCancelStatusChange}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary pulse-animation"
                    onClick={handleCloserSelection}
                    disabled={!selectedCloser || !selectedFaultRestorer || updatingStatus}
                  >
                    {updatingStatus ? 'Saving...' : 'Confirm'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Restore Message Dialog */}
        {showRestoreMessageDialog && restoreMessageIncident && (
          <div 
            className="modal-overlay" 
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowRestoreMessageDialog(false);
                setRestoreMessageIncident(null);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowRestoreMessageDialog(false);
                setRestoreMessageIncident(null);
              } else if (e.ctrlKey && e.key === 'c') {
                copyToClipboard(generateRestoreMessage(restoreMessageIncident));
              }
            }}
            tabIndex={0}
          >
            <div className="modal-content restore-message-dialog animate-dialog">
              <div className="modal-header">
                <h2>Restore Message</h2>
                <button className="close-btn" onClick={() => setShowRestoreMessageDialog(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="form-group stakeholder-section">
                  <label className="section-label">Select people to thank:</label>
                  <div className="stakeholders-selection">
                    {restoreMessageIncident.stakeholders?.map((person) => (
                      <div key={person} className="stakeholder-checkbox">
                        <input
                          type="checkbox"
                          id={`thanks-${person}`}
                          checked={selectedThanksTo.includes(person)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedThanksTo([...selectedThanksTo, person]);
                            } else {
                              setSelectedThanksTo(selectedThanksTo.filter(p => p !== person));
                            }
                          }}
                        />
                        <label htmlFor={`thanks-${person}`}>{person}</label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="message-preview">
                  <label className="section-label">Message:</label>
                  <pre className="message-text">{generateRestoreMessage(restoreMessageIncident)}</pre>
                  <div className="help-text">
                    Press <kbd>Ctrl</kbd>+<kbd>C</kbd> to copy or use the button below
                  </div>
                </div>
                <div className="dialog-actions">
                  <button
                    className="btn btn-primary pulse-animation"
                    onClick={() => copyToClipboard(generateRestoreMessage(restoreMessageIncident))}
                  >
                    Copy to Clipboard
                  </button>
                </div>
              </div>
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

  function calculateTotalTime(incident: Incident) {
    return calculateOutageTime(incident.timestamp, incident.faultEndTime);
  }
}