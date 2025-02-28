interface Location {
  latitude: number;
  longitude: number;
}

// Regular expressions for different location formats
const GOOGLE_MAPS_REGEX = /[?&/@](-?\d+\.\d+),(-?\d+\.\d+)/;
const COORDINATES_REGEX = /^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/;
const SHORT_URL_REGEX = /maps\.app\.goo\.gl|goo\.gl/;
const SHARE_URL_REGEX = /maps\.google\.com\/maps\?q=(-?\d+\.\d+),(-?\d+\.\d+)|google\.com\/maps\/place\/[^@]*@(-?\d+\.\d+),(-?\d+\.\d+)/;

export async function parseLocation(input: string): Promise<Location | null> {
  console.log('Attempting to parse location from input:', input);
  
  try {
    // First try to match share URL format
    const shareMatch = input.match(SHARE_URL_REGEX);
    if (shareMatch) {
      const lat = shareMatch[1] || shareMatch[3];
      const lng = shareMatch[2] || shareMatch[4];
      console.log('Found coordinates in share URL:', lat, lng);
      return {
        latitude: parseFloat(lat),
        longitude: parseFloat(lng)
      };
    }

    // Handle short URLs (goo.gl)
    if (SHORT_URL_REGEX.test(input)) {
      console.log('Detected short URL format');
      try {
        // Use our server-side endpoint to handle the URL expansion
        const response = await fetch(`/api/expand-url?url=${encodeURIComponent(input)}`);
        if (!response.ok) {
          throw new Error('Failed to expand URL');
        }
        
        const data = await response.json();
        if (data.latitude && data.longitude) {
          console.log('Found coordinates from expanded URL:', data.latitude, data.longitude);
          return {
            latitude: data.latitude,
            longitude: data.longitude
          };
        }
      } catch (e) {
        console.error('Error handling short URL:', e);
      }
    }

    // Try Google Maps link format
    try {
      console.log('Attempting to parse as Google Maps URL');
      const url = new URL(input);
      const searchParams = new URLSearchParams(url.search);
      const fullUrl = url.pathname + url.search + url.hash;
      console.log('URL components:', {
        pathname: url.pathname,
        search: url.search,
        hash: url.hash,
        fullUrl
      });
      
      // Try different patterns
      const patterns = [
        // Pattern 1: Coordinates in query parameters
        () => {
          const queryParams = ['q', 'query', 'center', 'll', 'sll', 'near'];
          for (const param of queryParams) {
            const value = searchParams.get(param);
            if (value) {
              const coordsMatch = value.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
              if (coordsMatch) {
                console.log(`Found coordinates in ${param} parameter:`, coordsMatch[1], coordsMatch[2]);
                return {
                  latitude: parseFloat(coordsMatch[1]),
                  longitude: parseFloat(coordsMatch[2])
                };
              }
            }
          }
          return null;
        },
        // Pattern 2: Coordinates in URL path or fragment
        () => {
          const googleMapsMatch = fullUrl.match(GOOGLE_MAPS_REGEX);
          console.log('Checking URL path/fragment for coordinates');
          if (googleMapsMatch) {
            console.log('Found coordinates in URL:', googleMapsMatch[1], googleMapsMatch[2]);
            return {
              latitude: parseFloat(googleMapsMatch[1]),
              longitude: parseFloat(googleMapsMatch[2])
            };
          }
          return null;
        }
      ];

      // Try each pattern
      for (const pattern of patterns) {
        const result = pattern();
        if (result) {
          console.log('Successfully parsed location:', result);
          return result;
        }
      }
    } catch (e) {
      console.log('URL parsing failed, trying direct regex match');
      // If URL parsing fails, try the regex directly
      const googleMapsMatch = input.match(GOOGLE_MAPS_REGEX);
      if (googleMapsMatch) {
        console.log('Found coordinates via direct regex:', googleMapsMatch[1], googleMapsMatch[2]);
        return {
          latitude: parseFloat(googleMapsMatch[1]),
          longitude: parseFloat(googleMapsMatch[2])
        };
      }
    }

    // Try raw coordinates format
    console.log('Attempting to parse as raw coordinates');
    const coordinatesMatch = input.match(COORDINATES_REGEX);
    if (coordinatesMatch) {
      console.log('Found raw coordinates:', coordinatesMatch[1], coordinatesMatch[2]);
      return {
        latitude: parseFloat(coordinatesMatch[1]),
        longitude: parseFloat(coordinatesMatch[2])
      };
    }

    // If not coordinates, try to geocode the address
    console.log('Attempting to geocode as address');
    try {
      const encodedAddress = encodeURIComponent(input);
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`);
      const data = await response.json();

      if (data && data.length > 0) {
        console.log('Successfully geocoded address:', data[0]);
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon)
        };
      }
    } catch (error) {
      console.error('Error geocoding address:', error);
    }
  } catch (error) {
    console.error('Error parsing location:', error);
  }

  console.log('Failed to parse location from input');
  return null;
}

// Karachi's default coordinates
export const DEFAULT_CENTER: Location = {
  latitude: 24.8607,
  longitude: 67.0011
};

// Helper function to validate coordinates
export function isValidCoordinates(location: Location): boolean {
  return (
    location.latitude >= -90 && 
    location.latitude <= 90 && 
    location.longitude >= -180 && 
    location.longitude <= 180
  );
}

export type { Location }; 