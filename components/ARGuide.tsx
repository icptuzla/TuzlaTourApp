import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Language, Location } from '../types';
import { LOCATIONS, TRANSLATIONS } from '../constants';
import { Camera, Info, X, MapPin, Compass } from 'lucide-react';
import { getARProjection, ARStage } from '../hooks/useARProjection';
import { AppFeatures } from '../utils/platform';
import { useQuestRuntimePolicy } from '../hooks/useQuestRuntimePolicy';
import { QuestQualityMode } from '../utils/questRuntimePolicy';

interface ARGuideProps {
  lang: Language;
  features: AppFeatures;
  onNavigate?: (poi: Location) => void;
}

// Optimized AR Marker that doesn't have its own loop
const ARMarker: React.FC<{
  location: Location;
  lang: Language;
  onSelect: (loc: Location, distance: number) => void;
  domRef: React.RefObject<HTMLDivElement | null>;
  distRef: React.RefObject<HTMLSpanElement | null>;
  currentDistState: React.MutableRefObject<number>;
  registerLockSetter: (id: string, setter: React.Dispatch<React.SetStateAction<boolean>> | null) => void;
}> = ({ location, lang, onSelect, domRef, distRef, currentDistState, registerLockSetter }) => {
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    registerLockSetter(location.id, setIsLocked);
    return () => registerLockSetter(location.id, null);
  }, [location.id, registerLockSetter]);

  const getCategoryColor = (category: string, locked: boolean) => {
    if (locked) return 'bg-amber-400 border-amber-500 text-amber-600 shadow-[0_0_20px_rgba(251,191,36,0.5)]';
    switch (category) {
      case 'nature': return 'bg-green-500 border-green-600 text-green-600 shadow-[0_0_20px_rgba(34,197,94,0.3)]';
      case 'culture': return 'bg-amber-500 border-amber-600 text-amber-600 shadow-[0_0_20px_rgba(234,179,8,0.3)]';
      case 'shopping': return 'bg-blue-500 border-blue-600 text-blue-600 shadow-[0_0_20px_rgba(59,130,246,0.3)]';
      default: return 'bg-gray-500 border-gray-600 text-gray-600 shadow-[0_0_20px_rgba(107,114,128,0.3)]';
    }
  };

  const colors = getCategoryColor(location.category, isLocked).split(' ');

  return (
    <div
      ref={domRef}
      className="absolute pointer-events-auto transition-transform duration-75 will-change-transform [display:none]"
    >
      <button
        onClick={() => onSelect(location, currentDistState.current)}
        className="flex flex-col items-center group"
      >
        <div className="relative">
          <div className={`absolute inset-0 ${colors[0]} rounded-full blur-md ${isLocked ? 'animate-ping' : 'animate-pulse'} opacity-70`}></div>
          <div className={`relative w-14 h-14 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center border-4 ${colors[1]} shadow-2xl group-hover:scale-110 transition-transform`}>
            {isLocked ? <Compass className={`w-7 h-7 ${colors[2]}`} /> : <MapPin className={`w-7 h-7 ${colors[2]}`} />}
          </div>
        </div>
        <div className={`mt-3 px-4 py-1.5 ${isLocked ? 'bg-amber-900/90 border-amber-400' : 'bg-black/80 border-white/40'} backdrop-blur-md rounded-full border shadow-xl`}>
          <span className="text-white text-sm font-black whitespace-nowrap tracking-wide [text-shadow:0_2px_4px_rgba(0,0,0,0.8)]">
            {location.name[lang]}
          </span>
          <span ref={distRef} className="ml-2 text-blue-300 text-xs font-bold [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">
            ...
          </span>
        </div>
      </button>
    </div>
  );
};

