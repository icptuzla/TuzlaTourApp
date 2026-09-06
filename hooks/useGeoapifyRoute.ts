import { useState, useEffect, useCallback, useRef } from 'react';
import { getDistance } from '../utils/geoUtils';

export interface GeoapifyManeuverStep {
  id: string; text: string; type: string; distance: number; lat: number; lng: number; stepIndex: number;
}
export interface LocationCoord { lat: number; lng: number; elevation?: number; }
export interface UseGeoapifyRouteProps {
  origin: LocationCoord | null; destination: LocationCoord | null;
  enabled?: boolean; apiKey?: string; onReachDestination?: () => void;
}
export interface UseGeoapifyRouteResult {
  fullPolyline: Array<[number, number, number]>; steps: GeoapifyManeuverStep[];
  activeStepIndex: number; activeStep: GeoapifyManeuverStep | null;
  distanceToNextStep: number; distanceToDestination: number;
  totalDistance: number; totalTime: number; isLoading: boolean;
  error: string | null; hasReachedDestination: boolean; refetchRoute: () => void;
}

const DEFAULT_GEOAPIFY_KEY =
  (import.meta as any).env?.VITE_GEOAPIFY_ROUTING_API ||
  (import.meta as any).env?.VITE_MAPQUESTVIEW_GEOAPIFY_API_KEY ||
  '63e8b34f44974d71bc70aad63e5b56ba';

export function useGeoapifyRoute({
  origin, destination, enabled = true, apiKey = DEFAULT_GEOAPIFY_KEY, onReachDestination,
}: UseGeoapifyRouteProps): UseGeoapifyRouteResult {
  const [fullPolyline, setFullPolyline] = useState<Array<[number, number, number]>>([]);
  const [steps, setSteps] = useState<GeoapifyManeuverStep[]>([]);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [distanceToNextStep, setDistanceToNextStep] = useState<number>(Infinity);
  const [distanceToDestination, setDistanceToDestination] = useState<number>(Infinity);
  const [totalDistance, setTotalDistance] = useState<number>(0);
  const [totalTime, setTotalTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasReachedDestination, setHasReachedDestination] = useState<boolean>(false);

  const reachedTriggeredRef = useRef<boolean>(false);
  const lastFetchedDestRef = useRef<string | null>(null); // PRO FIX: Prevent API spam

  const fetchRoute = useCallback(async () => {
    if (!origin || !destination || !enabled) { setFullPolyline([]); setSteps([]); return; }

    const destKey = `${destination.lat},${destination.lng}`;
    if (lastFetchedDestRef.current === destKey && fullPolyline.length > 0) return;
    lastFetchedDestRef.current = destKey;

    setIsLoading(true); setError(null);
    reachedTriggeredRef.current = false; setHasReachedDestination(false);

    try {
      const url = `https://api.geoapify.com/v1/routing?waypoints=${origin.lng},${origin.lat}|${destination.lng},${destination.lat}&mode=walk&details=instruction_details,elevation&apiKey=${apiKey}`;
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, { signal: controller.signal }).finally(() => window.clearTimeout(timeoutId));
      if (!res.ok) throw new Error(`Geoapify Routing API returned status ${res.status}`);
      const data = await res.json();
      const feature = data.features?.[0];
      if (!feature) throw new Error('No routing path found');

      const rawCoords: Array<[number, number, number?]> = feature.geometry?.coordinates || [];
      const parsedPolyline: Array<[number, number, number]> = rawCoords.map((coord) => [coord[1], coord[0], coord[2] ?? 0]);
      setFullPolyline(parsedPolyline);

      const legSteps = feature.properties?.legs?.[0]?.steps || [];
      const parsedSteps: GeoapifyManeuverStep[] = legSteps.map((step: any, idx: number) => {
        const fromIdx = step.from_index ?? 0;
        const stepCoord = parsedPolyline[fromIdx] || [destination.lat, destination.lng, 0];
        return {
          id: `step-${idx}-${step.instruction?.text || idx}`, text: step.instruction?.text || step.text || `Maneuver ${idx + 1}`,
          type: step.instruction?.type || step.type || 'Straight', distance: step.distance || 0,
          lat: stepCoord[0], lng: stepCoord[1], stepIndex: idx,
        };
      });

      if (parsedSteps.length === 0 || parsedSteps[parsedSteps.length - 1].type !== 'Arrival') {
        parsedSteps.push({ id: `step-${parsedSteps.length}-arrival`, text: 'Arrive at destination', type: 'Arrival', distance: 0, lat: destination.lat, lng: destination.lng, stepIndex: parsedSteps.length });
      }

      setSteps(parsedSteps); setActiveStepIndex(0);
      setTotalDistance(feature.properties?.distance || 0); setTotalTime(feature.properties?.time || 0);
    } catch (err: any) {
      console.warn('[useGeoapifyRoute] Error fetching route, using fallback:', err);
      setError(err?.message || 'Failed to fetch walking route');
      const fallbackPolyline: Array<[number, number, number]> = [
        [origin.lat, origin.lng, origin.elevation || 0], [destination.lat, destination.lng, destination.elevation || 0],
      ];
      setFullPolyline(fallbackPolyline);
      setSteps([{ id: 'step-0-fallback', text: 'Head straight towards landmark', type: 'Straight', distance: getDistance(origin.lat, origin.lng, destination.lat, destination.lng), lat: destination.lat, lng: destination.lng, stepIndex: 0 }]);
    } finally { setIsLoading(false); }
  }, [destination?.lat, destination?.lng, enabled, apiKey, origin?.lat, origin?.lng, fullPolyline.length]);

  useEffect(() => { fetchRoute(); }, [fetchRoute]);

  // PRO FIX: Real-time tracking loop. Runs on every GPS tick, but ONLY does local math. NO API CALLS.
  useEffect(() => {
    if (!origin || !destination) return;
    const distToDest = getDistance(origin.lat, origin.lng, destination.lat, destination.lng);
    setDistanceToDestination(distToDest);

    if (distToDest <= 5 && !reachedTriggeredRef.current) {
      reachedTriggeredRef.current = true; setHasReachedDestination(true);
      if (onReachDestination) onReachDestination();
    }

    if (steps.length > 0 && activeStepIndex < steps.length) {
      const currentStepNode = steps[activeStepIndex];
      const distToStepNode = getDistance(origin.lat, origin.lng, currentStepNode.lat, currentStepNode.lng);
      setDistanceToNextStep(distToStepNode);
      if (distToStepNode <= 8 && activeStepIndex < steps.length - 1) {
        setActiveStepIndex((prev) => Math.min(steps.length - 1, prev + 1));
      }
    }
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng, steps, activeStepIndex, onReachDestination]);

  return {
    fullPolyline, steps, activeStepIndex, activeStep: steps[activeStepIndex] || null,
    distanceToNextStep, distanceToDestination, totalDistance, totalTime,
    isLoading, error, hasReachedDestination, refetchRoute: fetchRoute,
  };
}