import { put, list } from '@vercel/blob';
import postgres from 'postgres';
import { VerifiedEvent } from '../types/events';

const BLOB_PATHNAME = 'verified_events.json';

// In-memory runtime cache for serverless invocation lifecycle
let memoryEventsCache: VerifiedEvent[] = [];

// 1. Vercel Blob Storage Native Storage
async function getEventsFromVercelBlob(): Promise<VerifiedEvent[] | null> {
  try {
    const token = process.env.VERCEL_BLOB_READ_WRITE_TOKEN;
    if (!token) return null;

    const { blobs } = await list({ prefix: BLOB_PATHNAME, token });
    const targetBlob = blobs.find(b => b.pathname === BLOB_PATHNAME);
    if (!targetBlob) return null;

    const res = await fetch(targetBlob.url);
    if (res.ok) {
      const data: VerifiedEvent[] = await res.json();
      return data;
    }
  } catch (err) {
    console.error('Vercel Blob read error:', err);
  }
  return null;
}

async function saveEventsToVercelBlob(events: VerifiedEvent[]): Promise<boolean> {
  try {
    const token = process.env.VERCEL_BLOB_READ_WRITE_TOKEN;
    if (!token) return false;

    await put(BLOB_PATHNAME, JSON.stringify(events, null, 2), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
      token
    });
    return true;
  } catch (err) {
    console.error('Vercel Blob save error:', err);
    return false;
  }
}

// 2. PostgreSQL (Vercel Postgres or Direct Postgres)
const postgresConnStr = process.env.POSTGRES_URL || process.env.DATABASE_URL;
let sqlClient: any = null;

if (postgresConnStr) {
  try {
    sqlClient = postgres(postgresConnStr, { ssl: 'require' });
  } catch (e) {
    // Ignore if not configured
  }
}

export async function fetchPublicVerifiedEvents(): Promise<VerifiedEvent[]> {
  const todayStr = new Date().toISOString().split('T')[0];

  // Strategy A: Vercel Blob
  const blobEvents = await getEventsFromVercelBlob();
  if (blobEvents) {
    memoryEventsCache = blobEvents;
    return blobEvents.filter(e => e.verified && e.start_date >= todayStr);
  }

  // Strategy B: Vercel Postgres
  if (sqlClient) {
    try {
      const rows = await sqlClient`
        SELECT 
          id, title, category, 
          to_char(start_date, 'YYYY-MM-DD') as start_date, 
          start_time, venue_name, city, price, 
          source_urls, verification_sources, verified
        FROM verified_events
        WHERE verified = true
          AND start_date >= ${todayStr}::date
        ORDER BY start_date ASC, start_time ASC;
      `;
      const pgEvents = rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        category: r.category,
        start_date: r.start_date,
        start_time: r.start_time,
        venue_name: r.venue_name,
        city: r.city,
        price: r.price,
        source_urls: r.source_urls || [],
        verification_sources: r.verification_sources || [],
        verified: r.verified
      }));
      memoryEventsCache = pgEvents;
      return pgEvents;
    } catch (err) {
      console.error('Postgres fetch error:', err);
    }
  }

  // Strategy C: In-Memory Runtime Cache
  return memoryEventsCache.filter(e => e.verified && e.start_date >= todayStr);
}

