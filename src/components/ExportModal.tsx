import React, { useState } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  FileCode,
  FileText,
  Subtitles,
  FileJson,
} from 'lucide-react';
import { TranscriptionData, ExportFormat } from '../types/transcription';
import { generateExportContent, downloadFile } from '../utils/exportUtils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: TranscriptionData;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('txt-timestamps');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const content = generateExportContent(data, selectedFormat);

  const getExtension = (fmt: ExportFormat) => {
    switch (fmt) {
      case 'txt-plain':
      case 'txt-timestamps':
        return 'txt';
      case 'srt':
        return 'srt';
      case 'vtt':
        return 'vtt';
      case 'json':
        return 'json';
      case 'markdown':
        return 'md';
    }
  };

  const getMimeType = (fmt: ExportFormat) => {
    switch (fmt) {
      case 'json':
        return 'application/json';
      case 'srt':
      case 'vtt':
      case 'txt-plain':
      case 'txt-timestamps':
      case 'markdown':
        return 'text/plain';
    }
  };

  const handleDownload = () => {
    const safeTitle = data.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const ext = getExtension(selectedFormat);
    downloadFile(content, `${safeTitle}.${ext}`, getMimeType(selectedFormat));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formats: { id: ExportFormat; label: string; desc: string; icon: any }[] = [
    {
      id: 'txt-timestamps',
      label: 'Timestamped Text (.txt)',
      desc: 'Speakers and timestamps formatted for notes',
      icon: FileText,
    },
    {
      id: 'txt-plain',
      label: 'Plain Transcript (.txt)',
      desc: 'Clean dialogue without timestamps',
      icon: FileText,
    },
    {
      id: 'srt',
      label: 'SubRip Subtitles (.srt)',
      desc: 'Standard video caption format for Premiere, YouTube, VLC',
      icon: Subtitles,
    },
    {
      id: 'vtt',
      label: 'WebVTT Subtitles (.vtt)',
      desc: 'HTML5 web video subtitle track with speaker tags',
      icon: Subtitles,
    },
    {
      id: 'markdown',
      label: 'Markdown Meeting Notes (.md)',
      desc: 'Executive summary, topics, action items & dialogue',
      icon: FileCode,
    },
    {
      id: 'json',
      label: 'Structured Data (.json)',
      desc: 'Raw machine-readable array of segments & speakers',
      icon: FileJson,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Export Transcription
            </h3>
            <p className="text-xs text-slate-500">
              Download subtitles, structured notes, or copy directly
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector */}
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800">
          {formats.map((fmt) => {
            const Icon = fmt.icon;
            const isSelected = selectedFormat === fmt.id;
            return (
              <button
                key={fmt.id}
                onClick={() => setSelectedFormat(fmt.id)}
                className={`p-3 rounded-2xl text-left border transition ${
                  isSelected
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                  <span className="font-semibold text-xs truncate">{fmt.label}</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">
                  {fmt.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* Live Preview */}
        <div className="flex-1 p-5 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Live Output Preview</span>
            <span className="font-mono">{content.length} characters</span>
          </div>

          <pre className="flex-1 overflow-auto p-4 bg-slate-900 text-slate-200 rounded-2xl font-mono text-xs leading-relaxed border border-slate-800">
            {content}
          </pre>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied to Clipboard' : 'Copy Text'}
            </button>

            <button
              onClick={handleDownload}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              Download File
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
