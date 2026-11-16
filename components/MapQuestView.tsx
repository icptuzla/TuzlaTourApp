import React, { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { globalPMTilesProtocol, ensureTuzlaOfflineMapDownloaded } from '../utils/pmtilesProtocol.ts';
import { OFFLINE_STYLE_SPEC } from '../utils/offlineMapStyle.ts';
import { motion, AnimatePresence } from 'framer-motion';
import CelebrationOverlay from './CelebrationOverlay.tsx';
import { QrCode, Navigation, Route, Info, X, Compass, Landmark, Hotel as HotelIcon, Trophy, Layers, Check, ChevronUp, ChevronDown, Play } from 'lucide-react';
import { AppFeatures } from '../utils/platform.ts';
import { Language } from '../types.ts';
import { TUZLA_CENTER, LOCATIONS } from '../constants.tsx';
import { useNetwork } from '../hooks/useNetwork.ts';
import { useQuestRuntimePolicy } from '../hooks/useQuestRuntimePolicy.ts';
import { useGeolocationWatcher } from '../hooks/useGeolocationWatcher.ts';
import { getDistance } from '../utils/geoUtils.ts';
import { AdaptiveLowPassFilter } from '../utils/arProjection'; // PRO FIX: Import centralized filter
import { QUEST_TARGETS, POI_COLORS, ROUTE_POI_PRESETS, PHASE_1_POIS, PHASE_2_POIS, PHASE_3_POIS, GRAND_FINALE_POIS, QUEST_GAME_RULES, isPoiRewardUnlocked } from '../constants/questData.ts';
import { NavigationHud } from './NavigationHud.tsx';
import { QrScannerModal } from './QrScannerModal.tsx';
import ARGuide from './ARGuide.tsx';

export interface MapQuestViewProps {
  lang: Language; features: AppFeatures; unlockedRewards: string[];
  onRewardFound: (id: string, qrPayload?: string) => void | boolean | Promise<void | boolean>;
  navigationTarget?: any | null; onClearNavigation?: () => void; initialOpenScanner?: boolean;
}

const QUEST_TARGET_COORDS: Record<string, { lat: number; lon: number }> = {
  trg_slobode: { lat: 44.5395175, lon: 18.6749037 }, salt_square: { lat: 44.5382182, lon: 18.6759398 },
  palancinkara: { lat: 44.5383762, lon: 18.6775339 }, slana_banja: { lat: 44.5378167, lon: 18.6875664 },