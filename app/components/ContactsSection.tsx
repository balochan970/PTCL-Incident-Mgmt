import React from 'react';

interface Contact {
  id: string;
  name: string;
  number: string;
  backupNumber?: string;
  exchangeName: string;
  supervisorName: string;
  remarks?: string;
}

interface ContactsSectionProps {
  contacts: Contact[];
  onSave: (contact: Omit<Contact, 'id'>) => Promise<void>;
  onUpdate: (contact: Contact) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEdit: (contact: Contact) => void;
}

export default function ContactsSection({ contacts, onSave, onUpdate, onDelete, onEdit }: ContactsSectionProps) {
  return (
    <div className="contacts-section">
      {contacts.length === 0 ? (
        <div className="empty-state">
          <p>No contacts found.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Number</th>
                <th>Backup Number</th>
                <th>Exchange</th>
                <th>Supervisor</th>
                <th>Remarks</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id}>
                  <td>{contact.name}</td>
                  <td>{contact.number}</td>
                  <td>{contact.backupNumber || '-'}</td>
                  <td>{contact.exchangeName}</td>
                  <td>{contact.supervisorName}</td>
                  <td>{contact.remarks || '-'}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => onEdit(contact)}
                        className="btn btn-primary btn-small"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(contact.id)}
                        className="btn btn-danger btn-small"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .contacts-section {
          width: 100%;
          background-color: #FFF8E8;
          border-radius: 8px;
          border: 2px solid #D4C9A8;
          overflow: hidden;
        }

        .empty-state {
          padding: 2rem;
          text-align: center;
          color: #4A4637;
          font-weight: 500;
          font-size: 1rem;
        }

        .table-container {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }

        th, td {
          padding: 1rem;
          text-align: left;
          border-bottom: 2px solid #D4C9A8;
          color: #4A4637;
          font-weight: 500;
        }

        th {
          background: #E6DFC8;
          font-weight: 600;
          font-size: 1rem;
        }

        td {
          font-size: 0.95rem;
          background: #FFF8E8;
        }

        tr:last-child td {
          border-bottom: none;
        }

        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .btn {
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-primary {
          background-color: #4A4637;
          color: white;
        }

        .btn-primary:hover {
          background-color: #635C48;
        }

        .btn-danger {
          background-color: #DC3545;
          color: white;
        }

        .btn-danger:hover {
          background-color: #C82333;
        }

        .btn-small {
          padding: 0.4rem 0.8rem;
          font-size: 0.85rem;
        }

        @media (max-width: 768px) {
          td {
            white-space: nowrap;
          }
        }
      `}</style>
    </div>
  );
} 