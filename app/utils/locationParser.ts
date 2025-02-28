import { Location } from '../types/incident';

const GOOGLE_MAPS_REGEX = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
const COORDINATES_REGEX = /^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/;

export async function parseLocation(input: string): Promise<Location | null> {
  // Clean the input
  const cleanInput = input.trim();

  // Try Google Maps URL format
  const googleMapsMatch = cleanInput.match(GOOGLE_MAPS_REGEX);
  if (googleMapsMatch) {
    return {
      lat: parseFloat(googleMapsMatch[1]),
      lng: parseFloat(googleMapsMatch[2]),
      source: 'google_maps'
    };
  }

  // Try raw coordinates format
  const coordinatesMatch = cleanInput.match(COORDINATES_REGEX);
  if (coordinatesMatch) {
    return {
      lat: parseFloat(coordinatesMatch[1]),
      lng: parseFloat(coordinatesMatch[2]),
      source: 'coordinates'
    };
  }

  // If not coordinates, try to geocode the address using OpenStreetMap Nominatim API
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanInput)}&limit=1`
    );
    const data = await response.json();

    if (data && data[0]) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        address: data[0].display_name,
        source: 'address'
      };
    }
  } catch (error) {
    console.error('Error geocoding address:', error);
  }

  return null;
}

export function isValidLocation(location: any): location is Location {
  return (
    location &&
    typeof location.lat === 'number' &&
    typeof location.lng === 'number' &&
    typeof location.source === 'string' &&
    ['google_maps', 'coordinates', 'address'].includes(location.source)
  );
} 