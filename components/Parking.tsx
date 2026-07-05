import React, { useEffect, useState, useRef } from "react";
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';
import { Language } from "../types";
import { TRANSLATIONS, TUZLA_CENTER, TUZLA_PARKING_DATA } from "../constants";
import { Info, MessageSquare, Clock, MapPin, Car, List, Layers, Search, Navigation, Crosshair } from 'lucide-react';
import { useNetwork } from '../hooks/useNetwork';

// Initialize PMTiles Protocol once globally
const pmtilesProtocol = new Protocol();
try {
    maplibregl.addProtocol('pmtiles', pmtilesProtocol.tile);
} catch (e) {
    // Protocol might already be registered in another component
}

type ZoneKey = "Z0" | "Z1" | "Z2";
type PaymentType = "hourly" | "daily";

interface Zone {
    key: ZoneKey;
    name: string;
    price: number;
    dailyPrice: number;
    start: string;
    end: string;
    color: string;
    polygons: [number, number][][];
}

const isPointInPolygon = (point: [number, number], polygon: [number, number][]) => {
    let isInside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];
        const intersect = ((yi > point[1]) !== (yj > point[1])) &&
            (point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi);
        if (intersect) isInside = !isInside;
    }
    return isInside;
};

const zones: Zone[] = [
    {
        key: "Z0",
        name: "Zona 0",
        price: 2.0,
        dailyPrice: 6.0,
        start: "07:00",
        end: "22:00",
        color: "#bd9393ff",
        polygons: [
            [
                [18.672885, 44.540179],
                [18.673389, 44.540454],
                [18.674526, 44.540668],
                [18.675492, 44.540546],
                [18.676339, 44.53998],
                [18.676178, 44.539735],
                [18.677874, 44.538741],
                [18.677766, 44.538114],
                [18.677241, 44.538022],
                [18.677638, 44.537525],
                [18.677927, 44.537617],
                [18.678281, 44.537418],
                [18.678614, 44.537502],
                [18.678871, 44.537411],
                [18.678539, 44.536952],
                [18.679934, 44.535858],
                [18.679365, 44.53533],
                [18.676908, 44.536126],
                [18.675889, 44.536868],
                [18.674451, 44.537433],
                [18.673164, 44.538022],
                [18.674355, 44.539116],
                [18.672885, 44.540179]
            ]
        ]
    },
    {
        key: "Z1",
        name: "Zona 1",
        price: 1.0,
        dailyPrice: 5.0,
        start: "07:00",
        end: "22:00",
        color: "#bcdcffff",
        polygons: [
            // Parking Zona 1
            [
                [18.679322, 44.535292], [18.681049, 44.534413], [18.681951, 44.534971], [18.682455, 44.535522], [18.6815, 44.535881], [18.681103, 44.535254], [18.680663, 44.535392], [18.680309, 44.535024], [18.679504, 44.535384], [18.679322, 44.535292]
            ],
            // Zona 1 - Posta
            [
                [18.692508, 44.532929], [18.693033, 44.532898], [18.69298, 44.532677], [18.692465, 44.532684], [18.692508, 44.532929]
            ],
            // Zona 1 - Slatina
            [
                [18.665417, 44.540167], [18.665428, 44.541521], [18.66523, 44.541517], [18.665257, 44.542079], [18.665165, 44.542068], [18.665144, 44.540561], [18.665235, 44.540561], [18.665267, 44.540393], [18.665294, 44.540248], [18.665417, 44.540167]
            ],
            // Zona 1 - Tenis
            [
                [18.685169, 44.538126], [18.684558, 44.537579], [18.684343, 44.537713], [18.684268, 44.537648], [18.68452, 44.537472], [18.684209, 44.537242], [18.684354, 44.537154], [18.685314, 44.538018], [18.685169, 44.538126]
            ],
            // blue 5
            [
                [18.683764, 44.534872], [18.683206, 44.53504], [18.683115, 44.534803], [18.682771, 44.534891], [18.682648, 44.534646], [18.683544, 44.534455], [18.683764, 44.534872]
            ],
            // Zona 1 - Merkator
            [
                [18.681763, 44.533805], [18.681564, 44.533721], [18.68187, 44.533525], [18.682052, 44.533395], [18.682095, 44.533319], [18.682128, 44.533017], [18.683571, 44.532111], [18.684483, 44.531912], [18.684644, 44.533388], [18.683957, 44.533273], [18.683335, 44.533135], [18.682948, 44.533204], [18.683034, 44.533376], [18.682251, 44.533591], [18.681983, 44.533858], [18.681763, 44.533805]
            ],
            // Zona 1 - Hotel Tuzla
            [
                [18.688661, 44.530248], [18.688683, 44.530424], [18.688179, 44.53042], [18.688157, 44.530627], [18.687664, 44.53065], [18.687701, 44.530455], [18.688077, 44.530459], [18.688211, 44.530252], [18.688661, 44.530248]
            ],
            // Zona 1 - Dom Armije
            [
                [18.688018, 44.532367], [18.688039, 44.532745], [18.687771, 44.532757], [18.687685, 44.532466], [18.687401, 44.532531], [18.687428, 44.532791], [18.687197, 44.532807], [18.68717, 44.532497], [18.687009, 44.532497], [18.686805, 44.532527], [18.686585, 44.532673], [18.686194, 44.532906], [18.686167, 44.533059], [18.686178, 44.533288], [18.685743, 44.533296], [18.685679, 44.533204], [18.686247, 44.532726], [18.686607, 44.532474], [18.686891, 44.532352], [18.68717, 44.532332], [18.687637, 44.532302], [18.688012, 44.532302], [18.688018, 44.532367]
            ]
        ]
    },
    {
        key: "Z2",
        name: "Zona 2",
        price: 0.5,
        dailyPrice: 4.0,
        start: "07:00",
        end: "22:00",
        color: "#10b981",
        polygons: [
            // Zona 2 - Kajmak stanica
            [
                [18.681704, 44.538068], [18.681479, 44.537808], [18.680738, 44.537816], [18.679816, 44.538198], [18.680062, 44.538435], [18.681704, 44.538068]
            ],
            // Zona 2 - Panonica
            [
                [18.676039, 44.541318], [18.676618, 44.540959], [18.676211, 44.540561], [18.676758, 44.540309], [18.677595, 44.541074], [18.676929, 44.541311], [18.676447, 44.541448], [18.6762, 44.541418], [18.676039, 44.541318]
            ],
            // Zona 2 - Gradina
            [
                [18.686736, 44.540718], [18.686902, 44.540745], [18.687004, 44.540752], [18.687176, 44.540749], [18.687358, 44.540714], [18.687304, 44.540592], [18.687192, 44.540619], [18.687057, 44.540638], [18.686596, 44.540584], [18.686564, 44.540695], [18.686736, 44.540718]
            ],
            // Zona 2 - Gradina 2
            [
                [18.691054, 44.539211], [18.691569, 44.539246], [18.691585, 44.538936], [18.691462, 44.538948], [18.691462, 44.538734], [18.69107, 44.53873], [18.691054, 44.539211]
            ],
            // Zona 2 - Gradina 3
            [
                [18.691649, 44.537678], [18.692513, 44.53764], [18.692524, 44.537418], [18.691859, 44.537453], [18.691639, 44.537575], [18.691649, 44.537678]
            ],
            // Zona 2 - Gradina 4
            [
                [18.691435, 44.537433], [18.691006, 44.537747], [18.690737, 44.537537], [18.690571, 44.537644], [18.690737, 44.537938], [18.69121, 44.537816], [18.692062, 44.537193], [18.691939, 44.537108], [18.691435, 44.537433]
            ],
            // Zona 2 - Dom Zdravlja
            [
                [18.667923, 44.540924], [18.668427, 44.540913], [18.668422, 44.540492], [18.668196, 44.540389], [18.66605, 44.540393], [18.666008, 44.540183], [18.665723, 44.540186], [18.665761, 44.54084], [18.666104, 44.540844], [18.666115, 44.540496], [18.66722, 44.540504], [18.667912, 44.5405], [18.667923, 44.540924]
            ],
            // Zona 2 - Panonica 2
            [
                [18.683077, 44.538053], [18.682675, 44.538382], [18.682787, 44.53847], [18.683147, 44.538443], [18.683458, 44.538275], [18.683077, 44.538053]
            ],
            // Zona 2 - Mikrostanica
            [
                [18.687615, 44.534072], [18.687857, 44.534069], [18.687878, 44.534283], [18.688136, 44.534275], [18.688184, 44.534516], [18.687884, 44.53452], [18.687862, 44.534382], [18.687819, 44.534271], [18.687631, 44.53426], [18.687615, 44.534072]
            ],
            // Zona 2 - Jupiter - NLB
            [
                [18.683839, 44.533403], [18.683496, 44.533495], [18.68385, 44.534053], [18.685073, 44.533625], [18.685201, 44.533755], [18.685577, 44.533686], [18.685856, 44.533808], [18.687401, 44.533457], [18.68739, 44.53325], [18.68621, 44.533311], [18.685781, 44.533334], [18.685663, 44.533346], [18.685598, 44.533288], [18.685502, 44.533189], [18.685309, 44.533334], [18.684976, 44.533464], [18.684204, 44.533678], [18.684043, 44.53374], [18.683839, 44.533403]
            ]
        ]
    }
];

