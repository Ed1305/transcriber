import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Gauge,
  SlidersHorizontal,
} from 'lucide-react';
import { formatTime } from '../utils/audioUtils';

interface AudioPlayerProps {
  audioUrl: string | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  currentTime,
  duration,
  isPlaying,
  onPlayPause,
  onSeek,
  onTimeUpdate,
  onDurationChange,
  audioRef,
}) => {
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const scrubBarRef = useRef<HTMLDivElement>(null);

  // Sync playback rate with audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, audioRef]);

  // Volume change
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
      if (newVol > 0 && isMuted) {
        setIsMuted(false);
        audioRef.current.muted = false;
      }
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      const nextMuted = !isMuted;
      setIsMuted(nextMuted);
      audioRef.current.muted = nextMuted;
    }
  };

  const skipTime = (offset: number) => {
    if (audioRef.current) {
      const newTime = Math.max(0, Math.min(duration || 0, audioRef.current.currentTime + offset));
      audioRef.current.currentTime = newTime;
      onSeek(newTime);
    }
  };

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubBarRef.current || !duration) return;
    const rect = scrubBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = pos * duration;
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
    }
    onSeek(targetTime);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-xl border border-slate-800">
      <audio
        ref={audioRef}
        src={audioUrl || undefined}
        onTimeUpdate={() => {
          if (audioRef.current && !isScrubbing) {
            onTimeUpdate(audioRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current && !isNaN(audioRef.current.duration)) {
            onDurationChange(audioRef.current.duration);
          }
        }}
        onEnded={() => {
          if (isPlaying) onPlayPause();
        }}
      />

      {/* Scrub Bar */}
      <div className="mb-3">
        <div
          ref={scrubBarRef}
          onClick={handleScrub}
          className="group relative h-3 bg-slate-800 hover:h-4 rounded-full cursor-pointer transition-all flex items-center"
        >
          {/* Progress fill */}
          <div
            className="h-full bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full relative"
            style={{ width: `${progressPercent}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md scale-0 group-hover:scale-100 transition-transform" />
          </div>
        </div>

        <div className="flex justify-between items-center text-xs text-slate-400 mt-1 font-mono">
          <span>{formatTime(currentTime)}</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Audio Sync Active</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {/* Main Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Quick skips & Playback rate */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => skipTime(-5)}
            title="Rewind 5s"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Rate selector */}
          <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-xl border border-slate-700/50 text-xs">
            <Gauge className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={playbackRate}
              onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer pr-1"
            >
              <option value="0.75" className="bg-slate-900">0.75x</option>
              <option value="1" className="bg-slate-900">1.0x</option>
              <option value="1.25" className="bg-slate-900">1.25x</option>
              <option value="1.5" className="bg-slate-900">1.5x</option>
              <option value="2" className="bg-slate-900">2.0x</option>
            </select>
          </div>
        </div>

        {/* Center: Play/Pause with Skip Forward */}
        <div className="flex items-center gap-3">
          <button
            onClick={onPlayPause}
            disabled={!audioUrl}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition shadow-lg ${
              !audioUrl
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-linear-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white hover:scale-105 active:scale-95'
            }`}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current translate-x-0.5" />}
          </button>

          <button
            onClick={() => skipTime(5)}
            title="Forward 5s"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Volume control */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-18 md:w-24 accent-indigo-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
          />
        </div>
      </div>
    </div>
  );
};
