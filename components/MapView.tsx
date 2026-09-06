import React, { useRef, useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { OfflinePlugin, OFFLINE_STATUS } from '@makina-corpus/maplibre-offline-pmtiles';
import { Language } from '../types';
import { TUZLA_CENTER } from '../constants';
import { AppFeatures } from '../utils/platform';
import { Search, X, Loader2, Navigation, Landmark, Compass, Route, Clock, Footprints, Trophy, Lock, QrCode, Layers, Check } from 'lucide-react';

import { useNetwork } from '../hooks/useNetwork';
import { tuzlaHotelData } from '../tuzlaHotelData';
import { Hotel as HotelIcon } from 'lucide-react';
import { QUEST_TARGETS } from '../constants/questData';
import { motion, AnimatePresence } from 'framer-motion';


interface MapViewProps {
  lang: Language;
  features: AppFeatures;
  unlockedRewards?: string[];
}


const GEO_MAP_KEY = ['65090a03070e4e18', '98694f7a18ba415b'].join('');
const ROUTE_MAP_KEY = ['63e8b34f44974d71', 'bc70aad63e5b56ba'].join('');

const OFFLINE_MAP_NAME = 'tuzla-city-v2';
const OFFLINE_MAP_URL = '/maps/tuzla.pmtiles';
const OFFLINE_MAP_STYLE_URL = '/maps/offline-vector-style.json';
const OFFLINE_MAP_READY_KEY = 'tuzla.offline-map.ready.v2';
const ONLINE_STYLE = `https://maps.geoapify.com/v1/styles/osm-liberty/style.json?apiKey=${import.meta.env.VITE_GEOAPIFY_MAP_TILES_API || import.meta.env.VITE_GEOAPIFY_STATIC_API || GEO_MAP_KEY}`;
const ONLINE_TUZLATOUR = `https://maps.geoapify.com/v1/styles/osm-liberty/style.json?apiKey=${import.meta.env.VITE_GEOAPIFY_MAP_TILES_API || import.meta.env.VITE_GEOAPIFY_STATIC_API || GEO_MAP_KEY}`;

OfflinePlugin.registerProtocol(maplibregl);
const offlinePlugin = new OfflinePlugin();
const EMPTY_MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: 'offline-background', type: 'background', paint: { 'background-color': '#0f172a' } }],
};

const MAP_LAYER_OPTIONS = [
  { id: 'geoapify', name: { bs: 'Geoapify OSM (Online)', en: 'Geoapify OSM (Online)' }, url: ONLINE_STYLE },
  { id: 'offline', name: { bs: 'Lokalna PMTiles (Offline)', en: 'Local PMTiles (Offline)' }, url: 'offline' },
];

const loadOfflineMap = async (mapInstance: maplibregl.Map): Promise<void> => {
  const statusHandler = (status: { code: OFFLINE_STATUS; progress?: number | string }) => {
    if (status.code === OFFLINE_STATUS.PROGRESS) console.info('Offline map:', status.progress);
  };

  if (localStorage.getItem(OFFLINE_MAP_READY_KEY) !== 'true') {
    const styleResponse = await fetch(OFFLINE_MAP_STYLE_URL);
    if (!styleResponse.ok) throw new Error(`Offline style request failed: ${styleResponse.status}`);
    const style = await styleResponse.json();
    const pmtilesStyle = {
      ...style,
      sources: {},
      layers: style.layers.filter((layer: { type: string; source?: string }) => layer.type === 'background' || layer.source === 'tuzla-pmtiles'),
    };
    await offlinePlugin.downloadMap(OFFLINE_MAP_URL, OFFLINE_MAP_NAME, statusHandler, pmtilesStyle);
    localStorage.setItem(OFFLINE_MAP_READY_KEY, 'true');
  }

  await offlinePlugin.loadMap(mapInstance, OFFLINE_MAP_NAME, statusHandler);
};
interface RoutePoiPreset {
  name: Partial<Record<Language, string>> & { en: string; bs: string };
  lat: number;
  lon: number;
  category: string;
  entryFee?: string;
  description?: string;
}

