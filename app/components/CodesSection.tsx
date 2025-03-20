import { useState } from 'react';
import { showNotification } from './CustomNotification';

interface Code {
  id: string;
  title: string;
  equipmentName: string;
  code: string;
}

interface CodesSectionProps {
  codes: Code[];
  onSave: (code: Code) => void;
  onUpdate: (code: Code) => void;
  onDelete: (id: string) => void;
}

export default function CodesSection({
  codes,
  onSave,
  onUpdate,
  onDelete
}: CodesSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingCode, setEditingCode] = useState<Code | null>(null);
  const [formData, setFormData] = useState<Omit<Code, 'id'>>({
    title: '',
    equipmentName: '',
    code: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCode) {
      onUpdate({ ...formData, id: editingCode.id });
    } else {
      onSave({ ...formData, id: Date.now().toString() });
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      title: '',
      equipmentName: '',
      code: ''
    });
    setEditingCode(null);
    setShowForm(false);
  };

  const handleEdit = (code: Code) => {
    setEditingCode(code);
    setFormData(code);
    setShowForm(true);
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    showNotification('Code copied to clipboard!', { variant: 'success' });
  };

  return (
    <div className="codes-section">
      {/* Form */}
      {showForm && (
        <div className="form-container">
          <h3>{editingCode ? 'Edit Code' : 'Create Code'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Code Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="form-input"
                  placeholder="Enter a descriptive title"
                />
              </div>

              <div className="form-group">
                <label>Equipment Name</label>
                <input
                  type="text"
                  value={formData.equipmentName}
                  onChange={(e) => setFormData({ ...formData, equipmentName: e.target.value })}
                  required
                  className="form-input"
                  placeholder="Enter equipment name"
                />
              </div>

              <div className="form-group full-width">
                <label>Code</label>
                <textarea
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                  className="form-input code-input"
                  rows={5}
                  placeholder="Enter the code here"
                />
              </div>
            </div>

            <div className="button-group">
              <button type="submit" className="btn btn-primary">
                {editingCode ? 'Update' : 'Save'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="codes-list">
        <div className="grid">
          {codes.map(code => (
            <div key={code.id} className="code-card">
              <div className="code-header">
                <h4>{code.title}</h4>
                <div className="code-actions">
                  <button
                    className="btn btn-small btn-primary mr-2"
                    onClick={() => handleEdit(code)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-small btn-danger"
                    onClick={() => onDelete(code.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="code-info">
                <span className="equipment-name">Equipment: {code.equipmentName}</span>
              </div>
              <div className="code-content">
                <pre>{code.code}</pre>
                <button
                  className="btn btn-small btn-secondary copy-btn"
                  onClick={() => handleCopy(code.code)}
                >
                  Copy Code
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .codes-section {
          width: 100%;
        }

        .form-container {
          background: white;
          padding: 1.5rem;
          border-radius: 0.5rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .full-width {
          grid-column: 1 / -1;
        }

        .form-input {
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 0.25rem;
          font-size: 0.9rem;
        }

        .code-input {
          font-family: monospace;
          white-space: pre;
          resize: vertical;
        }

        .button-group {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
        }

        .code-card {
          background: white;
          border-radius: 0.5rem;
          padding: 1rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .code-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .code-header h4 {
          margin: 0;
          font-size: 1.1rem;
          color: #333;
        }

        .code-actions {
          display: flex;
          gap: 0.5rem;
        }

        .code-info {
          margin-bottom: 0.5rem;
        }

        .equipment-name {
          font-size: 0.9rem;
          color: #666;
        }

        .code-content {
          position: relative;
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 0.25rem;
          margin-top: 0.5rem;
        }

        .code-content pre {
          margin: 0;
          white-space: pre-wrap;
          word-wrap: break-word;
          font-family: monospace;
          font-size: 0.9rem;
          color: #333;
        }

        .copy-btn {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .code-content:hover .copy-btn {
          opacity: 1;
        }

        .btn-small {
          padding: 0.25rem 0.5rem;
          font-size: 0.875rem;
        }

        .mr-2 {
          margin-right: 0.5rem;
        }

        @media (max-width: 768px) {
          .grid {
            grid-template-columns: 1fr;
          }

          .copy-btn {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
} 