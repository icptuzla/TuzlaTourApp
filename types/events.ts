export type VerifiedEventCategory =
  | 'Music'
  | 'Culture'
  | 'Theatre'
  | 'Sport'
  | 'Panonnica';

export const ALLOWED_EVENT_CATEGORIES: VerifiedEventCategory[] = [
  'Music',
  'Culture',
  'Theatre',
  'Sport',
  'Panonnica'
];

export interface VerifiedEvent {
  id: string;
  title: string;
  category: VerifiedEventCategory;
  start_date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  venue_name: string;
  city: string; // "Tuzla"
  price: string | null;
  source_urls?: string[];
  verification_sources?: string[];
  verified: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface EventImportInput {
  id?: string;
  title: string;
  category?: VerifiedEventCategory | string;
  start_date: string; // YYYY-MM-DD
  start_time?: string; // HH:mm
  venue_name: string;
  city?: string;
  price?: string | null;
}

