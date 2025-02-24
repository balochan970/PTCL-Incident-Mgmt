import React, { useState } from 'react';

interface MultiSelectDropdownProps {
  options: string[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  label: string;
}

export default function MultiSelectDropdown({ 
  options, 
  selectedValues, 
  onChange,
  label 
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (option: string) => {
    const newSelection = selectedValues.includes(option)
      ? selectedValues.filter(item => item !== option)
      : [...selectedValues, option];
    onChange(newSelection);
  };

  // Reorder options to put "Add Custom" at the top
  const reorderedOptions = ['Add Custom', ...options.filter(opt => opt !== 'Add Custom')];

  return (
    <div className="multi-select-container">
      <label className="dropdown-label">{label}</label>
      <div 
        className={`selected-display ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
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
          {reorderedOptions.map((option) => (
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
          ))}
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
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        /* Scrollbar styling */
        .options-container::-webkit-scrollbar {
          width: 8px;
        }

        .options-container::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }

        .options-container::-webkit-scrollbar-thumb {
          background: #ccc;
          border-radius: 4px;
        }

        .options-container::-webkit-scrollbar-thumb:hover {
          background: #999;
        }
      `}</style>
    </div>
  );
} 