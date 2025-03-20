import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { showNotification } from './CustomNotification';

// Import the exchanges array
const exchanges = [
  "EPZA", "GADAP", "GULISTAN-e-JAUHAR", "GULSHAN-e-HADEED", "GULSHAN-e-MEHRAN",
  "KAP", "KATHORE", "LANDHI", "MALIR CANTT", "MEMON GOTH", "MMC", "PAK CAPITAL", "PORT QASIM", "SHAH LATIF"
];

interface Template {
  id: string;
  title: string;
  domain?: string;
  equipmentType?: string;
  exchangeName?: string;
  faultType?: string;
  nodeA?: string;
  nodeB?: string;
  fdh?: string;
  fat?: string;
  oltIp?: string;
  fsp?: string;
  stakeholders?: string[];
  remarks?: string;
}

interface TemplatesOverlayProps {
  onClose: () => void;
  onApplyTemplate: (template: Template) => void;
}

export default function TemplatesOverlay({ onClose, onApplyTemplate }: TemplatesOverlayProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState<Omit<Template, 'id'>>({
    title: '',
    domain: '',
    equipmentType: '',
    exchangeName: '',
    faultType: '',
    nodeA: '',
    nodeB: '',
    fdh: '',
    fat: '',
    oltIp: '',
    fsp: '',
    stakeholders: [],
    remarks: ''
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Add useEffect to auto-focus the overlay when component mounts
  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.focus();
    }
  }, []);

  const fetchTemplates = async () => {
    try {
      // Only use faultTemplates collection to ensure single source of truth
      const templatesRef = collection(db, 'faultTemplates');
      const snapshot = await getDocs(templatesRef);
      const fetchedTemplates = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Template[];
      setTemplates(fetchedTemplates);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      if (!formData.title) {
        showNotification('Template title is required', { variant: 'warning' });
        return;
      }

      // Check if template with same title exists
      const templatesRef = collection(db, 'faultTemplates');
      const titleQuery = query(templatesRef, where('title', '==', formData.title));
      const titleSnapshot = await getDocs(titleQuery);

      if (!editingTemplate && !titleSnapshot.empty) {
        showNotification('A template with this title already exists', { variant: 'warning' });
        return;
      }

      const templateData = {
        ...formData,
        // Ensure all fields are properly formatted
        fdh: formData.fdh || '',
        fat: formData.fat || '',
        oltIp: formData.oltIp || '',
        fsp: formData.fsp || '',
        stakeholders: formData.stakeholders || [],
        remarks: formData.remarks || ''
      };

      if (editingTemplate) {
        // Update existing template
        const templateRef = doc(db, 'faultTemplates', editingTemplate.id);
        await updateDoc(templateRef, templateData);
        showNotification('Template updated successfully', { variant: 'success' });
      } else {
        // Create new template
        await addDoc(templatesRef, templateData);
        showNotification('Template created successfully', { variant: 'success' });
      }

      await fetchTemplates();
      resetForm();
    } catch (error) {
      console.error('Error saving template:', error);
      showNotification('Failed to save template', { variant: 'error' });
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'faultTemplates', templateId));
      await fetchTemplates();
      showNotification('Template deleted successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error deleting template:', error);
      showNotification('Failed to delete template', { variant: 'error' });
    }
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      title: template.title,
      domain: template.domain || '',
      equipmentType: template.equipmentType || '',
      exchangeName: template.exchangeName || '',
      faultType: template.faultType || '',
      nodeA: template.nodeA || '',
      nodeB: template.nodeB || '',
      fdh: template.fdh || '',
      fat: template.fat || '',
      oltIp: template.oltIp || '',
      fsp: template.fsp || '',
      stakeholders: template.stakeholders || [],
      remarks: template.remarks || ''
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      domain: '',
      equipmentType: '',
      exchangeName: '',
      faultType: '',
      nodeA: '',
      nodeB: '',
      fdh: '',
      fat: '',
      oltIp: '',
      fsp: '',
      stakeholders: [],
      remarks: ''
    });
    setEditingTemplate(null);
    setShowForm(false);
  };

  const filteredTemplates = templates.filter(template => {
    const searchLower = searchQuery.toLowerCase();
    return (
      template.title.toLowerCase().includes(searchLower) ||
      template.domain?.toLowerCase().includes(searchLower) ||
      template.equipmentType?.toLowerCase().includes(searchLower) ||
      template.exchangeName?.toLowerCase().includes(searchLower) ||
      template.faultType?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div 
      className="templates-overlay"
      tabIndex={0}
      ref={overlayRef}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
    >
      <div className="templates-header">
        <div className="header-content">
          <h2>Templates</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="search-bar">
          <button className="create-template-btn" onClick={() => setShowForm(true)}>
            + Create Template
          </button>
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {showForm && (
        <div className="template-form">
          <h3>{editingTemplate ? 'Edit Template' : 'Create New Template'}</h3>
          <input
            type="text"
            placeholder="Template Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="form-input"
          />
          
          {/* Domain Dropdown */}
          <select
            value={formData.domain}
            onChange={(e) => setFormData({ ...formData, domain: e.target.value, equipmentType: '' })}
            className="form-select"
          >
            <option value="">Select Domain</option>
            <option value="Switch/Access">Switch/Access</option>
            <option value="Transport/Transmission">Transport/Transmission</option>
          </select>

          {/* Equipment Type Dropdown */}
          <select
            value={formData.equipmentType}
            onChange={(e) => setFormData({ ...formData, equipmentType: e.target.value })}
            className="form-select"
          >
            <option value="">Select Equipment Type</option>
            {formData.domain === 'Switch/Access' && (
              <>
                <option value="UA5000 IPMD">UA5000 IPMD</option>
                <option value="UA5000 PVMD">UA5000 PVMD</option>
                <option value="HYBRID ma5600t">HYBRID ma5600t</option>
                <option value="GPON ma5800">GPON ma5800</option>
                <option value="MINI MSAG ma5616/ma52aa">MINI MSAG ma5616/ma52aa</option>
                <option value="MINI OLT ma5608">MINI OLT ma5608</option>
              </>
            )}
            {formData.domain === 'Transport/Transmission' && (
              <>
                <option value="OFAN-3">OFAN-3</option>
                <option value="DWDM">DWDM</option>
                <option value="NOKIA">NOKIA</option>
                <option value="OTN">OTN</option>
                <option value="PTN">PTN</option>
                <option value="UFONE BTS">UFONE BTS</option>
                <option value="ACCESS">ACCESS</option>
                <option value="ACCESS-PTN">ACCESS-PTN</option>
                <option value="SPUR">SPUR</option>
              </>
            )}
          </select>

          {/* Exchange Name Dropdown */}
          <select
            value={formData.exchangeName}
            onChange={(e) => setFormData({ ...formData, exchangeName: e.target.value })}
            className="form-select"
          >
            <option value="">Select Exchange</option>
            {exchanges.map((exchange) => (
              <option key={exchange} value={exchange}>{exchange}</option>
            ))}
          </select>

          {/* Fault Type Dropdown */}
          <select
            value={formData.faultType}
            onChange={(e) => setFormData({ ...formData, faultType: e.target.value })}
            className="form-select"
          >
            <option value="">Select Fault Type</option>
            <option value="Fiber Break">Fiber Break</option>
            <option value="Low Power">Low Power</option>
            <option value="Outage">Outage</option>
            <option value="Power Outage">Power Outage</option>
            <option value="Corporate Fault">Corporate Fault</option>
            <option value="MMBB Fault">MMBB Fault</option>
          </select>

          {/* Keep existing fields */}
          <input
            type="text"
            placeholder="Node A"
            value={formData.nodeA}
            onChange={(e) => setFormData({ ...formData, nodeA: e.target.value })}
            className="form-input"
          />
          <input
            type="text"
            placeholder="Node B"
            value={formData.nodeB}
            onChange={(e) => setFormData({ ...formData, nodeB: e.target.value })}
            className="form-input"
          />
          <input
            type="text"
            placeholder="FDH"
            value={formData.fdh}
            onChange={(e) => setFormData({ ...formData, fdh: e.target.value })}
            className="form-input"
          />
          <input
            type="text"
            placeholder="FAT"
            value={formData.fat}
            onChange={(e) => setFormData({ ...formData, fat: e.target.value })}
            className="form-input"
          />
          <input
            type="text"
            placeholder="OLT IP"
            value={formData.oltIp}
            onChange={(e) => setFormData({ ...formData, oltIp: e.target.value })}
            className="form-input"
          />
          <input
            type="text"
            placeholder="F/S/P"
            value={formData.fsp}
            onChange={(e) => setFormData({ ...formData, fsp: e.target.value })}
            className="form-input"
          />

          <div className="button-group">
            <button className="btn btn-primary" onClick={handleCreateTemplate}>
              {editingTemplate ? 'Update Template' : 'Save Template'}
            </button>
            <button className="btn btn-secondary" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="templates-list">
        {filteredTemplates.map((template) => (
          <div key={template.id} className="template-item">
            <div className="template-info">
              <h3>{template.title}</h3>
              {template.domain && <p>Domain: {template.domain}</p>}
              {template.equipmentType && <p>Equipment: {template.equipmentType}</p>}
              {template.faultType && <p>Fault Type: {template.faultType}</p>}
            </div>
            <div className="template-actions">
              <button
                className="btn btn-primary"
                onClick={() => onApplyTemplate(template)}
              >
                Apply
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => handleEdit(template)}
              >
                Edit
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleDeleteTemplate(template.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .templates-overlay {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: 350px;
          background: #ffffff;
          border-right: 1px solid #e2e8f0;
          padding: 1rem;
          overflow-y: auto;
          box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
          z-index: 1000;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .templates-header {
          margin-bottom: 1rem;
          position: sticky;
          top: 0;
          background: #ffffff;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #e2e8f0;
          z-index: 2;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .header-content h2 {
          margin: 0;
          color: #1a202c;
          font-size: 1.5rem;
          font-weight: 600;
          letter-spacing: -0.025em;
        }

        .close-btn {
          background: none;
          border: none;
          color: #4a5568;
          font-size: 1.75rem;
          cursor: pointer;
          padding: 0.5rem;
          line-height: 1;
          transition: all 0.2s;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-btn:hover {
          background: #f7fafc;
          color: #2d3748;
        }

        .search-bar {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        .search-input {
          flex: 1;
          padding: 0.4rem 0.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          font-size: 0.875rem;
        }

        .create-template-btn {
          padding: 0.4rem 0.75rem;
          font-size: 0.875rem;
          background: #22c55e;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-weight: 500;
        }

        .create-template-btn:hover {
          background: #16a34a;
        }

        .create-template-btn:active {
          background: #15803d;
        }

        .template-form {
          background: #ffffff;
          padding: 0.75rem;
          border-radius: 6px;
          margin-bottom: 1rem;
          border: 1px solid #e2e8f0;
        }

        .template-form h3 {
          margin: 0 0 0.75rem 0;
          font-size: 1rem;
          color: #2d3748;
          font-weight: 500;
        }

        .form-input, .form-select {
          width: 100%;
          padding: 0.4rem 0.5rem;
          margin-bottom: 0.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          font-size: 0.875rem;
          background: #ffffff;
        }

        .button-group {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
          margin-top: 0.75rem;
        }

        .btn {
          padding: 0.4rem 0.75rem;
          font-size: 0.875rem;
        }

        .btn-primary {
          background: #3182ce;
          color: white;
        }

        .btn-primary:hover {
          background: #2c5282;
        }

        .btn-secondary {
          background: #edf2f7;
          color: #2d3748;
        }

        .btn-secondary:hover {
          background: #e2e8f0;
        }

        .btn-danger {
          background: #f56565;
          color: white;
        }

        .btn-danger:hover {
          background: #c53030;
        }

        .templates-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding-bottom: 2rem;
        }

        .template-item {
          padding: 0.5rem;
          margin-bottom: 0.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .template-info {
          flex: 1;
        }

        .template-info h3 {
          margin: 0;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .template-info p {
          margin: 0.25rem 0 0 0;
          font-size: 0.75rem;
          color: #718096;
        }

        .template-actions {
          display: flex;
          gap: 0.25rem;
        }

        .template-actions .btn {
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
        }

        @media (max-width: 768px) {
          .templates-overlay {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
} 