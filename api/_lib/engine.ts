// Shared transcription engine used by both the Vercel functions (api/*.ts) and the
// Express server (server.ts). Files under api/_lib are not exposed as routes by Vercel.
//
// Transcription tries a chain of free models, best first, and moves to the next one
// whenever a model is overloaded, rate-limited, unavailable or otherwise fails:
//
//   1. Gemini models (GEMINI_API_KEY)  - listen to the audio directly, so they give real
//      voice-based speaker diarization plus title/summary/topics in a single call.
//   2. Groq Whisper (GROQ_API_KEY)     - whisper-large-v3 is the most accurate free
//      speech-to-text model. Whisper has no diarization, so a free Groq LLM then labels
//      speakers from the text and writes the title/summary.
//
// Both chains can be overridden with comma-separated env vars: GEMINI_MODELS, GROQ_WHISPER_MODELS,
// GROQ_CHAT_MODELS.

import { GoogleGenAI, Type } from '@google/genai';

const DEFAULT_GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-flash-lite-latest',
  'gemini-2.5-flash-lite',
];
const DEFAULT_GROQ_WHISPER_MODELS = ['whisper-large-v3', 'whisper-large-v3-turbo'];
const DEFAULT_GROQ_CHAT_MODELS = ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b', 'llama-3.1-8b-instant'];

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

function envList(name: string, fallback: string[]): string[] {
  const raw = process.env[name];
  if (!raw) return fallback;
  const list = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return list.length ? list : fallback;
}

let geminiClient: GoogleGenAI | null = null;
function gemini(): GoogleGenAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
  }
  return geminiClient;
}

export class EngineError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

function errStatus(err: any): number | undefined {
  const s = err?.status ?? err?.code;
  return typeof s === 'number' ? s : undefined;
}

function isTransient(err: any): boolean {
  const s = errStatus(err);
  if (s === 429 || s === 500 || s === 502 || s === 503 || s === 504) return true;
  return /UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overloaded|rate limit|ECONNRESET|ETIMEDOUT|fetch failed/i.test(
    String(err?.message || '')
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Total time we allow for the whole chain; Vercel kills functions at 300s. */
const TOTAL_BUDGET_MS = 280_000;
/** Time kept back for the Groq fallback when it is configured. */
const GROQ_RESERVE_MS = 60_000;

type Attempt = { model: string; error: string };

function summarizeAttempts(attempts: Attempt[]): string {
  return attempts.map((a) => `${a.model}: ${a.error}`).join(' | ');
}

function shortError(err: any): string {
  const s = errStatus(err);
  const msg = String(err?.message || err || 'unknown error').replace(/\s+/g, ' ').slice(0, 160);
  return s ? `${s} ${msg}` : msg;
}

function withTimeout(ms: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), Math.max(1000, ms));
  return { signal: controller.signal, clear: () => clearTimeout(id) };
}

// ---------------------------------------------------------------------------
// Input handling
// ---------------------------------------------------------------------------

export interface TranscribeInput {
  audioBase64?: string;
  audioUrl?: string;
  mimeType?: string;
  fileName?: string;
  language?: string;
  expectedSpeakers?: number;
  customPrompt?: string;
}

interface Media {
  base64: string;
  mime: string;
  fileName: string;
}

function extOf(fileName: string): string {
  const i = fileName.lastIndexOf('.');
  return i >= 0 ? fileName.slice(i + 1).toLowerCase() : '';
}

async function loadMedia(input: TranscribeInput): Promise<Media> {
  let base64 = '';
  let mime = input.mimeType || 'audio/mp3';

  if (input.audioUrl && !input.audioBase64) {
    console.log(`[Transcribe] Fetching media from URL: ${input.audioUrl}`);
    const r = await fetch(input.audioUrl);
    if (!r.ok) {
      throw new EngineError(
        `Failed to download media from the specified URL (HTTP ${r.status}). Please check that the URL is public and direct.`,
        400
      );
    }
    base64 = Buffer.from(await r.arrayBuffer()).toString('base64');
    const headerMime = r.headers.get('content-type');
    if (headerMime && headerMime.includes('/')) mime = headerMime.split(';')[0].trim();
  } else if (input.audioBase64) {
    base64 = input.audioBase64;
    if (base64.includes(';base64,')) {
      const [head, data] = base64.split(';base64,');
      base64 = data;
      const m = head.match(/:(.*?)$/);
      if (m && m[1]) mime = m[1];
    }
  } else {
    throw new EngineError('Audio data or audio URL is required', 400);
  }

  const ext = input.fileName ? extOf(input.fileName) : '';
  const byExt: Record<string, string> = {
    mp3: 'audio/mp3', mpeg: 'audio/mp3', wav: 'audio/wav', m4a: 'audio/mp4', mp4: 'video/mp4',
    mov: 'video/quicktime', ogg: 'audio/ogg', opus: 'audio/ogg', aac: 'audio/aac', webm: 'audio/webm',
    flac: 'audio/flac',
  };
  if (byExt[ext]) mime = byExt[ext];
  if (mime === 'audio/m4a' || mime === 'audio/x-m4a') mime = 'audio/mp4';
  if (mime === 'audio/x-wav' || mime === 'audio/wave') mime = 'audio/wav';
  if (mime === 'audio/mpeg') mime = 'audio/mp3';

  return { base64, mime, fileName: input.fileName || `audio.${ext || 'mp3'}` };
}

