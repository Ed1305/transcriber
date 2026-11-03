import type { VercelRequest, VercelResponse } from '@vercel/node';
import { askTranscript } from './_lib/engine.js';

export const config = {
  maxDuration: 60,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { transcriptText, question } = req.body || {};
    if (!transcriptText || !question) {
      return res.status(400).json({ error: 'transcriptText and question are required' });
    }
    const answer = await askTranscript(transcriptText, question);
    return res.json({ answer: answer || 'No response generated.' });
  } catch (error: any) {
    console.error('Ask transcript error:', error);
    return res.status(error?.status || 500).json({
      error: error?.message || 'Failed to answer question about transcript.',
    });
  }
}
