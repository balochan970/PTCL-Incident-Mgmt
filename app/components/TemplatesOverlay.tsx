import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';

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
    fsp: ''
  });

  useEffect(() => {
    fetchTemplates();
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
        alert('Template title is required');
        return;
      }

      // Check if template with same title exists
      const templatesRef = collection(db, 'faultTemplates');
      const titleQuery = query(templatesRef, where('title', '==', formData.title));
      const titleSnapshot = await getDocs(titleQuery);

      if (!editingTemplate && !titleSnapshot.empty) {
        alert('A template with this title already exists');
        return;
      }

      if (editingTemplate) {
        // Update existing template
        const templateRef = doc(db, 'faultTemplates', editingTemplate.id);
        await updateDoc(templateRef, formData);
      } else {
        // Create new template
        await addDoc(templatesRef, formData);
      }

      await fetchTemplates();
      resetForm();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'faultTemplates', templateId));
      await fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
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
      fsp: template.fsp || ''
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
      fsp: ''
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
    <div className="templates-overlay">
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
          width: 400px;
          background: #FFF8E8;
          border-right: 2px solid #D4C9A8;
          padding: 1.5rem;
          overflow-y: auto;
          box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
          z-index: 1000;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }

        .templates-header {
          margin-bottom: 1.5rem;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .header-content h2 {
          margin: 0;
          color: #4A4637;
          font-size: 1.2rem;
          font-weight: 600;
        }

        .close-btn {
          background: none;
          border: none;
          color: #4A4637;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.25rem;
          line-height: 1;
          transition: color 0.2s;
        }

        .close-btn:hover {
          color: #635C48;
        }

        .search-bar {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .search-input {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid #D4C9A8;
          border-radius: 4px;
          font-size: 0.9rem;
          background: white;
        }

        .search-input:focus {
          outline: none;
          border-color: #4A4637;
        }

        .create-template-btn {
          background: #4A4637;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: background 0.2s;
          white-space: nowrap;
        }

        .create-template-btn:hover {
          background: #635C48;
        }

        .template-form {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          border: 1px solid #D4C9A8;
        }

        .template-form h3 {
          margin: 0 0 1rem 0;
          color: #4A4637;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .form-input {
          width: 100%;
          padding: 0.5rem;
          margin-bottom: 1rem;
          border: 1px solid #D4C9A8;
          border-radius: 4px;
          font-size: 0.9rem;
          background: #FFF8E8;
        }

        .form-input:focus {
          outline: none;
          border-color: #4A4637;
        }

        .form-select {
          width: 100%;
          padding: 0.5rem;
          margin-bottom: 1rem;
          border: 1px solid #D4C9A8;
          border-radius: 4px;
          font-size: 0.9rem;
          background: #FFF8E8;
        }

        .form-select:focus {
          outline: none;
          border-color: #4A4637;
        }

        .button-group {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
        }

        .btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #4A4637;
          color: white;
        }

        .btn-primary:hover {
          background: #635C48;
        }

        .btn-secondary {
          background: #D4C9A8;
          color: #4A4637;
        }

        .btn-secondary:hover {
          background: #C2B696;
        }

        .btn-danger {
          background: #DC3545;
          color: white;
        }

        .btn-danger:hover {
          background: #C82333;
        }

        .templates-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .template-item {
          background: white;
          padding: 1rem;
          border-radius: 8px;
          border: 1px solid #D4C9A8;
        }

        .template-info h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1rem;
          color: #4A4637;
        }

        .template-info p {
          margin: 0.25rem 0;
          font-size: 0.9rem;
          color: #666;
        }

        .template-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        @media (max-width: 768px) {
          .templates-overlay {
            width: 100%;
          }

          .search-bar {
            flex-direction: column;
          }

          .create-template-btn {
            width: 100%;
          }

          .search-input {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
} 