// ---------------------------------------------------------------------------
// Gemini (audio in -> diarized JSON out)
// ---------------------------------------------------------------------------

function buildGeminiPrompt(input: TranscribeInput, fileName: string): string {
  const { language, expectedSpeakers, customPrompt } = input;
  return `You are a state-of-the-art speech transcription and speaker diarization engine.
Carefully listen to this audio recording (filename: ${fileName}) and transcribe it verbatim with exact speaker diarization and accurate timestamps.

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
}

const transcriptionSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: 'Descriptive title of the audio conversation or speech' },
    languageDetected: { type: Type.STRING, description: 'Detected language name (e.g. English, Spanish, etc.)' },
    summary: { type: Type.STRING, description: 'A comprehensive summary of the audio contents and discussion' },
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
    keyTopics: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Key themes or topics covered in the conversation' },
    actionItems: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Action items, assigned tasks, or next steps mentioned' },
  },
  required: ['title', 'languageDetected', 'summary', 'speakers', 'segments'],
};

function parseJsonText(text: string | undefined): any {
  if (!text) throw new Error('empty response');
  let t = text.trim();
  if (t.startsWith('```')) t = t.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  return JSON.parse(t);
}

async function transcribeWithGemini(model: string, media: Media, input: TranscribeInput, timeoutMs: number) {
  const t = withTimeout(timeoutMs);
  try {
    const response = await gemini().models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: media.mime, data: media.base64 } },
            { text: buildGeminiPrompt(input, media.fileName) },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: transcriptionSchema,
        abortSignal: t.signal,
      },
    });
    const parsed = parseJsonText(response.text);
    if (!Array.isArray(parsed.segments) || parsed.segments.length === 0) {
      throw new Error('model returned no transcript segments');
    }
    return parsed;
  } finally {
    t.clear();
  }
}

// ---------------------------------------------------------------------------
// Groq (Whisper speech-to-text + free LLM for speakers / summary)
// ---------------------------------------------------------------------------

const LANGUAGE_CODES: Record<string, string> = {
  english: 'en', spanish: 'es', french: 'fr', german: 'de', italian: 'it', portuguese: 'pt',
  japanese: 'ja', chinese: 'zh', korean: 'ko', arabic: 'ar', russian: 'ru', hindi: 'hi', dutch: 'nl',
  swahili: 'sw', turkish: 'tr', polish: 'pl',
};

const WHISPER_EXT: Record<string, string> = {
  'audio/mp3': 'mp3', 'audio/wav': 'wav', 'audio/mp4': 'm4a', 'video/mp4': 'mp4', 'audio/ogg': 'ogg',
  'audio/webm': 'webm', 'audio/flac': 'flac', 'audio/aac': 'm4a',
};

async function groqFetch(pathName: string, init: RequestInit, timeoutMs: number): Promise<any> {
  const t = withTimeout(timeoutMs);
  try {
    const r = await fetch(`${GROQ_BASE_URL}${pathName}`, {
      ...init,
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, ...(init.headers || {}) },
      signal: t.signal,
    });
    const body = await r.text();
    if (!r.ok) {
      let msg = body;
      try {
        msg = JSON.parse(body)?.error?.message || body;
      } catch {}
      const e: any = new Error(msg.slice(0, 300));
      e.status = r.status;
      throw e;
    }
    return JSON.parse(body);
  } finally {
    t.clear();
  }
}

