/**
 * Geocoding utilities using Nominatim OpenStreetMap API
 */

// Rate limiting: Nominatim allows 1 request per second
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second in milliseconds

async function waitForRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
}

/**
 * Reverse geocode: Convert latitude/longitude to address
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<{address: string, lat: number, lon: number}>}
 */
async function reverseGeocode(lat, lon) {
  try {
    // Respect rate limiting
    await waitForRateLimit();
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Hypercaller/1.0', // Required by Nominatim
        },
      }
    );

    if (!response.ok) {
      throw new Error('Reverse geocoding failed');
    }

    const data = await response.json();
    
    if (!data || !data.display_name) {
      throw new Error('No address found');
    }

    return {
      address: data.display_name,
      lat: parseFloat(data.lat),
      lon: parseFloat(data.lon),
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    throw error;
  }
}

/**
 * Forward geocode: Convert address to latitude/longitude
 * @param {string} address - Full address string
 * @returns {Promise<{address: string, lat: number, lon: number}>}
 */
async function forwardGeocode(address) {
  try {
    // Respect rate limiting
    await waitForRateLimit();
    
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Hypercaller/1.0', // Required by Nominatim
        },
      }
    );

    if (!response.ok) {
      throw new Error('Forward geocoding failed');
    }

    const data = await response.json();
    
    if (!data || data.length === 0) {
      throw new Error('Address not found');
    }

    const result = data[0];
    return {
      address: result.display_name,
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
    };
  } catch (error) {
    console.error('Forward geocoding error:', error);
    throw error;
  }
}

module.exports = {
  reverseGeocode,
  forwardGeocode,
};

