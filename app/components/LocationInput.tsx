"use client";
import { useState } from 'react';
import { Location } from '../types/incident';
import { parseLocation } from '../utils/locationParser';

interface LocationInputProps {
  value: Location | null;
  onChange: (location: Location | null) => void;
  onCancel?: () => void;
  isEditing?: boolean;
}

export default function LocationInput({
  value,
  onChange,
  onCancel,
  isEditing = false
}: LocationInputProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const location = await parseLocation(input);
      if (location) {
        onChange(location);
        setInput('');
      } else {
        setError('Could not parse location. Please check the format and try again.');
      }
    } catch (error) {
      setError('An error occurred while processing the location.');
      console.error('Location parsing error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isEditing && value) {
    return (
      <div className="location-display">
        <p>
          <strong>Latitude:</strong> {value.lat.toFixed(6)}
        </p>
        <p>
          <strong>Longitude:</strong> {value.lng.toFixed(6)}
        </p>
        {value.address && (
          <p>
            <strong>Address:</strong> {value.address}
          </p>
        )}
        <p className="text-sm text-gray-500">
          Source: {value.source.replace('_', ' ')}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Location
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter Google Maps link, coordinates, or address"
            className="form-input flex-1"
            disabled={loading}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!input.trim() || loading}
          >
            {loading ? 'Processing...' : 'Update'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}
      <div className="text-sm text-gray-500">
        <p>Accepted formats:</p>
        <ul className="list-disc list-inside">
          <li>Google Maps link (shared via WhatsApp)</li>
          <li>Coordinates (e.g., "24.8607, 67.0011")</li>
          <li>Address (will be geocoded)</li>
        </ul>
      </div>
    </form>
  );
} 