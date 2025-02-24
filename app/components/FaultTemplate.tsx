import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';

interface Template {
  id: string;
  name: string;
  domain: string;
  equipmentType: string;
  faultType: string;
  nodes: {
    nodeA: string;
    nodeB: string;
    nodeC?: string;
    nodeD?: string;
  };
  stakeholders: string[];
  priority: 'High' | 'Medium' | 'Low';
}

interface FaultTemplateProps {
  onApplyTemplate: (template: Omit<Template, 'id' | 'name'>) => void;
  currentDomain: string;
}

export default function FaultTemplate({ onApplyTemplate, currentDomain }: FaultTemplateProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [currentTemplate, setCurrentTemplate] = useState<Omit<Template, 'id' | 'name'> | null>(null);

  // Fetch templates from Firestore
  useEffect(() => {
    const fetchTemplates = async () => {
      const templatesRef = collection(db, 'faultTemplates');
      const snapshot = await getDocs(templatesRef);
      const fetchedTemplates = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Template[];
      setTemplates(fetchedTemplates);
    };

    fetchTemplates();
  }, []);

  // Save new template
  const handleSaveTemplate = async (templateData: Omit<Template, 'id'>) => {
    try {
      const templatesRef = collection(db, 'faultTemplates');
      await addDoc(templatesRef, templateData);
      alert('Template saved successfully!');
      setShowSaveForm(false);
      setNewTemplateName('');
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    }
  };

  // Delete template
  const handleDeleteTemplate = async (templateId: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      try {
        await deleteDoc(doc(db, 'faultTemplates', templateId));
        setTemplates(templates.filter(t => t.id !== templateId));
        alert('Template deleted successfully!');
      } catch (error) {
        console.error('Error deleting template:', error);
        alert('Failed to delete template');
      }
    }
  };

  return (
    <div className="template-container">
      <div className="template-header">
        <h3>Fault Templates</h3>
        <button 
          className="btn btn-secondary"
          onClick={() => setShowSaveForm(!showSaveForm)}
        >
          {showSaveForm ? 'Cancel' : 'Save Current as Template'}
        </button>
      </div>

      {showSaveForm && (
        <div className="save-template-form">
          <input
            type="text"
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
            placeholder="Template Name"
            className="form-input"
          />
          <button 
            className="btn btn-primary"
            onClick={() => currentTemplate && handleSaveTemplate({
              ...currentTemplate,
              name: newTemplateName
            })}
          >
            Save Template
          </button>
        </div>
      )}

      <div className="templates-list">
        {templates
          .filter(template => template.domain === currentDomain)
          .map(template => (
            <div key={template.id} className="template-item">
              <div className="template-info">
                <h4>{template.name}</h4>
                <p>Type: {template.faultType}</p>
                <p>Equipment: {template.equipmentType}</p>
                <p className={`priority priority-${template.priority.toLowerCase()}`}>
                  Priority: {template.priority}
                </p>
              </div>
              <div className="template-actions">
                <button 
                  className="btn btn-primary"
                  onClick={() => onApplyTemplate({
                    domain: template.domain,
                    equipmentType: template.equipmentType,
                    faultType: template.faultType,
                    nodes: template.nodes,
                    stakeholders: template.stakeholders,
                    priority: template.priority
                  })}
                >
                  Apply
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
        .template-container {
          background-color: #fff;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .template-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .save-template-form {
          display: flex;
          gap: 10px;
          margin-bottom: 16px;
        }

        .templates-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }

        .template-item {
          border: 1px solid #ddd;
          border-radius: 6px;
          padding: 12px;
          background-color: #f8f9fa;
        }

        .template-info h4 {
          margin: 0 0 8px 0;
          color: #333;
        }

        .template-info p {
          margin: 4px 0;
          color: #666;
          font-size: 0.9rem;
        }

        .template-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }

        .priority {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .priority-high {
          background-color: #ffd7d7;
          color: #d63031;
        }

        .priority-medium {
          background-color: #ffeaa7;
          color: #fdcb6e;
        }

        .priority-low {
          background-color: #c8ffc8;
          color: #00b894;
        }
      `}</style>
    </div>
  );
} 