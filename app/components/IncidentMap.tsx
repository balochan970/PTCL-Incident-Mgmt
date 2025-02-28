"use client";
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Incident } from '../types/incident';

// Fix for default marker icons in Next.js
const DefaultIcon = L.icon({
  iconUrl: '/images/marker-icon.png',
  iconRetinaUrl: '/images/marker-icon-2x.png',
  shadowUrl: '/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface IncidentMapProps {
  incidents: Incident[];
  center?: [number, number]; // [lat, lng]
  zoom?: number;
  onMarkerClick?: (incident: Incident) => void;
}

export default function IncidentMap({ 
  incidents, 
  center = [24.8607, 67.0011], // Default to Karachi coordinates
  zoom = 11,
  onMarkerClick 
}: IncidentMapProps) {
  const [map, setMap] = useState<L.Map | null>(null);

  useEffect(() => {
    if (map && incidents.length > 0) {
      const bounds = L.latLngBounds(
        incidents
          .filter(incident => incident.location)
          .map(incident => [incident.location!.lat, incident.location!.lng] as L.LatLngTuple)
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, incidents]);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '600px', width: '100%' }}
      whenReady={({ target }: { target: L.Map }) => setMap(target)}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {incidents.map(incident => {
        if (!incident.location) return null;
        
        return (
          <Marker
            key={incident.id}
            position={[incident.location.lat, incident.location.lng]}
            eventHandlers={{
              click: () => onMarkerClick?.(incident)
            }}
          >
            <Popup>
              <div className="incident-popup">
                <h3 className="font-bold">Incident #{incident.incidentNumber}</h3>
                <p><strong>Exchange:</strong> {incident.exchangeName}</p>
                <p><strong>Status:</strong> {incident.status}</p>
                <p><strong>Type:</strong> {incident.faultType}</p>
                {incident.nodeA && <p><strong>Node A:</strong> {incident.nodeA}</p>}
                {incident.nodeB && <p><strong>Node B:</strong> {incident.nodeB}</p>}
                {incident.location.address && (
                  <p><strong>Address:</strong> {incident.location.address}</p>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
} 