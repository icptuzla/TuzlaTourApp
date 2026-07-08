import React, { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { AppFeatures } from '../utils/platform';
import { Language } from '../types';
import { TUZLA_CENTER, LOCATIONS } from '../constants';
import { tuzlaHotelData } from '../tuzlaHotelData';
import { QrCode, Navigation, Gamepad2, CheckCircle2, Lock, Play, X, Trophy, Route, Compass, Landmark, Loader2, Clock, Footprints, Hotel as HotelIcon } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { motion, AnimatePresence, useDragControls, useMotionValue } from 'framer-motion';
import { useNetwork } from '../hooks/useNetwork';
import { useQuestRuntimePolicy } from '../hooks/useQuestRuntimePolicy';
import { QuestQualityMode } from '../utils/questRuntimePolicy';
import { getDistance } from '../utils/geoUtils';

interface RoutePoiPreset {
  name: Partial<Record<Language, string>> & { en: string; bs: string };
  lat: number;
  lon: number;
  category: string;
  entryFee?: string;
}

const ROUTE_POI_PRESETS: RoutePoiPreset[] = [
  {
    name: { bs: 'Panonska Jezera', en: 'Pannonian Lakes' },
    lat: 44.53888255374366,
    lon: 18.680032450849325,
    category: 'nature',
    entryFee: 'Paid 7.5 KM - 9 KM for entire day',
  },
  {
    name: { bs: 'Slana Banja Park', en: 'Slana Banja Park' },
    lat: 44.53846734540082,
    lon: 18.685620782683003,
    category: 'nature',
  },
  {
    name: { bs: 'Tuzla Old Town (Čaršija)', en: 'Tuzla Old Town (Čaršija)' },
    lat: 44.53824258043878,
    lon: 18.67589812243773,
    category: 'culture',
  },
  {
    name: { bs: 'Trg Slobode', en: 'Freedom Square' },
    lat: 44.53954253369571,
    lon: 18.67508475352372,
    category: 'culture',
  },
  {
    name: { bs: 'Spomenik Kralju Tvrtku (I)', en: 'King Tvrtko Monument' },
    lat: 44.53812247668793,
    lon: 18.678359094003866,
    category: 'history',
  },
  {
    name: { bs: 'Spomenik Meši Selimoviću', en: 'Mesa Selimovic Monument' },
    lat: 44.53710706292608,
    lon: 18.67822758905615,
    category: 'culture',
  },
  {
    name: { bs: 'Džamija Šarena (Atik)', en: 'Atik Mosque' },
    lat: 44.54001556181191,
    lon: 18.673365480509432,
    category: 'religion',
  },
  {
    name: { bs: 'Saborna Crkva', en: 'Orthodox Cathedral' },
    lat: 44.53800051276164,
    lon: 18.679763716121386,
    category: 'religion',
  },
  {
    name: { bs: 'Tržni centar Bingo (BCC)', en: 'Bingo Shopping Center' },
    lat: 44.53188635183338,
    lon: 18.652020274686947,
    category: 'shopping',
  },
  {
    name: { bs: 'TC Robot', en: 'Robot Shopping Center' },
    lat: 44.53454365316736,
    lon: 18.682516897004632,
    category: 'shopping',
  },
  {
    name: { bs: 'TC Mercator', en: 'Mercator Shopping Center' },
    lat: 44.5327311385098,
    lon: 18.68292815613492,
    category: 'shopping',
  },
  {
    name: { bs: 'TC Tuzlanka', en: 'Tuzlanka Shopping Center' },
    lat: 44.538634727509304,
    lon: 18.664878503738578,
    category: 'shopping',
  },
];

const QUEST_TARGETS = [
  { id: 'irish', name: { en: 'Irish Pub', bs: 'Irish Pub' }, image: '/assets/Gallery/QuestQRLocations/Irish.webp' },
  { id: 'Papi Gelato', name: { en: 'Papi Gelato', bs: 'Papi Gelato' }, image: '/assets/Gallery/QuestQRLocations/PapiGelato.png' },
  { id: 'slana_banja', name: { en: 'Slana Banja', bs: 'Slana Banja' }, image: '/assets/Gallery/QuestQRLocations/QR Banja.png' },
  { id: 'panonika', name: { en: 'Pannonica Office', bs: 'Panonika Ured' }, image: '/assets/Gallery/QuestQRLocations/Panonika.webp' },
  { id: 'slapovi', name: { en: 'Waterfalls', bs: 'Slapovi' }, image: '/assets/Gallery/QuestQRLocations/slapovi.webp' },
  { id: 'ismet', name: { en: 'Ismet Mujezinovic', bs: 'Ismet Mujezinović' }, image: '/assets/Gallery/QuestQRLocations/QRIsmet.webp' },
  { id: 'atelje_ismet', name: { en: 'Atelje Ismet Mujezinovic', bs: 'Atelje Ismet Mujezinović' }, image: '/assets/Gallery/QuestQRLocations/Atelje Ismet Mujezinovic.png' },
  { id: 'bingo_city_centar', name: { en: 'Bingo City Center', bs: 'Bingo City Centar' }, image: '/assets/Gallery/QuestQRLocations/Bingo City Centar.png', website: 'https://tuzla.bingocitycenter.ba/' },
  { id: 'mesa_selimovic', name: { en: 'Mesa Selimovic', bs: 'Meša Selimović' }, image: '/assets/Gallery/QuestQRLocations/TuzlaMesaS.webp', video: '/assets/Gallery/QuestQRLocations/MesaSelimovic.mp4' },
  { id: 'tvrtko_park', name: { en: 'King Tvrtko Park', bs: 'Park Kralja Tvrtka I' }, image: '/assets/Gallery/QuestQRLocations/Tvrko pannellum/tvrle.png' },
];

interface MapQuestViewProps {
  lang: Language;
  features: AppFeatures;
  unlockedRewards: string[];
  onRewardFound: (id: string) => void;
  onToggleAR: () => void;
  navigationTarget?: any | null;
  onClearNavigation?: () => void;
  initialOpenScanner?: boolean;
}

const MapQuestView: React.FC<MapQuestViewProps> = ({
  lang,
  features,
  unlockedRewards,
  onRewardFound,
  onToggleAR,
  navigationTarget,
  onClearNavigation,
  initialOpenScanner = false
}) => {
  const { policy, mode, setMode } = useQuestRuntimePolicy(features);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const userLocationRef = useRef<[number, number] | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [useFallbackStyle, setUseFallbackStyle] = useState(false);
  const isOnline = useNetwork();
  const OFFLINE_STYLE = '/style/offline-style.json';
  const ONLINE_STYLE_PRIMARY = 'https://maps.geoapify.com/v1/styles/osm-bright/style.json?apiKey=65090a03070e4e1898694f7a18ba415b';
  const ONLINE_STYLE_FALLBACK = 'https://api.jawg.io/styles/845b87e6-2431-4d4c-ae2c-a3d1e8095a01.json?access-token=MJ1UjbO1irardUqAtZPQAzlWULZIZAFIsQdTrqkdC9bA34vgAGVMi20z7kP9ZRWX';
  const ONLINE_STYLE = useFallbackStyle ? ONLINE_STYLE_FALLBACK : ONLINE_STYLE_PRIMARY;

  // Navigation state
  const [selectedNavTarget, setSelectedNavTarget] = useState<{ name: string; lat: number; lon: number } | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeTime, setRouteTime] = useState<number | null>(null);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'poi' | 'hotel'>('poi');
  const navHudBoundsRef = useRef<HTMLDivElement>(null);
  const navHudDragControls = useDragControls();
  const navHudX = useMotionValue(0);
  const navHudY = useMotionValue(0);

  const scannerContainerId = "map-quest-reader";
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const markers = useRef<{ [key: string]: maplibregl.Marker }>({});
  const userMarker = useRef<maplibregl.Marker | null>(null);
  const isUtilityMode = policy.qualityLevel === 'utility';
  const isBalancedMode = policy.qualityLevel === 'balanced';
  const scannerFps = isUtilityMode ? 10 : (isBalancedMode ? 12 : 15);
  const scannerQrSize = isUtilityMode ? 220 : 250;

  useEffect(() => {
    navHudX.set(0);
    navHudY.set(0);
  }, [isNavigating, selectedNavTarget?.name, selectedNavTarget?.lat, selectedNavTarget?.lon, navHudX, navHudY]);

  const setupBuildings = (mapInstance: maplibregl.Map) => {
    try {
      if (!mapInstance.isStyleLoaded()) return;

      const layers = mapInstance.getStyle().layers ?? [];
      const buildingLayer = layers.find((l: any) => l['source-layer'] === 'building' || l['source-layer'] === 'buildings');
      if (!buildingLayer) return;

      const source = (buildingLayer as any).source;
      const sourceLayer = (buildingLayer as any)['source-layer'];

      if (mapInstance.getLayer('building-outline')) mapInstance.removeLayer('building-outline');
      if (mapInstance.getLayer('building')) mapInstance.removeLayer('building');

      let labelLayerId: string | undefined;
      for (const layer of layers) {
        if (layer.type === 'symbol' && (layer as any).layout?.['text-field']) {
          labelLayerId = layer.id;
          break;
        }
      }

      if (!mapInstance.getLayer('3d-buildings')) {
        mapInstance.addLayer({
          id: '3d-buildings',
          source: source,
          'source-layer': sourceLayer,
          type: 'fill-extrusion',
          minzoom: 14,
          paint: {
            'fill-extrusion-color': '#d6dbe2ff',
            'fill-extrusion-height': [
              'interpolate', ['linear'], ['zoom'],
              14, 0,
              15, ['*', ['coalesce', ['get', 'render_height'], ['get', 'height'], 15], 1.6],
            ],
            'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0],
            'fill-extrusion-opacity': 0.8,
          },
        }, labelLayerId);
      }
    } catch (e) {
      console.warn("MapQuest: Error setting up buildings", e);
    }
  };

  const setupHighlighters = (mapInstance: maplibregl.Map) => {
    if (mapInstance.getLayer('m4-glow-outer')) return;

    // Find the correct source ID used by the map style
    const sources = mapInstance.getStyle().sources || {};
    const sourceId = Object.keys(sources).find(id => id.includes('geoapify') || id.includes('osm') || id.includes('streets')) || 'geoapify';

    mapInstance.addLayer({
      id: 'm4-glow-outer',
      type: 'line',
      source: sourceId,
      'source-layer': 'road',
      filter: ['all',
        ['any', ['==', 'class', 'primary'], ['==', 'class', 'motorway'], ['==', 'type', 'primary'], ['==', 'type', 'motorway'], ['==', 'highway', 'primary']],
        ['any', ['==', 'name', 'Obala Zmaja od Bosne'], ['==', 'ref', 'M-4'], ['==', 'ref', 'M 4']]
      ],
      paint: {
        'line-color': '#facc15',
        'line-width': 12,
        'line-blur': 8,
        'line-opacity': 0.5
      }
    }, '3d-buildings');

    mapInstance.addLayer({
      id: 'm4-glow-inner',
      type: 'line',
      source: sourceId,
      'source-layer': 'road',
      filter: ['all',
        ['any', ['==', 'class', 'primary'], ['==', 'class', 'motorway'], ['==', 'type', 'primary'], ['==', 'type', 'motorway'], ['==', 'highway', 'primary']],
        ['any', ['==', 'name', 'Obala Zmaja od Bosne'], ['==', 'ref', 'M-4'], ['==', 'ref', 'M 4']]
      ],
      paint: {
        'line-color': '#fef08a',
        'line-width': 4,
        'line-opacity': 0.6
      }
    }, '3d-buildings');
  };

  // Initialize Map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    if (initialOpenScanner) {
      setIsScanning(true);
    }

    const questRules = lang === 'bs'
      ? '<strong>Tuzla Quest Pravila:</strong> Posjetite lokacije na mapi. Skupite sve nagrade! Kada dođete na cilj, skenirajte QR kod na lokaciji kako biste otključali AR sadržaj.'
      : '<strong>Tuzla Quest Rules:</strong> Visit map locations and collect rewards! Once there, scan the QR code to unlock the AR content.';

    const styleToUse = isOnline ? ONLINE_STYLE : OFFLINE_STYLE;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: styleToUse,
      center: [TUZLA_CENTER[1], TUZLA_CENTER[0]],
      zoom: 15,
      minZoom: (isOnline && !isOfflineMode) ? 0 : 14,
      maxZoom: (isOnline && !isOfflineMode) ? 20 : 16,
      pitch: 75,
      bearing: -15,
      attributionControl: false,
    });

    // FAIL-SAFE: If primary style fails, try fallback (osm-bright), then offline
    map.current.on('error', (e) => {
      console.warn("🗺️ MapQuest: Style error detected, attempting fallback...", e.error?.message);
      if (isOnline && (e.error?.message?.includes('401') || e.error?.message?.includes('403') || e.error?.message?.includes('Failed to fetch') || e.error?.message?.includes('NetworkError'))) {
        if (!useFallbackStyle) {
          // First fallback: try secondary osm-bright style
          console.warn("🗺️ MapQuest: Primary style (osm-bright) failed, trying fallback (osm-liberty)...");
          setUseFallbackStyle(true);
          map.current?.setStyle(ONLINE_STYLE_FALLBACK);
        } else {
          // Second fallback: go fully offline
          console.warn("🗺️ MapQuest: Fallback style also failed, switching to offline mode.");
          setIsOfflineMode(true);
          map.current?.setStyle(OFFLINE_STYLE);
          map.current?.setMinZoom(14);
          map.current?.setMaxZoom(16);
        }
        // Ensure we signal loaded so markers can appear
        setTimeout(() => setIsLoaded(true), 1000);
      }
    });

    map.current.addControl(new maplibregl.AttributionControl({
      customAttribution: questRules
    }));

    // 1. Initial Resources Setup
    const setupResources = () => {
      if (!map.current) return;

      // Add source for navigation line
      if (!map.current.getSource('nav-line')) {
        map.current?.addSource('nav-line', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });

        map.current?.addLayer({
          id: 'nav-line-layer',
          type: 'line',
          source: 'nav-line',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#c4cfe6cc',
            'line-width': 1,
            'line-opacity': 0.8
          }
        });
      }

      // Simple connect path
      if (!map.current.getSource('connect-path')) {
        map.current?.addSource('connect-path', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: LOCATIONS.map(l => [l.coordinates[1], l.coordinates[0]])
            }
          }
        });

        map.current?.addLayer({
          id: 'connect-path-layer',
          type: 'line',
          source: 'connect-path',
          paint: {
            'line-color': '#f59e0b',
            'line-width': 2,
            'line-opacity': 0.2,
            'line-dasharray': [5, 10]
          }
        });
      }
    };

    // 2. Attach global functions IMMEDIATELY so buttons work even if style is loading
    (window as any).playQuestRewardVideo = (videoUrl: string) => {
      setPlayingVideo(videoUrl);
    };

    (window as any).setGlobalMapNavTarget = async (locId: string) => {
      console.log("🚀 Navigating to:", locId);
      let coords: [number, number] | null = null;
      const tgt = LOCATIONS.find(l => l.id === locId);

      if (tgt) {
        coords = [tgt.coordinates[1], tgt.coordinates[0]];
      } else if (locId.startsWith('hotel-')) {
        const idx = parseInt(locId.split('-')[1]);
        const hotelTarget = tuzlaHotelData[idx];
        if (hotelTarget) coords = [hotelTarget.longitude, hotelTarget.latitude];
      }

      if (coords && map.current) {
        map.current.flyTo({ center: coords, zoom: 18, pitch: Math.min(60, policy.mapFx.maxPitch) });

        // Ensure sources exist before setting data
        setupResources();

        const navLineSource = map.current.getSource('nav-line') as maplibregl.GeoJSONSource;
        if (navLineSource && (window as any).currentUserLngLat) {
          const [lng, lat] = (window as any).currentUserLngLat;

          if (isOnline) {
            try {
              const routingApiKey = import.meta.env.VITE_GEOAPIFY_ROUTING_API;
              // Geoapify waypoints are lat,lon
              const routingUrl = `https://api.geoapify.com/v1/routing?waypoints=${lat},${lng}|${coords[1]},${coords[0]}&mode=walk&apiKey=${routingApiKey}`;
              const res = await fetch(routingUrl);
              const data = await res.json();

              if (data.features && data.features.length > 0) {
                navLineSource.setData(data.features[0]);
                return; // Success!
              }
            } catch (err) {
              console.warn("🧭 MapQuest: Routing API failed, falling back to direct line.", err);
            }
          }

          // Fallback: Straight Line (or for offline mode)
          navLineSource.setData({
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: [[lng, lat], coords] }
          });
        }
      } else {
        console.warn("❌ Could not navigate: Coords or Map missing", { coords, map: !!map.current });
      }
    };

    map.current.on('load', () => {
      setIsLoaded(true);
      setupResources();

      try {
        if (!map.current?.isStyleLoaded()) return;

        // Apply custom Geoapify Map Styles
        try {

          if (map.current) {
            map.current.setPaintProperty('background', 'background-color', '#e7efd8');
            map.current.setPaintProperty('park', 'fill-color', '#ade674');
            map.current.setPaintProperty('park_outline', 'line-color', '#c8e9a6');
            map.current.setPaintProperty('landuse_residential', 'fill-color', 'rgba(244, 240, 245, 0.49)');
            map.current.setPaintProperty('landcover_wood', 'fill-color', 'rgba(101,177,58,0.7)');
            map.current.setPaintProperty('landcover_grass', 'fill-color', '#b2eb91');
            map.current.setPaintProperty('landuse_hospital', 'fill-color', '#e9a5c7');
            map.current.setPaintProperty('landuse_school', 'fill-color', '#ede1e8');
            map.current.setLayoutProperty('waterway_tunnel', 'visibility', 'none');
            map.current.setLayoutProperty('waterway_river', 'visibility', 'none');
            map.current.setLayoutProperty('waterway_other', 'visibility', 'none');
            map.current.setPaintProperty('water', 'fill-color', '#79a1f7');
            map.current.setPaintProperty('road_area_pattern', 'fill-color', '#d4d0d0');
            map.current.setPaintProperty('road_secondary_tertiary_casing', 'line-color', '#f58829');
            map.current.setPaintProperty('road_path_pedestrian', 'line-color', '#afa1a1');
            map.current.setPaintProperty('road_path_pedestrian', 'line-width', { "base": 1.2, "stops": [[14, 0.3999999999999999], [20, 4]] });
            map.current.setPaintProperty('road_motorway_link', 'line-color', '#e7bd85');
            map.current.setPaintProperty('road_service_track', 'line-color', '#f3f295');
            map.current.setPaintProperty('road_link', 'line-color', '#e9d47d');
            map.current.setPaintProperty('road_minor', 'line-color', '#ffffff');
            map.current.setPaintProperty('road_secondary_tertiary', 'line-color', '#fde06c');
            map.current.setPaintProperty('road_trunk_primary', 'line-color', '#f5bc53');
            map.current.setPaintProperty('road_motorway', 'line-color', '#c08e4b');
            map.current.setPaintProperty('building', 'fill-color', '#9cb0c4');
            map.current.setPaintProperty('building-3d', 'fill-extrusion-color', '#d7dfe2');
          }

          // QUEST_TARGETS is defined at module scope
          map.current.setPaintProperty('background', 'background-color', '#e1eed2');
          map.current.setPaintProperty('landuse-residential', 'fill-color', 'rgba(201, 196, 190, 0.74)');
          map.current.setPaintProperty('landuse-commercial', 'fill-color', 'rgba(191, 195, 235, 0.52)');
          map.current.setPaintProperty('landuse-industrial', 'fill-color', 'rgba(182, 193, 215, 0.47)');
          map.current.setPaintProperty('park', 'fill-color', '#c5e1a9');
          map.current.setPaintProperty('park-outline', 'line-color', 'rgba(97,168,50,0.66)');
          map.current.setPaintProperty('landuse-hospital', 'fill-color', '#ecc4d8');
          map.current.setPaintProperty('landuse-school', 'fill-color', '#e0dae6');
          map.current.setPaintProperty('landcover-wood', 'fill-color', '#549c30');
          map.current.setPaintProperty('landcover-grass', 'fill-color', '#b3db8c');
          map.current.setPaintProperty('landcover-grass-park', 'fill-color', '#c3f095');
          map.current.setPaintProperty('waterway-river', 'line-color', '#85bcf2');
          map.current.setLayoutProperty('water-offset', 'visibility', 'none');
          map.current.setPaintProperty('water', 'fill-color', '#9ecaf6');
          map.current.setPaintProperty('building', 'fill-color', '#f1f5f9');
          map.current.setPaintProperty('building-top', 'fill-color', '#f8fafc');
          map.current.setPaintProperty('aeroway-area', 'fill-color', '#e0dfe9');
          map.current.setPaintProperty('aeroway-runway', 'line-color', '#c6c6ca');
          map.current.setPaintProperty('highway-area', 'fill-color', 'rgba(204,200,200,0.56)');
          map.current.setPaintProperty('highway-motorway-link-casing', 'line-color', '#bb671e');
          map.current.setPaintProperty('highway-motorway-link-casing', 'line-width', { "base": 1.2, "stops": [[12, 1.0666666666666667], [13, 3.2], [14, 4.266666666666667], [20, 16]] });
          map.current.setPaintProperty('highway-link-casing', 'line-color', '#b77a47');
          map.current.setPaintProperty('highway-minor-casing', 'line-color', '#c7baba');
          map.current.setPaintProperty('highway-minor-casing', 'line-width', { "base": 1.2, "stops": [[12, 0.30000000000000004], [13, 0.6000000000000001], [14, 2.4000000000000004], [20, 9]] });
          map.current.setPaintProperty('highway-secondary-tertiary-casing', 'line-color', '#e79a55');
          map.current.setPaintProperty('highway-primary-casing', 'line-color', '#924707');
          map.current.setPaintProperty('highway-primary-casing', 'line-width', { "base": 1.2, "stops": [[7, 0], [8, 0.5454545454545454], [9, 1.3636363636363635], [20, 20]] });
          map.current.setPaintProperty('highway-trunk-casing', 'line-color', '#d78945');
          map.current.setPaintProperty('highway-motorway-casing', 'line-color', '#b2580a');
          map.current.setPaintProperty('highway-path', 'line-color', '#f39c44');
          map.current.setPaintProperty('highway-motorway-link', 'line-color', '#d7a35d');
          map.current.setPaintProperty('highway-link', 'line-color', '#f8f8f6');
          map.current.setPaintProperty('highway-minor', 'line-color', '#f1f1f1');
          map.current.setPaintProperty('highway-minor', 'line-width', { "base": 1.2, "stops": [[13.5, 0], [14, 3.0434782608695645], [20, 14]] });
          map.current.setPaintProperty('highway-secondary-tertiary', 'line-color', '#f6e17a');
          map.current.setPaintProperty('highway-primary', 'line-color', '#ec9b40');
          map.current.setPaintProperty('highway-primary', 'line-width', { "base": 1.2, "stops": [[8.5, 0], [9, 0.4166666666666666], [20, 15]] });
          map.current.setPaintProperty('highway-trunk', 'line-color', '#ffefb1');
          map.current.setPaintProperty('highway-motorway', 'line-color', '#c89550');
          map.current.setPaintProperty('railway', 'line-color', '#999696');
          map.current.setPaintProperty('waterway-name', 'text-color', '#3a87d5');
          map.current.setPaintProperty('water-name-lakeline', 'text-color', '#4695e6');
          map.current.setLayoutProperty('water-name-other', 'visibility', 'none');
          map.current.setPaintProperty('poi-level-3', 'text-color', '#0f0e0e');
          map.current.setPaintProperty('poi-level-2', 'text-color', '#615656');
          map.current.setPaintProperty('poi-level-1', 'text-color', '#5b5252');
          map.current.setPaintProperty('road_oneway', 'text-color', '#7e7a7a');
          map.current.setPaintProperty('road_oneway_opposite', 'text-color', '#989494');
          map.current.setPaintProperty('highway-name-path', 'text-color', '#b9834d');
          map.current.setPaintProperty('highway-name-minor', 'text-color', '#61472c');
          map.current.setPaintProperty('highway-name-major', 'text-color', '#7e5933');
          map.current.setPaintProperty('highway-shield', 'text-color', '#1c1b1b');
          map.current.setPaintProperty('place-other', 'text-color', '#471c1c');
        } catch (paintErr) {
          console.warn("Could not apply all Geoapify custom paint properties:", paintErr);
        }

        // Advanced 3D Lighting for metallic effect
        map.current?.setLight({
          anchor: 'viewport',
          color: '#ffffff',
          intensity: 0.4,
          position: [1.15, 210, 30]
        });
      } catch (e) {
        console.warn("MapQuest: Error applying style refinements", e);
      }

      if (isOnline && policy.mapFx.enable3dBuildings) {
        setupBuildings(map.current!);
      }
      if (isOnline) {
        setupHighlighters(map.current!);
      }


    });

    // Special case: if offline mode kicks in via error handler, we might miss 'load'
    map.current.on('styledata', () => {
      if (map.current?.isStyleLoaded()) {
        setupResources();
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Route calculation
  const clearRoute = () => {
    if (map.current) {
      try {
        if (map.current.getLayer('route-layer')) map.current.removeLayer('route-layer');
        if (map.current.getLayer('route-layer-casing')) map.current.removeLayer('route-layer-casing');
        if (map.current.getSource('route-source')) map.current.removeSource('route-source');
      } catch (err) {
        console.warn('Error clearing route layers:', err);
      }
    }
    setRouteDistance(null);
    setRouteTime(null);
  };

  const calculateRoute = async (startLoc: [number, number], target: { name: string; lat: number; lon: number }) => {
    if (!map.current || !isLoaded) return;
    setIsRouteLoading(true);
    try {
      const apiKey = import.meta.env.VITE_GEOAPIFY_ROUTING_API || '63e8b34f44974d71bc70aad63e5b56ba';
      const url = `https://api.geoapify.com/v1/routing?waypoints=${startLoc[1]},${startLoc[0]}|${target.lat},${target.lon}&mode=walk&apiKey=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Routing API request failed');
      const data = await res.json();
      if (!data?.features?.length) throw new Error('No route found');

      const routeFeature = data.features[0];
      setRouteDistance(routeFeature.properties.distance);
      setRouteTime(routeFeature.properties.time);

      if (!map.current) return;
      if (map.current.getSource('route-source')) {
        (map.current.getSource('route-source') as maplibregl.GeoJSONSource).setData(data);
      } else {
        map.current.addSource('route-source', { type: 'geojson', data });
        map.current.addLayer({
          id: 'route-layer-casing', type: 'line', source: 'route-source',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#1c8a44ff', 'line-width': 9, 'line-opacity': 0.5 }
        });
        map.current.addLayer({
          id: 'route-layer', type: 'line', source: 'route-source',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#22c55e', 'line-width': 4, 'line-opacity': 0.9 }
        });
      }

      const coordinates = routeFeature.geometry.coordinates;
      if (coordinates?.length) {
        const bounds = new maplibregl.LngLatBounds();
        coordinates.forEach((coord: [number, number]) => bounds.extend(coord));
        map.current.fitBounds(bounds, { padding: { top: 120, bottom: 260, left: 60, right: 60 }, duration: 1500 });
      }
    } catch (error) {
      console.error('Error calculating route:', error);
    } finally {
      setIsRouteLoading(false);
    }
  };

  // Trigger route calculation when navigation starts
  useEffect(() => {
    if (isNavigating && selectedNavTarget && isLoaded) {
      const start = userLocationRef.current || [TUZLA_CENTER[1], TUZLA_CENTER[0]] as [number, number];
      calculateRoute(start, selectedNavTarget);
    } else {
      clearRoute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNavigating, selectedNavTarget, isLoaded]);

  // Handle Offline Map Styles
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    if (isOnline) {
      setIsOfflineMode(false);
      map.current.setStyle(ONLINE_STYLE);
      map.current.setMinZoom(0);
      map.current.setMaxZoom(20);

      map.current.once('style.load', () => {
        if (!map.current) return;

        // Advanced 3D Lighting
        map.current.setLight({
          anchor: 'viewport',
          color: '#a1a1a1ff',
          intensity: 0.4,
          position: [1.15, 210, 30]
        });


        if (policy.mapFx.enable3dBuildings) {
          setupBuildings(map.current);
        }
        setupHighlighters(map.current);
      });
    } else {
      setIsOfflineMode(true);
      map.current.setStyle(OFFLINE_STYLE);
      map.current.setMinZoom(14);
      map.current.setMaxZoom(16);
    }
  }, [isOnline, isLoaded, policy.mapFx.enable3dBuildings, policy.mapFx.maxPitch, useFallbackStyle]);

  // Update Quest Markers
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    const POI_COLORS: Record<string, string> = {
      '1': '#06b6d4', // Cyan
      '2': '#f59e0b', // Amber
      '3': '#e2e8f0', // Silver/White
      '4': '#84cc16', // Lime
      '5': '#ec4899', // Pink
      'mesa_selimovic': '#a855f7', // Purple
      'irish': '#10b981', // Green
      'galerija': '#3b82f6', // Blue
      'banja': '#fbbf24', // Yellow
      'panonika': '#f97316', // Orange
      'slapovi': '#0ea5e9', // Sky Blue
      'ismet': '#ef4444',  // Red
      'tvrtko_park': '#f59e0b', // Amber/Gold
      'slana_banja': '#fbbf24' // Yellow
    };

    LOCATIONS.forEach(loc => {
      const isQuest = loc.category !== 'hotel' && loc.category !== 'food' && loc.category !== 'shopping';
      const isUnlocked = isQuest ? unlockedRewards.includes(loc.id) : true;
      const questTarget = QUEST_TARGETS.find(q => q.id === loc.id);
      const videoUrl = questTarget?.video;
      const markerColor = POI_COLORS[loc.id] || '#cbd5e1';

      const popupHtml = `
        <div style="padding: 18px; font-family: 'Quicksand', sans-serif; background: #0f172a; color: white; border-radius: 24px; border: 2px solid ${markerColor}${isUnlocked ? '' : '33'}; box-shadow: 0 25px 50px rgba(0,0,0,0.5), 0 0 30px ${markerColor}${isUnlocked ? '40' : '05'};">
          <h3 style="margin: 0; font-size: 18px; font-weight: 900; color: ${isUnlocked ? markerColor : '#64748b'}; text-transform: uppercase; letter-spacing: 0.15em; text-shadow: 0 0 10px ${markerColor}44;">${isUnlocked ? loc.name[lang] : '??? Location ???'}</h3>
          <p style="font-size: 14px; margin: 10px 0; color: #94a3b8; line-height: 1.6;">${isUnlocked ? loc.description[lang] : 'Search this area to uncover its history and collect your reward.'}</p>
          <div style="display: flex; align-items: center; gap: 8px; margin-top: 15px;">
            ${isQuest ? (!isUnlocked ? '<span style="font-size: 10px; color: #f59e0b; font-weight: 900; background: rgba(245,158,11,0.2); padding: 5px 12px; border-radius: 8px; border: 1px solid rgba(245,158,11,0.3);">🔒 Quest Active</span>' : '<span style="font-size: 10px; color: #10b981; font-weight: 900; background: rgba(16,185,129,0.2); padding: 5px 12px; border-radius: 8px; border: 1px solid rgba(16,185,129,0.3);">🔓 Reward Unlocked</span>') : ''}
            <span style="font-size: 10px; color: #475569; font-weight: bold; text-transform: uppercase;">Quest Target</span>
          </div>
          <div style="display: flex; gap: 8px; margin-top: 18px;">
            <button onclick="window.setGlobalMapNavTarget('${loc.id}')" style="flex: 1; padding: 12px; background: ${isUnlocked ? markerColor : '#1e293b'}; color: white; border: none; border-radius: 16px; font-weight: 900; font-family: 'Quicksand', sans-serif; cursor: pointer; text-transform: uppercase; font-size: 11px; letter-spacing: 0.1em; transition: all 0.3s ease;">GPS</button>
            ${isUnlocked && videoUrl ? `
              <button onclick="window.playQuestRewardVideo('${videoUrl}')" style="flex: 1.2; padding: 12px; background: #a855f7; color: white; border: none; border-radius: 16px; font-weight: 900; font-family: 'Quicksand', sans-serif; cursor: pointer; text-transform: uppercase; font-size: 11px; letter-spacing: 0.1em; box-shadow: 0 10px 20px rgba(168,85,247,0.3); display: flex; align-items: center; justify-content: center; gap: 4px;">
                ${lang === 'bs' ? '🎬 GLEDAJ' : '🎬 WATCH'}
              </button>
            ` : ''}
            ${loc.website ? `
              <button onclick="window.open('${loc.website}', '_blank')" style="flex: 1.5; padding: 12px; background: #2563eb; color: white; border: none; border-radius: 16px; font-weight: 900; font-family: 'Quicksand', sans-serif; cursor: pointer; text-transform: uppercase; font-size: 11px; letter-spacing: 0.1em; box-shadow: 0 10px 20px rgba(37,99,235,0.3); display: flex; align-items: center; justify-content: center; gap: 4px;">
                WEBSITE
              </button>
            ` : ''}
          </div>
        </div>
      `;

      if (!markers.current[loc.id]) {
        const el = document.createElement('div');
        el.className = `quest-marker-container`;

        // Applying refined 20% opacity for locked items
        const displayColor = (isQuest && !isUnlocked) ? `${markerColor}33` : markerColor;

        const iconContent = (isQuest && !isUnlocked)
          ? `<span style="font-size: 20px; filter: grayscale(1) opacity(0.4); transform: scale(0.75)">🔒</span>`
          : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="color:white; filter: drop-shadow(0 0 8px ${markerColor})"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;

        el.innerHTML = `
          <style>
            @keyframes marker-breathe {
              0%, 100% { transform: scale(1); opacity: 0.8; }
              50% { transform: scale(1.08); opacity: 1; }
            }
          </style>
          <div class="${(isQuest && !isUnlocked) ? 'locked-quest-pulse' : 'quest-marker-pulse'}" 
               style="background:${displayColor}; width:56px; height:56px; clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%); 
                      border: 2px solid ${isUnlocked ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.15)'}; 
                      display: flex; flex-direction: column; align-items: center; justify-content: center; 
                      box-shadow: ${isUtilityMode
            ? `0 0 ${isUnlocked ? '8px' : '4px'} ${markerColor}${isUnlocked ? '66' : '22'}`
            : `0 0 ${isUnlocked ? '20px' : '8px'} ${markerColor}${isUnlocked ? '99' : '22'}, 
                                  0 0 ${isUnlocked ? '40px' : '12px'} ${markerColor}${isUnlocked ? '44' : '11'}, 
                                  inset 0 0 15px rgba(255,255,255,${isUnlocked ? '0.5' : '0.05'})`}; 
                      transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1); 
                      animation: ${policy.uiFx.enableInfiniteAnimations ? `marker-breathe ${isUnlocked ? '3s' : '6s'} infinite ease-in-out` : 'none'};">
            <div style="transform: scale(0.9); display: flex; align-items: center; justify-content: center;">
              ${iconContent}
            </div>
            ${isQuest && !isUnlocked ? `<span style="font-size: 6px; font-weight: 900; color: white; text-transform: uppercase; margin-top: 2px; opacity: 0.8;">Active Quest</span>` : ''}
          </div>`;

        const popup = new maplibregl.Popup({ offset: 35 }).setHTML(popupHtml);

        markers.current[loc.id] = new maplibregl.Marker(el)
          .setLngLat([loc.coordinates[1], loc.coordinates[0]])
          .setPopup(popup)
          .addTo(map.current!);
      } else {
        const displayColor = (isQuest && !isUnlocked) ? `${markerColor}33` : markerColor;

        const el = markers.current[loc.id].getElement();
        const inner = el.querySelector('div');
        if (inner) {
          inner.style.background = displayColor;
          inner.style.boxShadow = isUtilityMode
            ? `0 0 ${isUnlocked ? '8px' : '4px'} ${markerColor}${isUnlocked ? '66' : '22'}`
            : `0 0 ${isUnlocked ? '20px' : '8px'} ${markerColor}${isUnlocked ? '99' : '22'}, 0 0 ${isUnlocked ? '40px' : '12px'} ${markerColor}${isUnlocked ? '44' : '11'}, inset 0 0 15px rgba(255,255,255,${isUnlocked ? '0.5' : '0.05'})`;

          if (isQuest && !isUnlocked) {
            if (policy.uiFx.enableInfiniteAnimations) {
              inner.classList.add('locked-quest-pulse');
              inner.classList.remove('quest-marker-pulse');
            } else {
              inner.classList.remove('locked-quest-pulse');
              inner.classList.remove('quest-marker-pulse');
            }
            inner.innerHTML = `<span style="font-size: 20px; filter: grayscale(1) opacity(0.4);">🔒</span>`;
          } else {
            inner.classList.remove('locked-quest-pulse');
            if (policy.uiFx.enableInfiniteAnimations) {
              inner.classList.add('quest-marker-pulse');
            } else {
              inner.classList.remove('quest-marker-pulse');
            }
            inner.innerHTML = `<div style="transform: scale(0.9); display: flex; align-items: center; justify-content: center;"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="color:white; filter: drop-shadow(0 0 8px ${markerColor})"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`;
          }
        }

        const popup = new maplibregl.Popup({ offset: 35 }).setHTML(popupHtml);
        markers.current[loc.id].setPopup(popup);
      }
    });

    tuzlaHotelData.forEach((hotel, idx) => {
      const hotelId = `hotel-${idx}`;
      if (!markers.current[hotelId]) {
        const el = document.createElement('div');
        el.className = `hotel-marker-container ${policy.uiFx.enableInfiniteAnimations ? 'quest-marker-pulse' : ''}`.trim();

        el.innerHTML = `
          <div style="position: relative; width: 48px; height: 62px; filter: drop-shadow(0 12px 24px rgba(0,0,0,0.4));">
            <svg viewBox="0 0 44 56" style="width: 100%; height: 100%; fill: #d97706; filter: drop-shadow(0 0 10px #d9770680)">
              <path d="M22 0C9.8 0 0 9.8 0 22C0 38.5 22 56 22 56C22 56 44 38.5 44 22C44 9.8 34.2 0 22 0Z" />
              <circle cx="22" cy="22" r="18" fill="white" fill-opacity="0.15" />
            </svg>
            <div style="position: absolute; top: 7px; left: 50%; translate: -50% 0; width: 34px; height: 34px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 2px 5px rgba(0,0,0,0.2); border: 2px solid #1d4ed820;">
              <img src="/assets/Gallery/QuestQRLocations/hotel.svg" alt="Hotel" style="width: 22px; height: 22px;" />
            </div>
          </div>`;

        const popup = new maplibregl.Popup({ offset: 35 }).setHTML(`
          <div style="padding: 20px; font-family: 'Quicksand', sans-serif; background: #0f172a; color: white; border-radius: 28px; border: 2px solid #3b82f633; box-shadow: 0 30px 60px rgba(0,0,0,0.6), 0 0 40px #1d4ed833;">
            <h3 style="margin: 0; font-size: 18px; font-weight: 900; color: #60a5fa; text-shadow: 0 0 10px #60a5fa44;">${hotel.name}</h3>
            <p style="font-size: 14px; margin: 10px 0; color: #94a3b8; line-height: 1.6;">${hotel.description[lang]}</p>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px;">
               <span style="font-size: 11px; color: #fbbf24; font-weight: 900; background: rgba(251,191,36,0.15); padding: 6px 14px; border-radius: 10px; border: 1px solid rgba(251,191,36,0.2);">⭐ ${hotel.rating} / 10</span>
               <span style="font-size: 10px; color: #60a5fa; font-weight: bold; text-transform: uppercase; background: rgba(59,130,246,0.1); padding: 5px 12px; border-radius: 8px;">🏨 Premier Hotel</span>
            </div>
            <button onclick="window.setGlobalMapNavTarget('${hotelId}')" style="width: 100%; padding: 14px; background: #2563eb; color: white; border: none; border-radius: 18px; font-weight: 900; font-family: 'Quicksand', sans-serif; cursor: pointer; text-transform: uppercase; font-size: 11px; letter-spacing: 0.15em; box-shadow: 0 20px 40px rgba(37,99,235,0.4); transition: all 0.3s ease;">Start GPS Navigation</button>
          </div>
        `);

        markers.current[hotelId] = new maplibregl.Marker(el)
          .setLngLat([hotel.longitude, hotel.latitude])
          .setPopup(popup)
          .addTo(map.current!);
      }
    });
  }, [isLoaded, unlockedRewards, lang, isUtilityMode, policy.uiFx.enableInfiniteAnimations]);

  // Watch Position & User Marker
  useEffect(() => {
    let watchId: number;

    const startTracking = () => {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserLocation([latitude, longitude]);
          userLocationRef.current = [longitude, latitude];

          if (map.current && isLoaded) {
            if (!userMarker.current) {
              const el = document.createElement('div');
              el.innerHTML = `<div style="background:#3b82f6;width:24px;height:24px;border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 0 20px rgba(59,130,246,0.6);"><div style="width:8px;height:8px;background:#fff;border-radius:50%;" /></div>`;
              userMarker.current = new maplibregl.Marker(el)
                .setLngLat([longitude, latitude])
                .addTo(map.current);
              // Fly to user on first GPS lock
              map.current?.flyTo({ center: [longitude, latitude], zoom: 17, pitch: 60, duration: 2000 });
            } else {
              userMarker.current.setLngLat([longitude, latitude]);
            }

            // Set global position for the nav line logic
            (window as any).currentUserLngLat = [longitude, latitude];

            // Update navigation line
            let targetPoint = navigationTarget;

            if (!targetPoint) {
              const lockedPoints = LOCATIONS.filter(l => !unlockedRewards.includes(l.id) && l.category !== 'hotel' && l.category !== 'food' && l.category !== 'shop');
              if (lockedPoints.length > 0) {
                let closest = lockedPoints[0];
                let minDist = getDistance(latitude, longitude, closest.coordinates[0], closest.coordinates[1]);
                lockedPoints.forEach(p => {
                  const d = getDistance(latitude, longitude, p.coordinates[0], p.coordinates[1]);
                  if (d < minDist) { minDist = d; closest = p; }
                });
                targetPoint = closest;
              }
            }

            if (targetPoint) {
              const navLineSource = map.current.getSource('nav-line') as maplibregl.GeoJSONSource;
              if (navLineSource) {
                navLineSource.setData({
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'LineString',
                    coordinates: [
                      [longitude, latitude],
                      [targetPoint.coordinates[1], targetPoint.coordinates[0]]
                    ]
                  }
                });
              }
            }
          }
        },
        (err) => {
          console.error("MapQuest Geolocation Error:", err);
          // Fallback to lower accuracy if high accuracy fails or times out
          if (err.code === 3 || err.code === 1) {
            navigator.geolocation.getCurrentPosition(
              (p) => setUserLocation([p.coords.latitude, p.coords.longitude]),
              (e) => console.error("MapQuest Fallback Geolocation Error:", e),
              { enableHighAccuracy: false, timeout: 10000 }
            );
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        startTracking();
      } else {
        if (watchId) navigator.geolocation.clearWatch(watchId);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    if (document.visibilityState === 'visible') {
      startTracking();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isLoaded, unlockedRewards, navigationTarget]);

  // Fly to navigation target when it changes
  useEffect(() => {
    if (map.current && isLoaded && navigationTarget) {
      map.current.flyTo({
        center: [navigationTarget.coordinates[1], navigationTarget.coordinates[0]],
        zoom: 18,
        pitch: Math.min(60, policy.mapFx.maxPitch),
      });
    }
  }, [navigationTarget, isLoaded, policy.mapFx.maxPitch]);

  // Scanner Logic (Same as before)
  useEffect(() => {
    if (isScanning) startScanner();
    else stopScanner();
    return () => { stopScanner(); };
  }, [isScanning]);

  const startScanner = async () => {
    try {
      const html5QrCode = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = html5QrCode;
      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: scannerFps, qrbox: { width: scannerQrSize, height: scannerQrSize } },
        (decodedText) => {
          const matched = LOCATIONS.find(l => l.qrCode === decodedText);
          if (matched) {
            onRewardFound(matched.id);
            setSuccessMessage(`Unlocked: ${matched.name[lang]}`);
            setTimeout(() => setSuccessMessage(null), 3000);
            setIsScanning(false);

            if (matched.id === 'mesa_selimovic') {
              setPlayingVideo('/assets/Gallery/QuestQRLocations/MesaSelimovic.mp4');
            }
          }
        },
        () => { }
      );
    } catch (err) { setIsScanning(false); }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current?.isScanning) {
      await html5QrCodeRef.current.stop();
      html5QrCodeRef.current.clear();
    }
  };

  const unlockedItems = QUEST_TARGETS.filter(item => unlockedRewards.includes(item.id));
  const lockedItems = QUEST_TARGETS.filter(item => !unlockedRewards.includes(item.id));

  return (
    <div className="h-[calc(100vh-88px)] w-full relative flex flex-col overflow-hidden bg-slate-900 font-quicksand brightness-[1.1]">


      {/* MAP VIEW */}
      <div ref={mapContainer} className="h-full w-full grayscale-[0.05] contrast-[1.05] brightness-[0.9]">
        {/* RECENTER BUTTON */}
        <button
          onClick={() => {
            if (userLocation && map.current) {
              map.current.flyTo({ center: [userLocation[1], userLocation[0]], zoom: 17, pitch: 60 });
            } else {
              // Try to force a fresh GPS lock
              navigator.geolocation.getCurrentPosition(
                (p) => {
                  const coords: [number, number] = [p.coords.latitude, p.coords.longitude];
                  setUserLocation(coords);
                  map.current?.flyTo({ center: [coords[1], coords[0]], zoom: 17, pitch: 60 });
                },
                (e) => alert(lang === 'bs' ? 'GPS lokacija nije dostupna.' : 'GPS location not available.'),
                { enableHighAccuracy: true, timeout: 10000 }
              );
            }
          }}
          className="absolute bottom-24 left-6 z-20 w-12 h-12 bg-slate-900/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl flex items-center justify-center text-blue-400 active:scale-95 transition-all"
        >
          <Navigation size={20} />
        </button>


      </div>

      {/* OFFLINE INDICATOR BAR */}
      <AnimatePresence>
        {isOfflineMode && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-28 right-6 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-xl border border-blue-500/30 shadow-lg shadow-blue-500/20"
          >
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_#3b82f6]" />
            <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Saved Offline Map Data</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP FLOATING HUB */}
      <div className="absolute top-6 inset-x-0 mx-auto z-10 w-[95%] max-w-lg">
        <div className={`bg-slate-900/40 ${isUtilityMode ? 'backdrop-blur-sm shadow-lg' : 'backdrop-blur-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]'} px-6 py-4 rounded-[2.5rem] border border-white/20 flex items-center justify-between`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-tr from-amber-500 to-yellow-300 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/40 rotate-3 transition-transform hover:rotate-0">
              <Trophy className="w-6 h-6 text-slate-900" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em] leading-none mb-1">Explorer Hub</span>
              <span className="text-xl font-black text-white uppercase tracking-tight leading-none">Tuzla Quest</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsScanning(true)}
              className="w-14 h-14 flex items-center justify-center bg-white/10 hover:bg-amber-500 text-white hover:text-slate-900 rounded-2xl transition-all active:scale-90 border border-white/10 group shadow-lg"
            >
              <QrCode className="w-6 h-6 transition-transform group-hover:scale-110" />
            </button>
            <button
              onClick={() => {
                if (isNavigating) {
                  setIsNavigating(false);
                  setSelectedNavTarget(null);
                } else {
                  setIsPresetModalOpen(true);
                }
              }}
              className={`w-14 h-14 flex items-center justify-center rounded-2xl transition-all active:scale-90 border shadow-lg ${isNavigating ? 'bg-red-500 border-red-400 text-white animate-pulse' : 'bg-white/10 border-white/10 text-white hover:bg-emerald-500'}`}
            >
              {isNavigating ? <X className="w-6 h-6" /> : <Route className="w-6 h-6 transition-transform group-hover:scale-110" />}
            </button>
            <button
              onClick={onToggleAR}
              className="w-14 h-14 flex items-center justify-center bg-white/10 hover:bg-blue-500 text-white rounded-2xl transition-all active:scale-90 border border-white/10 group shadow-lg"
            >
              <Navigation className="w-6 h-6 rotate-45 transition-transform group-hover:scale-110" />
            </button>
          </div>
        </div>
      </div>
      {/* 3D PITCH CONTROL */}
      <div className={`absolute right-6 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-3 bg-white/5 ${isUtilityMode ? 'backdrop-blur-sm shadow-lg' : 'backdrop-blur-xl shadow-2xl'} p-3 rounded-full border border-white/10`}>
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-black text-white uppercase tracking-tighter">3D</div>
        <input
          type="range" min="30" max={policy.mapFx.maxPitch.toString()} defaultValue={Math.min(75, policy.mapFx.maxPitch).toString()}
          onChange={(e) => map.current?.setPitch(Math.min(parseInt(e.target.value), policy.mapFx.maxPitch))}
          className="bg-white/20 rounded-full h-32 w-2 focus:outline-none focus:ring-2 focus:ring-amber-500 [writing-mode:vertical-rl] [appearance:slider-vertical] [-webkit-appearance:slider-vertical]"
        />
      </div>

      {/* SCANNER OVERLAY */}
      <AnimatePresence>
        {isScanning && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-[2000] bg-black flex flex-col pt-32"
          >
            {/* LASER SCANNER FRAME */}
            <div className="relative w-full h-[40vh] flex flex-col items-center justify-center mb-12">
              {!isUtilityMode && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-12 bg-amber-500/10 blur-[40px] rounded-full" />}

              <div className="relative w-64 h-64">
                {/* Real Camera Feed */}
                <div id={scannerContainerId} className="absolute inset-0 rounded-3xl overflow-hidden bg-black border-2 border-white/10 shadow-[0_0_80px_rgba(245,158,11,0.1)]" style={{ backgroundColor: 'black' }} />

                {/* Cyber Frame Decor */}
                <div className="absolute -inset-4 border-2 border-white/5 rounded-[2.5rem] pointer-events-none" />
                <div className={`absolute -inset-1 border border-amber-500/50 rounded-[1.5rem] pointer-events-none ${policy.uiFx.enableInfiniteAnimations ? 'animate-pulse' : ''}`} />

                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-amber-500 rounded-tl-2xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-amber-500 rounded-tr-2xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-amber-500 rounded-bl-2xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-amber-500 rounded-br-2xl" />

                {/* Animated Laser line with blur trail */}
                {policy.uiFx.enableInfiniteAnimations ? (
                  <motion.div
                    animate={{ top: ['0%', '100%', '0%'] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent z-10"
                  >
                    <div className="absolute inset-0 bg-amber-400 blur-sm opacity-50" />
                  </motion.div>
                ) : (
                  <div className="absolute left-0 top-1/2 w-full h-1 -translate-y-1/2 bg-gradient-to-r from-transparent via-amber-500 to-transparent z-10" />
                )}
              </div>

              <div className="mt-8 flex flex-col items-center">
                <span className="text-amber-400 font-black text-xs uppercase tracking-[0.3em] mb-2 animate-pulse">Scanning Signal</span>
                <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest text-center px-12 leading-relaxed">
                  Position QR code within the frame to unlock rewards
                </span>
              </div>
            </div>

            {/* REWARD SECTIONS */}
            <div className="flex-1 overflow-y-auto px-6 pb-20 hide-scrollbar space-y-12">

              {/* SECTION: UNLOCKED */}
              {unlockedItems.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">{lang === 'bs' ? 'Otključane Nagrade' : 'Unlocked Rewards'}</h2>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {unlockedItems.map((item) => (
                      <motion.div
                        layout
                        key={item.id}
                        className="group relative h-32 rounded-3xl overflow-hidden border border-amber-400/40 bg-white/5 shadow-xl transition-all active:scale-95"
                        onClick={() => {
                          if (item.video) setPlayingVideo(item.video);
                          else if ((item as any).website) window.open((item as any).website, '_blank');
                        }}
                      >
                        <img src={item.image} alt={item.name.en} className={`w-full h-full object-cover brightness-[0.7] ${isUtilityMode ? '' : 'group-hover:brightness-100 transition-all duration-500'}`} />
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 to-transparent p-5 flex flex-col justify-center">
                          <span className="text-amber-400 text-[10px] font-black uppercase tracking-widest mb-1 leading-none">{lang === 'bs' ? 'Otključano' : 'Unlocked'}</span>
                          <h3 className="text-lg font-black text-white uppercase leading-none tracking-tight">{item.name.en}</h3>
                        </div>
                        {item.video && (
                          <div className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/40">
                            <Play className="w-5 h-5 text-slate-950 fill-slate-950 ml-0.5" />
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 h-1 bg-amber-500 transition-all duration-500 w-full shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION: LOCKED */}
              {lockedItems.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <Lock className="w-5 h-5 text-slate-500" />
                    <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">{lang === 'bs' ? 'Preostali Zadaci' : 'Remaining Quests'}</h2>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {lockedItems.map((item) => (
                      <div
                        key={item.id}
                        className="relative h-28 rounded-3xl overflow-hidden border border-white/5 bg-slate-900/50"
                      >
                        <img src={item.image} alt="Locked" className={`w-full h-full object-cover grayscale brightness-[0.3] ${isUtilityMode ? 'blur-sm' : 'blur-xl'}`} />
                        <div className="absolute inset-0 flex items-center justify-between px-8">
                          <div className="flex flex-col">
                            <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1 leading-none">Find to Unlock</span>
                            <h3 className="text-md font-black text-slate-600 uppercase leading-none tracking-tight italic">SECRET LOCATION</h3>
                          </div>
                          <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                            <Lock className="w-4 h-4 text-slate-700" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => setIsScanning(false)}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-white/10 hover:bg-white/20 backdrop-blur-2xl border border-white/20 rounded-3xl flex items-center justify-center text-white shadow-2xl active:scale-90 transition-all"
            >
              <X className="w-8 h-8" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VIDEO PLAYER */}
      <AnimatePresence>
        {playingVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[5000] bg-black flex flex-col p-6"
          >
            <div className="flex-grow flex items-center justify-center bg-black">
              <video
                src={playingVideo}
                autoPlay
                controls
                playsInline
                poster={QUEST_TARGETS.find(q => q.video === playingVideo)?.image}
                className="w-full max-h-[70vh] rounded-[2.5rem] bg-black shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] border border-white/10"
              />
            </div>

            <div className="h-48 flex flex-col items-center justify-center gap-6">
              <h2 className="text-white font-black text-2xl uppercase tracking-tighter text-center">Reward Cinematic Unlocked</h2>
              <button
                onClick={() => setPlayingVideo(null)}
                className="px-12 py-5 bg-white text-slate-950 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all"
              >
                Return to Quest
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SUCCESS POPUP */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 left-6 right-6 z-[3000] bg-green-500 text-white p-6 rounded-3xl shadow-[0_20px_50px_rgba(16,185,129,0.4)] flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-green-100 block mb-1">New Reward Unlocked</span>
              <span className="text-lg font-black uppercase text-white leading-none">{successMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Destination Preset Selector Modal */}
      <AnimatePresence>
        {isPresetModalOpen && (
          <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="w-full max-w-lg overflow-hidden border bg-slate-900/95 backdrop-blur-2xl border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[80vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                    <Compass className="text-emerald-500" size={24} />
                    {lang === 'bs' ? 'Odaberi Odredište' : 'Choose Destination'}
                  </h3>
                  <p className="text-xs font-bold text-slate-400 mt-1">
                    {lang === 'bs' ? 'Započni pješačku rutu kroz Tuzlu' : 'Start a walking route through Tuzla'}
                  </p>
                </div>
                <button
                  onClick={() => setIsPresetModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Tabs */}
              <div className="px-6 py-2 border-b border-white/5 flex gap-2">
                <button
                  onClick={() => setActiveModalTab('poi')}
                  className={`flex-1 py-3 px-4 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all ${activeModalTab === 'poi'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                >
                  <Landmark size={16} />
                  {lang === 'bs' ? 'Znamenitosti' : 'Landmarks'}
                </button>
                <button
                  onClick={() => setActiveModalTab('hotel')}
                  className={`flex-1 py-3 px-4 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all ${activeModalTab === 'hotel'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                >
                  <HotelIcon size={16} />
                  {lang === 'bs' ? 'Hoteli' : 'Hotels'}
                </button>
              </div>

              {/* Scrollable List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                {activeModalTab === 'poi' ? (
                  ROUTE_POI_PRESETS.map((poi, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedNavTarget({
                          name: (poi.name[lang] ?? poi.name.en),
                          lat: poi.lat,
                          lon: poi.lon
                        });
                        setIsNavigating(true);
                        setIsPresetModalOpen(false);
                      }}
                      className="w-full p-4 bg-white/5 hover:bg-emerald-600/20 hover:border-emerald-500/50 border border-white/5 rounded-2xl transition-all flex items-center justify-between group text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-all">
                          <Landmark size={20} />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-white group-hover:text-emerald-300 transition-colors">
                            {poi.name[lang] ?? poi.name.en}
                          </h4>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400/80">
                            {poi.category}
                          </span>
                        </div>
                      </div>
                      <Route size={20} className="text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                    </button>
                  ))
                ) : (
                  tuzlaHotelData.map((hotel, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedNavTarget({
                          name: hotel.name,
                          lat: hotel.latitude,
                          lon: hotel.longitude
                        });
                        setIsNavigating(true);
                        setIsPresetModalOpen(false);
                      }}
                      className="w-full p-4 bg-white/5 hover:bg-emerald-600/20 hover:border-emerald-500/50 border border-white/5 rounded-2xl transition-all flex items-center justify-between group text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-all">
                          <HotelIcon size={20} />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-white group-hover:text-emerald-300 transition-colors">
                            {hotel.name}
                          </h4>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400/80">
                            {hotel.rating} ★ • {hotel.priceRange}
                          </span>
                        </div>
                      </div>
                      <Route size={20} className="text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Navigation HUD Panel */}
      <AnimatePresence>
        {isNavigating && selectedNavTarget && (
          <motion.div
            ref={navHudBoundsRef}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="absolute inset-0 z-20 pointer-events-none flex items-end justify-center pb-28 px-4"
          >
            <motion.div
              drag
              dragControls={navHudDragControls}
              dragListener={false}
              dragConstraints={navHudBoundsRef}
              dragElastic={0.08}
              dragMomentum={false}
              style={{ x: navHudX, y: navHudY }}
              className="w-full max-w-md pointer-events-auto bg-slate-950 border border-emerald-500/30 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 touch-none"
            >
              {/* Header Info */}
              <div
                className="flex items-start justify-between cursor-grab active:cursor-grabbing select-none"
                onPointerDown={(event) => navHudDragControls.start(event)}
              >
                <div className="flex gap-3">
                  <div className="p-3 bg-emerald-600/20 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                    <Route size={24} className="animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400">
                      {lang === 'bs' ? 'U Toku je Pješačka Ruta' : 'Walking Route in Progress'}
                    </span>
                    <h4 className="text-base font-black text-white line-clamp-1 mt-0.5">
                      {selectedNavTarget.name}
                    </h4>
                  </div>
                </div>
                <button
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => {
                    setIsNavigating(false);
                    setSelectedNavTarget(null);
                  }}
                  className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Navigation Data Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Distance Card */}
                <div className="bg-white/5 border border-white/5 rounded-2xl p-3.5 flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Footprints size={14} />
                    <span className="text-xs font-bold">{lang === 'bs' ? 'Udaljenost' : 'Distance'}</span>
                  </div>
                  <div className="mt-2 text-white font-black text-xl flex items-baseline gap-1">
                    {isRouteLoading ? (
                      <Loader2 className="animate-spin text-emerald-400" size={20} />
                    ) : routeDistance !== null ? (
                      routeDistance >= 1000 ? (
                        <>
                          {(routeDistance / 1000).toFixed(1)}
                          <span className="text-xs text-emerald-400 font-bold">km</span>
                        </>
                      ) : (
                        <>
                          {Math.round(routeDistance)}
                          <span className="text-xs text-emerald-400 font-bold">m</span>
                        </>
                      )
                    ) : (
                      '--'
                    )}
                  </div>
                </div>

                {/* Duration Card */}
                <div className="bg-white/5 border border-white/5 rounded-2xl p-3.5 flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock size={14} />
                    <span className="text-xs font-bold">{lang === 'bs' ? 'Vrijeme' : 'Duration'}</span>
                  </div>
                  <div className="mt-2 text-white font-black text-xl flex items-baseline gap-1">
                    {isRouteLoading ? (
                      <Loader2 className="animate-spin text-emerald-400" size={20} />
                    ) : routeTime !== null ? (
                      <>
                        {Math.ceil(routeTime / 60)}
                        <span className="text-xs text-emerald-400 font-bold">min</span>
                      </>
                    ) : (
                      '--'
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsNavigating(false);
                    setSelectedNavTarget(null);
                  }}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-lg shadow-red-600/20"
                >
                  {lang === 'bs' ? 'Završi' : 'End'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
      </AnimatePresence>
    </div>
  );
};

export default MapQuestView;