async function whisperTranscribe(model: string, media: Media, input: TranscribeInput, timeoutMs: number) {
  const form = new FormData();
  const ext = WHISPER_EXT[media.mime] || extOf(media.fileName) || 'mp3';
  const baseName = media.fileName.replace(/\.[^.]+$/, '') || 'audio';
  form.append('file', new Blob([Buffer.from(media.base64, 'base64')], { type: media.mime }), `${baseName}.${ext}`);
  form.append('model', model);
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'segment');
  const code = input.language ? LANGUAGE_CODES[input.language.toLowerCase()] : undefined;
  if (code) form.append('language', code);
  if (input.customPrompt) form.append('prompt', input.customPrompt.slice(0, 800));

  const json = await groqFetch('/audio/transcriptions', { method: 'POST', body: form }, timeoutMs);
  const segments = (Array.isArray(json.segments) ? json.segments : [])
    .map((s: any) => ({ start: Number(s.start) || 0, end: Number(s.end) || 0, text: String(s.text || '').trim() }))
    .filter((s: any) => s.text);
  if (segments.length === 0 && json.text) {
    segments.push({ start: 0, end: Number(json.duration) || 0, text: String(json.text).trim() });
  }
  if (segments.length === 0) throw new Error('Whisper returned an empty transcript');
  return { segments, language: String(json.language || '') };
}

async function groqChatJson(prompt: string, timeoutMs: number): Promise<any> {
  const attempts: Attempt[] = [];
  for (const model of envList('GROQ_CHAT_MODELS', DEFAULT_GROQ_CHAT_MODELS)) {
    try {
      const json = await groqFetch(
        '/chat/completions',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            temperature: 0.2,
            response_format: { type: 'json_object' },
            messages: [{ role: 'user', content: prompt }],
          }),
        },
        timeoutMs
      );
      return parseJsonText(json?.choices?.[0]?.message?.content);
    } catch (err) {
      attempts.push({ model, error: shortError(err) });
      console.warn(`[Groq chat] ${model} failed: ${shortError(err)}`);
    }
  }
  throw new Error(`all Groq chat models failed: ${summarizeAttempts(attempts)}`);
}

async function analyzeWhisperTranscript(
  segments: { start: number; end: number; text: string }[],
  input: TranscribeInput,
  timeoutMs: number
) {
  // Keep the prompt within free-tier token limits for long recordings.
  const lines: string[] = [];
  let size = 0;
  for (let i = 0; i < segments.length; i++) {
    const line = `${i}: ${segments[i].text}`;
    size += line.length;
    if (size > 60_000) break;
    lines.push(line);
  }

  const prompt = `Below is a transcript split into numbered segments (from a speech-to-text model with no speaker information).
Infer who is speaking in each segment from the content and turn-taking (questions vs answers, introductions, names, topic shifts).
${input.expectedSpeakers ? `There are approximately ${input.expectedSpeakers} speaker(s).` : 'Decide how many speakers there are; use 1 if it is a monologue.'}
${input.customPrompt ? `Context: ${input.customPrompt}` : ''}

Return ONLY a JSON object with this shape:
{
  "title": string,
  "languageDetected": string (language name, e.g. "English"),
  "summary": string (3-5 sentences),
  "keyTopics": string[],
  "actionItems": string[],
  "speakers": [{ "id": "speaker_1", "label": "Speaker 1", "name": "Speaker 1" or a real name if one is clearly stated, "description": string }],
  "segmentSpeakers": string[] (one speaker id per segment, in order, same length as the number of segments)
}

Segments:
${lines.join('\n')}`;

  return groqChatJson(prompt, timeoutMs);
}

