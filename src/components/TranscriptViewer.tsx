import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Play,
  Edit2,
  Check,
  Copy,
  ChevronUp,
  ChevronDown,
  Filter,
  User,
  Radio,
} from 'lucide-react';
import { TranscriptSegment, Speaker } from '../types/transcription';
import { formatTime, getSpeakerColor } from '../utils/audioUtils';

interface TranscriptViewerProps {
  segments: TranscriptSegment[];
  speakers: Speaker[];
  currentTime: number;
  onJumpToTime: (seconds: number) => void;
  onUpdateSegment: (segmentId: string, updatedText: string) => void;
  onReassignSpeaker?: (segmentId: string, newSpeakerId: string) => void;
  onSpeakerClick?: (speakerId: string) => void;
}

export const TranscriptViewer: React.FC<TranscriptViewerProps> = ({
  segments,
  speakers,
  currentTime,
  onJumpToTime,
  onUpdateSegment,
  onReassignSpeaker,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpeakerFilter, setSelectedSpeakerFilter] = useState<string>('all');
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const activeSegmentRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Speaker map for quick color lookup
  const speakerIndexMap = new Map<string, number>();
  speakers.forEach((s, idx) => {
    speakerIndexMap.set(s.id, idx);
    speakerIndexMap.set(s.label, idx);
    speakerIndexMap.set(s.name, idx);
  });

  // Find currently active segment based on audio currentTime
  const activeSegmentIndex = segments.findIndex(
    (seg) => currentTime >= seg.start && currentTime <= seg.end
  );

  // Auto scroll to active segment
  useEffect(() => {
    if (autoScroll && activeSegmentRef.current && containerRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeSegmentIndex, autoScroll]);

  // Filter segments
  const filteredSegments = segments.filter((seg) => {
    const matchesSpeaker =
      selectedSpeakerFilter === 'all' ||
      seg.speakerId === selectedSpeakerFilter ||
      seg.speakerLabel === selectedSpeakerFilter ||
      seg.speakerName === selectedSpeakerFilter;

    const matchesSearch =
      !searchQuery.trim() ||
      seg.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seg.speakerLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seg.speakerName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSpeaker && matchesSearch;
  });

  // Start editing
  const startEditing = (seg: TranscriptSegment) => {
    setEditingSegmentId(seg.id);
    setEditText(seg.text);
  };

  // Save editing
  const saveEditing = (segId: string) => {
    if (editText.trim()) {
      onUpdateSegment(segId, editText.trim());
    }
    setEditingSegmentId(null);
  };

  // Copy segment text
  const handleCopy = (seg: TranscriptSegment) => {
    const textToCopy = `[${formatTime(seg.start)}] ${seg.speakerLabel} (${seg.speakerName}): ${seg.text}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(seg.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Text highlighter for search query
  const renderHighlightedText = (text: string) => {
    if (!searchQuery.trim()) return text;
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-500/40 text-slate-900 dark:text-yellow-100 rounded px-1">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm flex flex-col h-full overflow-hidden">
      {/* Top Header & Search Controls */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Interactive Transcript
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
              {filteredSegments.length} turns
            </span>
          </div>

          {/* Auto scroll toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition ${
              autoScroll
                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                : 'text-slate-500 border-slate-200 dark:border-slate-800 hover:text-slate-800'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${autoScroll ? 'animate-pulse text-indigo-500' : ''}`} />
            Auto-follow playback
          </button>
        </div>

        {/* Search bar & Speaker filter */}
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search words or phrases in transcript..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Speaker Filter Dropdown */}
          <div className="flex items-center gap-1.5 min-w-[190px]">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedSpeakerFilter}
              onChange={(e) => setSelectedSpeakerFilter(e.target.value)}
              className="w-full py-2 px-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">All Speakers ({speakers.length})</option>
              {speakers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} ({s.name})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Segments Stream */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3.5 divide-y divide-slate-100 dark:divide-slate-800/50"
      >
        {filteredSegments.length === 0 ? (
          <div className="py-12 text-center text-slate-400 dark:text-slate-500">
            <p className="text-sm">No transcript segments match your filter.</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 underline"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          filteredSegments.map((segment) => {
            const speakerIndex = speakerIndexMap.get(segment.speakerId) ?? speakerIndexMap.get(segment.speakerLabel) ?? 0;
            const colors = getSpeakerColor(speakerIndex);
            const isActive = currentTime >= segment.start && currentTime <= segment.end;
            const isEditing = editingSegmentId === segment.id;

            return (
              <div
                key={segment.id}
                ref={isActive ? activeSegmentRef : null}
                className={`pt-3.5 first:pt-0 transition-all rounded-2xl p-3 ${
                  isActive
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/40 ring-1 ring-indigo-500/50 shadow-sm'
                    : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                }`}
              >
                {/* Segment Meta: Speaker & Timestamps */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Speaker badge & reassign dropdown */}
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${colors.bg} ${colors.text} border ${colors.border}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                      <span className="font-mono font-bold">{segment.speakerLabel}</span>
                      {segment.speakerName && segment.speakerName !== segment.speakerLabel && (
                        <span className="text-[11px] opacity-80">({segment.speakerName})</span>
                      )}

                      {/* Quick speaker reassign dropdown */}
                      {onReassignSpeaker && speakers.length > 1 && (
                        <select
                          title="Reassign speaker for this turn"
                          value={segment.speakerId}
                          onChange={(e) => onReassignSpeaker(segment.id, e.target.value)}
                          className="ml-1 bg-transparent text-[10px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer focus:outline-none"
                        >
                          {speakers.map((s) => (
                            <option key={s.id} value={s.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                              Switch to {s.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Timestamp button (click to jump) */}
                    <button
                      onClick={() => onJumpToTime(segment.start)}
                      title="Jump audio to this timestamp"
                      className="group flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <Play className="w-2.5 h-2.5 fill-current opacity-60 group-hover:opacity-100" />
                      <span>
                        {formatTime(segment.start)} - {formatTime(segment.end)}
                      </span>
                    </button>
                  </div>

                  {/* Actions: Edit & Copy */}
                  <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                    {isEditing ? (
                      <button
                        onClick={() => saveEditing(segment.id)}
                        title="Save edit"
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => startEditing(segment)}
                        title="Edit text"
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => handleCopy(segment)}
                      title="Copy turn"
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Spoken Text */}
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      className="w-full p-2.5 bg-white dark:bg-slate-900 border border-indigo-400 dark:border-indigo-600 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none ring-2 ring-indigo-500/20"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2 text-xs">
                      <button
                        onClick={() => setEditingSegmentId(null)}
                        className="px-2.5 py-1 text-slate-500 hover:text-slate-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveEditing(segment.id)}
                        className="px-3 py-1 bg-indigo-600 text-white rounded-lg font-medium"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <p
                    onClick={() => onJumpToTime(segment.start)}
                    className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                  >
                    {renderHighlightedText(segment.text)}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
