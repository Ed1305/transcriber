export interface Speaker {
  id: string;
  label: string; // e.g. "Speaker 1", "Speaker 2"
  name: string;  // e.g. "Speaker 1" or custom name like "Speaker 1 (Alex)"
  description?: string;
  color?: string;
  talkTimeSeconds?: number;
  wordCount?: number;
  turnCount?: number;
}

export interface TranscriptSegment {
  id: string;
  speakerId: string;
  speakerLabel: string; // e.g. "Speaker 1", "Speaker 2"
  speakerName: string;
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
}

export interface TranscriptionData {
  title: string;
  languageDetected: string;
  summary: string;
  speakers: Speaker[];
  segments: TranscriptSegment[];
  speakerTransitionsCount?: number;
  keyTopics?: string[];
  actionItems?: string[];
  duration?: number;
}

export interface SavedTranscription {
  id: string;
  createdAt: number;
  fileName: string;
  data: TranscriptionData;
  audioBlobUrl?: string; // transient
}

export type ExportFormat = 'txt-plain' | 'txt-timestamps' | 'srt' | 'vtt' | 'json' | 'markdown';
