import type { VercelRequest, VercelResponse } from '@vercel/node';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';

// Transcription endpoint — Vercel serverless port of the /api/transcribe route in server.ts
export const config = {
  maxDuration: 300,
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
    const { audioBase64, audioUrl, mimeType, fileName, language, expectedSpeakers, customPrompt } =
      req.body || {};

    if (!audioBase64 && !audioUrl) {
      return res.status(400).json({ error: 'Audio data or audio URL is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured. Please ensure it is set in the environment.',
      });
    }

    let cleanBase64 = '';
    let actualMime = mimeType || 'audio/mp3';

    if (audioUrl && !audioBase64) {
      console.log(`[Transcribe] Fetching media from URL: ${audioUrl}`);
      const fetchRes = await fetch(audioUrl);
      if (!fetchRes.ok) {
        return res.status(400).json({
          error: `Failed to download media from the specified URL (HTTP ${fetchRes.status}). Please check that the URL is public and direct.`,
        });
      }
      const arrayBuffer = await fetchRes.arrayBuffer();
      cleanBase64 = Buffer.from(arrayBuffer).toString('base64');
      const headerMime = fetchRes.headers.get('content-type');
      if (headerMime && headerMime.includes('/')) {
        actualMime = headerMime.split(';')[0].trim();
      }
    } else if (audioBase64) {
      cleanBase64 = audioBase64;
      if (cleanBase64.includes(';base64,')) {
        const parts = cleanBase64.split(';base64,');
        cleanBase64 = parts[1];
        const match = parts[0].match(/:(.*?)$/);
        if (match && match[1]) {
          actualMime = match[1];
        }
      }
    }

    // Infer from file extension if mime is generic or missing
    const ext = fileName ? path.extname(fileName).toLowerCase().replace('.', '') : '';
    if (ext === 'mp3' || ext === 'mpeg') actualMime = 'audio/mp3';
    else if (ext === 'wav') actualMime = 'audio/wav';
    else if (ext === 'm4a') actualMime = 'audio/mp4';
    else if (ext === 'mp4') actualMime = 'video/mp4';
    else if (ext === 'mov') actualMime = 'video/quicktime';
    else if (ext === 'ogg' || ext === 'opus') actualMime = 'audio/ogg';
    else if (ext === 'aac') actualMime = 'audio/aac';
    else if (ext === 'webm') actualMime = 'audio/webm';

    // Normalize audio mime types for Gemini
    if (actualMime === 'audio/m4a' || actualMime === 'audio/x-m4a') actualMime = 'audio/mp4';
    if (actualMime === 'audio/x-wav' || actualMime === 'audio/wave') actualMime = 'audio/wav';
    if (actualMime === 'audio/mpeg') actualMime = 'audio/mp3';

    console.log(
      `[Transcribe] Processing: ${fileName || 'unnamed'}, mime: ${actualMime}, size: ${Math.round(
        (cleanBase64.length * 0.75) / 1024
      )} KB`
    );

    const audioPart = {
      inlineData: {
        mimeType: actualMime,
        data: cleanBase64,
      },
    };

    const promptInstructions = `You are a state-of-the-art speech transcription and speaker diarization engine.
Carefully listen to this audio recording (${fileName ? `filename: ${fileName}` : ''}) and transcribe it verbatim with exact speaker diarization and accurate timestamps.

CRITICAL SPEAKER DIARIZATION INSTRUCTIONS:
1. Analyze Acoustic Characteristics & Turn-Taking:
   - Carefully discern differences in vocal timbre, pitch, resonance, speaking speed, and pause transitions.
   - Assign UNIQUE labels to each distinct speaker throughout the audio: "Speaker 1", "Speaker 2", "Speaker 3", etc.
   - Maintain strict speaker consistency: if the person who spoke at 0:05 speaks again at 1:20, they must retain the EXACT SAME speaker label (e.g. "Speaker 1").
   - If a speaker's personal name is explicitly spoken or introduced in the dialogue, include it alongside their label (e.g. "Speaker 1 (Sarah Jenkins)" or set name to "Sarah Jenkins" with label "Speaker 1"). Otherwise, name them "Speaker 1", "Speaker 2", etc.
   - ALWAYS split into a new segment whenever there is a speaker turn/transition or meaningful pause. Never merge two speakers' dialogue into one segment.
   ${expectedSpeakers ? `- Hint: Expecting approximately ${expectedSpeakers} distinct speaker(s).` : ''}

2. Timestamps:
   - For every segment, provide 'start' and 'end' time in seconds (float numbers, e.g. 0.0, 3.4, 7.8).
   - Ensure timestamps flow chronologically and accurately mirror when the speech occurs.

3. Verbatim Precision:
   - Transcribe every spoken word accurately.
   - Fix stutters gracefully while preserving meaningful fillers or pauses.
   ${language && language !== 'auto' ? `- Expected audio language: ${language}.` : '- Automatically detect the primary language.'}
   ${customPrompt ? `- Additional context: ${customPrompt}` : ''}

4. Executive Summary & Takeaways:
   - Descriptive title.
   - Summary of discussion (3-5 sentences).
   - Key topics and action items.
`;

    const transcriptionSchema = {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: 'Descriptive title of the audio conversation or speech',
        },
        languageDetected: {
          type: Type.STRING,
          description: 'Detected language name (e.g. English, Spanish, etc.)',
        },
        summary: {
          type: Type.STRING,
          description: 'A comprehensive summary of the audio contents and discussion',
        },
        speakers: {
          type: Type.ARRAY,
          description: 'List of detected distinct speakers with unique labels',
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "Unique speaker ID like 'speaker_1', 'speaker_2'" },
              label: { type: Type.STRING, description: "Unique speaker label like 'Speaker 1', 'Speaker 2'" },
              name: { type: Type.STRING, description: "Speaker display name like 'Speaker 1' or 'Speaker 1 (Name)'" },
              description: { type: Type.STRING, description: 'Voice characteristics or role (e.g. Deep voice, higher pitch, Host, Guest)' },
            },
            required: ['id', 'label', 'name'],
          },
        },
        segments: {
          type: Type.ARRAY,
          description: 'Sequential time-coded speech segments with unique speaker attribution',
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: 'Unique segment id, e.g. seg_1' },
              speakerId: { type: Type.STRING, description: 'Matching speaker id from speakers list' },
              speakerLabel: { type: Type.STRING, description: "Unique speaker label, e.g. 'Speaker 1', 'Speaker 2'" },
              speakerName: { type: Type.STRING, description: 'Speaker display name' },
              start: { type: Type.NUMBER, description: 'Start time in seconds (e.g. 0.0)' },
              end: { type: Type.NUMBER, description: 'End time in seconds (e.g. 3.5)' },
              text: { type: Type.STRING, description: 'Verbatim transcribed speech for this turn' },
            },
            required: ['id', 'speakerId', 'speakerLabel', 'speakerName', 'start', 'end', 'text'],
          },
        },
        keyTopics: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Key themes or topics covered in the conversation',
        },
        actionItems: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Action items, assigned tasks, or next steps mentioned',
        },
      },
      required: ['title', 'languageDetected', 'summary', 'speakers', 'segments'],
    };

    // Use gemini-3.8-flash for robust multimodal understanding and JSON schema output
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [audioPart, { text: promptInstructions }],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: transcriptionSchema,
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Received empty response from Gemini model');
    }

    let cleanJson = responseText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsedData = JSON.parse(cleanJson);
    console.log(
      `[Transcribe] Successfully parsed transcription with ${parsedData.speakers?.length || 0} speakers and ${
        parsedData.segments?.length || 0
      } segments.`
    );

    // Normalize speakers and segments
    const speakersList: any[] = Array.isArray(parsedData.speakers) ? parsedData.speakers : [];

    // Ensure every speaker has clean id and label
    const normalizedSpeakers = speakersList.map((sp: any, idx: number) => {
      const fallbackNum = idx + 1;
      const label = sp.label || `Speaker ${fallbackNum}`;
      const id = sp.id || `speaker_${fallbackNum}`;
      const name = sp.name || label;
      return {
        id,
        label,
        name,
        description: sp.description || 'Distinct conversational speaker',
        talkTimeSeconds: 0,
        turnCount: 0,
        wordCount: 0,
      };
    });

    // If no speakers detected, default to Speaker 1
    if (normalizedSpeakers.length === 0) {
      normalizedSpeakers.push({
        id: 'speaker_1',
        label: 'Speaker 1',
        name: 'Speaker 1',
        description: 'Primary speaker',
        talkTimeSeconds: 0,
        turnCount: 0,
        wordCount: 0,
      });
    }

    // Map for fast speaker lookup
    const speakerMap = new Map<string, any>();
    normalizedSpeakers.forEach((sp) => {
      speakerMap.set(sp.id, sp);
      speakerMap.set(sp.label, sp);
      speakerMap.set(sp.name, sp);
    });

    let speakerTransitionsCount = 0;
    let lastSpeakerId = '';

    const normalizedSegments = (Array.isArray(parsedData.segments) ? parsedData.segments : []).map(
      (seg: any, idx: number) => {
        let matchedSpeaker =
          speakerMap.get(seg.speakerId) ||
          speakerMap.get(seg.speakerLabel) ||
          speakerMap.get(seg.speakerName) ||
          normalizedSpeakers[0];

        const speakerId = matchedSpeaker.id;
        const speakerLabel = matchedSpeaker.label;
        const speakerName = seg.speakerName || matchedSpeaker.name;

        if (lastSpeakerId && lastSpeakerId !== speakerId) {
          speakerTransitionsCount++;
        }
        lastSpeakerId = speakerId;

        const start = typeof seg.start === 'number' ? Math.max(0, seg.start) : 0;
        const end = typeof seg.end === 'number' ? Math.max(start, seg.end) : start + 2;

        return {
          id: seg.id || `seg_${idx + 1}`,
          speakerId,
          speakerLabel,
          speakerName,
          start,
          end,
          text: (seg.text || '').trim(),
        };
      }
    );

    // Compute talk-time & statistics for each speaker
    normalizedSpeakers.forEach((sp) => {
      const mySegs = normalizedSegments.filter((s: any) => s.speakerId === sp.id);
      const totalSec = mySegs.reduce((acc: number, s: any) => acc + (s.end - s.start), 0);
      const words = mySegs.reduce(
        (acc: number, s: any) => acc + s.text.trim().split(/\s+/).filter(Boolean).length,
        0
      );
      sp.talkTimeSeconds = Math.round(totalSec * 10) / 10;
      sp.turnCount = mySegs.length;
      sp.wordCount = words;
    });

    const finalResult = {
      title: parsedData.title || 'Audio Transcription',
      languageDetected: parsedData.languageDetected || 'English',
      summary: parsedData.summary || '',
      speakers: normalizedSpeakers,
      segments: normalizedSegments,
      speakerTransitionsCount,
      keyTopics: parsedData.keyTopics || [],
      actionItems: parsedData.actionItems || [],
      duration:
        normalizedSegments.length > 0 ? normalizedSegments[normalizedSegments.length - 1].end : 0,
    };

    return res.json({
      success: true,
      data: finalResult,
    });
  } catch (error: any) {
    console.error('Transcription error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to transcribe audio. Please try again.',
      details: error?.toString(),
    });
  }
}
