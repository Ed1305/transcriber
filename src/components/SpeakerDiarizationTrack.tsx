import React from 'react';
import { Users, Layers, Activity, Clock } from 'lucide-react';
import { Speaker, TranscriptSegment } from '../types/transcription';
import { getSpeakerColor, formatTime } from '../utils/audioUtils';

interface SpeakerDiarizationTrackProps {
  speakers: Speaker[];
  segments: TranscriptSegment[];
  currentTime: number;
  duration: number;
  speakerTransitionsCount?: number;
  onSeek: (seconds: number) => void;
}

export const SpeakerDiarizationTrack: React.FC<SpeakerDiarizationTrackProps> = ({
  speakers,
  segments,
  currentTime,
  duration,
  speakerTransitionsCount,
  onSeek,
}) => {
  if (!duration || duration <= 0 || speakers.length === 0) return null;

  // Find currently speaking speaker
  const currentSegment = segments.find(
    (seg) => currentTime >= seg.start && currentTime <= seg.end
  );
  const activeSpeakerId = currentSegment?.speakerId;

  // Speaker index map for consistent coloring
  const speakerIndexMap = new Map<string, number>();
  speakers.forEach((s, idx) => speakerIndexMap.set(s.id, idx));

  // Transitions count fallback
  const transitions =
    speakerTransitionsCount ??
    segments.reduce((acc, seg, i) => {
      if (i > 0 && seg.speakerId !== segments[i - 1].speakerId) return acc + 1;
      return acc;
    }, 0);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header & Diarization Diagnostics */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-purple-50 dark:bg-purple-950/60 rounded-xl text-purple-600 dark:text-purple-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                Speaker Diarization Timeline
              </h4>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-semibold">
                Acoustic Multi-Track
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Visual voice turn mapping across audio duration. Click any block to jump audio.
            </p>
          </div>
        </div>

        {/* Quick Diarization Metrics */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <Users className="w-3.5 h-3.5 text-indigo-500" />
            <span>{speakers.length} Speakers</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <Activity className="w-3.5 h-3.5 text-pink-500" />
            <span>{transitions} Transitions</span>
          </div>

          {currentSegment && (
            <div className="hidden md:flex px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-semibold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Live: {currentSegment.speakerLabel}</span>
            </div>
          )}
        </div>
      </div>

      {/* Multi-Track Timeline */}
      <div className="relative pt-1 pb-2">
        {/* Playhead line spanning all tracks */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-rose-500 dark:bg-rose-400 z-20 pointer-events-none transition-all duration-75 shadow-sm"
          style={{ left: `${Math.min(100, Math.max(0, (currentTime / duration) * 100))}%` }}
        >
          <div className="w-3 h-3 -ml-[5px] -top-1.5 bg-rose-500 rounded-full shadow-md" />
        </div>

        {/* Tracks per speaker */}
        <div className="space-y-2">
          {speakers.map((speaker) => {
            const speakerIndex = speakerIndexMap.get(speaker.id) ?? 0;
            const color = getSpeakerColor(speakerIndex);
            const isSpeakerActive = activeSpeakerId === speaker.id;
            const speakerSegments = segments.filter((s) => s.speakerId === speaker.id);

            return (
              <div key={speaker.id} className="flex items-center gap-3">
                {/* Speaker Label Header */}
                <div
                  className={`w-28 sm:w-36 shrink-0 flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition ${
                    isSpeakerActive
                      ? `${color.bg} ${color.text} ${color.border} ring-2 ring-indigo-500/30 font-bold`
                      : 'bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${color.dot}`} />
                    <span className="truncate">{speaker.label}</span>
                  </div>
                  {isSpeakerActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  )}
                </div>

                {/* Speaker Lane Bar */}
                <div className="relative flex-1 h-8 bg-slate-100 dark:bg-slate-800/50 rounded-xl overflow-hidden border border-slate-200/60 dark:border-slate-800">
                  {speakerSegments.map((seg) => {
                    const leftPercent = (seg.start / duration) * 100;
                    const widthPercent = Math.max(0.8, ((seg.end - seg.start) / duration) * 100);
                    const isCurrent = currentTime >= seg.start && currentTime <= seg.end;

                    return (
                      <div
                        key={seg.id}
                        onClick={() => onSeek(seg.start)}
                        title={`[${formatTime(seg.start)} - ${formatTime(seg.end)}] ${seg.speakerLabel}: "${seg.text.slice(0, 50)}..."`}
                        className={`absolute top-1 bottom-1 rounded-lg cursor-pointer transition-all flex items-center px-1.5 overflow-hidden text-[10px] font-mono select-none group shadow-2xs ${
                          isCurrent
                            ? 'ring-2 ring-white z-10 brightness-110 scale-y-105'
                            : 'hover:brightness-105 hover:scale-y-105 opacity-90 hover:opacity-100'
                        }`}
                        style={{
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`,
                          backgroundColor: color.accent,
                          color: '#ffffff',
                        }}
                      >
                        <span className="truncate opacity-90 group-hover:opacity-100">
                          {formatTime(seg.start)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Timeline Axis scale */}
        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mt-2 px-1 pl-32 sm:pl-40">
          <span>00:00</span>
          <span>{formatTime(duration * 0.25)}</span>
          <span>{formatTime(duration * 0.5)}</span>
          <span>{formatTime(duration * 0.75)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};
