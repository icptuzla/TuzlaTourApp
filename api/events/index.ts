import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchPublicVerifiedEvents, saveVerifiedEvents, normalizeImportedEvents, deleteEventById } from '../../utils/eventsDb';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=300, stale-while-revalidate=600');
      const events = await fetchPublicVerifiedEvents();
      return res.status(200).json(events);
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          // ignore
        }
      }

      const rawItems = Array.isArray(body) ? body : (body && typeof body === 'object' ? [body] : []);

      if (rawItems.length === 0) {
        return res.status(400).json({ error: 'No valid event data provided in request body.' });
      }

      const normalizedEvents = normalizeImportedEvents(rawItems);
      if (normalizedEvents.length === 0) {
        return res.status(400).json({ error: 'Failed to parse events.' });
      }

      const stats = await saveVerifiedEvents(normalizedEvents);
      return res.status(200).json({
        success: true,
        message: `Successfully inserted ${normalizedEvents.length} event(s).`,
        count: normalizedEvents.length,
        stats,
        events: normalizedEvents
      });
    }

    if (req.method === 'DELETE') {
      const id = (req.query.id as string) || req.body?.id;
      if (!id) {
        return res.status(400).json({ error: 'Event ID required' });
      }
      await deleteEventById(id);
      return res.status(200).json({ success: true, deletedId: id });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API /api/events error:', error);
    return res.status(500).json({ error: error?.message || 'Server error processing request' });
  }
}

