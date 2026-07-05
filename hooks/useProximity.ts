import { useEffect, useState } from 'react';

/**
 * Calculate the haversine distance between two latitude/longitude points.
 * Returns distance in meters.
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371e3; // Earth radius in meters
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * useProximity - watches the device geolocation and returns distance to a target point.
 * @param targetLat latitude of POI
 * @param targetLng longitude of POI
 * @param options optional configuration
 */
export function useProximity(
  targetLat: number,
  targetLng: number,
  options?: {
    /** Check interval in milliseconds (default 5000) */
    interval?: number;
    /** Callback when error occurs */
    onError?: (error: GeolocationPositionError) => void;
  }
) {
  const [distance, setDistance] = useState<number | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported in this browser');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const d = haversineDistance(latitude, longitude, targetLat, targetLng);
        setDistance(d);
        setHasPermission(true);
      },
      (err) => {
        options?.onError?.(err);
        setHasPermission(false);
        console.error('Geolocation error:', err.message);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );

    const interval = options?.interval ?? 5000;
    const timer = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const d = haversineDistance(latitude, longitude, targetLat, targetLng);
          setDistance(d);
        },
        (err) => {
          options?.onError?.(err);
        }
      );
    }, interval);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(timer);
    };
  }, [targetLat, targetLng, options?.interval]);

  return { distance, hasPermission };
}
