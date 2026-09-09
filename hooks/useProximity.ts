import { useMemo } from 'react';
import { useGeolocationWatcher } from './useGeolocationWatcher';

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371e3;
  const φ1 = toRad(lat1); const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1); const Δλ = toRad(lon2 - lon1);
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// PRO FIX: No longer owns a watchPosition subscription. Reads from the
// single app-wide GPS stream (useGeolocationWatcher) so opening AR mode,
// the map, and proximity checks at the same time doesn't spin up 2-3
// concurrent high-accuracy GPS watchers.
export function useProximity(
  targetLat: number, targetLng: number,
  options?: { onError?: (error: GeolocationPositionError) => void; }
) {
  const { position, hasPermission } = useGeolocationWatcher({ onError: options?.onError });

  const distance = useMemo(() => {
    if (!position) return null;
    return haversineDistance(position.lat, position.lng, targetLat, targetLng);
  }, [position, targetLat, targetLng]);

  return { distance, hasPermission };
}
