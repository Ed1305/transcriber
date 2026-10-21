import React, { useState } from 'react';
import { Users, Edit3, Check, X, Clock, MessageSquare, Plus, UserPlus } from 'lucide-react';
import { Speaker, TranscriptSegment } from '../types/transcription';
import { getSpeakerColor, formatTime } from '../utils/audioUtils';

interface SpeakerManagerProps {
  speakers: Speaker[];
  segments: TranscriptSegment[];
  onRenameSpeaker: (speakerId: string, newName: string) => void;
  onAddSpeaker?: (name: string, label: string) => void;
}

export const SpeakerManager: React.FC<SpeakerManagerProps> = ({
  speakers,
  segments,
  onRenameSpeaker,
  onAddSpeaker,
}) => {
  const [editingSpeakerId, setEditingSpeakerId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSpeakerName, setNewSpeakerName] = useState('');

  // Calculate talk-time and stats for each speaker
  const totalDuration = segments.reduce((sum, seg) => sum + Math.max(0, seg.end - seg.start), 0);

  const speakerStats = speakers.map((speaker, idx) => {
    const speakerSegments = segments.filter(
      (s) => s.speakerId === speaker.id || s.speakerName === speaker.name || s.speakerLabel === speaker.label
    );
    const speakerDuration = speakerSegments.reduce(
      (sum, s) => sum + Math.max(0, s.end - s.start),
      0
    );
    const wordCount = speakerSegments.reduce(
      (sum, s) => sum + s.text.trim().split(/\s+/).filter(Boolean).length,
      0
    );
    const percent = totalDuration > 0 ? (speakerDuration / totalDuration) * 100 : 0;

    return {
      ...speaker,
      colorData: getSpeakerColor(idx),
      turnCount: speakerSegments.length,
      duration: speakerDuration,
      wordCount,
      percent: Math.round(percent),
    };
  });

  const startEditing = (speaker: Speaker) => {
    setEditingSpeakerId(speaker.id);
    setNewName(speaker.name);
  };

  const saveRename = (speakerId: string) => {
    if (newName.trim()) {
      onRenameSpeaker(speakerId, newName.trim());
    }
    setEditingSpeakerId(null);
  };

  const handleCreateSpeaker = () => {
    if (!newSpeakerName.trim() || !onAddSpeaker) return;
    const nextNum = speakers.length + 1;
    const nextLabel = `Speaker ${nextNum}`;
    onAddSpeaker(newSpeakerName.trim(), nextLabel);
    setNewSpeakerName('');
    setShowAddModal(false);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-600 dark:text-indigo-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
              Speaker Diarization ({speakers.length} Identified)
            </h4>
            <p className="text-xs text-slate-500">
              Unique speaker labels, acoustic profiles & talk-time distribution
            </p>
          </div>
        </div>

        {onAddSpeaker && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <UserPlus className="w-3.5 h-3.5 text-indigo-500" />
            <span>Add Speaker</span>
          </button>
        )}
      </div>

      {/* Add Speaker Modal */}
      {showAddModal && (
        <div className="mb-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            Add New Speaker Label (Speaker {speakers.length + 1})
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={`e.g. Speaker ${speakers.length + 1} or Name`}
              value={newSpeakerName}
              onChange={(e) => setNewSpeakerName(e.target.value)}
              className="flex-1 text-xs px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
            <button
              onClick={handleCreateSpeaker}
              disabled={!newSpeakerName.trim()}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-medium disabled:opacity-40"
            >
              Add
            </button>
            <button
              onClick={() => setShowAddModal(false)}
              className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Speaker Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {speakerStats.map((sp) => {
          const isEditing = editingSpeakerId === sp.id;

          return (
            <div
              key={sp.id}
              className={`p-3.5 rounded-2xl border transition-all ${sp.colorData.bg} ${sp.colorData.border}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${sp.colorData.badge}`}
                  >
                    {sp.label.replace('Speaker ', 'S') || sp.name.charAt(0).toUpperCase()}
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-1.5 flex-1">
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full py-1 px-2 text-xs bg-white dark:bg-slate-900 border border-indigo-400 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => saveRename(sp.id)}
                        className="p-1 text-emerald-600 hover:bg-emerald-100/50 rounded-md"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingSpeakerId(null)}
                        className="p-1 text-slate-400 hover:bg-slate-100 rounded-md"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="truncate flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-white/70 dark:bg-slate-900/70 border border-black/5 dark:border-white/10 text-slate-600 dark:text-slate-300 font-bold shrink-0">
                          {sp.label}
                        </span>
                        <span className={`font-semibold text-xs truncate ${sp.colorData.text}`}>
                          {sp.name !== sp.label ? sp.name : ''}
                        </span>
                        <button
                          onClick={() => startEditing(sp)}
                          title="Rename speaker"
                          className="opacity-50 hover:opacity-100 transition p-0.5 text-slate-500 ml-auto"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                      {sp.description && (
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{sp.description}</p>
                      )}
                    </div>
                  )}
                </div>

                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-white/70 dark:bg-slate-900/70 text-slate-700 dark:text-slate-300 shadow-2xs shrink-0">
                  {sp.percent}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${sp.percent}%`,
                    backgroundColor: sp.colorData.accent,
                  }}
                />
              </div>

              {/* Mini Stats */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(sp.duration)}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {sp.turnCount} turns • {sp.wordCount} words
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
