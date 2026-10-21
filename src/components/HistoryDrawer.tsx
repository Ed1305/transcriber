import React from 'react';
import { X, History, Trash2, Clock, Users, ArrowRight } from 'lucide-react';
import { SavedTranscription } from '../types/transcription';
import { formatTime } from '../utils/audioUtils';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  savedTranscriptions: SavedTranscription[];
  onSelect: (item: SavedTranscription) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  savedTranscriptions,
  onSelect,
  onDelete,
  onClearAll,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md h-full flex flex-col shadow-2xl border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Transcription History
              </h3>
              <p className="text-xs text-slate-500">
                {savedTranscriptions.length} saved session{savedTranscriptions.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {savedTranscriptions.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <History className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No saved transcriptions yet.</p>
              <p className="text-xs text-slate-500 mt-1">
                Transcribe any audio file to see it saved here.
              </p>
            </div>
          ) : (
            savedTranscriptions.map((item) => (
              <div
                key={item.id}
                className="group p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50/50 dark:bg-slate-800/30 transition-all cursor-pointer relative"
                onClick={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                    {item.data.title || item.fileName}
                  </h4>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item.id);
                    }}
                    title="Delete item"
                    className="p-1 text-slate-400 hover:text-rose-500 opacity-60 group-hover:opacity-100 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                  {item.data.summary}
                </p>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 font-mono">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-indigo-400" />
                    {item.data.speakers?.length || 0} speakers
                  </span>
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-sans flex items-center gap-0.5 font-medium">
                    Open <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {savedTranscriptions.length > 0 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <button
              onClick={onClearAll}
              className="text-xs text-rose-500 hover:text-rose-600 font-medium"
            >
              Clear All History
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