const ARGuide: React.FC<ARGuideProps> = ({ lang, features, onNavigate }) => {
  const { policy, mode, setMode } = useQuestRuntimePolicy(features);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const betaZeroRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ loc: Location, dist: number } | null>(null);
  const userLocationRef = useRef<{ lat: number, lng: number } | null>(null);
  const orientationRef = useRef<{ 
    alpha: number | null, 
    beta: number | null, 
    gamma: number | null,
    headingAccuracy: number | null 
  }>({
    alpha: null, beta: null, gamma: null, headingAccuracy: null,
  });
  const [headingAccuracy, setHeadingAccuracy] = useState<number | null>(null);

  const [permissionGranted, setPermissionGranted] = useState(false);
  const [viewMode, setViewMode] = useState<'AR' | 'HORIZON'>(features.isAndroidLight ? 'HORIZON' : 'AR');
  const [showHelp, setShowHelp] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [isForeground, setIsForeground] = useState(true);
  const [compassOffset, setCompassOffset] = useState(0); // 0 or 180

  // Master Loop Refs
  const lastFrameTimeRef = useRef<number>(0);
  const markerRefs = useRef<Record<string, { dom: HTMLDivElement | null, dist: HTMLSpanElement | null, currentDist: number }>>({});
  const markerLockSettersRef = useRef<Record<string, React.Dispatch<React.SetStateAction<boolean>> | undefined>>({});
  const leftArrowRef = useRef<HTMLDivElement>(null);
  const rightArrowRef = useRef<HTMLDivElement>(null);
  const horizonIndicatorRef = useRef<HTMLDivElement>(null);
  const horizonNodesRefs = useRef<Record<string, { dom: HTMLButtonElement | null, currentDist: number }>>({});
  const smoothedAlphaRef = useRef<number | null>(null);
  const maxVisibleMarkers = policy.qualityLevel === 'utility' ? 3 : (policy.qualityLevel === 'balanced' ? 5 : 8);
  const qualityOptions: Array<{ value: QuestQualityMode; label: string }> = [
    { value: 'auto', label: 'Auto' },
    { value: 'cinematic', label: 'Cine' },
    { value: 'balanced', label: 'Bal' },
    { value: 'saver', label: 'Save' },
  ];

  const registerMarkerLockSetter = useCallback((id: string, setter: React.Dispatch<React.SetStateAction<boolean>> | null) => {
    if (setter) markerLockSettersRef.current[id] = setter;
    else delete markerLockSettersRef.current[id];
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      setIsForeground(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // MASTER LOOP (30 FPS)
  useEffect(() => {
    if (!permissionGranted || !isForeground) return;

    let frameId: number;
    const targetFrameMs = 1000 / policy.arFx.targetFps;
    const loop = (timestamp: number) => {
      frameId = requestAnimationFrame(loop);

      // Limit frame rate to control battery/thermal load
      const elapsed = timestamp - lastFrameTimeRef.current;
      if (elapsed < targetFrameMs) return;
      lastFrameTimeRef.current = timestamp;

      const userLoc = userLocationRef.current;
      const orient = orientationRef.current;
      if (!userLoc || !orient) return;

      // 1. Update AR Markers
      if (viewMode === 'AR') {
        const projections = LOCATIONS.map(loc => {
          const proj = getARProjection(userLoc, orient, { lat: loc.coordinates[0], lng: loc.coordinates[1] });
          return { loc, proj };
        });

        const prioritizedVisible = projections
          .filter(({ proj }) => proj.isVisible && proj.stage !== ARStage.LONG_RANGE)
          .sort((a, b) => a.proj.distance - b.proj.distance)
          .slice(0, maxVisibleMarkers);
        const visibleIds = new Set(prioritizedVisible.map(({ loc }) => loc.id));

        projections.forEach(({ loc, proj }) => {
          const refs = markerRefs.current[loc.id];
          if (!refs || !refs.dom) return;

          refs.currentDist = proj.distance;

          if (!visibleIds.has(loc.id)) {
            refs.dom.style.display = 'none';
          } else {
            refs.dom.style.display = 'block';
            refs.dom.style.left = `${proj.x}%`;
            refs.dom.style.top = `${proj.y}%`;
            refs.dom.style.transform = `translate(-50%, -50%) scale(${proj.scale})`;
            if (refs.dist) refs.dist.textContent = `${Math.round(proj.distance)}m`;

            // Update locked state if needed (minimal React calls)
            const isLocked = proj.stage === ARStage.TARGET_LOCK || proj.stage === ARStage.PRECISE;
            const setLocked = markerLockSettersRef.current[loc.id];
            if (setLocked) setLocked(isLocked);
          }
        });

        // 2. Update Guidance Arrows
        const nearestPOI = projections
          .map(({ loc, proj }) => ({ loc, ...proj }))
          .filter(p => !p.isVisible && p.stage !== ARStage.LONG_RANGE)
          .sort((a, b) => a.distance - b.distance)[0];

        if (leftArrowRef.current) leftArrowRef.current.style.opacity = nearestPOI && nearestPOI.relativeBearing < 0 ? '1' : '0';
        if (rightArrowRef.current) rightArrowRef.current.style.opacity = nearestPOI && nearestPOI.relativeBearing > 0 ? '1' : '0';
      }

      // 3. Update Horizon Mode
      if (viewMode === 'HORIZON') {
        LOCATIONS.forEach(loc => {
          const node = horizonNodesRefs.current[loc.id];
          if (!node || !node.dom) return;

          const proj = getARProjection(userLoc, orient, { lat: loc.coordinates[0], lng: loc.coordinates[1] });
          node.currentDist = proj.distance;

          if (proj.stage === ARStage.LONG_RANGE) {
            node.dom.style.display = 'none';
          } else {
            const xPos = ((proj.relativeBearing + 180) / 360) * 100;
            node.dom.style.display = 'flex';
            node.dom.style.left = `${xPos}%`;
          }
        });
      }
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [permissionGranted, isForeground, viewMode, policy.arFx.targetFps, maxVisibleMarkers]);

  // Recalibrate pitch when re-entering AR mode.
  useEffect(() => {
    if (viewMode === 'AR') betaZeroRef.current = null;
  }, [viewMode]);

  const HELP_HINTS = {
    [ARStage.LONG_RANGE]: "Open the map to see common routes to Tuzla's landmarks.",
    [ARStage.DISCOVERY]: "Hold your phone flat for the horizon compass, or upright for AR mode.",
    [ARStage.TARGET_LOCK]: "Follow the arrows to center the landmark in your view.",
    [ARStage.PRECISE]: "Walk closer until the camera activates to find the QR reward."
  };

  const [nearestPOIState, setNearestPOIState] = useState<{ distance: number, stage: ARStage }>({ distance: Infinity, stage: ARStage.LONG_RANGE });
  const currentStage = nearestPOIState.stage;
  const nearestDistance = nearestPOIState.distance;

  const CAMERA_ON_METERS = policy.arFx.cameraOnMeters;
  const CAMERA_OFF_METERS = policy.arFx.cameraOffMeters;
  const shouldCameraBeOn = viewMode === 'AR' && (nearestDistance <= CAMERA_ON_METERS || (cameraActive && nearestDistance <= CAMERA_OFF_METERS));

  const startCamera = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera is not available in this browser.");
        setCameraActive(false);
        return;
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: policy.arFx.cameraWidth },
          height: { ideal: policy.arFx.cameraHeight },
          frameRate: { ideal: policy.arFx.cameraIdealFps, max: policy.arFx.cameraMaxFps },
        }
      });
      streamRef.current = mediaStream;
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
      setCameraActive(true);
    } catch (err) {
      setError("Camera access denied.");
      setCameraActive(false);
    }
  }, [policy.arFx.cameraHeight, policy.arFx.cameraIdealFps, policy.arFx.cameraMaxFps, policy.arFx.cameraWidth]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    if (!permissionGranted || !isForeground) {
      if (cameraActive) stopCamera();
      return;
    }
    if (shouldCameraBeOn && !cameraActive) startCamera();
    else if (!shouldCameraBeOn && cameraActive) stopCamera();
  }, [shouldCameraBeOn, permissionGranted, cameraActive, startCamera, stopCamera, isForeground]);

  useEffect(() => {
    if (!permissionGranted || !isForeground) return;
    if (!navigator.geolocation) {
      setError('Location is not available in this browser.');
      return;
    }

    let watchId: number | null = null;
    let intervalId: any = null;
    let isHighAccuracy = false;
    let initialResolved = false;
    const highAccuracyThreshold = features.isAndroidLight ? 400 : 2000;

    const updateLocation = (pos: GeolocationPosition) => {
      initialResolved = true;
      const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      userLocationRef.current = newLoc;
      
      let minDistance = Infinity;
      for (const loc of LOCATIONS) {
        const dist = Math.sqrt(
          Math.pow((loc.coordinates[0] - newLoc.lat) * 111320, 2) +
          Math.pow((loc.coordinates[1] - newLoc.lng) * 111320 * Math.cos(newLoc.lat * Math.PI / 180), 2)
        );
        if (dist < minDistance) minDistance = dist;
      }

      let stage = ARStage.LONG_RANGE;
      if (minDistance < 10) stage = ARStage.PRECISE;
      else if (minDistance < 50) stage = ARStage.TARGET_LOCK;
      else if (minDistance < 2000) stage = ARStage.DISCOVERY;

      setNearestPOIState(prev => {
        if (prev.stage !== stage || Math.abs(prev.distance - minDistance) > 5) {
           return { distance: minDistance, stage };
        }
        return prev;
      });

      if (minDistance > highAccuracyThreshold && isHighAccuracy) {
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        watchId = null;
        isHighAccuracy = false;
        intervalId = setInterval(() => {
          navigator.geolocation.getCurrentPosition(updateLocation, () => {}, { enableHighAccuracy: false });
        }, 30000);
      } else if (minDistance <= highAccuracyThreshold && !isHighAccuracy) {
        if (intervalId !== null) clearInterval(intervalId);
        intervalId = null;
        isHighAccuracy = true;
        watchId = navigator.geolocation.watchPosition(updateLocation, () => {}, {
           enableHighAccuracy: true,
           maximumAge: 1000,
           timeout: 10000,
        });
      }
    };

    const handleGeoError = (err: GeolocationPositionError) => {
      console.warn('AR Geolocation error:', err.message);
      // Fallback: try with low accuracy if high accuracy times out
      if (!initialResolved && err.code === err.TIMEOUT) {
        navigator.geolocation.getCurrentPosition(
          updateLocation,
          () => { setError('Location unavailable. Please enable GPS.'); },
          { enableHighAccuracy: false, timeout: 10000 }
        );
      }
    };

    // Try high accuracy first with a reasonable timeout
    navigator.geolocation.getCurrentPosition(updateLocation, handleGeoError, {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 5000,
    });

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (intervalId !== null) clearInterval(intervalId);
    };
  }, [permissionGranted, isForeground, features.isAndroidLight]);

  useEffect(() => {
    if (!permissionGranted || !isForeground) return;

    // Track whether we've received absolute orientation data
    let hasAbsoluteData = false;

    const handleOrientation = (e: DeviceOrientationEvent, isAbsolute: boolean) => {
      // Once we get absolute data, ignore non-absolute events
      if (hasAbsoluteData && !isAbsolute) return;
      if (isAbsolute && !hasAbsoluteData) hasAbsoluteData = true;

      // 1. Get Alpha (Heading)
      let alpha: number | null = null;
      
      // Use webkitCompassHeading for iOS if available
      if ((e as any).webkitCompassHeading !== undefined) {
        alpha = (e as any).webkitCompassHeading;
        if ((e as any).webkitCompassAccuracy !== undefined) {
          setHeadingAccuracy((e as any).webkitCompassAccuracy);
        }
      } else if (e.alpha !== null) {
        // For absolute events, alpha is already compass heading (CW from North)
        // For non-absolute, alpha is arbitrary so we convert CCW to CW
        if (isAbsolute || (e as any).absolute) {
          alpha = (360 - e.alpha) % 360;
        } else {
          alpha = (360 - e.alpha) % 360;
        }
      }

      // 1.5 Apply Manual Calibration Offset
      if (alpha !== null) {
        alpha = (alpha + compassOffset) % 360;
      }

      // 2. Compensate for Screen Orientation (Portrait/Landscape)
      const screenAngle = (window.screen.orientation?.angle) || (window.orientation as number) || 0;
      if (alpha !== null) {
        alpha = (alpha + screenAngle) % 360;
      }

      const beta = e.beta;
      if (viewMode === 'AR' && betaZeroRef.current === null && beta !== null) {
        // Calibrate vertical horizon based on current tilt if it's within a reasonable range (pointing forward)
        if (Math.abs(beta) > 45 && Math.abs(beta) < 135) {
          betaZeroRef.current = beta;
        } else {
          betaZeroRef.current = 90; // Default vertical
        }
      }
      
      const betaAdj = beta !== null && betaZeroRef.current !== null ? beta - betaZeroRef.current : beta;
      
      let smoothedAlpha = alpha;
      if (smoothedAlpha !== null) {
        const prev = smoothedAlphaRef.current;
        smoothedAlpha = prev === null ? smoothedAlpha : (prev + 0.18 * ((((smoothedAlpha - prev) + 540) % 360) - 180) + 360) % 360;
        smoothedAlphaRef.current = smoothedAlpha;
      }

      const accuracy = (e as any).webkitCompassAccuracy ?? null;
      if (accuracy !== null) setHeadingAccuracy(accuracy);

      orientationRef.current = { 
        alpha: smoothedAlpha, 
        beta: betaAdj ?? null, 
        gamma: e.gamma ?? null,
        headingAccuracy: accuracy
      };
    };

    // Listen to BOTH events — prefer absolute when it fires, fall back to relative
    const handleAbsolute = (e: DeviceOrientationEvent) => handleOrientation(e, true);
    const handleRelative = (e: DeviceOrientationEvent) => handleOrientation(e, false);

    window.addEventListener('deviceorientationabsolute', handleAbsolute as any);
    window.addEventListener('deviceorientation', handleRelative as any);

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleAbsolute as any);
      window.removeEventListener('deviceorientation', handleRelative as any);
    };
  }, [permissionGranted, viewMode, isForeground, compassOffset]);

  const requestPermission = async () => {
    setError(null);

    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      setError("AR needs HTTPS so the browser can allow sensors and location.");
      return;
    }

    try {
      const OrientationEvent = window.DeviceOrientationEvent as typeof DeviceOrientationEvent | undefined;
      if (OrientationEvent && typeof (OrientationEvent as any).requestPermission === 'function') {
        const res = await (OrientationEvent as any).requestPermission();
        if (res !== 'granted') {
          setError("Motion sensor permission denied.");
          return;
        }
      } else if (!OrientationEvent) {
        setError("Motion sensors are not available on this device.");
      }

      setPermissionGranted(true);
    } catch (err) {
      console.warn('AR permission error:', err);
      setError("Could not start AR sensors.");
    }
  };

  return (
    <div className="relative w-full h-screen bg-blue-950 overflow-hidden">
      {cameraActive ? (
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover opacity-100 transition-opacity duration-700" />
      ) : (
        <div className="absolute inset-0 w-full h-full bg-black">
          <iframe
            src="/assets/Gallery/QuestQRLocations/Tvrko%20pannellum/pannellum/pannellum.htm?panorama=../tz.jpg&autoLoad=true"
            className="w-full h-full border-none pointer-events-auto"
            title="Tuzla Panorama"
            allow="gyroscope; accelerometer"
            allowFullScreen
          />
          <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px] pointer-events-none"></div>
        </div>
      )}

      {permissionGranted ? (
        <>
          <div className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${viewMode === 'AR' ? 'opacity-100' : 'opacity-20'}`}>
            {LOCATIONS.map((loc) => {
               if (!markerRefs.current[loc.id]) {
                 markerRefs.current[loc.id] = { dom: null, dist: null, currentDist: Infinity };
               }
               const refs = markerRefs.current[loc.id];
               return (
                <ARMarker
                  key={loc.id}
                  location={loc}
                  lang={lang}
                  onSelect={(l, d) => setSelectedLocation({ loc: l, dist: d })}
                  domRef={{ get current() { return refs.dom }, set current(v) { refs.dom = v } }}
                  distRef={{ get current() { return refs.dist }, set current(v) { refs.dist = v } }}
                  currentDistState={{ get current() { return refs.currentDist }, set current(v) { refs.currentDist = v } }}
                  registerLockSetter={registerMarkerLockSetter}
                />
               );
            })}
          </div>

          {viewMode === 'HORIZON' && (
             <div className="absolute top-24 inset-x-0 h-32 bg-black/60 border-y border-white/20 overflow-hidden pointer-events-auto shadow-2xl">
               <div className="relative w-full h-full">
                 {LOCATIONS.map(loc => {
                    if (!horizonNodesRefs.current[loc.id]) {
                      horizonNodesRefs.current[loc.id] = { dom: null, currentDist: Infinity };
                    }
                    const hRef = horizonNodesRefs.current[loc.id];
                    return (
                      <button
                        key={loc.id}
                        ref={(el) => { hRef.dom = el }}
                        onClick={() => setSelectedLocation({ loc, dist: hRef.currentDist })}
                        className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center group transition-transform will-change-transform [display:none] [transform:translateX(-50%)]"
                      >
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white/50 shadow-[0_0_15px_rgba(59,130,246,0.5)] group-hover:scale-110">
                          <MapPin className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-[10px] text-white font-black opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap mt-2 bg-blue-950/90 px-2 py-1 rounded-md border border-white/20 shadow-lg">
                          {loc.name[lang]}
                        </span>
                      </button>
                    );
                 })}
                 <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-red-500 rounded-full shadow-[0_0_15px_red] z-10 [transform:translateX(-50%)]"></div>
               </div>
             </div>
          )}

          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 pointer-events-none flex justify-between px-4">
            <div ref={leftArrowRef} className="flex flex-col items-center animate-pulse opacity-0 transition-opacity duration-200">
                <X className="w-10 h-10 text-amber-400 -rotate-90 drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]" />
                <span className="text-[10px] text-amber-400 font-black uppercase tracking-widest">POI LEFT</span>
            </div>
            <div ref={rightArrowRef} className="flex flex-col items-center animate-pulse opacity-0 transition-opacity duration-200">
                <X className="w-10 h-10 text-amber-400 rotate-90 drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]" />
                <span className="text-[10px] text-amber-400 font-black uppercase tracking-widest">POI RIGHT</span>
            </div>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-40 p-8 text-center">
          <Compass className="w-16 h-16 text-blue-400 mb-6 animate-bounce" />
          <h2 className="text-2xl font-black text-white mb-2">Enable AR Sensors</h2>
          {error && (
            <p className="max-w-xs text-sm text-amber-200 font-bold mb-5">
              {error}
            </p>
          )}
          <button onClick={requestPermission} className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl hover:bg-blue-700 transition-all">Start AR Guide</button>
        </div>
      )}

      {permissionGranted && error && (
        <div className="absolute top-28 left-4 right-4 z-[70] rounded-2xl border border-amber-300/50 bg-amber-950/85 px-4 py-3 text-center text-xs font-bold text-amber-100">
          {error}
        </div>
      )}

      {selectedLocation && (
        <div className="absolute inset-x-4 bottom-16 z-50 animate-in slide-in-from-bottom duration-300">
          <div className="bg-white/95 rounded-3xl p-6 shadow-2xl border border-blue-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-black text-blue-900">{selectedLocation.loc.name[lang]}</h3>
                <p className="text-sm text-blue-600 font-medium">{Math.round(selectedLocation.dist)}m away</p>
              </div>
              <button onClick={() => setSelectedLocation(null)} title="Close" aria-label="Close" className="p-2 bg-blue-50 rounded-full text-blue-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-gray-700 text-sm leading-relaxed mb-6">{selectedLocation.loc.description[lang]}</p>
            <button onClick={() => onNavigate?.(selectedLocation.loc)} className="w-full py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all">Navigate to Site</button>
          </div>
        </div>
      )}

      {showHelp && (
          <div className="absolute top-16 left-4 right-4 bg-blue-900/90 border border-white/20 rounded-2xl p-4 text-white text-xs z-[60] animate-in fade-in slide-in-from-top-4">
              <p className="font-bold mb-1">Hint:</p>
              {HELP_HINTS[currentStage]}
          </div>
      )}

      {/* Battery Warning at Bottom */}
      <div className="absolute bottom-4 inset-x-0 flex justify-center px-6 pointer-events-none">
        <p className="text-[10px] text-blue-300 font-bold text-center leading-tight uppercase tracking-widest opacity-80">
           ⚠️ {TRANSLATIONS[lang].batteryWarning}
        </p>
      </div>

      <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-none">
        <div className="pointer-events-auto bg-black/60 px-4 py-2 rounded-full border border-white/20 flex items-center gap-2">
          <div className={`w-2 h-2 ${cameraActive ? 'bg-green-500' : 'bg-blue-400'} rounded-full animate-pulse`}></div>
          <span className="text-white text-[10px] font-black uppercase tracking-widest">
            {cameraActive
              ? 'Scanning Active'
              : (viewMode === 'HORIZON'
                  ? (features.isAndroidLight ? 'Compass Mode (Battery Saver)' : 'Compass Mode')
                  : 'Discovery Mode')}
          </span>
        </div>
        <div className="flex gap-2 pointer-events-auto">
            <button onClick={() => setViewMode(viewMode === 'AR' ? 'HORIZON' : 'AR')} title={viewMode === 'AR' ? 'Switch to Horizon Mode' : 'Switch to AR Mode'} aria-label={viewMode === 'AR' ? 'Switch to Horizon Mode' : 'Switch to AR Mode'} className="bg-blue-600/90 p-2 rounded-full border border-white/20 text-white shadow-lg">{viewMode === 'AR' ? <Compass className="w-5 h-5" /> : <Camera className="w-5 h-5" />}</button>
            <button onClick={() => setShowHelp(!showHelp)} title="Help" aria-label="Help" className="bg-black/60 p-2 rounded-full border border-white/20 text-white"><Info className="w-5 h-5" /></button>
        </div>
      </div>

      
      {headingAccuracy !== null && headingAccuracy > 20 && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 bg-amber-500/90 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase z-50 animate-pulse">
          ⚠️ Compass Calibration Needed
        </div>
      )}
    </div>
  );
};

export default ARGuide;
