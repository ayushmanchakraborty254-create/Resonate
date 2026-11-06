// Serverless Room State Sync for Resonate Listen Together

interface RoomState {
  host: string;
  track: any;
  isPlaying: boolean;
  position: number;
  updatedAt: number;
}

// In-memory global store preserved during active serverless instances
const roomRegistry = new Map<string, RoomState>();

export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const codeParam = (req.query?.code || req.body?.code || '').toString().trim().toUpperCase();
  if (!codeParam) {
    return res.status(400).json({ error: 'Room code is required' });
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { host, track, isPlaying, position } = body || {};

      const state: RoomState = {
        host: host || 'Host',
        track: track || null,
        isPlaying: Boolean(isPlaying),
        position: Number(position) || 0,
        updatedAt: Date.now(),
      };

      roomRegistry.set(codeParam, state);
      return res.status(200).json({ success: true, state });
    } catch (e: any) {
      return res.status(400).json({ error: e.message || 'Invalid request' });
    }
  }

  if (req.method === 'GET') {
    const state = roomRegistry.get(codeParam);
    if (!state) {
      return res.status(404).json({ error: 'Room not active' });
    }
    return res.status(200).json({ success: true, state });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

