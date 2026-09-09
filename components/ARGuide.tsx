import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Language, Location } from '../types';
import { LOCATIONS, TRANSLATIONS } from '../constants';
import {
  Camera, Info, X, MapPin, Compass, Navigation, ChevronLeft, ChevronRight, Target, CheckCircle2, Sparkles,
} from 'lucide-react';
import {
  getARProjection, ARStage, DeviceOrientation, WGS84Location, smoothHeading, smoothAngle,
  computeTiltCompensatedHeading, AdaptiveLowPassFilter,
} from '../utils/arProjection';
import {
  QUEST_TARGETS, QUEST_TARGET_COORDS, POI_COLORS, PHASE_1_POIS, PHASE_2_POIS, PHASE_3_POIS,
  GRAND_FINALE_POIS, getPoiPhase, getCurrentQuestPhase, isPoiRewardUnlocked,
} from '../constants/questData';
import { AppFeatures } from '../utils/platform';
import { useQuestRuntimePolicy } from '../hooks/useQuestRuntimePolicy';
import { useGeoapifyRoute } from '../hooks/useGeoapifyRoute';
import { useGeolocationWatcher } from '../hooks/useGeolocationWatcher';
import { ARPolylineCanvas } from './ARPolylineCanvas';
import { QrScannerModal } from './QrScannerModal';

interface ARGuideProps {
  lang: Language;
  features: AppFeatures;
  onNavigate?: (poi: Location) => void;
  initialTarget?: Location | null;
  unlockedRewards?: string[];
  onRewardFound?: (id: string) => void;
}

export interface ARGuidePOI {
  id: string;
  name: Partial<Record<Language, string>> & { en: string; bs: string };
  coordinates: [number, number];
  phase: number;
  color: string;
  image?: string;
  category: string;
}

const AR_LOCALIZATION: Record<Language, any> = {
  en: {
    startArTour: 'Start AR Tour Guide', enableArSensors: 'Enable AR Guide',
    arSensorsDesc: 'Experience real-time 3D camera navigation and interactive landmark discovery.',
    motionPermissionDenied: 'Motion sensor permission denied.', cameraUnavailable: 'Camera is unavailable.',
    gpsNotSupported: 'GPS location is not supported.', cameraActive: 'WebAR Camera Active',
    compassMode: 'Compass 360 Mode', startGuide: 'Start AR Guide', viewOnMap: 'View on Map',
    targetLocked: 'TARGET LOCKED', stepOf: (s: number, t: number) => `Step ${s} of ${t}`,
    toTurn: 'to turn', totalRemaining: 'total remaining',
    turnLeft: (d: number) => `${d}° LEFT`, turnRight: (d: number) => `${d}° RIGHT`,
    metersAway: (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km away` : `${m} meters away`),
    instructionsTitle: 'AR Guide Instructions',
    instructionsDesc: 'Point your device camera towards Tuzla landmarks to see live 3D AR badges. Markers follow quest phases: complete each phase to unlock the next!',
    calibrationNeeded: 'Compass Calibration Needed', endNavigation: 'End Navigation',
    phase1Title: 'Phase 1: Foundations of Tuzla',
    phase2Title: 'Phase 2: Cultural Heritage',
    phase3Title: 'Phase 3: Lakes, Nature & Fine Arts',
    phaseFinaleTitle: 'Grand Finale: Bingo City Center',
    completedPhaseBadge: 'Completed',
    activePhaseGoal: 'Active Target',
  },
  bs: {
    startArTour: 'Pokreni AR Vodič', enableArSensors: 'Omogući AR Vodič',
    arSensorsDesc: 'Iskusite 3D kameru uživo i navigaciju u realnom vremenu.',
    motionPermissionDenied: 'Pristup senzorima pokreta je odbijen.', cameraUnavailable: 'Kamera nije dostupna.',
    gpsNotSupported: 'GPS lokacija nije podržana.', cameraActive: 'WebAR Kamera Aktivna',
    compassMode: 'Kompas 360 Režim', startGuide: 'Započni AR Navigaciju', viewOnMap: 'Prikaži na mapi',
    targetLocked: 'CILJ ZAKLJUČAN', stepOf: (s: number, t: number) => `Korak ${s} od ${t}`,
    toTurn: 'do skretanja', totalRemaining: 'ukupno preostalo',
    turnLeft: (d: number) => `${d}° LIJEVO`, turnRight: (d: number) => `${d}° DESNO`,
    metersAway: (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km udaljeno` : `${m} metara udaljeno`),
    instructionsTitle: 'AR Uputstva za Vodiča',
    instructionsDesc: 'Usmjerite kameru prema znamenitostima Tuzle za 3D AR oznake. Oznake prate faze potrage: završite svaku fazu da otključate sljedeću!',
    calibrationNeeded: 'Potrebna Kalibracija Kompasa', endNavigation: 'Završi Navigaciju',
    phase1Title: 'Faza 1: Temelji Tuzle',
    phase2Title: 'Faza 2: Kulturna Baština',
    phase3Title: 'Faza 3: Jezera, Priroda i Umjetnost',
    phaseFinaleTitle: 'Veliko Finale: Bingo City Centar',
    completedPhaseBadge: 'Završeno',
    activePhaseGoal: 'Aktivni cilj',
  },
  de: {
    startArTour: 'AR-Tour starten', enableArSensors: 'AR-Guide aktivieren',
    arSensorsDesc: 'Erleben Sie Echtzeit-3D-Kameranavigation.', motionPermissionDenied: 'Berechtigung verweigert.',
    cameraUnavailable: 'Kamera nicht verfügbar.', gpsNotSupported: 'GPS nicht unterstützt.',
    cameraActive: 'WebAR-Kamera aktiv', compassMode: 'Kompass 360 Modus', startGuide: 'AR-Navigation starten',
    viewOnMap: 'Auf Karte anzeigen', targetLocked: 'ZIEL ANVISIERT',
    stepOf: (s: number, t: number) => `Schritt ${s} von ${t}`, toTurn: 'bis Abbiegen',
    totalRemaining: 'verbleibend', turnLeft: (d: number) => `${d}° LINKS`, turnRight: (d: number) => `${d}° RECHTS`,
    metersAway: (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km entfernt` : `${m} Meter entfernt`),
    instructionsTitle: 'AR-Guide Anleitung',
    instructionsDesc: 'Richten Sie Ihre Kamera auf Sehenswürdigkeiten.', calibrationNeeded: 'Kalibrierung erforderlich',
    endNavigation: 'Navigation beenden',
    phase1Title: 'Phase 1: Grundlagen von Tuzla',
    phase2Title: 'Phase 2: Kulturelles Erbe',
    phase3Title: 'Phase 3: Seen, Natur & Kunst',
    phaseFinaleTitle: 'Großes Finale: Bingo City Center',
    completedPhaseBadge: 'Abgeschlossen',
    activePhaseGoal: 'Aktives Ziel',
  },
  tr: {
    startArTour: 'AR Rehberini Başlat', enableArSensors: 'AR Rehberini Etkinleştir',
    arSensorsDesc: 'Gerçek zamanlı 3D kamera navigasyonu.', motionPermissionDenied: 'İzin reddedildi.',
    cameraUnavailable: 'Kamera kullanılamıyor.', gpsNotSupported: 'GPS desteklenmiyor.',
    cameraActive: 'WebAR Kamera Aktif', compassMode: 'Pusula 360 Modu', startGuide: 'AR Navigasyonunu Başlat',
    viewOnMap: 'Haritada Gör', targetLocked: 'HEDEF KİLİTLENDİ',
    stepOf: (s: number, t: number) => `Adım ${s} / ${t}`, toTurn: 'dönüşe',
    totalRemaining: 'toplam kalan', turnLeft: (d: number) => `${d}° SOLA`, turnRight: (d: number) => `${d}° SAĞA`,
    metersAway: (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km uzakta` : `${m} metre uzaklıkta`),
    instructionsTitle: 'AR Rehberi Talimatları',
    instructionsDesc: 'Kameranızı simge yapılara doğrultun.', calibrationNeeded: 'Kalibrasyon Gerekli',
    endNavigation: 'Navigasyonu Bitir',
    phase1Title: 'Aşama 1: Tuzla Temelleri',
    phase2Title: 'Aşama 2: Kültürel Miras',
    phase3Title: 'Aşama 3: Göller, Doğa & Sanat',
    phaseFinaleTitle: 'Büyük Final: Bingo City Center',
    completedPhaseBadge: 'Tamamlandı',
    activePhaseGoal: 'Aktif Hedef',
  },
};

