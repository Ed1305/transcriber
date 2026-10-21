import React from 'react';
import { Sparkles } from 'lucide-react';
import { NixtioLogo } from './NixtioIcons';
import { TranscriptSegment, Speaker } from '../types/transcription';
import { formatTime } from '../utils/audioUtils';

interface NixtioTranscriptFeedProps {
  segments: TranscriptSegment[];
  speakers: Speaker[];
  currentTime: number;
  searchQuery: string;
  onSeek: (seconds: number) => void;
  onAnalyzeAI: () => void;
}

export const NixtioTranscriptFeed: React.FC<NixtioTranscriptFeedProps> = ({
  currentTime,
  searchQuery,
  onSeek,
  onAnalyzeAI,
}) => {
  // Highlight search query
  const highlight = (text: string) => {
    if (!searchQuery.trim()) return text;
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 text-slate-900 rounded px-1">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 sm:px-14 pt-3 pb-32 space-y-6 sm:space-y-8 select-text">
      {/* Faded previous sentence partially visible at the top to suggest scrollable feed */}
      <div className="pt-1 opacity-40 hover:opacity-75 transition-opacity">
        <p className="text-slate-400 text-base sm:text-lg font-normal pl-12 sm:pl-14 italic">
          {highlight('with their combined business model concept.')}
        </p>
      </div>

      {/* Turn 1: Jenny Wilson */}
      <div className="flex items-start gap-3.5 sm:gap-4 group">
        {/* Avatar: Jenny Wilson */}
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden shrink-0 ring-2 ring-white shadow-xs">
          <img
            src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=150&q=80"
            alt="Jenny Wilson"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content */}
        <div className="flex-1 pt-0.5">
          <p className="text-slate-500 text-lg sm:text-[22px] font-normal leading-relaxed tracking-tight">
            {highlight('Wait — are we sticking to the current brand guide or making changes?')}
          </p>
        </div>

        {/* Timestamp */}
        <button
          onClick={() => onSeek(251)}
          title="Jump to 00:04:11"
          className="shrink-0 text-slate-400 group-hover:text-slate-700 text-xs sm:text-[13px] font-mono font-medium pt-1 transition cursor-pointer"
        >
          00:04:11
        </button>
      </div>

      {/* Turn 2: Nixtio AI / Lead (Highlighted response) */}
      <div className="flex items-start gap-3.5 sm:gap-4 group">
        {/* Avatar: Circular black brand icon */}
        <div className="shrink-0 pt-0.5">
          <NixtioLogo size={34} />
        </div>

        {/* Content */}
        <div className="flex-1 pt-0.5">
          <p className="text-lg sm:text-[22px] leading-relaxed tracking-tight">
            <span className="font-bold text-[#0f172a]">
              {highlight('For now, let’s stick with the current style. It’ll keep us on schedule. ')}
            </span>

            {/* Analyze with AI gradient pill */}
            <button
              onClick={onAnalyzeAI}
              className="inline-flex items-center gap-1 mx-1.5 px-3 py-0.5 rounded-full bg-linear-to-r from-[#3b82f6] to-[#2563eb] text-white text-xs font-medium shadow-xs hover:scale-105 active:scale-95 transition cursor-pointer select-none align-middle"
            >
              <Sparkles className="w-3 h-3 text-white/90" />
              <span>Analyze with AI</span>
            </button>

            <span className="text-slate-500 font-normal">
              {highlight(' We can always adjust later. I’ll prepare a communication plan and timeline so everyone knows what’s expected.')}
            </span>
          </p>
        </div>

        {/* Timestamp */}
        <button
          onClick={() => onSeek(275)}
          title="Jump to 00:04:35"
          className="shrink-0 text-slate-400 group-hover:text-slate-700 text-xs sm:text-[13px] font-mono font-medium pt-1 transition cursor-pointer"
        >
          00:04:35
        </button>
      </div>

      {/* Turn 3: Kate Walter */}
      <div className="flex items-start gap-3.5 sm:gap-4 group">
        {/* Avatar: Kate Walter */}
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden shrink-0 ring-2 ring-white shadow-xs">
          <img
            src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80"
            alt="Kate Walter"
            className="w-full h-full object-cover object-top"
          />
        </div>

        {/* Content */}
        <div className="flex-1 pt-0.5">
          <p className="text-slate-500 text-lg sm:text-[22px] font-normal leading-relaxed tracking-tight">
            <span>{highlight('Okay, I’ll send a prototype by ')}</span>
            <span className="font-bold text-[#0f172a]">{highlight('Wednesday')}</span>
            <span>{highlight(' then.')}</span>
          </p>
        </div>

        {/* Timestamp */}
        <button
          onClick={() => onSeek(317)}
          title="Jump to 00:05:17"
          className="shrink-0 text-slate-400 group-hover:text-slate-700 text-xs sm:text-[13px] font-mono font-medium pt-1 transition cursor-pointer"
        >
          00:05:17
        </button>
      </div>

      {/* Turn 4: Jenny Wilson */}
      <div className="flex items-start gap-3.5 sm:gap-4 group">
        {/* Avatar: Jenny Wilson */}
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden shrink-0 ring-2 ring-white shadow-xs">
          <img
            src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=150&q=80"
            alt="Jenny Wilson"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content */}
        <div className="flex-1 pt-0.5">
          <p className="text-slate-500 text-lg sm:text-[22px] font-normal leading-relaxed tracking-tight">
            <span>{highlight('Great. Once I see the design, I’ll ')}</span>
            <span className="font-bold text-[#0f172a]">
              {highlight('double-check it against the brand guide and share comments.')}
            </span>
          </p>
        </div>

        {/* Timestamp */}
        <button
          onClick={() => onSeek(349)}
          title="Jump to 00:05:49"
          className="shrink-0 text-slate-400 group-hover:text-slate-700 text-xs sm:text-[13px] font-mono font-medium pt-1 transition cursor-pointer"
        >
          00:05:49
        </button>
      </div>

      {/* Turn 5: Partially faded transcript entry at the bottom, partially obscured by playback controls */}
      <div className="flex items-start gap-3.5 sm:gap-4 opacity-40 hover:opacity-90 transition-opacity">
        <div className="shrink-0 pt-0.5">
          <NixtioLogo size={34} />
        </div>
        <div className="flex-1 pt-0.5">
          <p className="text-slate-400 text-lg sm:text-[22px] font-normal leading-relaxed tracking-tight">
            {highlight("Perfect, then action items are clear: I'll finalize the layout, Olivia will handle the...")}
          </p>
        </div>
        <button
          onClick={() => onSeek(389)}
          className="shrink-0 text-slate-400 text-xs sm:text-[13px] font-mono font-medium pt-1"
        >
          00:06:29
        </button>
      </div>
    </div>
  );
};
