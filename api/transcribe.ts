import type { VercelRequest, VercelResponse } from '@vercel/node';
import { transcribe } from './_lib/engine.js';

// Transcription endpoint. The model fallback chain lives in api/_lib/engine.ts.
export const config = {
  maxDuration: 300,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const data = await transcribe(req.body || {});
    return res.json({ success: true, data });
  } catch (error: any) {
    console.error('Transcription error:', error);
    return res.status(error?.status || 500).json({
      error: error?.message || 'Failed to transcribe audio. Please try again.',
    });
  }
}
