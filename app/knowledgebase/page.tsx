"use client";
import '../styles/globals.css';
import Link from 'next/link';
import { useState, useEffect, JSX, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebaseConfig';
import { hashPassword } from '../../lib/utils/password';
import ContactsSection from '../components/ContactsSection';
import FiberPathsSection from '../components/FiberPathsSection';
import CodesSection from '../components/CodesSection';
import CredentialsSection from '../components/CredentialsSection';
import CustomListSection from '../components/CustomListSection';
import Modal from '../components/Modal';
import { read, utils } from 'xlsx';
import NavBar from '../components/NavBar';
import { BulkActions } from './components/BulkActions';
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Contact } from './types';
import { useTheme } from '../contexts/ThemeContext';

// Interfaces for different data types
interface FiberPath {
  id: string;
  linkName: string;
  nodeA: string;
  nodeB: string;
  nodeASectionLength: string;
  nodeBSectionLength: string;
  nodeASectionOwner: string;
  nodeBSectionOwner: string;
  remarks?: string;
}

interface Code {
  id: string;
  title: string;
  equipmentName: string;
  code: string;
}

interface Credential {
  id: string;
  title: string;
  username: string;
  password: string;
  type: string;
  remarks?: string;
}

interface CustomList {
  id: string;
  title: string;
  data: any[];
  fileUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TabProps {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}

interface ContactsSectionProps {
  contacts: Contact[];
  onSave: (contact: Omit<Contact, 'id'>) => Promise<void>;
  onUpdate: (contact: Contact) => Promise<void>;
  onDelete: (id: string) => void;
  onEdit: (contact: Contact) => void;
}

interface FiberPathsSectionProps {
  paths: FiberPath[];
  onSave: (path: Omit<FiberPath, 'id'>) => Promise<void>;
  onUpdate: (path: FiberPath) => Promise<void>;
  onDelete: (id: string) => void;
  onEdit: (path: FiberPath) => void;
}

interface CodesSectionProps {
  codes: Code[];
  onSave: (code: Omit<Code, 'id'>) => Promise<void>;
  onUpdate: (code: Code) => Promise<void>;
  onDelete: (id: string) => void;
}

interface CredentialsSectionProps {
  credentials: Credential[];
  onSave: (credential: Omit<Credential, 'id'>) => Promise<void>;
  onUpdate: (credential: Credential) => Promise<void>;
  onDelete: (id: string) => void;
}

// Tab component for navigation
const Tab = ({ label, icon, active, onClick }: TabProps) => (
  <button
    className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
      active 
        ? 'bg-amber-600 text-white shadow-md transform scale-105' 
        : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
    }`}
    onClick={onClick}
    style={{
      backgroundColor: active ? '#d97706' : '#fef3c7',
      color: active ? 'white' : '#92400e'
    }}
    data-active={active}
  >
    <span className="text-xl">{icon}</span>
    <span className="font-medium">{label}</span>
  </button>
);

type Section = 'contacts' | 'fiberPaths' | 'codes' | 'credentials' | 'customList';

export default function KnowledgeBasePage(): JSX.Element {
  const [activeSection, setActiveSection] = useState<Section>('contacts');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, name: string, type: string} | null>(null);

  // State for data
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [fiberPaths, setFiberPaths] = useState<FiberPath[]>([]);
  const [codes, setCodes] = useState<Code[]>([]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [customLists, setCustomLists] = useState<CustomList[]>([]);

  // State for search and filters
  const [searchQuery, setSearchQuery] = useState('');

  // Section-specific filter states
  const [contactFilters, setContactFilters] = useState({
    column: 'department' as keyof Contact,
    value: 'all'
  });

  const [fiberPathFilters, setFiberPathFilters] = useState({
    column: 'nodeASectionOwner' as keyof FiberPath,
    value: 'all'
  });

  const [codeFilters, setCodeFilters] = useState({
    column: 'equipmentName' as keyof Code,
    value: 'all'
  });

  const [credentialFilters, setCredentialFilters] = useState({
    column: 'type' as keyof Credential,
    value: 'all'
  });

  // Add state for selected contacts
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());

  const { toast } = useToast();
  const { theme } = useTheme();

  // Add a style tag to prevent dark mode from affecting the section buttons
  useEffect(() => {
    // Create a style element
    const style = document.createElement('style');
    
    // Add CSS rules to prevent dark mode from affecting the section buttons
    style.textContent = `
      /* Preserve section buttons styling in dark mode */
      .dark .database-section-tabs button {
        color: inherit !important;
      }
      .dark .database-section-tabs button[data-active="true"] {
        background-color: #d97706 !important;
        color: white !important;
      }
      .dark .database-section-tabs button[data-active="false"] {
        background-color: #fef3c7 !important;
        color: #92400e !important;
      }
      .dark .database-section-tabs button[data-active="false"]:hover {
        background-color: #fde68a !important;
      }
      
