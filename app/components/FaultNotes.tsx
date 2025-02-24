import React, { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

// Dynamic import of ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

interface FaultNotesProps {
  onChange: (notes: string, attachments: File[]) => void;
  initialNotes?: string;
}

export default function FaultNotes({ onChange, initialNotes = '' }: FaultNotesProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{'list': 'ordered'}, {'list': 'bullet'}],
      ['link', 'image'],
      ['clean']
    ],
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet',
    'link', 'image'
  ];

  const handleNotesChange = (content: string) => {
    setNotes(content);
    onChange(content, attachments);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments([...attachments, ...newFiles]);
      onChange(notes, [...attachments, ...newFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    const newAttachments = attachments.filter((_, i) => i !== index);
    setAttachments(newAttachments);
    onChange(notes, newAttachments);
  };

  return (
    <div className="fault-notes-container">
      <div className="editor-section">
        <h3>Fault Notes</h3>
        <ReactQuill
          value={notes}
          onChange={handleNotesChange}
          modules={modules}
          formats={formats}
          theme="snow"
        />
      </div>

      <div className="attachments-section">
        <div className="attachments-header">
          <h3>Attachments</h3>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            Add Files
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            style={{ display: 'none' }}
            accept="image/*,.pdf,.doc,.docx"
          />
        </div>

        <div className="attachments-list">
          {attachments.map((file, index) => (
            <div key={index} className="attachment-item">
              <span className="file-name">{file.name}</span>
              <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
              <button
                type="button"
                className="remove-btn"
                onClick={() => removeAttachment(index)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .fault-notes-container {
          background-color: white;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .editor-section {
          margin-bottom: 20px;
        }

        .editor-section h3,
        .attachments-section h3 {
          margin: 0 0 10px 0;
          color: #333;
          font-size: 1.1rem;
        }

        .attachments-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .attachments-list {
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 8px;
          max-height: 200px;
          overflow-y: auto;
        }

        .attachment-item {
          display: flex;
          align-items: center;
          padding: 8px;
          background-color: #f8f9fa;
          border-radius: 4px;
          margin-bottom: 4px;
        }

        .file-name {
          flex: 1;
          font-size: 0.9rem;
          color: #333;
        }

        .file-size {
          color: #666;
          font-size: 0.8rem;
          margin: 0 8px;
        }

        .remove-btn {
          background: none;
          border: none;
          color: #dc3545;
          font-size: 1.2rem;
          cursor: pointer;
          padding: 0 4px;
        }

        .remove-btn:hover {
          color: #bd2130;
        }

        /* Quill editor custom styles */
        :global(.ql-container) {
          min-height: 150px;
          font-size: 0.9rem;
        }

        :global(.ql-toolbar) {
          border-top-left-radius: 4px;
          border-top-right-radius: 4px;
        }

        :global(.ql-container) {
          border-bottom-left-radius: 4px;
          border-bottom-right-radius: 4px;
        }
      `}</style>
    </div>
  );
} 