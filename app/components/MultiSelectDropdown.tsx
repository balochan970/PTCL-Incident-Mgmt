import React, { useState, useRef, useEffect } from 'react';

interface MultiSelectDropdownProps {
  options: string[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  label: string;
  required?: boolean;
}

export default function MultiSelectDropdown({ 
  options, 
  selectedValues, 
  onChange,
  label,
  required = false 
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [touched, setTouched] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isValid = !required || selectedValues.length > 0;
  const showError = required && touched && selectedValues.length === 0;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleOption = (option: string) => {
    if (option === 'Add Custom') {
      setShowCustomInput(true);
      return;
    }
    const newSelection = selectedValues.includes(option)
      ? selectedValues.filter(item => item !== option)
      : [...selectedValues, option];
    onChange(newSelection);
  };

  const handleAddCustom = () => {
    if (customValue.trim()) {
      onChange([...selectedValues, customValue.trim()]);
      setCustomValue('');
      setShowCustomInput(false);
    }
  };

  const handleCancel = () => {
    setCustomValue('');
    setShowCustomInput(false);
  };

  // Reorder options to put "Add Custom" at the top
  const reorderedOptions = ['Add Custom', ...options.filter(opt => opt !== 'Add Custom')];

  return (
    <div className="multi-select-container" ref={dropdownRef}>
      <label className="dropdown-label">{label}{required && <span className="text-red-500">*</span>}</label>
      <div 
        className={`selected-display ${isOpen ? 'open' : ''} ${showError ? 'error' : ''}`}
        onClick={() => {
          setIsOpen(!isOpen);
          setTouched(true);
        }}
      >
        <div className="selected-text">
          {selectedValues.length ? (
            <div className="selected-tags">
              {selectedValues.map(value => (
                <span key={value} className="tag">
                  {value}
                  <button
                    className="tag-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOption(value);
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : (
            'Select Stakeholders'
          )}
        </div>
        <div className={`arrow ${isOpen ? 'up' : 'down'}`}>▼</div>
      </div>
      {isOpen && (
        <div className="options-container">
          {showCustomInput ? (
            <div className="custom-input-container">
              <input
                type="text"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder="Enter custom stakeholder"
                className="custom-input"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="button-group">
                <button
                  className="btn-add"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddCustom();
                  }}
                  disabled={!customValue.trim()}
                >
                  Add
                </button>
                <button
                  className="btn-cancel"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancel();
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            reorderedOptions.map((option) => (
              <div 
                key={option} 
                className={`option ${selectedValues.includes(option) ? 'selected' : ''}`}
                onClick={() => toggleOption(option)}
              >
                <div className="checkbox-wrapper">
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(option)}
                    onChange={() => {}}
                    className="custom-checkbox"
                  />
                  <span className="checkbox-label">{option}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <style jsx>{`
        .dropdown-label {
          display: block;
          font-size: 0.85rem;
          font-weight: 500;
          color: #666;
          margin-bottom: 4px;
        }

        .multi-select-container {
          position: relative;
          margin-bottom: 0;
          font-family: inherit;
        }

        .selected-display {
          padding: 6px 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background-color: #F8F9FA;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.2s ease;
          min-height: 33px;
          font-size: 0.9rem;
        }

        .selected-display:hover {
          border-color: #007bff;
        }

        .selected-display.open {
          border-color: #007bff;
        }

        .selected-display.error {
          border-color: #dc2626;
        }

        .selected-text {
          flex: 1;
          overflow: hidden;
          color: #555;
        }

        .selected-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .tag {
          background-color: #e3f2fd;
          color: #1976d2;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.9em;
          display: flex;
          align-items: center;
          gap: 4px;
          animation: fadeIn 0.2s ease;
        }

        .tag-remove {
          background: none;
          border: none;
          color: #1976d2;
          cursor: pointer;
          padding: 0 2px;
          font-size: 1.2em;
          line-height: 1;
        }

        .tag-remove:hover {
          color: #d32f2f;
        }

        .arrow {
          font-size: 0.8em;
          color: #666;
          transition: transform 0.2s ease;
        }

        .arrow.up {
          transform: rotate(180deg);
        }

        .options-container {
          position: absolute;
          top: calc(100% + 5px);
          left: 0;
          right: 0;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          max-height: 250px;
          overflow-y: auto;
          z-index: 1000;
          animation: slideDown 0.2s ease;
        }

        .custom-input-container {
          padding: 10px 15px;
        }

        .custom-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 0.9em;
          margin-bottom: 10px;
        }

        .button-group {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        .btn-add,
        .btn-cancel {
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 0.9em;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
        }

        .btn-add {
          background-color: #007bff;
          color: white;
        }

        .btn-add:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }

        .btn-cancel {
          background-color: #6c757d;
          color: white;
        }

        .btn-add:hover:not(:disabled) {
          background-color: #0056b3;
        }

        .btn-cancel:hover {
          background-color: #5a6268;
        }

        .option {
          padding: 10px 15px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .option:hover {
          background-color: #f5f9ff;
        }

        .option.selected {
          background-color: #f0f7ff;
        }

        .checkbox-wrapper {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .custom-checkbox {
          width: 18px;
          height: 18px;
          border-radius: 4px;
          border: 2px solid #007bff;
          appearance: none;
          -webkit-appearance: none;
          outline: none;
          cursor: pointer;
          position: relative;
          transition: all 0.2s ease;
        }

        .custom-checkbox:checked {
          background-color: #007bff;
        }

        .custom-checkbox:checked::after {
          content: '✓';
          color: white;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 12px;
        }

        .checkbox-label {
          color: #333;
          font-size: 0.95em;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .text-red-500 {
          color: #dc2626;
          margin-left: 4px;
        }
      `}</style>
    </div>
  );
} 