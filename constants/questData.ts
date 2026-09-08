// Quest related constants extracted for reuse

import { Language } from "../types";

export interface QuestTarget {
  id: string;
  name: { en: string; bs: string; de?: string; tr?: string };
  Html5Qrcode: string;
  Image: string;
  video?: string;
  website?: string;
}

export interface RoutePoiPreset {
  name: { bs: string; en: string };
  lat: number;
  lon: number;
  category: string;
  entryFee?: string;
}

export const QUEST_TARGETS: QuestTarget[] = [
  { id: 'trg_slobode', name: { en: 'Freedom Square', bs: 'Trg slobode' }, Html5Qrcode: '/assets/Gallery/QuestQRLocations/QRTrgSlobode.png', Image: '/assets/Gallery/QuestQRLocations/trgslobode.webp' },
  { id: 'salt_square', name: { en: 'Salt Square', bs: 'Solni trg' }, Html5Qrcode: '/assets/Gallery/QuestQRLocations/QRsonitrg.png', Image: '/assets/Gallery/QuestQRLocations/sonitrg.webp' },
  { id: 'palancinkara', name: { en: 'Pancake Bagi', bs: 'Palančikara Bagi' }, Html5Qrcode: '/assets/Gallery/Food/QuestQRLocations/QRpalacinkara.webp', Image: '/assets/Gallery/Food/bagi.webp' },
  { id: 'slana_banja', name: { en: 'Slana Banja', bs: 'Slana Banja' }, Html5Qrcode: '/assets/Gallery/QuestQRLocations/QRBanja.png', Image: '/assets/Gallery/Photos/tuzla24.webp' },
  { id: 'kapija', name: { en: 'Kapija', bs: 'Kapija' }, Html5Qrcode: '/assets/Gallery/QuestQRLocations/QRkapija.png', Image: '/assets/Gallery/QuestQRLocations/kapija.webp' },
  { id: 'slapovi', name: { en: 'Waterfalls', bs: 'Slapovi' }, Html5Qrcode: '/assets/Gallery/QuestQRLocations/QRslapovi.png', Image: '/assets/Gallery/QuestQRLocations/tzslapovi.webp' },
  { id: 'atelje_ismet', name: { en: 'Atelje Ismet Mujezinovic', bs: 'Atelje Ismet Mujezinović' }, Html5Qrcode: '/assets/Gallery/QuestQRLocations/QRAtelje.png', Image: '/assets/Gallery/QuestQRLocations/atelje.webp' },
  { id: 'bingo_city_centar', name: { en: 'Bingo City Center', bs: 'Bingo City Centar' }, Html5Qrcode: '/assets/Gallery/QuestQRLocations/QRBingoCityCenter.png', Image: '/assets/Bingo-supermarket.webp', website: 'https://tuzla.bingocitycenter.ba/' },
  { id: 'mesa_selimovic', name: { en: 'Mesa Selimovic', bs: 'Meša Selimović' }, Html5Qrcode: '/assets/Gallery/QuestQRLocations/QRMesaStatue.png', Image: '/assets/Gallery/QuestQRLocations/TuzlaMesaS.webp', video: '/assets/Gallery/QuestQRLocations/MesaSelimovic.mp4' },
  { id: 'tvrtko_park', name: { en: 'King Tvrtko Park', bs: 'Park Kralja Tvrtka I' }, Html5Qrcode: '/assets/Gallery/QuestQRLocations/QRtvrtko.png', Image: '/assets/Gallery/Photos/tuzla12.webp' },
  { id: 'panonika', name: { en: 'Pannonian Lakes', bs: 'Panonska jezera' }, Html5Qrcode: '/assets/Gallery/QuestQRLocations/QRpanonika.png', Image: '/assets/Gallery/QuestQRLocations/Panonsko jezero.png' },
];

export const ROUTE_POI_PRESETS: RoutePoiPreset[] = [
  { name: { bs: "Panonska Jezera", en: "Pannonian Lakes" }, lat: 44.53888255374366, lon: 18.680032450849325, category: "nature", entryFee: "Paid 7.5 KM - 9 KM for entire day" },
  { name: { bs: "Slana Banja Park", en: "Slana Banja Park" }, lat: 44.53846734540082, lon: 18.685620782683003, category: "nature" },
  { name: { bs: "Trg Slobode", en: "Freedom Square" }, lat: 44.53954253369571, lon: 18.67508475352372, category: "culture" },
  { name: { bs: "Spomenik Kralju Tvrtku (I)", en: "King Tvrtko Monument" }, lat: 44.53812247668793, lon: 18.678359094003866, category: "history" },
  { name: { bs: "Spomenik Meši Selimoviću", en: "Mesa Selimovic Monument" }, lat: 44.53710706292608, lon: 18.67822758905615, category: "culture" },
  { name: { bs: "Džamija Šarena (Atik)", en: "Atik Mosque" }, lat: 44.54001556181191, lon: 18.673365480509432, category: "religion" },
  { name: { bs: "Saborna Crkva", en: "Orthodox Cathedral" }, lat: 44.53800051276164, lon: 18.679763716121386, category: "religion" },
  { name: { bs: "Tržni centar Bingo (BCC)", en: "Bingo Shopping Center" }, lat: 44.53188635183338, lon: 18.652020274686947, category: "shopping" },
  { name: { bs: "TC Robot", en: "Robot Shopping Center" }, lat: 44.53454365316736, lon: 18.682516897004632, category: "shopping" },
  { name: { bs: "TC Mercator", en: "Mercator Shopping Center" }, lat: 44.5327311385098, lon: 18.68292815613492, category: "shopping" },
  { name: { bs: "TC Tuzlanka", en: "Tuzlanka Shopping Center" }, lat: 44.538634727509304, lon: 18.664878503738578, category: "shopping" }
];