async function transcribeWithGroq(model: string, media: Media, input: TranscribeInput, deadline: number) {
  const whisper = await whisperTranscribe(model, media, input, Math.min(150_000, deadline - Date.now()));

  let analysis: any = {};
  try {
    analysis = await analyzeWhisperTranscript(whisper.segments, input, Math.max(5_000, Math.min(60_000, deadline - Date.now())));
  } catch (err) {
    // The transcript itself is the important part; carry on with one speaker if labelling fails.
    console.warn(`[Transcribe] speaker/summary analysis failed, using single speaker: ${shortError(err)}`);
  }

  const speakers = Array.isArray(analysis.speakers) && analysis.speakers.length
    ? analysis.speakers
    : [{ id: 'speaker_1', label: 'Speaker 1', name: 'Speaker 1', description: 'Primary speaker' }];
  const assign: string[] = Array.isArray(analysis.segmentSpeakers) ? analysis.segmentSpeakers : [];
  const defaultId = speakers[0].id || 'speaker_1';

  const languageName = whisper.language
    ? whisper.language.charAt(0).toUpperCase() + whisper.language.slice(1)
    : undefined;

  return {
    title: analysis.title || media.fileName.replace(/\.[^.]+$/, '') || 'Audio Transcription',
    languageDetected: analysis.languageDetected || languageName || input.language || 'English',
    summary: analysis.summary || '',
    keyTopics: analysis.keyTopics || [],
    actionItems: analysis.actionItems || [],
    speakers: speakers.map((sp: any) => ({
      ...sp,
      description: sp.description ? `${sp.description} (speaker inferred from text)` : 'Speaker inferred from text',
    })),
    segments: whisper.segments.map((s: any, i: number) => ({
      id: `seg_${i + 1}`,
      speakerId: assign[i] || defaultId,
      speakerLabel: assign[i] || defaultId,
      speakerName: '',
      start: s.start,
      end: s.end,
      text: s.text,
    })),
  };
}

// ---------------------------------------------------------------------------
// Normalisation (shared by every engine)
// ---------------------------------------------------------------------------

function normalize(parsedData: any, engine: string) {
  const speakersList: any[] = Array.isArray(parsedData.speakers) ? parsedData.speakers : [];
  const normalizedSpeakers = speakersList.map((sp: any, idx: number) => {
    const label = sp.label || `Speaker ${idx + 1}`;
    return {
      id: sp.id || `speaker_${idx + 1}`,
      label,
      name: sp.name || label,
      description: sp.description || 'Distinct conversational speaker',
      talkTimeSeconds: 0,
      turnCount: 0,
      wordCount: 0,
    };
  });
  if (normalizedSpeakers.length === 0) {
    normalizedSpeakers.push({
      id: 'speaker_1', label: 'Speaker 1', name: 'Speaker 1', description: 'Primary speaker',
      talkTimeSeconds: 0, turnCount: 0, wordCount: 0,
    });
  }

  const speakerMap = new Map<string, any>();
  normalizedSpeakers.forEach((sp) => {
    speakerMap.set(sp.id, sp);
    speakerMap.set(sp.label, sp);
    speakerMap.set(sp.name, sp);
  });

  let speakerTransitionsCount = 0;
  let lastSpeakerId = '';
  const segments = (Array.isArray(parsedData.segments) ? parsedData.segments : []).map((seg: any, idx: number) => {
    const sp =
      speakerMap.get(seg.speakerId) || speakerMap.get(seg.speakerLabel) || speakerMap.get(seg.speakerName) ||
      normalizedSpeakers[0];
    if (lastSpeakerId && lastSpeakerId !== sp.id) speakerTransitionsCount++;
    lastSpeakerId = sp.id;
    const start = typeof seg.start === 'number' ? Math.max(0, seg.start) : 0;
    const end = typeof seg.end === 'number' ? Math.max(start, seg.end) : start + 2;
    return {
      id: seg.id || `seg_${idx + 1}`,
      speakerId: sp.id,
      speakerLabel: sp.label,
      speakerName: seg.speakerName || sp.name,
      start,
      end,
      text: String(seg.text || '').trim(),
    };
  });

  normalizedSpeakers.forEach((sp) => {
    const mine = segments.filter((s: any) => s.speakerId === sp.id);
    sp.talkTimeSeconds = Math.round(mine.reduce((a: number, s: any) => a + (s.end - s.start), 0) * 10) / 10;
    sp.turnCount = mine.length;
    sp.wordCount = mine.reduce((a: number, s: any) => a + s.text.split(/\s+/).filter(Boolean).length, 0);
  });

  return {
    title: parsedData.title || 'Audio Transcription',
    languageDetected: parsedData.languageDetected || 'English',
    summary: parsedData.summary || '',
    speakers: normalizedSpeakers,
    segments,
    speakerTransitionsCount,
    keyTopics: parsedData.keyTopics || [],
    actionItems: parsedData.actionItems || [],
    duration: segments.length > 0 ? segments[segments.length - 1].end : 0,
    engine,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function transcribe(input: TranscribeInput) {
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasGroq = !!process.env.GROQ_API_KEY;
  if (!hasGemini && !hasGroq) {
    throw new EngineError('No transcription API key configured. Set GEMINI_API_KEY and/or GROQ_API_KEY.', 500);
  }

  const media = await loadMedia(input);
  console.log(
    `[Transcribe] ${media.fileName}, mime: ${media.mime}, size: ${Math.round((media.base64.length * 0.75) / 1024)} KB`
  );

  const deadline = Date.now() + TOTAL_BUDGET_MS;
  const attempts: Attempt[] = [];

  if (hasGemini) {
    const models = envList('GEMINI_MODELS', DEFAULT_GEMINI_MODELS);
    for (const model of models) {
      const reserve = hasGroq ? GROQ_RESERVE_MS : 0;
      const remaining = deadline - Date.now() - reserve;
      if (remaining < 15_000) break;
      // One quick retry on a transient error, then move on to the next model.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          console.log(`[Transcribe] trying Gemini ${model}${attempt ? ' (retry)' : ''}`);
          const parsed = await transcribeWithGemini(model, media, input, deadline - Date.now() - reserve);
          console.log(`[Transcribe] success with Gemini ${model}`);
          return normalize(parsed, `Gemini · ${model}`);
        } catch (err: any) {
          console.warn(`[Transcribe] Gemini ${model} failed: ${shortError(err)}`);
          if (attempt === 0 && isTransient(err) && errStatus(err) !== 429 && deadline - Date.now() - reserve > 30_000) {
            await sleep(1500);
            continue;
          }
          attempts.push({ model, error: shortError(err) });
          break;
        }
      }
    }
  }

  if (hasGroq) {
    for (const model of envList('GROQ_WHISPER_MODELS', DEFAULT_GROQ_WHISPER_MODELS)) {
      if (deadline - Date.now() < 10_000) break;
      try {
        console.log(`[Transcribe] trying Groq ${model}`);
        const parsed = await transcribeWithGroq(model, media, input, deadline);
        console.log(`[Transcribe] success with Groq ${model}`);
        return normalize(parsed, `Groq · ${model}`);
      } catch (err: any) {
        console.warn(`[Transcribe] Groq ${model} failed: ${shortError(err)}`);
        attempts.push({ model, error: shortError(err) });
      }
    }
  }

  console.error(`[Transcribe] all models failed: ${summarizeAttempts(attempts)}`);
  const allBusy = attempts.length > 0 && attempts.every((a) => /^(429|5\d\d)|high demand|overloaded|UNAVAILABLE|RESOURCE_EXHAUSTED/i.test(a.error));
  throw new EngineError(
    allBusy
      ? 'All free transcription models are busy or rate-limited right now. Please wait a minute and try again.'
      : `Transcription failed on every available model. ${hasGroq ? '' : 'Tip: add a free GROQ_API_KEY for a Whisper fallback. '}Details: ${summarizeAttempts(attempts)}`,
    allBusy ? 503 : 502
  );
}

