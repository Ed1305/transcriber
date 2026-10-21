import React, { useRef } from 'react';
import { Volume2, VolumeX, Play, Pause, SkipForward } from 'lucide-react';
import { formatTime } from '../utils/audioUtils';

interface NixtioPlaybackBarProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSeek: (seconds: number) => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

export const NixtioPlaybackBar: React.FC<NixtioPlaybackBarProps> = ({
  currentTime,
  duration,
  isPlaying,
  onPlayPause,
  onSeek,
  audioRef,
}) => {
  const timelineRef = useRef<HTMLDivElement | null>(null);

  const effectiveDuration = duration > 0 ? duration : 1147; // 19:07 fallback
  const progressPercent = Math.min(100, Math.max(0, (currentTime / effectiveDuration) * 100));

  // Handle clicking or scrubbing the timeline
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetSeconds = clickRatio * effectiveDuration;
    if (audioRef.current) {
      audioRef.current.currentTime = targetSeconds;
    }
    onSeek(targetSeconds);
  };

  const handleSkipForward = () => {
    const nextTime = Math.min(effectiveDuration, currentTime + 10);
    if (audioRef.current) {
      audioRef.current.currentTime = nextTime;
    }
    onSeek(nextTime);
  };

  // Generate vertical ticks
  const tickCount = 44;

  return (
    <div className="w-full max-w-[1080px] mx-auto bg-[#181d24] text-white rounded-[24px] px-5 sm:px-6 py-3.5 shadow-2xl flex items-center gap-3 sm:gap-6 border border-slate-800/80 select-none">
      {/* Audio Timeline with vertical tick marks */}
      <div
        ref={timelineRef}
        onClick={handleTimelineClick}
        className="flex-1 relative h-12 flex items-center cursor-pointer group"
      >
        {/* Background Ticks Container */}
        <div className="absolute inset-x-0 h-4 flex items-center justify-between opacity-35 pointer-events-none">
          {Array.from({ length: tickCount }).map((_, i) => (
            <span
              key={i}
              className={`w-[1px] bg-slate-500 rounded-full transition-all ${
                i % 6 === 0 ? 'h-3.5 opacity-80' : 'h-2 opacity-50'
              }`}
            />
          ))}
        </div>

        {/* Small colored markers along the timeline (blue, orange, white) */}
        {/* Marker 1: Blue marker at ~12% */}
        <div
          className="absolute h-1 bg-[#3b82f6] rounded-full pointer-events-none shadow-xs"
          style={{ left: '12%', width: '28px' }}
        />
        {/* Marker 2: White marker at ~22% */}
        <div
          className="absolute h-1 bg-white rounded-full pointer-events-none shadow-xs"
          style={{ left: '22%', width: '32px' }}
        />
        {/* Marker 3: Orange marker at ~52% */}
        <div
          className="absolute h-1 bg-[#f97316] rounded-full pointer-events-none shadow-xs"
          style={{ left: '52%', width: '12px' }}
        />
        {/* Marker 4: Blue marker at ~66% */}
        <div
          className="absolute h-1 bg-[#3b82f6] rounded-full pointer-events-none shadow-xs"
          style={{ left: '66%', width: '30px' }}
        />

        {/* Static Milestone Timestamps along timeline */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none text-[11px] font-mono text-slate-400 font-medium px-2 z-10">
          <span className="w-12 text-left">00:00</span>
          <span className="w-12 text-center -ml-16 hidden sm:inline">01:35</span>
          <span className="w-12 text-center hidden md:inline">08:32</span>
          <span className="w-12 text-center mr-16 hidden sm:inline">14:11</span>
          <span className="w-12 text-right">19:07</span>
        </div>

        {/* Floating Selection Box showing "04:54" with orange line */}
        <div
          className="absolute z-20 pointer-events-none hidden sm:flex items-center gap-2 bg-white text-slate-900 px-3 py-1 rounded-xl shadow-lg border border-slate-200"
          style={{ left: '28%' }}
        >
          <div className="w-10 h-1 bg-[#f97316] rounded-full" />
          <span className="font-mono text-xs font-bold tracking-tight text-slate-900">04:54</span>
        </div>

        {/* Prominent Green Vertical Playhead & Green Timestamp Badge */}
        <div
          className="absolute top-0 bottom-0 z-30 pointer-events-none flex flex-col items-center transition-all duration-75"
          style={{ left: `${progressPercent}%` }}
        >
          {/* Green Timestamp Badge */}
          <div className="bg-[#22c55e] text-slate-950 font-mono font-bold text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full shadow-md whitespace-nowrap -mt-2">
            {formatTime(currentTime)}
          </div>
          {/* Green Vertical Playhead Line */}
          <div className="w-[2px] h-full bg-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
        </div>
      </div>

      {/* Right Controls: Volume, Pause/Play, Skip in dark rounded-square buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Volume Button */}
        <button
          onClick={() => {
            if (audioRef.current) {
              audioRef.current.muted = !audioRef.current.muted;
            }
          }}
          title="Toggle Volume"
          className="w-9 h-9 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
        >
          <Volume2 className="w-4 h-4" />
        </button>

        {/* Play / Pause Button */}
        <button
          onClick={onPlayPause}
          title={isPlaying ? 'Pause' : 'Play'}
          className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition shadow-md cursor-pointer active:scale-95"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current translate-x-0.5" />
          )}
        </button>

        {/* Skip / Next Button */}
        <button
          onClick={handleSkipForward}
          title="Skip Forward 10s"
          className="w-9 h-9 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
        >
          <SkipForward className="w-4 h-4 fill-current" />
        </button>
      </div>
    </div>
  );
};