export const POI_COLORS: Record<string, string> = {
  'mesa_selimovic': '#4d068fff',
  'trg_slobode': '#10b981',
  'galerija': '#afcbf8ff',
  'panonika': '#040e8fff',
  'slapovi': '#0ea5e9',
  'kapija': '#ef4444',
  'tvrtko_park': '#18a506ff',
  'slana_banja': '#cf0404ff',
  'atelje_ismet': '#8b5cf6',
  'bingo_city_centar': '#145a03ff',
  'salt_square': '#f59e0b',
  'palancinkara': '#ec4899',
  'palancikara': '#ec4899',
};

export const QUEST_TARGET_COORDS: Record<string, { lat: number; lon: number }> = {
  trg_slobode: { lat: 44.5395175, lon: 18.6749037 },
  salt_square: { lat: 44.5382182, lon: 18.6759398 },
  palancinkara: { lat: 44.5383762, lon: 18.6775339 },
  palancikara: { lat: 44.5383762, lon: 18.6775339 },
  slana_banja: { lat: 44.5378167, lon: 18.6875664 },
  panonika: { lat: 44.5385, lon: 18.6767 },
  slapovi: { lat: 44.5404243, lon: 18.6819408 },
  kapija: { lat: 44.53863, lon: 18.676805 },
  atelje_ismet: { lat: 44.5371465, lon: 18.6810454 },
  bingo_city_centar: { lat: 44.532177, lon: 18.651743 },
  mesa_selimovic: { lat: 44.5370993, lon: 18.6781216 },
  tvrtko_park: { lat: 44.5380826, lon: 18.6783327 },
};

export const PHASE_1_POIS = ['trg_slobode', 'kapija', 'mesa_selimovic'];
export const PHASE_2_POIS = ['tvrtko_park', 'palancinkara', 'salt_square'];
export const PHASE_3_POIS = ['panonika', 'slapovi', 'slana_banja', 'atelje_ismet'];
export const GRAND_FINALE_POIS = ['bingo_city_centar'];

export function isPoiRewardUnlocked(poiId: string, unlockedRewards: string[]): boolean {
  if (unlockedRewards.includes(poiId)) return true;
  if (poiId === 'palancinkara' && unlockedRewards.includes('palancikara')) return true;
  if (poiId === 'palancikara' && unlockedRewards.includes('palancinkara')) return true;
  return false;
}

export function getPoiPhase(poiId: string): number {
  if (PHASE_1_POIS.includes(poiId)) return 1;
  if (PHASE_2_POIS.includes(poiId) || poiId === 'palancikara') return 2;
  if (PHASE_3_POIS.includes(poiId)) return 3;
  if (GRAND_FINALE_POIS.includes(poiId)) return 4;
  return 1;
}

export function getCurrentQuestPhase(unlockedRewards: string[]): number {
  const isP1 = PHASE_1_POIS.every(id => isPoiRewardUnlocked(id, unlockedRewards));
  if (!isP1) return 1;
  const isP2 = PHASE_2_POIS.every(id => isPoiRewardUnlocked(id, unlockedRewards));
  if (!isP2) return 2;
  const isP3 = PHASE_3_POIS.every(id => isPoiRewardUnlocked(id, unlockedRewards));
  if (!isP3) return 3;
  return 4;
}

export const NFT_REWARD_IDS: string[] = ["panonika"];

export const QUEST_GAME_RULES: Record<Language, { title: string; text: string }> = {
  bs: {
    title: 'Pravila igre potrage',
    text: 'Pronađite označene lokacije na mapi grada. Pratite GPS navigaciju ili AR vodič. Kada stignete na lokaciju, pronađite QR kod i skenirajte ga kako biste otključali sljedeće nivoe igre i osvojili nagrade.',
  },
  en: {
    title: 'Quest Game Rules',
    text: 'Find the marked locations on the city map. Follow the GPS navigation or the AR guide. Once at the location, find the QR code and scan it to unlock the next game levels and win rewards.',
  },
  de: {
    title: 'Regeln für das Suchspiel',
    text: 'Finden Sie die markierten Orte auf der Stadtkarte. Folgen Sie der GPS-Navigation oder dem AR-Guide. Finden Sie vor Ort den QR-Code und scannen Sie ihn, um die nächsten Spiel-Level und Belohnungen freizuschalten.',
  },
  tr: {
    title: 'Keşif Oyunu Kuralları',
    text: 'Şehir haritasında işaretlenmiş konumları bulun. GPS navigasyonunu veya AR rehberini takip edin. Konuma ulaştığınızda QR kodunu bulun ve bir sonraki oyun seviyelerinin ve ödüllerin kilidini açmak için kodu tarayın.',
  },
};


