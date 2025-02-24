import React, { useState, useEffect } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { read, utils } from 'xlsx';
import Modal from './Modal';

interface CustomListItem {
  id: string;
  title: string;
  data: any[];
  fileUrl?: string;
  createdAt: any;
  updatedAt: any;
}

interface CustomListSectionProps {
  lists: CustomListItem[];
  onSave: (item: Omit<CustomListItem, 'id'>) => Promise<void>;
  onUpdate: (item: CustomListItem) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function CustomListSection({
  lists,
  onSave,
  onUpdate,
  onDelete
}: CustomListSectionProps) {
  // State management
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showTableView, setShowTableView] = useState(false);
  const [listTitle, setListTitle] = useState('');
  const [selectedList, setSelectedList] = useState<CustomListItem | null>(null);
  const [listToDelete, setListToDelete] = useState<string>('');
  const [tableData, setTableData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValue, setFilterValue] = useState('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Filter lists based on search and filter criteria
  const filteredLists = lists.filter(list => {
    const matchesSearch = list.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (filterValue === 'all') return matchesSearch;
    // Add more filter conditions as needed
    return matchesSearch;
  });

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setFileError(null);
    
    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ];

    if (!validTypes.includes(file.type)) {
      setFileError('Please select a valid Excel file (.xlsx or .xls)');
      event.target.value = ''; // Clear the input
      return;
    }

