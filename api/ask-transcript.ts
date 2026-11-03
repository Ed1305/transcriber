import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

// Q&A endpoint — Vercel serverless port of the /api/ask-transcript route in server.ts
export const config = {
  maxDuration: 60,
};

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Gemini returns 503 (model overloaded) / 429 (rate limited) fairly often under load.
// Retry with backoff, then fall back to a second model, instead of failing the whole request.
const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-flash-latest';

function isRetryableGeminiError(err: any): boolean {
  const status = err?.status ?? err?.code;
  if (status === 429 || status === 500 || status === 503 || status === 504) return true;
  const msg = String(err?.message || '');
  return /UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overloaded/i.test(msg);
}

async function generateWithRetry(params: any): Promise<any> {
  const models = Array.from(new Set([PRIMARY_MODEL, FALLBACK_MODEL]));
  let lastErr: any;
  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await ai.models.generateContent({ ...params, model });
      } catch (err: any) {
        lastErr = err;
        if (!isRetryableGeminiError(err)) throw err;
        const delay = 2000 * 2 ** attempt + Math.floor(Math.random() * 500);
        console.warn(`[Gemini] ${model} attempt ${attempt + 1} failed (${err?.status || 'error'}), retrying in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  const e: any = new Error(
    'The Gemini AI service is currently overloaded (high demand). Please wait a minute and try again.'
  );
  e.status = 503;
  e.cause = lastErr;
  throw e;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { transcriptText, question } = req.body || {};

    if (!transcriptText || !question) {
      return res.status(400).json({ error: 'transcriptText and question are required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured. Please ensure it is set in the environment.',
      });
    }

    const response = await generateWithRetry({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `You are an intelligent assistant analyzing an audio transcript.
Here is the audio transcript:
"""
${transcriptText}
"""

User Question: ${question}

Provide a direct, helpful, and concise answer based strictly on the transcript. Include quotes or timestamp references if mentioned.`,
            },
          ],
        },
      ],
    });

    return res.json({
      answer: response.text || 'No response generated.',
    });
  } catch (error: any) {
    console.error('Ask transcript error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to answer question about transcript.',
    });
  }
}
