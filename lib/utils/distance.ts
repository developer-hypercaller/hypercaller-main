/**
 * Distance calculation utilities
 * Uses Haversine formula for calculating distances between coordinates
 */

/**
 * Convert degrees to radians
 */
function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 *
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format distance for display
 * Shows in meters for very short distances (< 1 km), otherwise in kilometers
 *
 * @param distanceKm - Distance in kilometers
 * @returns Formatted distance string (e.g., "250 m" or "2.5 km")
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    // For distances less than 1 km, show in meters
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m`;
  }
  // For distances 1 km or more, show in kilometers with 1 decimal place
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Calculate distance between two coordinate objects
 * Returns distance in meters
 *
 * @param coord1 - First coordinate
 * @param coord2 - Second coordinate
 * @returns Distance in meters
 */
export function getDistance(
  coord1: { latitude: number; longitude: number },
  coord2: { latitude: number; longitude: number }
): number {
  const R = 6371000; // Earth radius in meters
  const lat1 = (coord1.latitude * Math.PI) / 180;
  const lat2 = (coord2.latitude * Math.PI) / 180;
  const deltaLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const deltaLng = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Check if a coordinate is within a radius of another coordinate
 *
 * @param center - Center coordinate
 * @param point - Point to check
 * @param radiusMeters - Radius in meters
 * @returns True if point is within radius
 */
export function isWithinRadius(
  center: { latitude: number; longitude: number },
  point: { latitude: number; longitude: number },
  radiusMeters: number
): boolean {
  const distance = getDistance(center, point);
  return distance <= radiusMeters;
}