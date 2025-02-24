import { useState } from 'react';

interface Credential {
  id: string;
  title: string;
  username: string;
  password: string;
  type: string;
  remarks?: string;
}

interface CredentialsSectionProps {
  credentials: Credential[];
  onSave: (credential: Credential) => void;
  onUpdate: (credential: Credential) => void;
  onDelete: (id: string) => void;
}

export default function CredentialsSection({
  credentials,
  onSave,
  onUpdate,
  onDelete
}: CredentialsSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null);
  const [formData, setFormData] = useState<Omit<Credential, 'id'>>({
    title: '',
    username: '',
    password: '',
    type: '',
    remarks: ''
  });

  // Predefined credential types
  const credentialTypes = [
    'Network Equipment',
    'Server Access',
    'Database',
    'Application',
    'Other'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCredential) {
      onUpdate({ ...formData, id: editingCredential.id });
    } else {
      onSave({ ...formData, id: Date.now().toString() });
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      title: '',
      username: '',
      password: '',
      type: '',
      remarks: ''
    });
    setEditingCredential(null);
    setShowForm(false);
  };

  const handleEdit = (credential: Credential) => {
    setEditingCredential(credential);
    setFormData(credential);
    setShowForm(true);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="credentials-section">
      {/* Form */}
      {showForm && (
        <div className="form-container">
          <h3>{editingCredential ? 'Edit Credential' : 'Create Credential'}</h3>
          <form onSubmit={handleSubmit} className="credentials-form">
            <div className="form-row">
              <label className="form-label">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="form-input"
              />
            </div>
            
            <div className="form-row">
              <label className="form-label">Username *</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                className="form-input"
              />
            </div>

            <div className="form-row">
              <label className="form-label">Password *</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="form-input"
              />
            </div>

            <div className="form-row">
              <label className="form-label">Type *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                required
                className="form-select"
              >
                <option value="">Select Type</option>
                <option value="system">System</option>
                <option value="network">Network</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-row">
              <label className="form-label">Remarks</label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="form-input"
                rows={3}
              />
            </div>

            <div className="form-actions">
              <button type="button" onClick={resetForm} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="credentials-list">
        <div className="grid">
          {credentials.map(credential => (
            <div key={credential.id} className="credential-card">
              <div className="credential-header">
                <h4>{credential.title}</h4>
                <div className="credential-actions">
                  <button
                    className="btn btn-small btn-primary mr-2"
                    onClick={() => handleEdit(credential)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-small btn-danger"
                    onClick={() => onDelete(credential.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="credential-info">
                <div className="info-row">
                  <span className="label">Type:</span>
                  <span className="value">{credential.type}</span>
                </div>
                <div className="info-row">
                  <span className="label">Username:</span>
                  <span className="value">
                    {credential.username}
                    <button
                      className="btn btn-small btn-secondary copy-btn"
                      onClick={() => handleCopy(credential.username)}
                    >
                      Copy
                    </button>
                  </span>
                </div>
                <div className="info-row">
                  <span className="label">Password:</span>
                  <span className="value">
                    ••••••••
                    <button
                      className="btn btn-small btn-secondary copy-btn"
                      onClick={() => handleCopy(credential.password)}
                    >
                      Copy
                    </button>
                  </span>
                </div>
                {credential.remarks && (
                  <div className="info-row">
                    <span className="label">Remarks:</span>
                    <span className="value remarks">{credential.remarks}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .credentials-section {
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

        .credential-card {
          background: white;
          border-radius: 0.5rem;
          padding: 1rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .credential-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .credential-header h4 {
          margin: 0;
          font-size: 1.1rem;
          color: #333;
        }

        .credential-actions {
          display: flex;
          gap: 0.5rem;
        }

        .info-row {
          display: flex;
          margin-bottom: 0.5rem;
          align-items: center;
        }

        .label {
          font-weight: 500;
          color: #666;
          width: 100px;
          flex-shrink: 0;
        }

        .value {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }

        .remarks {
          font-style: italic;
          color: #666;
        }

        .copy-btn {
          opacity: 0;
          transition: opacity 0.2s;
        }

        .info-row:hover .copy-btn {
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

          .info-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
          }

          .label {
            width: auto;
          }
        }

        .credentials-form {
          background: #FFF8E8;
          padding: 1.5rem;
          border-radius: 8px;
          border: 1px solid #D4C9A8;
          max-width: 800px;
        }

        .form-row {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
          align-items: center;
        }

        .form-label {
          min-width: 100px;
          color: #4A4637;
          font-weight: 500;
        }

        .form-input {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid #D4C9A8;
          border-radius: 4px;
          background: white;
          max-width: 300px;
        }

        .form-select {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid #D4C9A8;
          border-radius: 4px;
          background: white;
          max-width: 300px;
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 1.5rem;
        }
      `}</style>
    </div>
  );
} 