"use client";
import { useState } from 'react';
import { parseLocation, Location } from '@/lib/utils/location';

interface LocationFieldProps {
  initialLocation?: Location | null;
  onUpdate: (location: Location | null) => Promise<void>;
  onCancel: () => void;
}

export default function LocationField({ initialLocation, onUpdate, onCancel }: LocationFieldProps) {
  const [locationInput, setLocationInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!locationInput.trim()) {
        throw new Error('Please enter a location');
      }

      const location = await parseLocation(locationInput);
      if (!location) {
        throw new Error('Could not parse location. Please enter coordinates in format: latitude, longitude (e.g., 24.8607, 67.0011)');
      }

      await onUpdate(location);
      setLocationInput('');
    } catch (err) {
      console.error('Location update error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while updating the location.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg border">
      <h3 className="text-lg font-medium mb-4">Update Location</h3>
      {initialLocation && (
        <div className="mb-4 p-2 bg-white rounded border">
          <p className="text-sm text-gray-600">Current Location:</p>
          <p className="font-mono">
            {initialLocation.latitude}, {initialLocation.longitude}
          </p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <input
            type="text"
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            placeholder="Enter coordinates in format: latitude, longitude (e.g., 24.8607, 67.0011)"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
          <p className="mt-1 text-sm text-gray-500">
            Format: latitude, longitude (e.g., 24.8607, 67.0011)
          </p>
        </div>
        {error && (
          <div className="p-2 text-sm text-red-600 bg-red-50 rounded">
            {error}
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
} 