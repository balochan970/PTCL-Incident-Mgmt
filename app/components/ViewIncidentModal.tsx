"use client";
import { useState, useEffect } from 'react';
import { updateIncidentLocation } from '../services/incidentService';
import LocationField from './LocationField';
import { Location } from '@/lib/utils/location';

interface ViewIncidentModalProps {
  incident: any;
  isGpon: boolean;
  onClose: () => void;
  onUpdate?: () => Promise<void>;
}

export default function ViewIncidentModal({ incident, isGpon, onClose, onUpdate }: ViewIncidentModalProps) {
  const [showLocationField, setShowLocationField] = useState(false);
  const [currentIncident, setCurrentIncident] = useState(incident);

  // Update local state when incident prop changes
  useEffect(() => {
    setCurrentIncident(incident);
  }, [incident]);

  const handleLocationUpdate = async (location: Location | null) => {
    try {
      await updateIncidentLocation(currentIncident.id, isGpon, location);
      
      // Update the local state
      const updatedIncident = {
        ...currentIncident,
        location,
        locationUpdatedAt: new Date().toISOString()
      };
      setCurrentIncident(updatedIncident);
      setShowLocationField(false);

      // Notify parent component to refresh data
      if (onUpdate) {
        await onUpdate();
      }
    } catch (error) {
      console.error('Error updating location:', error);
      alert('Failed to update location. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">View Incident</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Existing incident details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-medium">Incident Number</label>
              <p>{currentIncident.incidentNumber}</p>
            </div>
            <div>
              <label className="font-medium">Exchange</label>
              <p>{currentIncident.exchangeName}</p>
            </div>
            {/* Add other incident details here */}
          </div>

          {/* Location section */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-medium">Location</h3>
              {!showLocationField && (
                <button
                  onClick={() => setShowLocationField(true)}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  {currentIncident.location ? 'Update Location' : 'Add Location'}
                </button>
              )}
            </div>
            
            {showLocationField ? (
              <LocationField
                initialLocation={currentIncident.location}
                onUpdate={handleLocationUpdate}
                onCancel={() => setShowLocationField(false)}
              />
            ) : currentIncident.location ? (
              <div className="p-2 bg-gray-50 rounded">
                <p className="font-mono">
                  {currentIncident.location.latitude}, {currentIncident.location.longitude}
                </p>
                {currentIncident.locationUpdatedAt && (
                  <p className="text-sm text-gray-500 mt-1">
                    Last updated: {new Date(currentIncident.locationUpdatedAt).toLocaleString()}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500 italic">No location set</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 