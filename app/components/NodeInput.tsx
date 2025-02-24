import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';

interface NodeInputProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  showOutage?: boolean;
  onOutageChange?: (checked: boolean) => void;
  isOutage?: boolean;
}

export default function NodeInput({
  name,
  value,
  onChange,
  required = false,
  showOutage = false,
  onOutageChange,
  isOutage = false
}: NodeInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentNodes, setRecentNodes] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(true);
  const [validationMessage, setValidationMessage] = useState('');

  // Fetch recent nodes from Firestore
  useEffect(() => {
    const fetchRecentNodes = async () => {
      const nodesRef = collection(db, 'recentNodes');
      const snapshot = await getDocs(nodesRef);
      const nodes = snapshot.docs.map(doc => doc.data().nodeName as string);
      setRecentNodes(nodes);
    };

    fetchRecentNodes();
  }, []);

  // Validate node name format
  const validateNodeName = (nodeName: string) => {
    // Add your validation rules here
    const nodePattern = /^[A-Za-z0-9-_]+$/;
    const isValidFormat = nodePattern.test(nodeName);
    setIsValid(isValidFormat);
    setValidationMessage(isValidFormat ? '' : 'Node name can only contain letters, numbers, hyphens, and underscores');
    return isValidFormat;
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    validateNodeName(newValue);

    // Update suggestions
    if (newValue) {
      const filtered = recentNodes.filter(node => 
        node.toLowerCase().includes(newValue.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className="node-input-container">
      <div className="input-wrapper">
        <input
          type="text"
          name={name}
          value={value}
          onChange={handleInputChange}
          onFocus={() => value && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          className={`form-input ${!isValid ? 'invalid' : ''}`}
          required={required}
          placeholder={`Enter ${name}`}
        />
        {!isValid && (
          <div className="validation-message">
            {validationMessage}
          </div>
        )}
      </div>

      {showOutage && (
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={isOutage}
            onChange={(e) => onOutageChange?.(e.target.checked)}
          />
          Outage
        </label>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div className="suggestions-container">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="suggestion-item"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .node-input-container {
          position: relative;
          width: 100%;
        }

        .input-wrapper {
          position: relative;
        }

        .form-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 0.9rem;
          transition: border-color 0.2s;
        }

        .form-input:focus {
          outline: none;
          border-color: #007bff;
        }

        .form-input.invalid {
          border-color: #dc3545;
        }

        .validation-message {
          position: absolute;
          bottom: -20px;
          left: 0;
          font-size: 0.8rem;
          color: #dc3545;
        }

        .suggestions-container {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background-color: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          margin-top: 4px;
          max-height: 200px;
          overflow-y: auto;
          z-index: 1000;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .suggestion-item {
          padding: 8px 12px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .suggestion-item:hover {
          background-color: #f8f9fa;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 8px;
          font-size: 0.85rem;
          color: #666;
        }

        /* Scrollbar styling */
        .suggestions-container::-webkit-scrollbar {
          width: 8px;
        }

        .suggestions-container::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }

        .suggestions-container::-webkit-scrollbar-thumb {
          background: #ccc;
          border-radius: 4px;
        }

        .suggestions-container::-webkit-scrollbar-thumb:hover {
          background: #999;
        }
      `}</style>
    </div>
  );
} 