const ROUTE_POI_PRESETS: RoutePoiPreset[] = [
  {
    name: { bs: 'Panonska Jezera', en: 'Pannonian Lakes' },
    lat: 44.53888255374366,
    lon: 18.680032450849325,
    category: 'nature',
    entryFee: "Paid 7.5 KM - 9 KM for entire day",
    description: "The Pannonian Lakes are a unique complex of three salt lakes located in the heart of Tuzla. Created during mineral extraction activities in the late 19th and early 20th centuries, the lakes have since transformed into a popular recreational destination. Rich in minerals and natural beauty, the largest lake, Panonsko Jezero I, offers swimming, sunbathing, and numerous amenities including restaurants, sports facilities, and event spaces. The entire complex provides a refreshing urban oasis with its blend of natural landscapes and modern tourist infrastructure."
  },
  {
    name: { bs: 'Slana Banja Park', en: 'Slana Banja Park' },
    lat: 44.53846734540082,
    lon: 18.685620782683003,
    category: 'nature',
    entryFee: "free",
    description: "A sprawling, peaceful memorial park and pine forest on a hill overlooking the Pannonian lakes. It contains walking paths, fountains, and monuments dedicated to anti-fascist heroes and veterans."
  },

  {
    name: { bs: 'Trg Slobode', en: 'Freedom Square' },
    lat: 44.53954253369571,
    lon: 18.67508475352372,
    category: 'culture',
    entryFee: "free",
    description: "The old city gate and a deeply significant historical site. It serves as a central meeting point in the pedestrian zone and houses a memorial dedicated to the tragic loss of young lives during the 1995 shelling."
  },
  {
    name: { bs: 'Spomenik Kralju Tvrtku (I)', en: 'King Tvrtko Monument' },
    lat: 44.53812247668793,
    lon: 18.678359094003866,
    category: 'history',
    entryFee: "free",
    description: "A centrally located urban park and historical site featuring a majestic bronze statue of medieval Bosnia's first king, Tvrtko I Kotromanić. The park offers scenic walking paths, a stone replica of the landmark Charter of Kulin, an elegant central fountain, and peaceful green areas for relaxation in the heart of the city."
  },
  {
    name: { bs: 'Spomenik Meši Selimoviću', en: 'Mesa Selimovic Monument' },
    lat: 44.53710706292608,
    lon: 18.67822758905615,
    category: 'culture',
    entryFee: "free",
    description: "A culturally significant monument dedicated to the renowned Bosnian novelist, philosopher, and Nobel laureate, Meša Selimović. This evocative sculpture stands as a tribute to one of the most important literary figures of the former Yugoslavia, situated in a prominent location within the city's cultural landscape."
  },
  {
    name: { bs: 'Džamija Šarena (Atik)', en: 'Atik Mosque' },
    lat: 44.54001556181191,
    lon: 18.673365480509432,
    category: 'religion',
    description: "The historic Atik Mosque, locally known as Šarena Džamija (the Colorful Mosque), is an active place of worship and a protected cultural monument in the heart of Tuzla. Built in the early 16th century, its distinctively painted wooden exterior and intimate prayer hall make it one of the city’s most picturesque religious landmarks. The mosque is renowned for its tranquil atmosphere, traditional Bosnian Islamic architecture, and the peaceful courtyard that serves as a quiet retreat within the bustling old town."
  },
  {
    name: { bs: 'Saborna Crkva', en: 'Orthodox Cathedral' },
    lat: 44.53800051276164,
    lon: 18.679763716121386,
    category: 'religion',
    entryFee: "free",
    description: "The largest and most significant Orthodox Christian church in Tuzla, the Holy Mother of God Cathedral (Saborna Crkva) is a beautiful example of Serbian Orthodox ecclesiastical architecture. Constructed in the 19th century, the cathedral features striking frescoes, a prominent bell tower, and a serene interior that reflects the rich spiritual heritage of the region. It serves as the administrative center of the Eparchy of Zvornik and Tuzla and is a focal point for Orthodox Christian life in the city."
  },
  {
    name: { bs: 'Tržni centar Bingo (BCC)', en: 'Bingo Shopping Center' },
    lat: 44.53188635183338,
    lon: 18.652020274686947,
    category: "shopping",
    description: "The largest modern shopping mall in the region, featuring a vast hypermarket, international retail fashion brands, a multiplex cinema, bowling alley, and extensive dining areas."
  },
  {
    name: { bs: 'TC Robot', en: 'Robot Shopping Center' },
    lat: 44.53454365316736,
    lon: 18.682516897004632,
    category: "shopping"
  },
  {
    name: { bs: 'TC Mercator', en: 'Mercator Shopping Center' },
    lat: 44.5327311385098,
    lon: 18.68292815613492,
    category: "shopping",
    description: "An established and easily accessible shopping center located near the main southern transit road, offering a well-stocked supermarket, clothing stores, electronics shop, and cozy cafes.",
  },
  {
    name: { bs: 'TC Tuzlanka', en: 'Tuzlanka Shopping Center' },
    lat: 44.538634727509304,
    lon: 18.664878503738578,
    category: "shopping",
    description: "A multi-floor shopping mall located dynamically near the city center and student campus, featuring retail fashion outlets, electronics stores, home goods, and a panoramic rooftop café."
  }
];