export function normalizeImportedEvents(rawItems: any[]): VerifiedEvent[] {
  if (!Array.isArray(rawItems)) return [];

  const validCategories = ['Music', 'Culture', 'Movie', 'Theatre', 'Sport', 'Panonnica'];

  return rawItems
    .filter(item => item && typeof item === 'object' && (item.title || item.name))
    .map((item, idx) => {
      const cleanTitle = String(item.title || item.name || '').trim();
      const rawCat = String(item.category || '').trim();
      
      let category: any = 'Culture';
      if (validCategories.includes(rawCat)) {
        category = rawCat;
      } else if (cleanTitle.toLowerCase().includes('jazz') || cleanTitle.toLowerCase().includes('koncert') || cleanTitle.toLowerCase().includes('dj')) {
        category = 'Music';
      } else if (cleanTitle.toLowerCase().includes('film') || cleanTitle.toLowerCase().includes('kino')) {
        category = 'Movie';
      } else if (cleanTitle.toLowerCase().includes('teatar') || cleanTitle.toLowerCase().includes('predstava')) {
        category = 'Theatre';
      }

      let startDate = String(item.start_date || '').trim();
      let startTime = item.start_time ? String(item.start_time).trim() : '20:00';

      if (item.date_time) {
        const parts = String(item.date_time).trim().split(' ');
        if (parts[0]) startDate = parts[0];
        if (parts[1]) startTime = parts[1];
      }

      if (!startDate) {
        startDate = new Date().toISOString().split('T')[0];
      }

      const venueName = item.venue_name || item.location ? String(item.venue_name || item.location).trim() : 'Tuzla';
      const city = item.city ? String(item.city).trim() : 'Tuzla';
      const price = item.price ? String(item.price).trim() : 'Besplatno';

      const sourceUrl = item.link || item.source_url;
      const sourceUrls = Array.isArray(item.source_urls) 
        ? item.source_urls 
        : (sourceUrl ? [sourceUrl] : []);

      const id = item.id || `evt-${startDate}-${cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${idx}`;

      return {
        id,
        title: cleanTitle,
        category,
        start_date: startDate,
        start_time: startTime,
        venue_name: venueName,
        city,
        price,
        source_urls: sourceUrls,
        verification_sources: ['AICrawler Private Import'],
        verified: true,
        updated_at: new Date().toISOString()
      };
    });
}

export async function deleteEventById(id: string): Promise<boolean> {
  memoryEventsCache = memoryEventsCache.filter(e => e.id !== id);
  await saveEventsToVercelBlob(memoryEventsCache);
  if (sqlClient) {
    try {
      await sqlClient`DELETE FROM verified_events WHERE id = ${id};`;
    } catch (e) {
      console.error('Postgres delete error:', e);
    }
  }
  return true;
}

export async function saveVerifiedEvents(newEvents: VerifiedEvent[]): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;

  const mergedMap = new Map<string, VerifiedEvent>();
  
  memoryEventsCache.forEach(e => mergedMap.set(e.id, e));

  for (const evt of newEvents) {
    if (mergedMap.has(evt.id)) {
      updated++;
    } else {
      inserted++;
    }
    mergedMap.set(evt.id, evt);
  }

  const allMergedEvents = Array.from(mergedMap.values());
  memoryEventsCache = allMergedEvents;

  await saveEventsToVercelBlob(allMergedEvents);

  if (sqlClient) {
    try {
      await sqlClient`
        CREATE TABLE IF NOT EXISTS verified_events (
          id VARCHAR(255) PRIMARY KEY,
          title TEXT NOT NULL,
          category VARCHAR(50) NOT NULL,
          start_date DATE NOT NULL,
          start_time VARCHAR(10) NOT NULL,
          venue_name TEXT NOT NULL,
          city VARCHAR(100) NOT NULL DEFAULT 'Tuzla',
          price TEXT,
          source_urls TEXT[] NOT NULL,
          verification_sources TEXT[] NOT NULL,
          verified BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;
      for (const evt of newEvents) {
        await sqlClient`
          INSERT INTO verified_events (
            id, title, category, start_date, start_time, venue_name, city, price, source_urls, verification_sources, verified, updated_at
          ) VALUES (
            ${evt.id}, ${evt.title}, ${evt.category}, ${evt.start_date}::date, ${evt.start_time}, ${evt.venue_name}, ${evt.city}, ${evt.price}, ${evt.source_urls || []}, ${evt.verification_sources || ['Private AICrawler']}, ${evt.verified}, NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            category = EXCLUDED.category,
            start_date = EXCLUDED.start_date,
            start_time = EXCLUDED.start_time,
            venue_name = EXCLUDED.venue_name,
            price = EXCLUDED.price,
            source_urls = EXCLUDED.source_urls,
            verification_sources = EXCLUDED.verification_sources,
            verified = EXCLUDED.verified,
            updated_at = NOW();
        `;
      }
    } catch (err) {
      console.error('Postgres save error:', err);
    }
  }

  return { inserted, updated };
}