    setSelectedFile(file);
  };

  // Handle list creation
  const handleCreateList = async () => {
    if (!selectedFile || !listTitle.trim()) {
      setError('Please provide both a list title and an Excel file');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Read Excel file
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          console.log('File size:', data.length, 'bytes');
          
          const workbook = read(data, { type: 'array' });
          console.log('Sheets in workbook:', workbook.SheetNames);
          
          if (workbook.SheetNames.length === 0) {
            throw new Error('The Excel file contains no sheets');
          }

          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          if (!worksheet) {
            throw new Error('Could not read the first sheet of the Excel file');
          }

          const jsonData = utils.sheet_to_json(worksheet);
          console.log('Parsed rows:', jsonData.length);

          if (jsonData.length === 0) {
            throw new Error('The Excel file appears to be empty');
          }

          // Create new list
          const newList = {
            title: listTitle.trim(),
            data: jsonData,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          await onSave(newList);
          setShowCreateDialog(false);
          resetForm();
          setIsProcessing(false);
        } catch (err) {
          console.error('Excel processing error:', err);
          setError(err instanceof Error ? err.message : 'Error processing file. Please ensure the file is a valid Excel document.');
          setIsProcessing(false);
        }
      };

      reader.onerror = () => {
        setError('Error reading file');
        setIsProcessing(false);
      };

      reader.readAsArrayBuffer(selectedFile);
    } catch (err) {
      console.error('File reading error:', err);
      setError('Error reading file. Please try again.');
      setIsProcessing(false);
    }
  };

  // Handle list update
  const handleUpdateList = async () => {
    if (!selectedList) return;

    setIsProcessing(true);
    setError(null);

    try {
      const updatedList = {
        ...selectedList,
        data: tableData,
        updatedAt: new Date()
      };

      await onUpdate(updatedList);
      setShowTableView(false);
      setSelectedList(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating list');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset form state
  const resetForm = () => {
    setListTitle('');
    setSelectedFile(null);
    setTableData([]);
    setError(null);
    setFileError(null);
    // Clear file input if it exists
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    // Handle Firestore Timestamp
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString();
    }
    // Handle regular Date object
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString();
    }
    // Handle timestamp in seconds or milliseconds
    if (typeof timestamp === 'number') {
      return new Date(timestamp * 1000).toLocaleDateString();
    }
    return 'Invalid Date';
  };

  return (
    <div className="custom-list-section">
      {/* Header Controls */}
      <div className="controls">
        <div className="left-controls">
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateDialog(true)}
          >
            + Create New List
          </button>
        </div>
        <div className="right-controls">
          <input
            type="text"
            placeholder="Search lists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <select
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Lists</option>
            <option value="recent">Recent</option>
            <option value="modified">Last Modified</option>
          </select>
        </div>
      </div>

      {/* Create List Dialog */}
      <Modal
        isOpen={showCreateDialog}
        onClose={() => {
          setShowCreateDialog(false);
          resetForm();
        }}
        title="Create New List"
      >
        <div className="create-list-form">
          <div className="form-group">
            <label>List Name</label>
            <input
              type="text"
              value={listTitle}
              onChange={(e) => setListTitle(e.target.value)}
              placeholder="Enter list name"
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label>Import Excel File</label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="file-input"
              disabled={isProcessing}
            />
            {fileError && <div className="error-message">{fileError}</div>}
          </div>
          <div className="button-group">
            <button
              className="btn btn-primary"
              onClick={handleCreateList}
              disabled={isProcessing || !selectedFile || !listTitle.trim()}
            >
              {isProcessing ? 'Processing...' : 'Create List'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setShowCreateDialog(false);
                resetForm();
              }}
            >
              Cancel
            </button>
          </div>
          {error && <div className="error-message">{error}</div>}
          {isProcessing && <div className="processing-message">Processing file...</div>}
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <Modal
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title="Confirm Delete"
      >
        <div className="delete-confirm">
          <p>Are you sure you want to delete this list?</p>
          <div className="button-group">
            <button
              className="btn btn-danger"
              onClick={async () => {
                await onDelete(listToDelete);
                setShowDeleteDialog(false);
              }}
            >
              Delete
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Table View Modal */}
      <Modal
        isOpen={showTableView}
        onClose={() => setShowTableView(false)}
        title={selectedList?.title || 'View List'}
      >
        <div className="table-view">
          <div className="table-controls">
            <button
              className="btn btn-primary"
              onClick={handleUpdateList}
              disabled={isProcessing}
            >
              Update List
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setShowTableView(false)}
            >
              Cancel
            </button>
          </div>
          <div className="table-container">
            {tableData.length > 0 && (
              <table>
                <thead>
                  <tr>
                    {Object.keys(tableData[0]).map(key => (
                      <th key={key}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {Object.entries(row).map(([key, value], cellIndex) => (
                        <td key={`${rowIndex}-${cellIndex}`}>
                          <input
                            type="text"
                            value={value as string}
                            onChange={(e) => {
                              const newData = [...tableData];
                              newData[rowIndex] = {
                                ...newData[rowIndex],
                                [key]: e.target.value
                              };
                              setTableData(newData);
                            }}
                            className="cell-input"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </Modal>

      {/* Lists Grid */}
      <div className="lists-grid">
        {filteredLists.map(list => (
          <div key={list.id} className="list-item">
            <div className="list-header">
              <div className="list-info">
                <h4>{list.title}</h4>
                <span className="list-meta">
                  Updated: {formatDate(list.updatedAt)}
                </span>
              </div>
              <div className="list-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setSelectedList(list);
                    setTableData(list.data);
                    setShowTableView(true);
                  }}
                >
                  View
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    setListToDelete(list.id);
                    setShowDeleteDialog(true);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .custom-list-section {
          padding: 20px;
        }

        .controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          gap: 16px;
        }

        .right-controls {
          display: flex;
          gap: 12px;
        }

        .search-input,
        .filter-select {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .search-input {
          width: 250px;
        }

        .lists-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .list-item {
          background: white;
          border-radius: 8px;
          padding: 16px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .list-header {
          margin-bottom: 16px;
        }

        .list-header h4 {
          margin: 0 0 4px 0;
          font-size: 18px;
          color: #111827;
        }

        .list-meta {
          font-size: 12px;
          color: #6b7280;
        }

        .list-actions {
          display: flex;
          gap: 8px;
        }

        .table-view {
          margin-top: 16px;
        }

        .table-controls {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }

        .table-container {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th, td {
          padding: 8px;
          border: 1px solid #ddd;
        }

        th {
          background: #f9fafb;
          font-weight: 600;
        }

        .cell-input {
          width: 100%;
          padding: 4px;
          border: none;
          background: transparent;
        }

        .cell-input:focus {
          outline: 2px solid #3b82f6;
          border-radius: 2px;
        }

        .error-message {
          color: #dc2626;
          margin-top: 8px;
          font-size: 14px;
        }

        .processing-message {
          color: #059669;
          margin-top: 8px;
          font-size: 14px;
        }

        .create-list-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .form-group label {
          font-weight: 500;
          color: #374151;
        }

        .form-input {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .btn {
          padding: 8px 16px;
          border-radius: 4px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: background-color 0.2s;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-secondary {
          background: #6b7280;
          color: white;
        }

        .btn-danger {
          background: #dc2626;
          color: white;
        }

        .btn:hover {
          opacity: 0.9;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .controls {
            flex-direction: column;
            align-items: stretch;
          }

          .right-controls {
            flex-direction: column;
          }

          .search-input {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
