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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
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
