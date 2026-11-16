import ARGuide from './ARGuide.tsx';

export interface MapQuestViewProps {
  lang: Language; features: AppFeatures; unlockedRewards: string[];
  onRewardFound: (id: string, qrPayload?: string) => void | boolean | Promise<void | boolean>;
  navigationTarget?: any | null; onClearNavigation?: () => void; initialOpenScanner?: boolean;
}

const QUEST_TARGET_COORDS: Record<string, { lat: number; lon: number }> = {
  stara_cesma: { lat: 44.538982, lon: 18.67558 }, trg_slobode: { lat: 44.5395175, lon: 18.6749037 }, salt_square: { lat: 44.5382182, lon: 18.6759398 },
  palancinkara: { lat: 44.5383762, lon: 18.6775339 }, slana_banja: { lat: 44.5378167, lon: 18.6875664 },