export async function askTranscript(transcriptText: string, question: string): Promise<string> {
  const prompt = `You are an intelligent assistant analyzing an audio transcript.
Here is the audio transcript:
"""
${transcriptText}
"""

User Question: ${question}

Provide a direct, helpful, and concise answer based strictly on the transcript. Include quotes or timestamp references if mentioned.`;

  const attempts: Attempt[] = [];
  if (process.env.GEMINI_API_KEY) {
    for (const model of envList('GEMINI_MODELS', DEFAULT_GEMINI_MODELS)) {
      const t = withTimeout(60_000);
      try {
        const r = await gemini().models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { abortSignal: t.signal },
        });
        if (r.text) return r.text;
        throw new Error('empty response');
      } catch (err) {
        attempts.push({ model, error: shortError(err) });
      } finally {
        t.clear();
      }
    }
  }
  if (process.env.GROQ_API_KEY) {
    for (const model of envList('GROQ_CHAT_MODELS', DEFAULT_GROQ_CHAT_MODELS)) {
      try {
        const json = await groqFetch(
          '/chat/completions',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] }),
          },
          60_000
        );
        const text = json?.choices?.[0]?.message?.content;
        if (text) return text;
        throw new Error('empty response');
      } catch (err) {
        attempts.push({ model, error: shortError(err) });
      }
    }
  }
  if (attempts.length === 0) {
    throw new EngineError('No AI API key configured. Set GEMINI_API_KEY and/or GROQ_API_KEY.', 500);
  }
  throw new EngineError(`All AI models are busy right now. Please try again shortly. (${summarizeAttempts(attempts)})`, 503);
}