const smsNumbers = {
    hourly: { Z0: "0833510", Z1: "0833511", Z2: "0833512" },
    daily: { Z0: "0833513", Z1: "0833514", Z2: "0833515" },
};

const Parking: React.FC<{ lang: Language }> = ({ lang }) => {
    const t = TRANSLATIONS[lang];
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
    const [viewMode, setViewMode] = useState<'zones' | 'lots'>('zones');
    const [searchQuery, setSearchQuery] = useState("");
    const lotMarkers = useRef<maplibregl.Marker[]>([]);
    const [plate, setPlate] = useState("");
    const [paymentType, setPaymentType] = useState<PaymentType>("hourly");
    const [activeUntil, setActiveUntil] = useState<Date | null>(null);
    const [timeLeft, setTimeLeft] = useState("");
    const [isLoaded, setIsLoaded] = useState(false);
    const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
    const isOnline = useNetwork();
    const OFFLINE_STYLE = '/style/offline-style.json';
    const ONLINE_STYLE = 'https://maps.geoapify.com/v1/styles/osm-liberty/style.json?apiKey=65090a03070e4e1898694f7a18ba415b';

    useEffect(() => {
        const stored = localStorage.getItem("parkingExpiry");
        if (stored) setActiveUntil(new Date(stored));
    }, []);

    useEffect(() => {
        if (!activeUntil) return;
        const interval = setInterval(() => {
            const diff = activeUntil.getTime() - new Date().getTime();
            if (diff <= 0) {
                setActiveUntil(null);
                localStorage.removeItem("parkingExpiry");
            } else {
                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                setTimeLeft(`${h}h ${m}m ${s}s`);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [activeUntil]);

    useEffect(() => {
        if (map.current || !mapContainer.current) return;

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: isOnline ? ONLINE_STYLE : OFFLINE_STYLE,
            center: [TUZLA_CENTER[1], TUZLA_CENTER[0]],
            zoom: 14.5,
            minZoom: isOnline ? 0 : 14,
            maxZoom: isOnline ? 20 : 16,
            pitch: 0
        });

        map.current.on('load', () => {
            setIsLoaded(true);

            try {
                if (!map.current?.isStyleLoaded()) return;

                zones.forEach(zone => {
                    const id = `zone-${zone.key}`;
                    if (map.current?.getSource(id)) return; // Prevent duplicate source errors

                    map.current?.addSource(id, {
                        type: 'geojson',
                        data: {
                            type: 'FeatureCollection',
                            features: zone.polygons.map(p => ({
                                type: 'Feature',
                                properties: { zone: zone.key },
                                geometry: { type: 'Polygon', coordinates: [p] }
                            })) as any
                        }
                    });

                    map.current?.addLayer({
                        id: `${id}-fill`,
                        type: 'fill',
                        source: id,
                        paint: {
                            'fill-color': zone.color,
                            'fill-opacity': 0.3
                        }
                    });

                    map.current?.addLayer({
                        id: `${id}-outline`,
                        type: 'line',
                        source: id,
                        paint: {
                            'line-color': zone.color,
                            'line-width': 1.5,
                            'line-dasharray': [2, 1]
                        }
                    });

                    // Click listener
                    map.current?.on('click', `${id}-fill`, () => {
                        setSelectedZone(zone);
                    });

                    // Hover style
                    map.current?.on('mouseenter', `${id}-fill`, () => {
                        map.current!.getCanvas().style.cursor = 'pointer';
                        if (map.current?.isStyleLoaded()) {
                            try { map.current?.setPaintProperty(`${id}-fill`, 'fill-opacity', 0.6); } catch (e) { }
                        }
                    });
                    map.current?.on('mouseleave', `${id}-fill`, () => {
                        map.current!.getCanvas().style.cursor = '';
                        if (map.current?.isStyleLoaded()) {
                            try { map.current?.setPaintProperty(`${id}-fill`, 'fill-opacity', 0.3); } catch (e) { }
                        }
                    });
                });
            } catch (e) {
                console.warn("Parking Map: Could not initialize zone layers, style not fully loaded.", e);
            }
        });

        map.current.on('error', (e) => {
            console.warn("Parking Map: Style error detected, attempting to signal loaded anyway...", e);
            // Even if style fails, we want to allow geolocation and markers to work on a blank map
            if (!isLoaded) {
                setTimeout(() => setIsLoaded(true), 1000);
            }
        });

        return () => {
            map.current?.remove();
            map.current = null;
        };
    }, [isOnline]);

    const userMarker = useRef<maplibregl.Marker | null>(null);

    // Lot markers management
    useEffect(() => {
        if (!isLoaded || !map.current) return;

        // Clear existing lot markers
        lotMarkers.current.forEach(m => m.remove());
        lotMarkers.current = [];

        // Update zone visibility
        try {
            if (map.current.isStyleLoaded()) {
                zones.forEach(z => {
                    const visibility = viewMode === 'zones' ? 'visible' : 'none';
                    if (map.current?.getLayer(`zone-${z.key}-fill`)) {
                        map.current?.setLayoutProperty(`zone-${z.key}-fill`, 'visibility', visibility);
                        map.current?.setLayoutProperty(`zone-${z.key}-outline`, 'visibility', visibility);
                    }
                });
            }
        } catch (e) {
            console.warn("Could not update zone visibility, style not ready", e);
        }

        if (viewMode === 'lots') {
            TUZLA_PARKING_DATA.forEach(lot => {
                const el = document.createElement('div');
                el.className = 'parking-marker';
                el.innerHTML = `
                    <div style="background:#f59e0b;width:32px;height:32px;border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 20px rgba(0,0,0,0.2);cursor:pointer;">
                        <span style="color:white;font-weight:900;font-size:16px;">P</span>
                    </div>
                `;

                const marker = new maplibregl.Marker(el)
                    .setLngLat(lot.coordinates)
                    .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(`
                        <div style="padding:10px;font-family:Quicksand,sans-serif;">
                            <h3 style="margin:0;font-weight:900;color:#1e3a8a;font-size:16px;">${lot.name}</h3>
                            <div style="margin-top:4px;display:inline-block;background:#e2e8f0;padding:2px 6px;border-radius:4px;font-size:11px;color:#475569;">${lot.area}</div>
                            <p style="margin:6px 0;font-size:13px;color:#334155;">${lot.address}</p>
                            ${lot.features && lot.features.length > 0 ? `
                            <div style="margin-top:8px;">
                                ${lot.features.map(f => `<span style="display:inline-block;background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;padding:2px 6px;border-radius:12px;font-size:10px;margin:0 4px 4px 0;">${f}</span>`).join('')}
                            </div>
                            ` : ''}
                        </div>
                    `))
                    .addTo(map.current!);

                lotMarkers.current.push(marker);
            });
        }
    }, [viewMode, isLoaded]);

    // Geolocation effect
    useEffect(() => {
        if (!map.current || !isLoaded) return;

        let watchId: number;

        const startTracking = () => {
            watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    if (!userMarker.current) {
                        const el = document.createElement('div');
                        el.innerHTML = `<div style="background:#3b82f6;width:24px;height:24px;border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 0 20px rgba(59,130,246,0.6);"><div style="width:8px;height:8px;background:#fff;border-radius:50%;" /></div>`;
                        userMarker.current = new maplibregl.Marker(el)
                            .setLngLat([longitude, latitude])
                            .addTo(map.current!);

                        map.current?.flyTo({ center: [longitude, latitude], zoom: 15 });
                    } else {
                        userMarker.current.setLngLat([longitude, latitude]);
                    }
                    setUserCoords([longitude, latitude]);
                },
                (err) => {
                    console.error("Geolocation error:", err);
                    // If high accuracy fails, try falling back to low accuracy
                    if (err.code === 3 || err.code === 1) {
                        navigator.geolocation.getCurrentPosition(
                            (p) => setUserCoords([p.coords.longitude, p.coords.latitude]),
                            (e) => console.error("Fallback geolocation error:", e),
                            { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
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
    }, [isLoaded]);

    // Update highlight
    useEffect(() => {
        if (!isLoaded || !map.current) return;
        try {
            if (map.current.isStyleLoaded()) {
                zones.forEach(z => {
                    if (map.current?.getLayer(`zone-${z.key}-fill`)) {
                        map.current?.setPaintProperty(`zone-${z.key}-fill`, 'fill-opacity', selectedZone?.key === z.key ? 0.7 : 0.3);
                    }
                });
            }
        } catch (e) {
            console.warn("Could not update highlight, style not ready", e);
        }
    }, [selectedZone, isLoaded]);

    const isWithinTime = (zone: Zone) => {
        const now = new Date();
        const [sh, sm] = zone.start.split(":").map(Number);
        const [eh, em] = zone.end.split(":").map(Number);
        const start = new Date(); start.setHours(sh, sm, 0);
        const end = new Date(); end.setHours(eh, em, 0);
        return now >= start && now <= end;
    };

    const handlePay = () => {
        if (!selectedZone || !plate) {
            alert(t.parkingPromptPlate);
            return;
        }
        if (!isWithinTime(selectedZone)) {
            alert(t.parkingPaymentInactive);
            return;
        }
        const sms = smsNumbers[paymentType][selectedZone.key];
        window.location.href = `sms:${sms}?body=${plate}`;

        const expiry = new Date();
        paymentType === "hourly" ? expiry.setHours(expiry.getHours() + 1) : expiry.setHours(expiry.getHours() + 24);
        localStorage.setItem("parkingExpiry", expiry.toISOString());
        setActiveUntil(expiry);
    };

    const handleAutoDetect = () => {
        if (!userCoords) {
            // Try to request position manually if not available
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
                    setUserCoords(coords);
                    checkZones(coords);
                },
                (err) => {
                    console.error(err);
                    alert(t.locationNotAvailable || "Location not available. Please ensure GPS is enabled.");
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
            return;
        }
        checkZones(userCoords);
    };

    const checkZones = (coords: [number, number]) => {
        let found = false;
        for (const zone of zones) {
            for (const polygon of zone.polygons) {
                if (isPointInPolygon(coords, polygon)) {
                    setSelectedZone(zone);
                    found = true;
                    break;
                }
            }
            if (found) break;
        }

        if (!found) {
            alert(t.parkingDetectNoZone || "You are not in a parking zone.");
        }
    };

    return (
        <div className="h-[calc(100vh-88px)] w-full relative flex flex-col md:flex-row overflow-hidden bg-slate-50 font-quicksand">
            {/* Map Container */}
            <div ref={mapContainer} className="flex-grow z-0 relative h-1/2 md:h-full">
                {/* Floating Locate Button */}
                <button
                    onClick={() => {
                        if (userCoords && map.current) {
                            map.current.flyTo({ center: userCoords, zoom: 17 });
                        } else {
                            handleAutoDetect();
                        }
                    }}
                    className="absolute bottom-6 left-6 z-20 w-12 h-12 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-slate-100 flex items-center justify-center text-blue-600 active:scale-95 transition-all"
                >
                    <Navigation size={20} />
                </button>
            </div>

            {/* Sidebar / Controls */}
            <div className="w-full md:w-[400px] h-1/2 md:h-full bg-white/95 backdrop-blur-md z-10 p-8 shadow-[-20px_0_50px_rgba(0,0,0,0.05)] overflow-y-auto flex flex-col gap-6">
                <div>
                    <h1 className="text-3xl font-black text-blue-900 uppercase tracking-tighter flex items-center gap-3">
                        <MapPin className="text-blue-600" /> {t.parkingTitle} <Car className="text-amber-500 w-8 h-8" />
                    </h1>
                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={() => setViewMode('zones')}
                            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${viewMode === 'zones' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}
                        >
                            <Layers size={14} /> {t.zonesLabel}
                        </button>
                        <button
                            onClick={() => setViewMode('lots')}
                            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${viewMode === 'lots' ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}
                        >
                            <List size={14} /> {lang === 'bs' ? 'Parkinzi' : 'Parking Lots'}
                        </button>
                    </div>

                    <button
                        onClick={handleAutoDetect}
                        className="w-full mt-2 py-3 px-4 bg-blue-50 text-blue-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center justify-center gap-2 border border-blue-100"
                    >
                        <Crosshair size={14} /> {t.parkingAutoDetect}
                    </button>
                </div>

                {viewMode === 'zones' ? (
                    <>
                        {activeUntil && (
                            <div className="bg-amber-500 p-6 rounded-[2rem] shadow-[0_15px_35px_rgba(245,158,11,0.3)] animate-pulse border-4 border-white">
                                <p className="text-white/80 font-black uppercase text-[10px] tracking-widest">{t.parkingActive}</p>
                                <p className="text-3xl font-black text-white">{timeLeft}</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-2">
                                {zones.map((zone) => (
                                    <button
                                        key={zone.key}
                                        onClick={() => setSelectedZone(zone)}
                                        className={`py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all border-2 ${selectedZone?.key === zone.key
                                            ? "text-white shadow-xl scale-105"
                                            : "bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-200"
                                            }`}
                                        style={selectedZone?.key === zone.key ? { backgroundColor: zone.color, borderColor: zone.color } : {}}
                                    >
                                        {zone.name}
                                    </button>
                                ))}
                            </div>

                            {selectedZone && (
                                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-2xl font-black text-blue-900">{selectedZone.name}</span>
                                        <span className="px-4 py-1.5 bg-blue-100 text-blue-600 rounded-full text-xs font-black">
                                            {paymentType === "hourly" ? selectedZone.price : selectedZone.dailyPrice} KM
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">{selectedZone.start} - {selectedZone.end}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">{t.parkingLicensePlate}</label>
                                <input
                                    type="text"
                                    placeholder="A12K345"
                                    value={plate}
                                    onChange={(e) => setPlate(e.target.value.toUpperCase())}
                                    className="w-full p-5 rounded-[2rem] bg-slate-50 border-2 border-slate-100 text-blue-900 font-black text-xl shadow-inner focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-200"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setPaymentType("hourly")}
                                    className={`flex-1 py-4 rounded-2xl font-black uppercase text-sm tracking-widest transition-all ${paymentType === "hourly"
                                        ? "bg-blue-600 text-amber-400 shadow-[0_0_15px_rgba(37,99,235,0.5)]"
                                        : "bg-slate-100 text-slate-400"
                                        }`}
                                >
                                    {t.parkingHourly}
                                </button>
                                <button
                                    onClick={() => setPaymentType("daily")}
                                    className={`flex-1 py-4 rounded-2xl font-black uppercase text-sm tracking-widest transition-all ${paymentType === "daily"
                                        ? "bg-amber-400 text-blue-900 shadow-[0_0_15px_rgba(37,99,235,0.5)]"
                                        : "bg-slate-100 text-slate-400"
                                        }`}
                                >
                                    {t.parkingDaily}
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={handlePay}
                            disabled={!selectedZone || !plate}
                            className={`w-full p-6 rounded-[2.5rem] text-lg font-black uppercase tracking-tighter shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 ${!selectedZone || !plate
                                ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
                                : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200'}`}
                        >
                            <MessageSquare className="w-6 h-6" />
                            {t.parkingPaySms}
                        </button>
                    </>
                ) : (
                    <div className="flex-grow flex flex-col gap-4 overflow-hidden">
                        <div className="flex-grow overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                            {TUZLA_PARKING_DATA.map((lot, index) => (
                                <button
                                    key={lot.id || index}
                                    onClick={() => map.current?.flyTo({ center: lot.coordinates, zoom: 16 })}
                                    className="w-full p-4 bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-2xl transition-all flex items-start gap-4 text-left group"
                                >
                                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 group-hover:bg-blue-600 transition-colors">
                                        <Car className="text-amber-500 group-hover:text-white transition-colors" size={20} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-black text-blue-900 truncate">{lot.name}</h3>
                                        <p className="text-xs text-slate-400 font-medium truncate">{lot.address}</p>
                                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded-md text-[10px] font-black uppercase">
                                                {lot.area}
                                            </span>
                                            {lot.features && lot.features[0] && (
                                                <span className="px-2 py-0.5 bg-green-50 text-green-600 border border-green-100 rounded-md text-[10px] font-medium truncate">
                                                    {lot.features[0]}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <Navigation size={16} className="text-blue-400 shrink-0 self-center ml-2" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mt-auto p-6 bg-blue-50/50 rounded-[2rem] border border-blue-100 flex items-start gap-4 shrink-0">
                    <Info className="w-5 h-5 text-blue-600 shrink-0 mt-1" />
                    <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
                        {lang === 'bs'
                            ? 'Plaćanje se vrši putem SMS poruke. Obavezno provjerite validnost unešene tablice prije slanja.'
                            : 'Payment is made via SMS. Please double check your license plate number before sending.'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Parking;
