
export type Language = 'en' | 'bs' | 'de' | 'tr';

export interface LocationData {
  name: string;
  rating: number;
  user_ratings_total: number;
  address: string;
  latitude: number;
  longitude: number;
  website?: string;
  category: string;
  type: 'Dining' | 'Dessert';
  image?: string;
}

export interface WifiSpot {
  id: string;
  name: Record<Language, string>;
  description: Record<Language, string>;
  latitude: number;
  longitude: number;
  ssid: string;
}


export interface RouteStep {
  id: string;
  text: string;
  type: string;
  distance: number;
  lat: number;
  lng: number;
  stepIndex: number;
}

export interface Location {
  id: string;
  name: Record<Language, string>;
  description: Record<Language, string>;
  coordinates: [number, number];
  category: 'nature' | 'culture' | 'shopping' | 'landmark' | 'shop' | 'hotel' | 'park' | 'food';
  image?: string;
  qrCode?: string;
  discount?: string | number;
  website?: string;
  address?: string;
}

export interface TranslationSet {
  welcome: string;
  history: string;
  map: string;
  quest: string;
  gallery: string;
  scanQr: string;
  rewardClaimed: string;
  discountMessage: string;
  notificationTitle: string;
  notificationBody: string;
  close: string;
  viewOnMap: string;
  foundAt: string;
  liveEvents: string;
  wallet: string;
  loginOAuth: string;
  touristInfo: string;
  emergencyInfo: string;
  bestSupermarket: string;
  workingHours: string;
  monSat: string;
  sunday: string;
  closed: string;
  rating: string;
  reviews: string;
  delivery: string;
  noDelivery: string;
  typicalPrice: string;
  arGuide: string;
  walletManual: string;
  howToConnect: string;
  connectSteps: string;
  safeUsage: string;
  safeTips: string;
  txHistory: string;
  historyLocation: string;
  bamToEur: string;
  enterBam: string;
  calculatedEur: string;
  conversionRate: string;
  pannonicaAlt: string;
  pannonicaTitle: string;
  pannonicaImage: string;
  trademarksDisclaimer: string;
  privacyNoticeTitle: string;
  privacyNoticeBody: string;
  learnMore: string;
  busStation: string;
  batteryWarning: string;
  selectNetwork: string;
  solWallet: string;
  switchNetwork: string;
  connectedToSol: string;
  walletLocked: string;
  setWalletPin: string;
  confirmPin: string;
  enterPin: string;
  dentalTourism: string;
  locationNotAvailable: string;
  zonesLabel: string;
  galleryCharmText: string;
  // Wallet translations
  digitalWalletTitle: string;
  solanaConnection: string;
  walletAddress: string;
  statusNotConnected: string;
  viewOnSolanaExplorer: string;
  explorationTitle: string;
  qrLocationScannerTitle: string;
  startScanner: string;
  qrScannerDesc: string;
  currencyConverterTitle: string;
  enterBamLabel: string;
  enterEurLabel: string;
  estimatedEurLabel: string;
  estimatedBamLabel: string;
  conversionRateText: string;
  scanHistoryLedgerTitle: string;
  ledgerEmptyTitle: string;
  ledgerEmptyDesc: string;
  clearScanHistory: string;
  clearHistoryConfirm: string;
  yesDelete: string;
  cancel: string;
  partnerAgenciesTitle: string;
  scanLocationToUnlock: string;
  positionCodeInFrame: string;
  success: string;
  error: string;
  alreadyInLedger: string;
  unlockedLocation: string;
  unknownQrCode: string;
  couldNotStartCamera: string;
  privacyDisclaimerText: string;
  privacyKeyPointsTitle: string;
  zeroCustodyTitle: string;
  zeroCustodyText: string;
  privacyByDesignTitle: string;
  privacyByDesignText: string;
  noDataStorageTitle: string;
  noDataStorageText: string;
  onDeviceProcessingTitle: string;
  onDeviceProcessingText: string;
  blockchainOffline: string;
  watchCinematic: string;
  closeVideo: string;
  solBalance: string;
}

export enum AppTab {
  LANDING = 'landing',
  CITY_GUIDE = 'cityGuide',
  HISTORY = 'history',
  FOOD = 'food',
  ACCOMMODATION = 'accommodation',
  MAP = 'map',
  QUEST = 'quest',
  WALLET = 'wallet',
  TASK_MANAGER = 'taskManager',
  AR = 'ar',
  TRAVEL_AGENCIES = 'travelAgencies',
}