const MapView: React.FC<MapViewProps> = ({ lang, features, unlockedRewards = [] }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const userMarker = useRef<maplibregl.Marker | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeStyle, setActiveStyle] = useState<string>(navigator.onLine ? ONLINE_STYLE : 'offline');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  // Keep a ref to the latest location so calculateRoute can read it
  // without being a reactive dependency — prevents auto-rererouting on GPS tick
  const userLocationRef = useRef<[number, number] | null>(null);
  const isOnline = useNetwork();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchMarkerRef = useRef<maplibregl.Marker | null>(null);

  // Routing and Navigation States
  const [selectedTarget, setSelectedTarget] = useState<{ name: string; lat: number; lon: number } | null>(null);
  const [searchedTarget, setSearchedTarget] = useState<{ name: string; lat: number; lon: number } | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeTime, setRouteTime] = useState<number | null>(null);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'poi' | 'hotel' | 'qrcode'>('poi');

  const handleSwitchLayer = (styleUrl: string) => {
    if (!map.current || activeStyle === styleUrl) {
      setShowLayerMenu(false);
      return;
    }

    setActiveStyle(styleUrl);
    setShowLayerMenu(false);

    if (styleUrl === 'offline') {
      setIsLoaded(false);
      map.current.setStyle(EMPTY_MAP_STYLE);
      map.current.once('style.load', () => {
        void loadOfflineMap(map.current!).then(() => setIsLoaded(true)).catch((error) => {
          console.error('Offline PMTiles layer failed to load:', error);
          setActiveStyle(ONLINE_STYLE);
          map.current?.setStyle(ONLINE_STYLE);
        });
      });
      return;
    }

    setIsLoaded(false);
    map.current.setStyle(styleUrl);
    map.current.once('style.load', () => setIsLoaded(true));
  };

  // Expose global callback for Mapbox popup navigation clicks
  useEffect(() => {
    (window as any).startNavigationFromPopup = (name: string, lat: number, lon: number) => {
      setSelectedTarget({ name, lat, lon });
      setIsNavigating(true);
      // Close any open popups
      const popups = document.getElementsByClassName('maplibregl-popup');
      for (let i = 0; i < popups.length; i++) {
        (popups[i] as HTMLElement).remove();
      }
    };
    return () => {
      delete (window as any).startNavigationFromPopup;
    };
  }, []);

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
      const apiKey = import.meta.env.VITE_GEOAPIFY_ROUTING_API || import.meta.env.VITE_GEOAPIFY_STATIC_API || ROUTE_MAP_KEY;
      const url = `https://api.geoapify.com/v1/routing?waypoints=${startLoc[0]},${startLoc[1]}|${target.lon},${target.lat}&mode=walk&apiKey=${apiKey}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Routing API request failed');

      const data = await res.json();
      if (!data || !data.features || data.features.length === 0) {
        throw new Error('No route found');
      }

      const routeFeature = data.features[0];
      const distance = routeFeature.properties.distance; // in meters
      const time = routeFeature.properties.time; // in seconds

      setRouteDistance(distance);
      setRouteTime(time);

      if (!map.current) return;

      if (map.current.getSource('route-source')) {
        const source = map.current.getSource('route-source') as maplibregl.GeoJSONSource;
        source.setData(data);
      } else {
        map.current.addSource('route-source', {
          type: 'geojson',
          data: data
        });

        map.current.addLayer({
          id: 'route-layer-casing',
          type: 'line',
          source: 'route-source',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#1c8a44ff',
            'line-width': 9,
            'line-opacity': 0.5
          }
        });

        map.current.addLayer({
          id: 'route-layer',
          type: 'line',
          source: 'route-source',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#22c55e',
            'line-width': 4,
            'line-opacity': 0.9
          }
        });
      }

      const coordinates = routeFeature.geometry.coordinates;
      if (coordinates && coordinates.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        coordinates.forEach((coord: [number, number]) => {
          bounds.extend(coord);
        });

        map.current.fitBounds(bounds, {
          padding: { top: 120, bottom: 240, left: 60, right: 60 },
          duration: 1500
        });
      }

    } catch (error) {
      console.error('Error calculating route:', error);
    } finally {
      setIsRouteLoading(false);
    }
  };

  // Recalculate route ONLY when the user explicitly starts navigation or
  // changes the destination — NOT on every GPS location tick.
  // userLocationRef is read inside calculateRoute to get the current position.
  useEffect(() => {
    if (isNavigating && selectedTarget && isLoaded) {
      const start = userLocationRef.current || [TUZLA_CENTER[1], TUZLA_CENTER[0]] as [number, number];
      calculateRoute(start, selectedTarget);
    } else {
      clearRoute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNavigating, selectedTarget, isLoaded]); // intentionally excludes userLocation

  // Local GeoJSON Search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      let combinedResults: any[] = [];

      // 1. Search TuzlaTourGuide.geojson (local POI dataset)
      try {
        const res = await fetch('/maps/TuzlaTourGuide.geojson');
        if (res.ok) {
          const data = await res.json();
          const query = searchQuery.toLowerCase();
          const localMatches = (data.features || [])
            .filter((f: any) => {
              const props = f.properties || {};
              return (
                props.name?.toLowerCase().includes(query) ||
                props.name_bs?.toLowerCase().includes(query) ||
                props['name:bs']?.toLowerCase().includes(query) ||
                props['name:en']?.toLowerCase().includes(query) ||
                props['addr:street']?.toLowerCase().includes(query) ||
                props.amenity?.toLowerCase().includes(query) ||
                props.shop?.toLowerCase().includes(query) ||
                props.tourism?.toLowerCase().includes(query)
              );
            })
            .filter((f: any) => f.geometry?.type === 'Point')
            .slice(0, 20)
            .map((f: any) => {
              const props = f.properties || {};
              return {
                display_name: props.name || props['name:bs'] || props.amenity || props.shop || 'Unnamed',
                lat: f.geometry.coordinates[1],
                lon: f.geometry.coordinates[0],
                category: props.category || props.amenity || props.shop || props.tourism || 'POI',
              };
            });
          combinedResults = localMatches;
        }
      } catch (err) {
        console.warn('TuzlaTourGuide.geojson search failed:', err);
      }

      // 2. If online, also query Geoapify for real addresses
      if (isOnline) {
        try {
          let geoData;
          try {
            const geoapifyKey = import.meta.env.VITE_GEOAPIFY_GEOCODING_API ?? import.meta.env.VITE_GEOAPIFY_KEY;
            const geoRes = await fetch(`https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(searchQuery)}&bias=proximity:18.67,44.53&filter=rect:18.5,44.4,18.8,44.7&apiKey=${geoapifyKey}`);
            if (!geoRes.ok) throw new Error("Primary API failed");
            geoData = await geoRes.json();
          } catch (primaryErr) {
            console.warn('Primary geocoding API failed, trying backup...', primaryErr);
            const backupKey = import.meta.env.VITE_GEOCODING_API_KEY;
            if (backupKey) {
              const backupRes = await fetch(`https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(searchQuery)}&bias=proximity:18.67,44.53&filter=rect:18.5,44.4,18.8,44.7&apiKey=${backupKey}`);
              if (!backupRes.ok) {
                // Try as LocationIQ just in case
                const liqRes = await fetch(`https://eu1.locationiq.com/v1/search.php?key=${backupKey}&q=${encodeURIComponent(searchQuery)}&format=json`);
                if (liqRes.ok) {
                  const liqData = await liqRes.json();
                  geoData = {
                    features: Array.isArray(liqData) ? liqData.map((item: any) => ({
                      properties: { formatted: item.display_name, lat: parseFloat(item.lat), lon: parseFloat(item.lon) }
                    })) : []
                  };
                } else {
                  throw new Error("Backup API also failed");
                }
              } else {
                geoData = await backupRes.json();
              }
            } else {
              throw new Error("No backup API key provided");
            }
          }

          if (geoData && geoData.features) {
            const geoMatches = geoData.features.map((f: any) => ({
              display_name: f.properties.formatted,
              lat: f.properties.lat,
              lon: f.properties.lon,
              category: 'Address'
            }));
            combinedResults = [...combinedResults, ...geoMatches];
          }
        } catch (geoErr) {
          console.warn('All geocoding search attempts failed:', geoErr);
        }
      }

      setSearchResults(combinedResults.slice(0, 5));
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (result: any) => {
    if (map.current) {
      map.current.flyTo({ center: [result.lon, result.lat], zoom: 17, pitch: 60 });

      if (searchMarkerRef.current) searchMarkerRef.current.remove();

      searchMarkerRef.current = new maplibregl.Marker({ color: '#ea580c' })
        .setLngLat([result.lon, result.lat])
        .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(`
          <div style="font-family: 'Quicksand', sans-serif; padding: 6px; color: #1e293b;">
            <div style="font-weight: 800; font-size: 14px; margin-bottom: 6px;">${result.display_name}</div>
            <button onclick="window.startNavigationFromPopup('${result.display_name.replace(/'/g, "\\'")}', ${result.lat}, ${result.lon})" style="width:100%; background:#2563eb; border:none; border-radius:6px; color:white; padding:4px 0; font-weight:800; font-size:11px; cursor:pointer; font-family:'Quicksand',sans-serif; box-shadow:0 2px 6px rgba(37,99,235,0.2);">
              ${lang === 'bs' ? 'Navigacija' : 'Navigate'}
            </button>
          </div>
        `))
        .addTo(map.current);

      searchMarkerRef.current.togglePopup();

      setSearchedTarget({
        name: result.display_name,
        lat: result.lat,
        lon: result.lon
      });

      setSearchResults([]);
      setSearchQuery('');
      setIsSearchOpen(false);
    }
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: navigator.onLine ? ONLINE_STYLE : EMPTY_MAP_STYLE,
      center: [TUZLA_CENTER[1], TUZLA_CENTER[0]],
      zoom: 16,
      minZoom: 0,
      maxZoom: 20,
      pitch: 45,
      bearing: 0
    });

    map.current.on('load', async () => {
      try {
        if (!navigator.onLine) await loadOfflineMap(map.current!);
        setIsLoaded(true);
        map.current?.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');
      } catch (error) {
        console.error('Offline PMTiles map failed to load:', error);
      }

      // Add Hotel Markers
      tuzlaHotelData.forEach(hotel => {
        const el = document.createElement('div');
        el.className = 'hotel-marker';
        el.innerHTML = `
          <div style="background: #1e293b; color: #fbbf24; border: 2px solid #fbbf24; padding: 6px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; cursor: pointer; transform: scale(1); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bed"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>
          </div>
        `;

        new maplibregl.Marker(el)
          .setLngLat([hotel.longitude, hotel.latitude])
          .setPopup(new maplibregl.Popup({ offset: 25, maxWidth: '280px' }).setHTML(`
            <div style="font-family: 'Quicksand', sans-serif; padding: 12px; background: #0f172a; border-radius: 16px; color: white;">
              <img src="${hotel.image}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 12px; margin-bottom: 8px;" onerror="this.src='https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400'"/>
              <h3 style="font-weight: 800; font-size: 16px; margin: 0 0 4px 0; color: #fbbf24;">${hotel.name}</h3>
              <p style="font-size: 11px; margin: 0 0 8px 0; color: #94a3b8; line-height: 1.4;">${hotel.description[lang]}</p>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="font-size: 12px; font-weight: 900; color: #fbbf24;">${hotel.rating} ⭐</span>
                <span style="font-size: 10px; font-weight: 700; color: #94a3b8; background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 6px;">${hotel.priceRange}</span>
              </div>
              <button onclick="window.startNavigationFromPopup('${hotel.name.replace(/'/g, "\\'")}', ${hotel.latitude}, ${hotel.longitude})" style="width:100%; background:#2563eb; border:none; border-radius:8px; color:white; padding:8px 0; font-weight:800; font-size:12px; cursor:pointer; font-family:'Quicksand',sans-serif; box-shadow:0 4px 10px rgba(37,99,235,0.3); transition:all 0.2s;" onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='#2563eb'">
                ${lang === 'bs' ? 'Start' : 'Start'}
              </button>
            </div>
          `))
          .addTo(map.current!);
      });

    });

    map.current.on('error', (e) => {
      console.warn('Map error:', e.error?.message);
      if (navigator.onLine && activeStyle === ONLINE_STYLE && map.current) {
        setActiveStyle('offline');
        map.current.setStyle(EMPTY_MAP_STYLE);
        map.current.once('style.load', () => {
          void loadOfflineMap(map.current!).then(() => setIsLoaded(true)).catch((offlineError) => {
            console.error('Online and offline map styles failed:', offlineError);
          });
        });
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current || !isLoaded) return;

    let watchId: number;
    const startTracking = () => {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          // Always keep the ref up to date (used by calculateRoute)
          userLocationRef.current = [longitude, latitude];
          if (!userMarker.current) {
            const el = document.createElement('div');
            el.innerHTML = `<div style="background:#3b82f6;width:24px;height:24px;border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 0 20px rgba(59,130,246,0.6);"><div style="width:8px;height:8px;background:#fff;border-radius:50%;" /></div>`;
            userMarker.current = new maplibregl.Marker(el)
              .setLngLat([longitude, latitude])
              .addTo(map.current!);
          } else {
            userMarker.current.setLngLat([longitude, latitude]);
          }
          // Only update state (triggering re-render) — does NOT re-trigger route calculation
          setUserLocation([longitude, latitude]);
        },
        (err) => console.error(err),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };

    if (document.visibilityState === 'visible') startTracking();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') startTracking();
      else if (watchId) navigator.geolocation.clearWatch(watchId);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isLoaded]);

  return (
    <div className="h-full w-full relative group">
      <div ref={mapContainer} className="h-full w-full bg-slate-900" />
      {/* Global style overrides: keep popups and panels above all map markers */}
      <style>{`
        .maplibregl-marker { z-index: 1 !important; }
        .maplibregl-popup { z-index: 200 !important; }
        .maplibregl-ctrl-bottom-right { z-index: 10 !important; }
        .hotel-marker > div { padding: 5px !important; }
        .hotel-marker > div svg { width: 14px !important; height: 14px !important; }
        @media (max-width: 480px) {
          .map-action-btn { width: 36px !important; height: 36px !important; border-radius: 12px !important; }
          .map-action-btn svg { width: 16px !important; height: 16px !important; }
          .hotel-marker > div { padding: 4px !important; border-radius: 8px !important; }
          .hotel-marker > div svg { width: 11px !important; height: 11px !important; }
        }
      `}</style>

      {/* Search Overlay */}
      <div className={`absolute top-3 sm:top-6 inset-x-0 mx-auto z-[300] w-[90%] max-w-lg transition-all duration-500 ${isSearchOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}`}>
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            placeholder={lang === 'bs' ? "Traži lokacije..." : "Search locations..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/95 backdrop-blur-xl border-2 border-white/20 rounded-[2rem] py-4 pl-14 pr-16 shadow-2xl text-blue-900 font-bold outline-none focus:border-blue-500 transition-all placeholder:text-blue-900/30"
          />
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-600" size={24} />
          <button
            type="button"
            onClick={() => setIsSearchOpen(false)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full transition-all"
          >
            <X size={20} />
          </button>
        </form>

        {/* Search Results */}
        {(searchResults.length > 0 || isSearching) && (
          <div className="mt-4 bg-white/95 backdrop-blur-xl rounded-3xl p-4 shadow-2xl border border-white/20 overflow-hidden">
            {isSearching ? (
              <div className="flex items-center justify-center py-8 text-blue-600 gap-3">
                <Loader2 className="animate-spin" />
                <span className="font-bold">{lang === 'bs' ? 'Pretraživanje...' : 'Searching...'}</span>
              </div>
            ) : (
              <div className="space-y-2">
                {searchResults.map((result, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectSearchResult(result)}
                    className="w-full p-4 hover:bg-blue-50 rounded-2xl transition-all flex items-center gap-4 text-left group"
                  >
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <Navigation size={20} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-blue-900">{result.display_name}</h4>
                      <p className="text-xs text-blue-600/60 font-bold uppercase tracking-widest">{result.category || (lang === 'bs' ? 'Lokacija' : 'Location')}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons — Search (top-left) */}
      <div className="absolute top-3 sm:top-6 left-3 sm:left-6 flex flex-col gap-2 sm:gap-3 z-[150]">
        <button
          id="map-search-btn"
          onClick={() => setIsSearchOpen(true)}
          className="map-action-btn w-10 h-10 sm:w-14 sm:h-14 bg-white/90 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-2xl border border-white/20 flex items-center justify-center text-blue-600 hover:scale-110 active:scale-95 transition-all group"
        >
          <Search size={18} className="sm:hidden group-hover:rotate-12 transition-transform" />
          <Search size={24} className="hidden sm:block group-hover:rotate-12 transition-transform" />
        </button>
      </div>

      {/* Map Layer Switcher */}
      <div className="absolute bottom-6 left-3 sm:left-6 z-[150]">
        <button
          onClick={() => setShowLayerMenu((previous) => !previous)}
          className="map-action-btn w-10 h-10 sm:w-14 sm:h-14 bg-slate-900/90 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-2xl border border-blue-400/40 flex items-center justify-center text-blue-300 hover:text-white hover:border-blue-300 active:scale-95 transition-all"
          title={lang === 'bs' ? 'Promijeni sloj mape' : 'Switch map layer'}
        >
          <Layers size={20} />
        </button>
        <AnimatePresence>
          {showLayerMenu && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-12 sm:bottom-16 left-0 w-64 p-3 bg-slate-900/95 backdrop-blur-2xl border border-blue-500/30 rounded-2xl shadow-2xl space-y-1.5"
            >
              <div className="flex items-center justify-between px-2 py-1 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>{lang === 'bs' ? 'Sloj mape' : 'Map layer'}</span>
                <Layers size={12} className="text-blue-400" />
              </div>
              {MAP_LAYER_OPTIONS.map((layerOption) => {
                const isSelected = activeStyle === layerOption.url;
                return (
                  <button
                    key={layerOption.id}
                    onClick={() => handleSwitchLayer(layerOption.url)}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold text-left flex items-center justify-between transition-all ${isSelected ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
                  >
                    <span>{layerOption.name[lang as 'bs' | 'en'] || layerOption.name.bs}</span>
                    {isSelected && <Check size={14} />}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Navigation Button (top-right) */}
      <div className="absolute top-3 sm:top-6 right-3 sm:right-6 flex flex-col gap-2 sm:gap-3 z-[150]">
        <button
          id="map-nav-btn"
          onClick={() => {
            if (isNavigating) {
              setIsNavigating(false);
              setSelectedTarget(null);
            } else if (searchedTarget) {
              setSelectedTarget(searchedTarget);
              setIsNavigating(true);
            } else {
              setIsPresetModalOpen(true);
            }
          }}
          className={`map-action-btn w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl shadow-2xl border flex items-center justify-center transition-all duration-300 ${isNavigating
            ? 'bg-red-500 hover:bg-red-600 border-red-400 text-white hover:scale-110 active:scale-95 animate-pulse'
            : 'bg-white/90 border-white/20 text-blue-600 hover:scale-110 active:scale-95'
            }`}
        >
          {isNavigating ? (
            <>
              <X size={16} className="sm:hidden animate-in spin-in-90 duration-300" />
              <X size={24} className="hidden sm:block animate-in spin-in-90 duration-300" />
            </>
          ) : (
            <>
              <Route size={16} className="sm:hidden" />
              <Route size={24} className="hidden sm:block" />
            </>
          )}
        </button>
      </div>



      {/* Destination Preset Selector Modal */}
      <AnimatePresence>
        {isPresetModalOpen && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
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
                    <Compass className="text-blue-500" size={24} />
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
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                >
                  <Landmark size={16} />
                  {lang === 'bs' ? 'Znamenitosti' : 'Landmarks'}
                </button>
                <button
                  onClick={() => setActiveModalTab('hotel')}
                  className={`flex-1 py-3 px-4 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all ${activeModalTab === 'hotel'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                >
                  <HotelIcon size={16} />
                  {lang === 'bs' ? 'Hoteli' : 'Hotels'}
                </button>
                <button
                  onClick={() => setActiveModalTab('qrcode')}
                  className={`flex-1 py-3 px-4 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all ${activeModalTab === 'qrcode'
                    ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/30'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                >
                  <QrCode size={16} />
                  {lang === 'bs' ? 'QR Kod' : 'QR Code'}
                </button>
              </div>

              {/* Scrollable List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                {activeModalTab === 'poi' ? (
                  ROUTE_POI_PRESETS.map((poi, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedTarget({
                          name: poi.name[lang as 'bs' | 'en'] ?? poi.name.en,
                          lat: poi.lat,
                          lon: poi.lon
                        });
                        setIsNavigating(true);
                        setIsPresetModalOpen(false);
                      }}
                      className="w-full p-4 bg-white/5 hover:bg-blue-600/20 hover:border-blue-500/50 border border-white/5 rounded-2xl transition-all flex items-center justify-between group text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl group-hover:bg-blue-500 group-hover:text-white transition-all">
                          <Landmark size={20} />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-white group-hover:text-blue-300 transition-colors">
                            {poi.name[lang as 'bs' | 'en'] ?? poi.name.en}
                          </h4>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400/80">
                            {poi.category}
                          </span>
                        </div>
                      </div>
                      <Route size={20} className="text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                    </button>
                  ))
                ) : activeModalTab === 'hotel' ? (
                  tuzlaHotelData.map((hotel, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedTarget({
                          name: hotel.name,
                          lat: hotel.latitude,
                          lon: hotel.longitude
                        });
                        setIsNavigating(true);
                        setIsPresetModalOpen(false);
                      }}
                      className="w-full p-4 bg-white/5 hover:bg-blue-600/20 hover:border-blue-500/50 border border-white/5 rounded-2xl transition-all flex items-center justify-between group text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl group-hover:bg-blue-500 group-hover:text-white transition-all">
                          <HotelIcon size={20} />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-white group-hover:text-blue-300 transition-colors">
                            {hotel.name}
                          </h4>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400/80">
                            {hotel.rating} ★ • {hotel.priceRange}
                          </span>
                        </div>
                      </div>
                      <Route size={20} className="text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                    </button>
                  ))
                ) : (
                  /* REWARDS TAB */
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center pb-2">
                      {unlockedRewards.length} / {QUEST_TARGETS.length} {lang === 'bs' ? 'otključano' : 'unlocked'}
                    </p>
                    {QUEST_TARGETS.map((item) => {
                      const isUnlocked = unlockedRewards.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            if (!isUnlocked) return;
                            // Fly to location on map (approximate coords via LOCATIONS)
                            setIsPresetModalOpen(false);
                          }}
                          className={`w-full rounded-2xl overflow-hidden relative flex items-center gap-4 p-3 border transition-all text-left ${isUnlocked
                            ? 'border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 cursor-pointer'
                            : 'border-white/5 bg-white/3 opacity-60 cursor-default'
                            }`}
                        >
                          <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0">
                            <img
                              src={item.Image}
                              alt={item.name.en}
                              className={`w-full h-full object-cover ${isUnlocked ? 'brightness-90' : 'grayscale brightness-40 blur-sm'
                                }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className={`text-[9px] font-black uppercase tracking-widest block mb-0.5 ${isUnlocked ? 'text-amber-400' : 'text-slate-600'
                              }`}>
                              {isUnlocked ? (lang === 'bs' ? 'Otključano' : 'Unlocked') : (lang === 'bs' ? 'Zaključano' : 'Locked')}
                            </span>
                            <h4 className={`font-extrabold text-sm leading-tight truncate ${isUnlocked ? 'text-white' : 'text-slate-600 italic'
                              }`}>
                              {isUnlocked ? (lang === 'bs' ? item.name.bs : item.name.en) : '??? Secret Location'}
                            </h4>
                          </div>
                          <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${isUnlocked ? 'bg-amber-500/20' : 'bg-white/5'
                            }`}>
                            {isUnlocked
                              ? <Trophy size={16} className="text-amber-400" />
                              : <Lock size={14} className="text-slate-600" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Navigation HUD Panel */}
      <AnimatePresence>
        {isNavigating && selectedTarget && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="absolute inset-0 z-[250] pointer-events-none flex items-end justify-center pb-28 px-4"
          >
            <motion.div
              drag
              dragMomentum={false}
              className="w-full max-w-sm sm:max-w-md pointer-events-auto cursor-grab active:cursor-grabbing bg-slate-950 border border-blue-500/30 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col gap-3 sm:gap-4 mx-2"
            >
              {/* Header Info */}
              <div className="flex items-start justify-between">
                <div className="flex gap-3">
                  <div className="p-3 bg-blue-600/20 text-blue-400 rounded-2xl flex items-center justify-center border border-blue-500/20">
                    <Route size={24} className="animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-blue-400">
                      {lang === 'bs' ? 'U Toku je Pješačka Ruta' : 'Walking Route in Progress'}
                    </span>
                    <h4 className="text-base font-black text-white line-clamp-1 mt-0.5">
                      {selectedTarget.name}
                    </h4>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsNavigating(false);
                    setSelectedTarget(null);
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
                      <Loader2 className="animate-spin text-blue-400" size={20} />
                    ) : routeDistance !== null ? (
                      routeDistance >= 1000 ? (
                        <>
                          {(routeDistance / 1000).toFixed(1)}
                          <span className="text-xs text-blue-400 font-bold">km</span>
                        </>
                      ) : (
                        <>
                          {Math.round(routeDistance)}
                          <span className="text-xs text-blue-400 font-bold">m</span>
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
                      <Loader2 className="animate-spin text-blue-400" size={20} />
                    ) : routeTime !== null ? (
                      <>
                        {Math.ceil(routeTime / 60)}
                        <span className="text-xs text-blue-400 font-bold">min</span>
                      </>
                    ) : (
                      '--'
                    )}
                  </div>
                </div>
              </div>

              {/* Direct Maps Integration Button - Removed to keep navigation internal */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsNavigating(false);
                    setSelectedTarget(null);
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



      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center z-50">
          <div className="relative">
            <div className="w-24 h-24 border-4 border-blue-500/20 rounded-full animate-pulse" />
            <div className="absolute inset-0 border-t-4 border-blue-500 rounded-full animate-spin" />
            <Loader2 className="absolute inset-0 m-auto text-blue-500 animate-pulse" size={32} />
          </div>
          <p className="mt-8 text-blue-400 font-black uppercase tracking-[0.3em] text-sm animate-bounce">
            {lang === 'bs' ? 'Učitavanje Mape...' : 'Loading Map Experience...'}
          </p>
        </div>
      )}
    </div>
  );
};

export default MapView;
