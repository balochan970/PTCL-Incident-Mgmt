"use client";
import { useState } from 'react';
import { Incident, Location } from '../types/incident';
import { updateIncidentLocation } from '../services/incidentService';
import LocationInput from './LocationInput';
import dynamic from 'next/dynamic';

// Dynamically import the map component to avoid SSR issues
const IncidentMap = dynamic(() => import('./IncidentMap'), {
  ssr: false,
  loading: () => <div className="h-[300px] w-full bg-gray-100 animate-pulse" />
});

interface IncidentLocationEditorProps {
  incident: Incident;
  isGpon?: boolean;
  onLocationUpdate?: (location: Location) => void;
}

export default function IncidentLocationEditor({
  incident,
  isGpon = false,
  onLocationUpdate
}: IncidentLocationEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLocationUpdate = async (location: Location | null) => {
    if (!location) return;
    
    setError('');
    setLoading(true);
    
    try {
      await updateIncidentLocation(incident.id, location, isGpon);
      onLocationUpdate?.(location);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating location:', error);
      setError('Failed to update location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Location</h3>
        {!isEditing && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setIsEditing(true)}
            disabled={loading}
          >
            {incident.location ? 'Edit Location' : 'Add Location'}
          </button>
        )}
      </div>

      {error && (
        <div className="text-red-500 text-sm bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      <LocationInput
        value={incident.location || null}
        onChange={handleLocationUpdate}
        onCancel={isEditing ? () => setIsEditing(false) : undefined}
        isEditing={isEditing}
      />

      {incident.location && !isEditing && (
        <div className="mt-4">
          <IncidentMap
            incidents={[incident]}
            center={[incident.location.lat, incident.location.lng]}
            zoom={15}
          />
        </div>
      )}
    </div>
  );
} 