import React, { useState } from 'react';
import { Users, Smile, MoreHorizontal, Upload, Sparkles, Download, CheckSquare } from 'lucide-react';

interface RightFloatingControlsProps {
  onOpenSpeakers: () => void;
  onOpenUpload: () => void;
  onOpenExport: () => void;
  onOpenTasks: () => void;
}

export const RightFloatingControls: React.FC<RightFloatingControlsProps> = ({
  onOpenSpeakers,
  onOpenUpload,
  onOpenExport,
  onOpenTasks,
}) => {
  const [showReactions, setShowReactions] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [reactionToast, setReactionToast] = useState<string | null>(null);

  const handleSendReaction = (emoji: string) => {
    setReactionToast(emoji);
    setShowReactions(false);
    setTimeout(() => setReactionToast(null), 2500);
  };

  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2.5 z-30 select-none">
      {/* Toast reaction animation */}
      {reactionToast && (
        <div className="absolute -left-12 top-0 text-3xl animate-bounce pointer-events-none">
          {reactionToast}
        </div>
      )}

      {/* Button 1: Participants */}
      <button
        onClick={onOpenSpeakers}
        title="View Meeting Participants & Diarization"
        className="w-9 h-9 rounded-full bg-white shadow-lg border border-slate-200/90 flex items-center justify-center text-slate-800 hover:scale-105 active:scale-95 transition cursor-pointer"
      >
        <Users className="w-4 h-4" />
      </button>

      {/* Button 2: Reactions */}
      <div className="relative">
        <button
          onClick={() => {
            setShowReactions(!showReactions);
            setShowMoreMenu(false);
          }}
          title="Meeting Reactions"
          className="w-9 h-9 rounded-full bg-white shadow-lg border border-slate-200/90 flex items-center justify-center text-slate-800 hover:scale-105 active:scale-95 transition cursor-pointer"
        >
          <Smile className="w-4 h-4" />
        </button>

        {showReactions && (
          <div className="absolute right-11 top-0 bg-white/95 backdrop-blur-md rounded-2xl p-2 shadow-xl border border-slate-200 flex items-center gap-1.5 animate-in fade-in zoom-in-90">
            {['👏', '❤️', '🎉', '💡', '🔥', '👍'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSendReaction(emoji)}
                className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-lg transition active:scale-90"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Button 3: More Options */}
      <div className="relative">
        <button
          onClick={() => {
            setShowMoreMenu(!showMoreMenu);
            setShowReactions(false);
          }}
          title="More Actions"
          className="w-9 h-9 rounded-full bg-white shadow-lg border border-slate-200/90 flex items-center justify-center text-slate-800 hover:scale-105 active:scale-95 transition cursor-pointer"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        {showMoreMenu && (
          <div className="absolute right-11 -top-16 bg-white/95 backdrop-blur-md rounded-2xl p-1.5 shadow-xl border border-slate-200 w-44 space-y-1 text-xs font-medium text-slate-700 animate-in fade-in zoom-in-90">
            <button
              onClick={() => {
                setShowMoreMenu(false);
                onOpenUpload();
              }}
              className="w-full px-3 py-2 rounded-xl hover:bg-slate-100 flex items-center gap-2 text-left"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-500" />
              Upload Audio
            </button>
            <button
              onClick={() => {
                setShowMoreMenu(false);
                onOpenTasks();
              }}
              className="w-full px-3 py-2 rounded-xl hover:bg-slate-100 flex items-center gap-2 text-left"
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
              Action Items
            </button>
            <button
              onClick={() => {
                setShowMoreMenu(false);
                onOpenExport();
              }}
              className="w-full px-3 py-2 rounded-xl hover:bg-slate-100 flex items-center gap-2 text-left"
            >
              <Download className="w-3.5 h-3.5 text-purple-500" />
              Export Transcript
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