const ARMarker: React.FC<{
  poi: ARGuidePOI;
  lang: Language;
  isFocusedTarget: boolean;
  isDarkened: boolean;
  isUnlocked: boolean;
  onSelect: (poi: ARGuidePOI, distance: number) => void;
  domRef: React.RefObject<HTMLDivElement | null>;
  distRef: React.RefObject<HTMLSpanElement | null>;
  currentDistState: React.MutableRefObject<number>;
}> = ({ poi, lang, isFocusedTarget, isDarkened, isUnlocked, onSelect, domRef, distRef, currentDistState }) => {
  const customColor = poi.color || '#3b82f6';
  const name = poi.name[lang] || poi.name.en;

  return (
    <div
      ref={domRef}
      className={`absolute pointer-events-auto will-change-transform transition-opacity duration-300 ${
        isDarkened ? 'opacity-50 grayscale contrast-75 hover:opacity-100 hover:grayscale-0' : 'opacity-100'
      }`}
      style={{ top: 0, left: 0, display: 'none' }}
    >
      <button
        onClick={() => onSelect(poi, currentDistState.current)}
        className="flex flex-col items-center group focus:outline-none"
      >
        <div className="relative">
          {!isDarkened && (
            <div
              className={`absolute inset-0 rounded-full blur-md ${
                isFocusedTarget ? 'animate-ping opacity-90' : 'animate-pulse opacity-60'
              }`}
              style={{ backgroundColor: isFocusedTarget ? '#fbbf24' : customColor }}
            />
          )}
          <div
            className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110 border-4 ${
              isDarkened
                ? 'bg-slate-900/90 border-slate-600 text-slate-400'
                : isFocusedTarget
                ? 'bg-amber-400 border-amber-500 text-amber-950 shadow-[0_0_25px_rgba(251,191,36,0.8)]'
                : 'bg-white/95 text-white'
            }`}
            style={!isDarkened && !isFocusedTarget ? { borderColor: customColor } : undefined}
          >
            {isDarkened ? (
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            ) : isFocusedTarget ? (
              <Target className="w-7 h-7 text-amber-950 animate-spin-slow" />
            ) : (
              <MapPin className="w-7 h-7" style={{ color: customColor }} />
            )}
          </div>
        </div>

        <div
          className={`mt-2 px-3.5 py-1.5 backdrop-blur-md rounded-full border shadow-xl flex items-center gap-1.5 ${
            isDarkened
              ? 'bg-slate-950/85 border-slate-700/60'
              : isFocusedTarget
              ? 'bg-amber-950/90 border-amber-400'
              : 'bg-slate-950/85 border-white/30'
          }`}
        >
          {isDarkened && (
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30">
              ✓ P{poi.phase}
            </span>
          )}
          <span className={`text-xs font-black whitespace-nowrap tracking-wide ${isDarkened ? 'text-slate-300' : 'text-white'}`}>
            {name}
          </span>
          <span ref={distRef} className={`text-[11px] font-extrabold ${isDarkened ? 'text-slate-400' : 'text-amber-300'}`}>
            ...
          </span>
        </div>
      </button>
    </div>
  );
};

export const ARGuide: React.FC<ARGuideProps> = ({
  lang,
  features,
  onNavigate,
  initialTarget = null,
  unlockedRewards = [],
  onRewardFound,
}) => {
  const { policy } = useQuestRuntimePolicy(features);
  const t = AR_LOCALIZATION[lang] || AR_LOCALIZATION.en;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const arViewportRef = useRef<HTMLDivElement | null>(null);

  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'AR' | 'HORIZON'>(features.isAndroidLight ? 'HORIZON' : 'AR');
  const [showHelp, setShowHelp] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [isForeground, setIsForeground] = useState(true);

  const [targetPoi, setTargetPoi] = useState<Location | null>(initialTarget);
  const [selectedLocation, setSelectedLocation] = useState<{ loc: Location; dist: number } | null>(null);
  const [localUnlockedRewards, setLocalUnlockedRewards] = useState<string[]>(unlockedRewards);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Sync unlockedRewards from prop updates
  useEffect(() => {
    setLocalUnlockedRewards(unlockedRewards);
  }, [unlockedRewards]);

  // Unified Quest POIs mapped from canonical QUEST_TARGETS & QUEST_TARGET_COORDS
  const questArPois: ARGuidePOI[] = useMemo(() => {
    return QUEST_TARGETS.map((qt) => {
      const coords = QUEST_TARGET_COORDS[qt.id] || { lat: 44.5388, lon: 18.6750 };
      const matchedLoc = LOCATIONS.find(
        (l) =>
          l.id === qt.id ||
          l.id.toLowerCase() === qt.id.toLowerCase() ||
          l.name.bs.toLowerCase().includes(qt.name.bs.toLowerCase()) ||
          l.name.en.toLowerCase().includes(qt.name.en.toLowerCase())
      );
      return {
        id: qt.id,
        name: { ...matchedLoc?.name, ...qt.name },
        coordinates: [coords.lat, coords.lon],
        phase: getPoiPhase(qt.id),
        color: POI_COLORS[qt.id] || '#3b82f6',
        image: qt.Image || matchedLoc?.image,
        category:
          matchedLoc?.category ||
          (qt.id === 'panonika' || qt.id === 'slapovi' || qt.id === 'slana_banja' ? 'nature' : 'culture'),
      };
    });
  }, []);

  // Compute active quest phase (1, 2, 3, or 4)
  const currentPhase = useMemo(() => getCurrentQuestPhase(localUnlockedRewards), [localUnlockedRewards]);

  // Phase title helper
  const currentPhaseTitle = useMemo(() => {
    if (currentPhase === 1) return t.phase1Title;
    if (currentPhase === 2) return t.phase2Title;
    if (currentPhase === 3) return t.phase3Title;
    return t.phaseFinaleTitle;
  }, [currentPhase, t]);

  // Active phase stats (e.g. 2/3 completed in current phase)
  const currentPhasePois = useMemo(
    () => questArPois.filter((p) => p.phase === currentPhase),
    [questArPois, currentPhase]
  );
  const currentPhaseUnlockedCount = useMemo(
    () => currentPhasePois.filter((p) => isPoiRewardUnlocked(p.id, localUnlockedRewards)).length,
    [currentPhasePois, localUnlockedRewards]
  );

  const userLocationRef = useRef<WGS84Location | null>(null);
  const [userLocationState, setUserLocationState] = useState<WGS84Location | null>(null);
  const orientationRef = useRef<DeviceOrientation>({ alpha: null, beta: null, gamma: null });
  const [orientationState, setOrientationState] = useState<DeviceOrientation>({ alpha: null, beta: null, gamma: null });
  const [headingAccuracy, setHeadingAccuracy] = useState<number | null>(null);

  const smoothedAlphaRef = useRef<number | null>(null);
  const smoothedBetaRef = useRef<number | null>(null);
  const smoothedGammaRef = useRef<number | null>(null);

  const [targetRelativeBearing, setTargetRelativeBearing] = useState<number | null>(null);
  const [targetDistance, setTargetDistance] = useState<number | null>(null);
  const [nearestActivePoiBearing, setNearestActivePoiBearing] = useState<{
    bearing: number;
    distance: number;
    name: string;
  } | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  const markerRefs = useRef<
    Record<string, { dom: HTMLDivElement | null; dist: HTMLSpanElement | null; currentDist: number }>
  >({});
  const gpsFilterRef = useRef(new AdaptiveLowPassFilter());

  const { fullPolyline, steps, activeStepIndex, activeStep, distanceToNextStep, distanceToDestination } =
    useGeoapifyRoute({
      origin: userLocationState,
      destination: targetPoi ? { lat: targetPoi.coordinates[0], lng: targetPoi.coordinates[1] } : null,
      enabled: !!targetPoi && !!userLocationState,
      onReachDestination: () => {
        if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
        setIsQrModalOpen(true);
      },
    });

  useEffect(() => {
    const handleVisibility = () => setIsForeground(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(t.cameraUnavailable);
        setCameraActive(false);
        return;
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: policy.arFx.cameraWidth },
          height: { ideal: policy.arFx.cameraHeight },
          frameRate: { ideal: policy.arFx.cameraIdealFps, max: policy.arFx.cameraMaxFps },
        },
      });
      streamRef.current = mediaStream;
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
      setCameraActive(true);
    } catch (err) {
      console.warn('Camera start failed:', err);
      setCameraActive(false);
    }
  }, [policy.arFx, t.cameraUnavailable]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  }, []);

  useEffect(() => {
    if (!permissionGranted || !isForeground) {
      if (cameraActive) stopCamera();
      return;
    }
    if (viewMode === 'AR' && !cameraActive) startCamera();
    else if (viewMode === 'HORIZON' && cameraActive) stopCamera();
  }, [viewMode, permissionGranted, isForeground, cameraActive, startCamera, stopCamera]);

  const { position: rawGeoPosition, hasPermission: geoPermission } = useGeolocationWatcher({
    enabled: permissionGranted && isForeground,
    onError: (err) => console.warn('AR Geolocation error:', err),
  });

  useEffect(() => {
    if (!geoPermission && permissionGranted) {
      setError(t.gpsNotSupported);
    }
  }, [geoPermission, permissionGranted, t.gpsNotSupported]);

  // Adaptive Low-Pass Filter driven by app-wide GeolocationWatcher
  useEffect(() => {
    if (!rawGeoPosition) return;

    const rawLat = rawGeoPosition.lat;
    const rawLng = rawGeoPosition.lng;

    let distance = Infinity;
    if (targetPoi) {
      const dLat = (rawLat - targetPoi.coordinates[0]) * 111000;
      const dLng =
        (rawLng - targetPoi.coordinates[1]) * 111000 * Math.cos((targetPoi.coordinates[0] * Math.PI) / 180);
      distance = Math.sqrt(dLat * dLat + dLng * dLng);
    }

    const smoothed = gpsFilterRef.current.update(rawLat, rawLng, distance);
    const newLoc: WGS84Location = { lat: smoothed.lat, lng: smoothed.lng, elevation: rawGeoPosition.elevation ?? 0 };

    userLocationRef.current = newLoc;
    setUserLocationState(newLoc);
  }, [rawGeoPosition, targetPoi]);

  // Tilt-Compensated 3-Axis Sensor Fusion for rock-solid compass heading
  useEffect(() => {
    if (!permissionGranted || !isForeground) return;
    let hasAbsolute = false;

    const handleOrientation = (e: DeviceOrientationEvent, isAbs: boolean) => {
      if (hasAbsolute && !isAbs) return;
      if (isAbs) hasAbsolute = true;

      const webkitHeading = (e as any).webkitCompassHeading;
      if (webkitHeading !== undefined && (e as any).webkitCompassAccuracy !== undefined) {
        setHeadingAccuracy((e as any).webkitCompassAccuracy);
      }

      const rawHeading = computeTiltCompensatedHeading(e.alpha, e.beta, e.gamma, webkitHeading);
      if (rawHeading !== null) {
        const screenAngle = window.screen?.orientation?.angle || (window.orientation as number) || 0;
        const adjustedHeading = (rawHeading + screenAngle) % 360;
        const alpha = smoothHeading(adjustedHeading, smoothedAlphaRef.current, 0.18);
        smoothedAlphaRef.current = alpha;

        const betaRaw = e.beta ?? 90;
        const gammaRaw = e.gamma ?? 0;
        const beta = smoothAngle(betaRaw, smoothedBetaRef.current, 0.2);
        const gamma = smoothAngle(gammaRaw, smoothedGammaRef.current, 0.2);
        smoothedBetaRef.current = beta;
        smoothedGammaRef.current = gamma;

        const newOrient: DeviceOrientation = { alpha, beta, gamma };
        orientationRef.current = newOrient;
        setOrientationState(newOrient);
      }
    };

    window.addEventListener('deviceorientationabsolute', ((e: any) => handleOrientation(e, true)) as any);
    window.addEventListener('deviceorientation', ((e: any) => handleOrientation(e, false)) as any);
    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation as any);
      window.removeEventListener('deviceorientation', handleOrientation as any);
    };
  }, [permissionGranted, isForeground]);

  // GPU-Composited AR Render Loop with Phase Isolation and Horizon Clamping
  useEffect(() => {
    if (!permissionGranted || !isForeground) return;
    let frameId: number;
    const targetFps = policy.arFx.targetFps || 30;
    const frameInterval = 1000 / targetFps;

    const loop = (timestamp: number) => {
      frameId = requestAnimationFrame(loop);
      const elapsed = timestamp - lastFrameTimeRef.current;
      if (elapsed < frameInterval) return;
      lastFrameTimeRef.current = timestamp;

      const userLoc = userLocationRef.current;
      const orient = orientationRef.current;
      if (!userLoc || orient.alpha === null) return;

      const rect = arViewportRef.current?.getBoundingClientRect();
      const screen = { width: rect?.width || window.innerWidth, height: rect?.height || window.innerHeight * 0.4 };

      if (viewMode === 'AR') {
        questArPois.forEach((poi) => {
          const refs = markerRefs.current[poi.id];
          if (!refs || !refs.dom) return;

          // Phase-based visibility:
          // In Phase 1: Only Phase 1 POIs are rendered. Phase 2 & 3 are hidden.
          // In Phase 2: Phase 1 (darkened) + Phase 2 (bright). Phase 3 hidden.
          // In Phase 3: Phase 1 & 2 (darkened) + Phase 3 (bright). Finale hidden.
          // In Finale: Phase 1, 2, 3 (darkened) + Finale (bright).
          const isVisiblePhase = poi.phase <= currentPhase;
          if (!isVisiblePhase) {
            if (refs.dom.style.display !== 'none') refs.dom.style.display = 'none';
            return;
          }

          const proj = getARProjection(userLoc, orient, { lat: poi.coordinates[0], lng: poi.coordinates[1] }, screen);
          refs.currentDist = proj.distance;

          if (!proj.isVisible || proj.stage === ARStage.LONG_RANGE) {
            if (refs.dom.style.display !== 'none') refs.dom.style.display = 'none';
          } else {
            if (refs.dom.style.display === 'none') refs.dom.style.display = 'block';

            const pxX = (proj.x / 100) * screen.width;
            const pxY = (proj.y / 100) * screen.height;
            const transform = `translate3d(${pxX}px, ${pxY}px, 0) translate(-50%, -50%) scale(${proj.scale})`;

            if (refs.dom.style.transform !== transform) {
              refs.dom.style.transform = transform;
            }
            if (refs.dist) {
              refs.dist.textContent =
                proj.distance >= 1000
                  ? `${(proj.distance / 1000).toFixed(1)}km`
                  : `${Math.round(proj.distance)}m`;
            }
          }
        });
      }

      // Track target relative bearing or nearest active phase landmark
      if (targetPoi) {
        const targetProj = getARProjection(
          userLoc,
          orient,
          { lat: targetPoi.coordinates[0], lng: targetPoi.coordinates[1] },
          screen
        );
        setTargetRelativeBearing(targetProj.relativeBearing);
        setTargetDistance(targetProj.distance);
        setNearestActivePoiBearing(null);
      } else if (activeStep) {
        const stepProj = getARProjection(userLoc, orient, { lat: activeStep.lat, lng: activeStep.lng }, screen);
        setTargetRelativeBearing(stepProj.relativeBearing);
        setTargetDistance(stepProj.distance);
        setNearestActivePoiBearing(null);
      } else {
        // Track the closest landmark in the current active phase
        const activePois = questArPois.filter((p) => p.phase === currentPhase);
        let closestDist = Infinity;
        let closestProj: any = null;
        let closestName = '';

        activePois.forEach((p) => {
          const proj = getARProjection(userLoc, orient, { lat: p.coordinates[0], lng: p.coordinates[1] }, screen);
          if (proj.distance < closestDist) {
            closestDist = proj.distance;
            closestProj = proj;
            closestName = p.name[lang] || p.name.en;
          }
        });

        if (closestProj) {
          setTargetRelativeBearing(closestProj.relativeBearing);
          setTargetDistance(closestProj.distance);
          setNearestActivePoiBearing({
            bearing: closestProj.relativeBearing,
            distance: closestProj.distance,
            name: closestName,
          });
        } else {
          setTargetRelativeBearing(null);
          setTargetDistance(null);
          setNearestActivePoiBearing(null);
        }
      }
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [permissionGranted, isForeground, viewMode, policy.arFx.targetFps, targetPoi, activeStep, questArPois, currentPhase, lang]);

  const requestPermission = async () => {
    setError(null);
    try {
      const OrientationEvent = (window as any).DeviceOrientationEvent;
      if (OrientationEvent && typeof OrientationEvent.requestPermission === 'function') {
        const res = await OrientationEvent.requestPermission();
        if (res !== 'granted') {
          setError(t.motionPermissionDenied);
          return;
        }
      }
      setPermissionGranted(true);
    } catch (err) {
      console.warn('AR permission error:', err);
      setPermissionGranted(true);
    }
  };

  const handleStartQuestTarget = (loc: Location | ARGuidePOI) => {
    const matched = LOCATIONS.find((l) => l.id === loc.id) || (loc as Location);
    setTargetPoi(matched);
    setSelectedLocation(null);
  };

  const handleClearQuestTarget = () => {
    setTargetPoi(null);
    setTargetRelativeBearing(null);
    setTargetDistance(null);
  };

  const handleRewardFoundInternal = (id: string) => {
    if (!localUnlockedRewards.includes(id)) {
      setLocalUnlockedRewards([...localUnlockedRewards, id]);
    }
    if (onRewardFound) onRewardFound(id);
  };

  // Turn guidance logic
  const isTargetOffscreenLeft = targetRelativeBearing !== null && targetRelativeBearing < -16;
  const isTargetOffscreenRight = targetRelativeBearing !== null && targetRelativeBearing > 16;
  const isTargetInCenterVision = targetRelativeBearing !== null && Math.abs(targetRelativeBearing) <= 16;

  // Active target or closest active landmark name for turn indicators
  const activeGuidanceName = targetPoi
    ? targetPoi.name[lang] || targetPoi.name.en
    : nearestActivePoiBearing?.name || '';

  // Bottom carousel: only show POIs up to current phase
  const carouselPois = useMemo(() => {
    return questArPois.filter((p) => p.phase <= currentPhase);
  }, [questArPois, currentPhase]);

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden select-none flex flex-col font-quicksand">
      {!permissionGranted && (
        <div className="absolute top-0 inset-x-0 z-[200] bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border-b-2 border-amber-400 p-2.5 px-4 flex items-center justify-between gap-3 shadow-2xl shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center shrink-0 animate-bounce">
              <Compass className="w-5 h-5 text-amber-400" />
            </div>
            <div className="truncate">
              <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider truncate">
                {t.enableArSensors}
              </h4>
              <p className="text-[10px] text-slate-300 font-medium truncate">{t.arSensorsDesc}</p>
            </div>
          </div>
          <button
            onClick={requestPermission}
            className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-xs font-black rounded-xl shadow-lg active:scale-95 transition-all uppercase tracking-wider shrink-0"
          >
            {t.startArTour}
          </button>
        </div>
      )}

      {/* FULL BLEED AR VIEWPORT */}
      <div ref={arViewportRef} className="relative w-full h-full flex-1 bg-slate-950 overflow-hidden">
        {cameraActive ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
          />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-slate-950">
            <iframe
              src="/assets/Gallery/QuestQRLocations/Tvrko%20pannellum/pannellum/pannellum.htm?panorama=../tz.jpg&autoLoad=true"
              className="w-full h-full border-none pointer-events-auto opacity-80"
              title="Tuzla 360 Panorama"
              allow="gyroscope; accelerometer"
              allowFullScreen
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />
          </div>
        )}

        {permissionGranted && (
          <ARPolylineCanvas
            polyline={fullPolyline}
            userLocation={userLocationState}
            orientation={orientationState}
            maxHorizonMeters={40}
            isActive={viewMode === 'AR' && isForeground}
          />
        )}

        {/* 3D AR MARKERS WITH PHASE VISIBILITY */}
        {permissionGranted && (
          <div
            className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${
              viewMode === 'AR' ? 'opacity-100' : 'opacity-20'
            }`}
          >
            {questArPois.map((poi) => {
              if (!markerRefs.current[poi.id]) {
                markerRefs.current[poi.id] = { dom: null, dist: null, currentDist: Infinity };
              }
              const refs = markerRefs.current[poi.id];
              const isDarkened = poi.phase < currentPhase;
              const isUnlocked = isPoiRewardUnlocked(poi.id, localUnlockedRewards);
              const isFocused = targetPoi?.id === poi.id;
              const isVisiblePhase = poi.phase <= currentPhase;

              if (!isVisiblePhase) return null;

              return (
                <ARMarker
                  key={poi.id}
                  poi={poi}
                  lang={lang}
                  isFocusedTarget={isFocused}
                  isDarkened={isDarkened}
                  isUnlocked={isUnlocked}
                  onSelect={(selectedPoi, dist) => {
                    const matchedLoc =
                      LOCATIONS.find((l) => l.id === selectedPoi.id) || ({ ...selectedPoi } as unknown as Location);
                    setSelectedLocation({ loc: matchedLoc, dist });
                  }}
                  domRef={{
                    get current() {
                      return refs.dom;
                    },
                    set current(v) {
                      refs.dom = v;
                    },
                  }}
                  distRef={{
                    get current() {
                      return refs.dist;
                    },
                    set current(v) {
                      refs.dist = v;
                    },
                  }}
                  currentDistState={{
                    get current() {
                      return refs.currentDist;
                    },
                    set current(v) {
                      refs.currentDist = v;
                    },
                  }}
                />
              );
            })}
          </div>
        )}

        {/* TARGET LOCKED RETICLE IN CENTER VISION */}
        {permissionGranted && targetPoi && isTargetInCenterVision && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="relative flex flex-col items-center justify-center animate-in zoom-in-95 duration-200">
              <div className="absolute w-32 h-32 rounded-full border-2 border-amber-400/60 animate-ping" />
              <div className="w-24 h-24 rounded-full border-4 border-dashed border-amber-400 flex items-center justify-center animate-spin-slow bg-amber-500/10 backdrop-blur-[2px] shadow-[0_0_30px_rgba(245,158,11,0.5)]">
                <div className="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center">
                  <Target className="w-6 h-6 text-amber-300 animate-pulse" />
                </div>
              </div>
              <div className="mt-2 px-3 py-1 bg-amber-950/90 border border-amber-400 rounded-full shadow-2xl flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-amber-300 text-[10px] font-black uppercase tracking-widest">
                  {t.targetLocked} • {targetDistance ? (targetDistance >= 1000 ? `${(targetDistance / 1000).toFixed(1)}km` : `${Math.round(targetDistance)}m`) : ''}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* OFFSCREEN TURN GUIDANCE INDICATORS (AT 1000m & FAR DISTANCES) */}
        {permissionGranted && (targetPoi || nearestActivePoiBearing) && (
          <>
            <div
              className={`absolute left-3 top-1/2 -translate-y-1/2 z-40 pointer-events-none transition-all duration-300 ${
                isTargetOffscreenLeft ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'
              }`}
            >
              <div className="flex items-center gap-2 bg-amber-950/95 border border-amber-400/90 px-3.5 py-2.5 rounded-2xl backdrop-blur-md shadow-2xl animate-pulse">
                <ChevronLeft className="w-6 h-6 text-amber-400 animate-bounce" />
                <div className="flex flex-col">
                  <span className="text-amber-400 font-black text-[10px] uppercase tracking-widest">
                    {targetRelativeBearing !== null
                      ? t.turnLeft(Math.round(Math.abs(targetRelativeBearing)))
                      : 'LEFT'}
                  </span>
                  <span className="text-white text-[9px] font-extrabold truncate max-w-[130px]">
                    {activeGuidanceName} • {targetDistance ? (targetDistance >= 1000 ? `${(targetDistance / 1000).toFixed(1)}km` : `${Math.round(targetDistance)}m`) : ''}
                  </span>
                </div>
              </div>
            </div>

            <div
              className={`absolute right-3 top-1/2 -translate-y-1/2 z-40 pointer-events-none transition-all duration-300 ${
                isTargetOffscreenRight ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6'
              }`}
            >
              <div className="flex items-center gap-2 bg-amber-950/95 border border-amber-400/90 px-3.5 py-2.5 rounded-2xl backdrop-blur-md shadow-2xl animate-pulse">
                <div className="flex flex-col items-end">
                  <span className="text-amber-400 font-black text-[10px] uppercase tracking-widest">
                    {targetRelativeBearing !== null
                      ? t.turnRight(Math.round(targetRelativeBearing))
                      : 'RIGHT'}
                  </span>
                  <span className="text-white text-[9px] font-extrabold truncate max-w-[130px]">
                    {activeGuidanceName} • {targetDistance ? (targetDistance >= 1000 ? `${(targetDistance / 1000).toFixed(1)}km` : `${Math.round(targetDistance)}m`) : ''}
                  </span>
                </div>
                <ChevronRight className="w-6 h-6 text-amber-400 animate-bounce" />
              </div>
            </div>
          </>
        )}

        {/* TOP HUD: PHASE BADGE, SENSOR STATUS & CONTROLS */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-30 pointer-events-none gap-2">
          {/* Active Phase Pill */}
          <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-amber-400/50 flex items-center gap-2 shadow-xl">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
            <span className="text-amber-300 text-[10px] font-black uppercase tracking-wider truncate max-w-[160px] sm:max-w-none">
              {currentPhaseTitle}
            </span>
            <span className="text-[9px] font-black text-slate-900 bg-amber-400 px-1.5 py-0.2 rounded-full">
              {currentPhaseUnlockedCount}/{currentPhasePois.length}
            </span>
          </div>

          <div className="flex gap-2 pointer-events-auto ml-auto">
            <button
              onClick={() => setViewMode(viewMode === 'AR' ? 'HORIZON' : 'AR')}
              className="bg-blue-600/90 p-2 rounded-xl border border-white/20 text-white shadow-xl backdrop-blur-md transition-all active:scale-95 flex items-center gap-1 px-2.5"
            >
              {viewMode === 'AR' ? <Compass className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
              <span className="text-[10px] font-bold uppercase tracking-wider">{viewMode}</span>
            </button>
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="bg-slate-900/80 p-2 rounded-xl border border-white/20 text-white shadow-xl backdrop-blur-md transition-all active:scale-95"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>

        {headingAccuracy !== null && headingAccuracy > 20 && (
          <div className="absolute top-14 left-4 right-4 z-40 bg-amber-500/90 text-slate-950 px-4 py-2 rounded-2xl text-xs font-black uppercase text-center animate-pulse shadow-md border border-amber-300">
            ⚠️ {t.calibrationNeeded}
          </div>
        )}

        {/* FLOATING BOTTOM CONTROLS & PHASE-FILTERED CAROUSEL */}
        <div className="absolute bottom-3 left-0 right-0 z-30 px-3 flex flex-col gap-2.5 pointer-events-none">
          {permissionGranted && targetPoi && activeStep && (
            <div className="pointer-events-auto bg-slate-950/95 border border-amber-400/60 rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3 backdrop-blur-xl">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
                {activeStep.type.includes('Right') ? (
                  <Navigation className="w-4 h-4 rotate-90 text-amber-400" />
                ) : activeStep.type.includes('Left') ? (
                  <Navigation className="w-4 h-4 -rotate-90 text-amber-400" />
                ) : activeStep.type.includes('Arrival') ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Navigation className="w-4 h-4 text-emerald-400" />
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[8px] font-black uppercase tracking-widest text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full border border-amber-400/30">
                    {t.stepOf(activeStepIndex + 1, steps.length)}
                  </span>
                  <span className="text-[10px] font-bold text-slate-300 truncate">
                    {targetPoi.name[lang] || targetPoi.name.en}
                  </span>
                </div>
                <h3 className="text-xs font-black text-white leading-snug truncate">{activeStep.text}</h3>
                <p className="text-[9px] font-bold text-amber-300/90 mt-0.5">
                  {Math.round(distanceToNextStep)} m {t.toTurn} •{' '}
                  {distanceToDestination >= 1000
                    ? `${(distanceToDestination / 1000).toFixed(1)} km`
                    : `${Math.round(distanceToDestination)} m`}{' '}
                  {t.totalRemaining}
                </p>
              </div>
              <button
                onClick={handleClearQuestTarget}
                title={t.endNavigation}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {selectedLocation && !targetPoi && (
            <div className="pointer-events-auto bg-slate-950/95 rounded-2xl p-3 shadow-2xl border border-amber-400/50 text-white space-y-2 backdrop-blur-xl">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">
                    {selectedLocation.loc.category}
                  </span>
                  <h3 className="text-sm font-black text-white">
                    {selectedLocation.loc.name[lang] || selectedLocation.loc.name.en}
                  </h3>
                  <p className="text-[11px] text-amber-300 font-bold mt-0.5">
                    {t.metersAway(Math.round(selectedLocation.dist))}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedLocation(null)}
                  className="p-1 bg-white/10 rounded-full text-slate-300 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => handleStartQuestTarget(selectedLocation.loc)}
                  className="py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-wider"
                >
                  <Target className="w-3.5 h-3.5" />
                  {t.startGuide}
                </button>
                <button
                  onClick={() => onNavigate?.(selectedLocation.loc)}
                  className="py-2 bg-white/10 border border-white/20 text-white font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-wider"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  {t.viewOnMap}
                </button>
              </div>
            </div>
          )}

          {/* SLIM HORIZONTAL CAROUSEL: FILTERED TO ACTIVE & UNLOCKED PHASES */}
          <div className="pointer-events-auto flex items-center gap-2 overflow-x-auto pb-1 snap-x scroll-smooth no-scrollbar">
            {carouselPois.map((poi) => {
              const isUnlocked = isPoiRewardUnlocked(poi.id, localUnlockedRewards);
              const isSelected = targetPoi?.id === poi.id || selectedLocation?.loc.id === poi.id;
              const isDarkened = poi.phase < currentPhase;

              return (
                <div
                  key={poi.id}
                  onClick={() => {
                    handleStartQuestTarget(poi);
                    const matchedLoc = LOCATIONS.find((l) => l.id === poi.id);
                    if (matchedLoc && onNavigate) onNavigate(matchedLoc);
                  }}
                  className={`min-w-[160px] max-w-[210px] shrink-0 snap-start p-2 rounded-xl border backdrop-blur-xl transition-all cursor-pointer flex items-center justify-between gap-2 shadow-lg active:scale-95 relative overflow-hidden ${
                    isSelected
                      ? 'bg-amber-500/30 border-amber-400 shadow-amber-500/20'
                      : isDarkened
                      ? 'bg-slate-950/80 border-slate-700/60 opacity-60 hover:opacity-100'
                      : isUnlocked
                      ? 'bg-slate-950/85 border-white/15 hover:border-amber-400/60'
                      : 'bg-slate-950/95 border-amber-400/40 shadow-md shadow-amber-500/10'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden relative z-10">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] text-white shadow-md shrink-0 border border-white/10"
                      style={{ backgroundColor: isDarkened ? '#334155' : poi.color }}
                    >
                      {isDarkened ? '✓' : isUnlocked ? '★' : '🎯'}
                    </div>
                    <div className="truncate">
                      <h5
                        className={`text-[11px] font-black truncate leading-tight ${
                          isDarkened ? 'text-slate-400' : 'text-white'
                        }`}
                      >
                        {poi.name[lang] || poi.name.en}
                      </h5>
                      <span
                        className={`text-[9px] font-bold truncate block ${
                          isDarkened ? 'text-emerald-400' : isUnlocked ? 'text-amber-300' : 'text-slate-300'
                        }`}
                      >
                        {isDarkened
                          ? (lang === 'bs' ? `Faza ${poi.phase} završena` : `Phase ${poi.phase} done`)
                          : isUnlocked
                          ? (lang === 'bs' ? 'Otključano' : 'Unlocked')
                          : (lang === 'bs' ? `Faza ${poi.phase} cilj` : `Phase ${poi.phase} goal`)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-3.5 h-3.5 shrink-0 relative z-10 ${
                      isDarkened ? 'text-slate-600' : 'text-amber-400'
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showHelp && (
        <div className="absolute top-16 left-4 right-4 bg-slate-900/95 border border-amber-400/40 rounded-3xl p-5 text-white text-xs z-50 shadow-2xl backdrop-blur-xl animate-in fade-in duration-200">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-black text-amber-400 uppercase tracking-widest">{t.instructionsTitle}</h4>
            <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-slate-300 leading-relaxed font-medium">{t.instructionsDesc}</p>
        </div>
      )}

      <QrScannerModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        lang={lang}
        unlockedRewards={localUnlockedRewards}
        onRewardFound={handleRewardFoundInternal}
      />
    </div>
  );
};

export default ARGuide;