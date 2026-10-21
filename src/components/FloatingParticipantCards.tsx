import React from 'react';
import { Mic } from 'lucide-react';
import { NixtioLogo } from './NixtioIcons';

interface FloatingParticipantCardsProps {
  onKateClick?: () => void;
  onJennyClick?: () => void;
  onNixtioClick?: () => void;
}

export const FloatingParticipantCards: React.FC<FloatingParticipantCardsProps> = ({
  onKateClick,
  onJennyClick,
  onNixtioClick,
}) => {
  return (
    <>
      {/* Upper-Right Tile: Kate Walter */}
      <div
        onClick={onKateClick}
        className="absolute right-4 sm:right-8 top-16 sm:top-20 w-28 sm:w-36 h-20 sm:h-26 rounded-2xl overflow-hidden shadow-2xl border border-white/80 z-20 hover:scale-105 transition-transform cursor-pointer select-none group bg-slate-100"
      >
        <img
          src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80"
          alt="Kate Walter"
          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
        />
        {/* Name & Mic Badge */}
        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] text-white font-medium flex items-center gap-1 shadow-sm">
          <Mic className="w-2.5 h-2.5 text-white/90" />
          <span className="truncate max-w-[80px]">Kate Walter</span>
        </div>
      </div>

      {/* Lower-Left Tile: Jenny Wilson */}
      <div
        onClick={onJennyClick}
        className="absolute left-2 sm:left-4 bottom-22 sm:bottom-28 w-28 sm:w-36 h-20 sm:h-26 rounded-2xl overflow-hidden shadow-2xl border border-white/80 z-20 hover:scale-105 transition-transform cursor-pointer select-none group bg-slate-100"
      >
        <img
          src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=400&q=80"
          alt="Jenny Wilson"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {/* Name & Mic Badge */}
        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] text-white font-medium flex items-center gap-1 shadow-sm">
          <Mic className="w-2.5 h-2.5 text-white/90" />
          <span className="truncate max-w-[80px]">Jenny Wilson</span>
        </div>
      </div>

      {/* Lower-Right Tile: Nixtio AI Presence */}
      <div
        onClick={onNixtioClick}
        className="absolute right-4 sm:right-10 bottom-22 sm:bottom-28 w-28 sm:w-36 h-20 sm:h-26 rounded-2xl overflow-hidden shadow-2xl border border-white/90 z-20 hover:scale-105 transition-transform cursor-pointer select-none bg-gradient-to-tr from-[#93c5fd]/70 via-[#fde68a]/50 to-[#fed7aa]/80 backdrop-blur-md flex items-center justify-center relative"
      >
        {/* Centered circular Nixtio Logo */}
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black text-white flex items-center justify-center shadow-md">
          <NixtioLogo size={36} />
        </div>

        {/* Name & Mic Badge */}
        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] text-white font-medium flex items-center gap-1 shadow-sm">
          <Mic className="w-2.5 h-2.5 text-white/90" />
          <span>Nixtio</span>
        </div>
      </div>
    </>
  );
};