      /* Force light mode styles in database container when in dark mode */
      .dark .database-container .code-card,
      .dark .database-container .credential-card,
      .dark .database-container .list-item {
        background-color: white !important;
        color: #333 !important;
        border: 1px solid #ddd !important;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
      }
      
      .dark .database-container h4,
      .dark .database-container h3,
      .dark .database-container .title {
        color: #333 !important;
      }
      
      .dark .database-container pre,
      .dark .database-container code {
        background-color: #f8f9fa !important;
        color: #333 !important;
      }
      
      .dark .database-container .equipment-name,
      .dark .database-container .credential-type,
      .dark .database-container .list-meta {
        color: #666 !important;
      }
      
      .dark .database-container .code-content,
      .dark .database-container .password-field {
        background-color: #f8f9fa !important;
        border: 1px solid #eee !important;
      }
      
      /* Ensure all buttons in database sections maintain their styling */
      .dark .database-container button {
        color: inherit !important;
      }
      
      .dark .database-container button.btn-primary {
        background-color: #0d6efd !important;
        color: white !important;
        border-color: #0d6efd !important;
      }
      
      .dark .database-container button.btn-secondary {
        background-color: #6c757d !important;
        color: white !important;
        border-color: #6c757d !important;
      }
      
      .dark .database-container button.btn-danger {
        background-color: #dc3545 !important;
        color: white !important;
        border-color: #dc3545 !important;
      }
      
      /* Ensure all form elements maintain their styling */
      .dark .database-container .form-container {
        background-color: white !important;
        color: #333 !important;
      }
      
      .dark .database-container input,
      .dark .database-container select,
      .dark .database-container textarea {
        background-color: white !important;
        color: #333 !important;
        border: 1px solid #ddd !important;
      }
      
      .dark .database-container label {
        color: #333 !important;
      }
      
      /* Additional specific styles for database sections */
      .dark .database-container .codes-list,
      .dark .database-container .credentials-list,
      .dark .database-container .custom-list-section {
        color: #333 !important;
      }
      
      .dark .database-container .info-row .label {
        color: #555 !important;
      }
      
      .dark .database-container .info-row .value {
        color: #333 !important;
      }
      
      .dark .database-container .copy-btn,
      .dark .database-container .copy-password-btn {
        background-color: #e9ecef !important;
        color: #495057 !important;
        border: 1px solid #ced4da !important;
      }
      
      .dark .database-container .copy-btn:hover,
      .dark .database-container .copy-password-btn:hover {
        background-color: #dee2e6 !important;
      }
      
      .dark .database-container .credential-header,
      .dark .database-container .list-header {
        border-bottom: 1px solid #eee !important;
      }
      
      /* Ensure create button maintains its styling */
      .dark .database-container .create-button {
        background-color: #d97706 !important;
        color: white !important;
      }
      
