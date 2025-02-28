"use client";
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Location } from '@/lib/utils/location';

// Fix Leaflet default marker icon issue in Next.js
const fixLeafletMarker = () => {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  });
};

interface MapProps {
  incidents: Array<{
    id: string;
    incidentNumber: string;
    exchangeName: string;
    faultType: string;
    location?: Location;
    [key: string]: any;
  }>;
  center: Location;
}

export default function Map({ incidents, center }: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    // Fix marker icon issue
    fixLeafletMarker();

    // Initialize map if not already initialized
    if (!mapRef.current) {
      mapRef.current = L.map('map').setView([center.latitude, center.longitude], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapRef.current);

      // Initialize markers layer group
      markersRef.current = L.layerGroup().addTo(mapRef.current);
    }

    // Clear existing markers
    if (markersRef.current) {
      markersRef.current.clearLayers();
    }

    // Add markers for each incident
    const validIncidents = incidents.filter(incident => incident.location);
    validIncidents.forEach(incident => {
      if (incident.location) {
        const marker = L.marker([incident.location.latitude, incident.location.longitude]);
        
        // Create popup content
        const popupContent = `
          <div class="p-3">
            <h3 class="font-bold mb-2">${incident.incidentNumber}</h3>
            <p><strong>Exchange:</strong> ${incident.exchangeName}</p>
            <p><strong>Type:</strong> ${incident.faultType}</p>
            <p><strong>Location:</strong> ${incident.location.latitude}, ${incident.location.longitude}</p>
          </div>
        `;

        marker.bindPopup(popupContent);
        marker.addTo(markersRef.current!);
      }
    });

    // Fit map bounds to show all markers
    if (validIncidents.length > 0 && markersRef.current) {
      const group = L.featureGroup(markersRef.current.getLayers());
      mapRef.current?.fitBounds(group.getBounds().pad(0.1));
    }

    // Cleanup function
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      if (markersRef.current) {
        markersRef.current.clearLayers();
        markersRef.current = null;
      }
    };
  }, [incidents, center]);

  return (
    <div id="map" className="h-[500px] w-full rounded-lg shadow-md" />
  );
} 