      .dark .database-container .create-button:hover {
        background-color: #b45309 !important;
      }
    `;
    
    // Append the style element to the document head
    document.head.appendChild(style);
    
    // Clean up function to remove the style element when the component unmounts
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Get the current section's data length
  const getCurrentDataLength = () => {
    switch (activeSection) {
      case 'contacts': return contacts.length;
      case 'fiberPaths': return fiberPaths.length;
      case 'codes': return codes.length;
      case 'credentials': return credentials.length;
      case 'customList': return customLists.length;
      default: return 0;
    }
  };

  // Get the create button text based on active section
  const getCreateButtonText = () => {
    switch (activeSection) {
      case 'contacts': return 'Add Contact';
      case 'fiberPaths': return 'Add Fiber Path';
      case 'codes': return 'Add Code';
      case 'credentials': return 'Add Credential';
      case 'customList': return 'Create Custom List';
      default: return 'Add New';
    }
  };

  // Get form title based on active section and edit mode
  const getFormTitle = () => {
    const action = editingItem ? 'Edit' : 'Add';
    switch (activeSection) {
      case 'contacts': return `${action} Contact`;
      case 'fiberPaths': return `${action} Fiber Path`;
      case 'codes': return `${action} Code`;
      case 'credentials': return `${action} Credential`;
      case 'customList': return `${action} Custom List`;
      default: return 'Add New';
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const collectionName = activeSection === 'fiberPaths' ? 'fiber_paths' : 
                            activeSection === 'customList' ? 'custom_lists' : 
                            `${activeSection}`;

      if (editingItem) {
        // Update existing item
        const updateData = {
          ...formData,
          updatedAt: new Date()
        };
        await updateDoc(doc(db, collectionName, editingItem.id), updateData as any);
        
        // Don't close the form if we're updating a custom list
        if (activeSection !== 'customList') {
          setShowForm(false);
          setEditingItem(null);
          setFormData({});
        }
      } else {
        // Create new item
        const newData = {
          ...formData,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        await addDoc(collection(db, collectionName), newData as any);
        setShowForm(false);
        setEditingItem(null);
        setFormData({});
      }
    } catch (err) {
      console.error('Error saving data:', err);
      setError('Failed to save data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Render form fields based on active section
  const renderFormFields = () => {
    switch (activeSection) {
      case 'contacts':
        return (
          <>
            <div className="form-group">
              <label htmlFor="name">Name *</label>
              <input
                type="text"
                id="name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="number">Number *</label>
              <input
                type="text"
                id="number"
                value={formData.number || ''}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="backupNumber">Backup Number</label>
              <input
                type="text"
                id="backupNumber"
                value={formData.backupNumber || ''}
                onChange={(e) => setFormData({ ...formData, backupNumber: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="designation">Designation</label>
              <input
                type="text"
                id="designation"
                value={formData.designation || ''}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="department">Department</label>
              <input
                type="text"
                id="department"
                value={formData.department || ''}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="exchangeName">Exchange Name</label>
              <input
                type="text"
                id="exchangeName"
                value={formData.exchangeName || ''}
                onChange={(e) => setFormData({ ...formData, exchangeName: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="supervisorName">Supervisor Name</label>
              <input
                type="text"
                id="supervisorName"
                value={formData.supervisorName || ''}
                onChange={(e) => setFormData({ ...formData, supervisorName: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="remarks">Remarks</label>
              <textarea
                id="remarks"
                value={formData.remarks || ''}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              />
            </div>
          </>
        );

      case 'fiberPaths':
        return (
          <>
            <div className="form-group">
              <label htmlFor="linkName">Link Name *</label>
              <input
                type="text"
                id="linkName"
                value={formData.linkName || ''}
                onChange={(e) => setFormData({ ...formData, linkName: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="nodeA">Node A *</label>
              <input
                type="text"
                id="nodeA"
                value={formData.nodeA || ''}
                onChange={(e) => setFormData({ ...formData, nodeA: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="nodeB">Node B *</label>
              <input
                type="text"
                id="nodeB"
                value={formData.nodeB || ''}
                onChange={(e) => setFormData({ ...formData, nodeB: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="nodeASectionLength">Node A Section Length *</label>
              <input
                type="text"
                id="nodeASectionLength"
                value={formData.nodeASectionLength || ''}
                onChange={(e) => setFormData({ ...formData, nodeASectionLength: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="nodeBSectionLength">Node B Section Length *</label>
              <input
                type="text"
                id="nodeBSectionLength"
                value={formData.nodeBSectionLength || ''}
                onChange={(e) => setFormData({ ...formData, nodeBSectionLength: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="nodeASectionOwner">Node A Section Owner *</label>
              <input
                type="text"
                id="nodeASectionOwner"
                value={formData.nodeASectionOwner || ''}
                onChange={(e) => setFormData({ ...formData, nodeASectionOwner: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="nodeBSectionOwner">Node B Section Owner *</label>
              <input
                type="text"
                id="nodeBSectionOwner"
                value={formData.nodeBSectionOwner || ''}
                onChange={(e) => setFormData({ ...formData, nodeBSectionOwner: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="remarks">Remarks</label>
              <textarea
                id="remarks"
                value={formData.remarks || ''}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              />
            </div>
          </>
        );

      case 'codes':
        return (
          <>
            <div className="form-group">
              <label htmlFor="title">Title *</label>
              <input
                type="text"
                id="title"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="equipmentName">Equipment Name *</label>
              <input
                type="text"
                id="equipmentName"
                value={formData.equipmentName || ''}
                onChange={(e) => setFormData({ ...formData, equipmentName: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="code">Code *</label>
              <textarea
                id="code"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
              />
            </div>
          </>
        );

      case 'credentials':
        return (
          <>
            <div className="form-group">
              <label htmlFor="title">Title *</label>
              <input
                type="text"
                id="title"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="username">Username *</label>
              <input
                type="text"
                id="username"
                value={formData.username || ''}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <input
                type="password"
                id="password"
                value={formData.password || ''}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="type">Type *</label>
              <select
                id="type"
                value={formData.type || ''}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                required
              >
                <option value="">Select Type</option>
                <option value="system">System</option>
                <option value="network">Network</option>
                <option value="application">Application</option>
                <option value="database">Database</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="remarks">Remarks</label>
              <textarea
                id="remarks"
                value={formData.remarks || ''}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              />
            </div>
          </>
        );

      case 'customList':
        return (
          <>
            <div className="form-group">
              <label htmlFor="title">List Title *</label>
              <input
                type="text"
                id="title"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="file">Import Excel File</label>
              <input
                type="file"
                id="file"
                accept=".xlsx,.xls"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  try {
                    const reader = new FileReader();
                    
                    reader.onload = async (event) => {
                      try {
                        const data = new Uint8Array(event.target?.result as ArrayBuffer);
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
                        
                        setFormData({
                          ...formData,
                          data: jsonData
                        });
                      } catch (err) {
                        console.error('Excel processing error:', err);
                        setError(err instanceof Error ? err.message : 'Error processing file. Please ensure the file is a valid Excel document.');
                      }
                    };

                    reader.onerror = () => {
                      setError('Error reading file');
                    };

                    reader.readAsArrayBuffer(file);
                  } catch (err) {
                    console.error('File reading error:', err);
                    setError('Error reading file. Please try again.');
                  }
                }}
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  // Firebase real-time listeners
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    try {
      // Contacts listener
      const contactsQuery = query(collection(db, 'contacts'), orderBy('name'));
      const contactsUnsubscribe = onSnapshot(contactsQuery, (snapshot) => {
        const contactsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Contact[];
        setContacts(contactsData);
      });
      unsubscribers.push(contactsUnsubscribe);

      // Fiber paths listener
      const fiberPathsQuery = query(collection(db, 'fiber_paths'), orderBy('linkName'));
      const fiberPathsUnsubscribe = onSnapshot(fiberPathsQuery, (snapshot) => {
        const fiberPathsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as FiberPath[];
        setFiberPaths(fiberPathsData);
      });
      unsubscribers.push(fiberPathsUnsubscribe);

      // Codes listener
      const codesQuery = query(collection(db, 'codes'), orderBy('title'));
      const codesUnsubscribe = onSnapshot(codesQuery, (snapshot) => {
        const codesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Code[];
        setCodes(codesData);
      });
      unsubscribers.push(codesUnsubscribe);

      // Credentials listener
      const credentialsQuery = query(collection(db, 'credentials'), orderBy('title'));
      const credentialsUnsubscribe = onSnapshot(credentialsQuery, (snapshot) => {
        const credentialsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Credential[];
        setCredentials(credentialsData);
      });
      unsubscribers.push(credentialsUnsubscribe);

      // Custom lists listener
      const customListsQuery = query(collection(db, 'custom_lists'), orderBy('title'));
      const customListsUnsubscribe = onSnapshot(customListsQuery, (snapshot) => {
        const customListsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as CustomList[];
        setCustomLists(customListsData);
      });
      unsubscribers.push(customListsUnsubscribe);

      setLoading(false);
    } catch (err) {
      console.error('Error setting up Firebase listeners:', err);
      setError('Failed to load data. Please try again later.');
      setLoading(false);
    }

    // Cleanup function to unsubscribe from all listeners
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  const sections: { id: Section; label: string }[] = [
    { id: 'contacts', label: 'Contacts' },
    { id: 'fiberPaths', label: 'Fiber Paths' },
    { id: 'codes', label: 'Codes' },
    { id: 'credentials', label: 'Credentials' },
    { id: 'customList', label: 'Custom List' }
  ];

  // Get filter options based on active section
  const getFilterOptions = () => {
    const values = new Set<string>();
    
    switch (activeSection) {
      case 'contacts':
        contacts.forEach(contact => {
          const value = contact[contactFilters.column];
          if (value) values.add(value.toString());
        });
        break;
      case 'fiberPaths':
        fiberPaths.forEach(path => {
          const value = path[fiberPathFilters.column];
          if (value) values.add(value.toString());
        });
        break;
      case 'codes':
        codes.forEach(code => {
          const value = code[codeFilters.column];
          if (value) values.add(value.toString());
        });
        break;
      case 'credentials':
        credentials.forEach(cred => {
          const value = cred[credentialFilters.column];
          if (value) values.add(value.toString());
        });
        break;
    }
    
    return Array.from(values).sort();
  };

  // Get filter columns based on active section
  const getFilterColumns = () => {
    switch (activeSection) {
      case 'contacts':
        return [
          { value: 'name', label: 'Name' },
          { value: 'number', label: 'Number' },
          { value: 'designation', label: 'Designation' },
          { value: 'department', label: 'Department' },
          { value: 'exchangeName', label: 'Exchange' },
          { value: 'supervisorName', label: 'Supervisor' },
          { value: 'email', label: 'Email' }
        ];
      case 'fiberPaths':
        return [
          { value: 'linkName', label: 'Link Name' },
          { value: 'nodeA', label: 'Node A' },
          { value: 'nodeB', label: 'Node B' },
          { value: 'nodeASectionOwner', label: 'Node A Owner' },
          { value: 'nodeBSectionOwner', label: 'Node B Owner' }
        ];
      case 'codes':
        return [
          { value: 'title', label: 'Title' },
          { value: 'equipmentName', label: 'Equipment Name' }
        ];
      case 'credentials':
        return [
          { value: 'title', label: 'Title' },
          { value: 'type', label: 'Type' },
          { value: 'username', label: 'Username' }
        ];
      default:
        return [];
    }
  };

  // Update the filter handling
  const handleFilterColumnChange = (value: string) => {
    switch (activeSection) {
      case 'contacts':
        setContactFilters(prev => ({ ...prev, column: value as keyof Contact, value: 'all' }));
        break;
      case 'fiberPaths':
        setFiberPathFilters(prev => ({ ...prev, column: value as keyof FiberPath, value: 'all' }));
        break;
      case 'codes':
        setCodeFilters(prev => ({ ...prev, column: value as keyof Code, value: 'all' }));
        break;
      case 'credentials':
        setCredentialFilters(prev => ({ ...prev, column: value as keyof Credential, value: 'all' }));
        break;
    }
  };

  const handleFilterValueChange = (value: string) => {
    switch (activeSection) {
      case 'contacts':
        setContactFilters(prev => ({ ...prev, value }));
        break;
      case 'fiberPaths':
        setFiberPathFilters(prev => ({ ...prev, value }));
        break;
      case 'codes':
        setCodeFilters(prev => ({ ...prev, value }));
        break;
      case 'credentials':
        setCredentialFilters(prev => ({ ...prev, value }));
        break;
    }
  };

  // Filter data based on search query and section-specific filters
  const getFilteredData = () => {
    const query = searchQuery.toLowerCase().trim();
    
    switch (activeSection) {
      case 'contacts':
        return contacts.filter(contact => {
          // First check if it matches the search query
          const searchFields = [
            contact.name,
            contact.number,
            contact.backupNumber,
            contact.exchangeName,
            contact.supervisorName,
            contact.designation,
            contact.department,
            contact.email,
            contact.remarks
          ];
          
          const matchesSearch = query === '' || searchFields.some(field => 
            field && field.toString().toLowerCase().includes(query)
          );

          // Then check if it matches the filter
          const filterField = contact[contactFilters.column];
          const matchesFilter = contactFilters.value === 'all' || 
            (filterField && filterField.toString().toLowerCase() === contactFilters.value.toLowerCase());

          return matchesSearch && matchesFilter;
        });

      case 'fiberPaths':
        return fiberPaths.filter(path => {
          // First check if it matches the search query
          const searchFields = [
            path.linkName,
            path.nodeA,
            path.nodeB,
            path.nodeASectionLength,
            path.nodeBSectionLength,
            path.nodeASectionOwner,
            path.nodeBSectionOwner,
            path.remarks
          ];
          
          const matchesSearch = query === '' || searchFields.some(field => 
            field && field.toString().toLowerCase().includes(query)
          );

          // Then check if it matches the filter
          const filterField = path[fiberPathFilters.column];
          const matchesFilter = fiberPathFilters.value === 'all' || 
            (filterField && filterField.toString().toLowerCase() === fiberPathFilters.value.toLowerCase());

          return matchesSearch && matchesFilter;
        });

      case 'codes':
        return codes.filter(code => {
          // First check if it matches the search query
          const searchFields = [
            code.title,
            code.equipmentName,
            code.code
          ];
          
          const matchesSearch = query === '' || searchFields.some(field => 
            field && field.toString().toLowerCase().includes(query)
          );

          // Then check if it matches the filter
          const filterField = code[codeFilters.column];
          const matchesFilter = codeFilters.value === 'all' || 
            (filterField && filterField.toString().toLowerCase() === codeFilters.value.toLowerCase());

          return matchesSearch && matchesFilter;
        });

      case 'credentials':
        return credentials.filter(cred => {
          // First check if it matches the search query
          const searchFields = [
            cred.title,
            cred.username,
            cred.type,
            cred.remarks
          ];
          
          const matchesSearch = query === '' || searchFields.some(field => 
            field && field.toString().toLowerCase().includes(query)
          );

          // Then check if it matches the filter
          const filterField = cred[credentialFilters.column];
          const matchesFilter = credentialFilters.value === 'all' || 
            (filterField && filterField.toString().toLowerCase() === credentialFilters.value.toLowerCase());

          return matchesSearch && matchesFilter;
        });

      case 'customList':
        return customLists.filter(list => 
          query === '' || list.title.toLowerCase().includes(query)
        );

      default:
        return [];
    }
  };

  // Handle edit item
  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData(item);
    setShowForm(true);
  };

  // Initialize form data when opening form
  const handleOpenForm = () => {
    setShowForm(true);
    setEditingItem(null);
    switch (activeSection) {
      case 'contacts':
        setFormData({
          name: '',
          number: '',
          backupNumber: '',
          exchangeName: '',
          supervisorName: '',
          remarks: ''
        });
        break;
      case 'fiberPaths':
        setFormData({
          linkName: '',
          nodeA: '',
          nodeB: '',
          nodeASectionLength: '',
          nodeBSectionLength: '',
          nodeASectionOwner: '',
          nodeBSectionOwner: '',
          remarks: ''
        });
        break;
      case 'codes':
        setFormData({
          title: '',
          equipmentName: '',
          code: ''
        });
        break;
      case 'credentials':
        setFormData({
          title: '',
          username: '',
          password: '',
          type: '',
          remarks: ''
        });
        break;
      case 'customList':
        setFormData({
          title: '',
          fields: {}
        });
        break;
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      switch (itemToDelete.type) {
        case 'contact':
          await deleteDoc(doc(db, 'contacts', itemToDelete.id));
          setContacts(contacts.filter(c => c.id !== itemToDelete.id));
          break;
        case 'fiberPath':
          await deleteDoc(doc(db, 'fiber_paths', itemToDelete.id));
          setFiberPaths(fiberPaths.filter(p => p.id !== itemToDelete.id));
          break;
        case 'code':
          await deleteDoc(doc(db, 'codes', itemToDelete.id));
          setCodes(codes.filter(c => c.id !== itemToDelete.id));
          break;
        case 'credential':
          await deleteDoc(doc(db, 'credentials', itemToDelete.id));
          setCredentials(credentials.filter(c => c.id !== itemToDelete.id));
          break;
        case 'customList':
          await deleteDoc(doc(db, 'custom_lists', itemToDelete.id));
          setCustomLists(customLists.filter(l => l.id !== itemToDelete.id));
          break;
      }
      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const contactsRef = collection(db, 'contacts');
      const q = query(contactsRef, orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const fetchedContacts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Contact[];

      setContacts(fetchedContacts);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch contacts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const departments = Array.from(new Set(contacts.map(contact => contact.department)));

  const handleSelectContact = (contactId: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedContacts.size === contacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(contacts.map(contact => contact.id)));
    }
  };

  // Memoize filtered data to prevent unnecessary recalculations
  const filteredData = useMemo(() => getFilteredData(), [
    activeSection,
    contacts,
    fiberPaths,
    codes,
    credentials,
    searchQuery,
    contactFilters,
    fiberPathFilters,
    codeFilters,
    credentialFilters
  ]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
        <button 
          className="btn btn-primary"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <NavBar />
      <div className="container database-container bg-[#FFF8E8] min-h-screen" style={{ paddingTop: '32px' }}>
        <div className="page-container">
          <div className="card slide-in">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-800">Database</h1>
              <Link href="/">
                <button className="btn btn-primary">
                  <span className="icon">🏠</span>
                  Back to Home
                </button>
              </Link>
            </div>
          </div>

          <div className="card mt-4">
            {/* Navigation Tabs */}
            <div className="flex gap-4 p-4 rounded-lg mb-6 database-section-tabs" style={{ backgroundColor: '#fffbeb' }}>
              {sections.map(section => (
                <Tab
                  key={section.id}
                  label={section.label}
                  icon={section.id === 'contacts' ? '👥' : section.id === 'fiberPaths' ? '🔌' : section.id === 'codes' ? '💻' : section.id === 'credentials' ? '🔑' : '📝'}
                  active={activeSection === section.id}
                  onClick={() => setActiveSection(section.id as Section)}
                />
              ))}
            </div>

            {/* Create Button and Search/Filter Bar */}
            <div className="controls-container">
              <div className="flex flex-col gap-4 w-full">
                <div className="flex justify-between items-center">
                  <button 
                    className="create-button bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
                    onClick={handleOpenForm}
                  >
                    <span className="text-xl font-bold">+</span>
                    {getCreateButtonText()}
                  </button>
                  
                  <div className="search-filter-container">
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {activeSection !== 'customList' && (
                      <>
                        <select
                          className="filter-select"
                          value={
                            activeSection === 'contacts' ? contactFilters.column :
                            activeSection === 'fiberPaths' ? fiberPathFilters.column :
                            activeSection === 'codes' ? codeFilters.column :
                            activeSection === 'credentials' ? credentialFilters.column :
                            ''
                          }
                          onChange={(e) => handleFilterColumnChange(e.target.value)}
                        >
                          {getFilterColumns().map(column => (
                            <option key={column.value} value={column.value}>{column.label}</option>
                          ))}
                        </select>
                        <select
                          className="filter-select"
                          value={
                            activeSection === 'contacts' ? contactFilters.value :
                            activeSection === 'fiberPaths' ? fiberPathFilters.value :
                            activeSection === 'codes' ? codeFilters.value :
                            activeSection === 'credentials' ? credentialFilters.value :
                            'all'
                          }
                          onChange={(e) => handleFilterValueChange(e.target.value)}
                        >
                          <option value="all">All {
                            activeSection === 'contacts' ? contactFilters.column :
                            activeSection === 'fiberPaths' ? fiberPathFilters.column :
                            activeSection === 'codes' ? codeFilters.column :
                            activeSection === 'credentials' ? credentialFilters.column :
                            ''
                          }s</option>
                          {getFilterOptions().map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>
                </div>

                {/* Add BulkActions component for contacts section */}
                {activeSection === 'contacts' && (
                  <BulkActions 
                    contacts={contacts} 
                    onRefresh={fetchContacts}
                    selectedContacts={selectedContacts}
                    onSelectContact={handleSelectContact}
                    onSelectAll={handleSelectAll}
                  />
                )}
              </div>
            </div>

            {/* Content Area */}
            <div className="content-area">
              {getCurrentDataLength() === 0 ? (
                <div className="empty-state">
                  <p>No records found. Click '{getCreateButtonText()}' to create a new entry.</p>
                </div>
              ) : (
                <>
                  {activeSection === 'contacts' && (
                    <ContactsSection
                      contacts={filteredData as Contact[]}
                      onSave={async (contact) => {
                        const docRef = await addDoc(collection(db, 'contacts'), contact as any);
                        const newContacts = [...contacts, { ...contact, id: docRef.id }];
                        setContacts(newContacts);
                      }}
                      onUpdate={async (contact) => {
                        await updateDoc(doc(db, 'contacts', contact.id), contact as any);
                        setContacts(contacts.map(c => c.id === contact.id ? contact : c));
                      }}
                      onDelete={async (id) => {
                        const contact = contacts.find(c => c.id === id);
                        if (contact) {
                          setItemToDelete({ id, name: contact.name, type: 'contact' });
                          setShowDeleteModal(true);
                        }
                      }}
                      onEdit={(contact) => {
                        setEditingItem(contact);
                        setFormData(contact);
                        setShowForm(true);
                      }}
                      selectedContacts={selectedContacts}
                      onSelectContact={handleSelectContact}
                      onSelectAll={handleSelectAll}
                    />
                  )}
                  {activeSection === 'fiberPaths' && (
                    <FiberPathsSection
                      paths={filteredData as FiberPath[]}
                      onSave={async (path) => {
                        const docRef = await addDoc(collection(db, 'fiber_paths'), path as any);
                        const newPaths = [...fiberPaths, { ...path, id: docRef.id }];
                        setFiberPaths(newPaths);
                      }}
                      onUpdate={async (path) => {
                        await updateDoc(doc(db, 'fiber_paths', path.id), path as any);
                        setFiberPaths(fiberPaths.map(p => p.id === path.id ? path : p));
                      }}
                      onDelete={async (id) => {
                        const path = fiberPaths.find(p => p.id === id);
                        if (path) {
                          setItemToDelete({ id, name: path.linkName, type: 'fiberPath' });
                          setShowDeleteModal(true);
                        }
                      }}
                      onEdit={(path) => {
                        setEditingItem(path);
                        setFormData(path);
                        setShowForm(true);
                      }}
                    />
                  )}
                  {activeSection === 'codes' && (
                    <CodesSection
                      codes={filteredData as Code[]}
                      onSave={async (code) => {
                        const docRef = await addDoc(collection(db, 'codes'), code as any);
                        const newCodes = [...codes, { ...code, id: docRef.id }];
                        setCodes(newCodes);
                      }}
                      onUpdate={async (code) => {
                        await updateDoc(doc(db, 'codes', code.id), code as any);
                        setCodes(codes.map(c => c.id === code.id ? code : c));
                      }}
                      onDelete={async (id) => {
                        const code = codes.find(c => c.id === id);
                        if (code) {
                          setItemToDelete({ id, name: code.title, type: 'code' });
                          setShowDeleteModal(true);
                        }
                      }}
                    />
                  )}
                  {activeSection === 'credentials' && (
                    <CredentialsSection
                      credentials={filteredData as Credential[]}
                      onSave={async (credential) => {
                        const docRef = await addDoc(collection(db, 'credentials'), credential as any);
                        const newCredentials = [...credentials, { ...credential, id: docRef.id }];
                        setCredentials(newCredentials);
                      }}
                      onUpdate={async (credential) => {
                        await updateDoc(doc(db, 'credentials', credential.id), credential as any);
                        setCredentials(credentials.map(c => c.id === credential.id ? credential : c));
                      }}
                      onDelete={async (id) => {
                        const credential = credentials.find(c => c.id === id);
                        if (credential) {
                          setItemToDelete({ id, name: credential.title, type: 'credential' });
                          setShowDeleteModal(true);
                        }
                      }}
                    />
                  )}
                  {activeSection === 'customList' && (
                    <CustomListSection
                      lists={filteredData as CustomList[]}
                      onSave={async (list) => {
                        const docRef = await addDoc(collection(db, 'custom_lists'), {
                          ...list,
                          createdAt: new Date(),
                          updatedAt: new Date()
                        } as any);
                        const newLists = [...customLists, { ...list, id: docRef.id }];
                        setCustomLists(newLists);
                      }}
                      onUpdate={async (list) => {
                        await updateDoc(doc(db, 'custom_lists', list.id), {
                          ...list,
                          updatedAt: new Date()
                        } as any);
                        setCustomLists(customLists.map(l => l.id === list.id ? list : l));
                      }}
                      onDelete={async (id) => {
                        const list = customLists.find(l => l.id === id);
                        if (list) {
                          setItemToDelete({ id, name: list.title, type: 'customList' });
                          setShowDeleteModal(true);
                        }
                      }}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          <Modal
            isOpen={showForm}
            onClose={() => {
              setShowForm(false);
              setEditingItem(null);
              setFormData({});
            }}
            title={getFormTitle()}
          >
            <form onSubmit={handleSubmit}>
              {renderFormFields()}
              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowForm(false);
                    setEditingItem(null);
                    setFormData({});
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : editingItem ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </Modal>

          {/* Delete Confirmation Modal */}
          <Modal
            isOpen={showDeleteModal}
            onClose={() => {
              setShowDeleteModal(false);
              setItemToDelete(null);
            }}
            title="Confirm Delete"
          >
            <div className="delete-confirm">
              <p>Are you sure you want to delete {itemToDelete?.name}?</p>
              <div className="button-group">
                <button className="btn btn-danger" onClick={handleDelete}>
                  Yes, Delete
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowDeleteModal(false);
                    setItemToDelete(null);
                  }}
                >
                  No, Cancel
                </button>
              </div>
            </div>
          </Modal>
        </div>
      </div>

      <style jsx>{`
        .controls-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          gap: 1rem;
          padding: 0 1rem;
        }

        .create-button {
          min-width: 160px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-size: 0.95rem;
          border: none;
          cursor: pointer;
          outline: none;
        }

        .create-button:active {
          transform: scale(0.98);
        }

        .search-filter-container {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .search-input,
        .filter-select {
          padding: 0.5rem 1rem;
          border: 2px solid #D4C9A8;
          border-radius: 0.5rem;
          background-color: #FFF8E8;
          color: #4A4637;
          font-size: 0.95rem;
          outline: none;
          transition: all 0.2s;
        }

        .search-input:focus,
        .filter-select:focus {
          border-color: #A0522D;
          box-shadow: 0 0 0 2px rgba(160, 82, 45, 0.1);
        }

        @media (max-width: 768px) {
          .controls-container {
            flex-direction: column;
            align-items: stretch;
          }

          .search-filter-container {
            flex-direction: column;
          }

          .create-button,
          .search-input,
          .filter-select {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
} 