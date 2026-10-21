import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  Mic,
  Link2,
  Check,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Search,
  CheckCircle2,
  MoreHorizontal,
  Play,
  Pause,
  Download,
  X,
  Volume2,
  FileText,
  RotateCcw,
  Sparkles,
  Square,
  AlertCircle,
  Copy,
  ArrowLeft,
  Users,
  Clock,
  Filter,
} from 'lucide-react';
import { TranscriptionData, SavedTranscription, TranscriptSegment } from './types/transcription';
import { SAMPLE_TRANSCRIPTIONS, createSyntheticAudioBlob, formatTime } from './utils/audioUtils';
import { downloadFile, generateExportContent } from './utils/exportUtils';
import { ExportModal } from './components/ExportModal';

const STORAGE_KEY = 'transcriber_history_v2';

export default function App() {
  const defaultSample = SAMPLE_TRANSCRIPTIONS[0]; // 20261020-140215_0745345282_CLFUNCC_IN250508-all.mp3

  // Navigation view: 'upload' | 'recent' | 'transcript'
  const [currentView, setCurrentView] = useState<'upload' | 'recent' | 'transcript'>('upload');

  // File upload state
  const [selectedFile, setSelectedFile] = useState<{ name: string; size?: number; blob?: Blob; url?: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [audioLanguage, setAudioLanguage] = useState('English');
  const [transcriptionMode, setTranscriptionMode] = useState<'cheetah' | 'dolphin' | 'whale'>('whale');
  const [showMoreSettings, setShowMoreSettings] = useState(false);
  const [expectedSpeakers, setExpectedSpeakers] = useState<number | ''>('');
  const [customVocabulary, setCustomVocabulary] = useState('');

  // Transcription active state
  const [activeTranscription, setActiveTranscription] = useState<TranscriptionData>(defaultSample.data);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeStep, setTranscribeStep] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Audio player state
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(defaultSample.duration || 35);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Modals & Display
  const [showMicModal, setShowMicModal] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [transcriptDisplayMode, setTranscriptDisplayMode] = useState<'inline' | 'diarized'>('inline');
  const [searchFilter, setSearchFilter] = useState('');
  const [speakerFilter, setSpeakerFilter] = useState<string>('all');
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Microphone recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const micChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // Saved History
  const [recentFiles, setRecentFiles] = useState<SavedTranscription[]>([
    {
      id: 'item_default',
      createdAt: Date.now() - 3600000,
      fileName: '20261020-140215 0745345282 CLFUNCC IN250508-all.mp3',
      data: defaultSample.data,
    },
  ]);

  // Initialize synthetic audio for seamless synchronized playback
  useEffect(() => {
    const dummyBlob = createSyntheticAudioBlob(defaultSample.duration || 35);
    const url = URL.createObjectURL(dummyBlob);
    setAudioUrl(url);

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecentFiles(parsed);
        }
      }
    } catch (e) {
      console.warn(e);
    }

    return () => {
      URL.revokeObjectURL(url);
    };
  }, []);

  // Sync playback
  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSeek = (seconds: number) => {
    setCurrentTime(seconds);
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      if (!isPlaying) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileSelected(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    setSelectedFile({
      name: file.name,
      size: file.size,
      blob: file,
    });
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setErrorMessage(null);
  };

  // Microphone recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) micChunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const mime = mr.mimeType || 'audio/webm';
        const blob = new Blob(micChunksRef.current, { type: mime });
        const name = `Recording_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.webm`;
        setSelectedFile({ name, size: blob.size, blob });
        setAudioUrl(URL.createObjectURL(blob));
        setShowMicModal(false);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Microphone access denied or not available.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  // URL import
  const handleImportUrl = () => {
    if (!importUrl.trim()) return;
    try {
      new URL(importUrl);
      const fileName = importUrl.split('/').pop()?.split('?')[0] || 'imported-media-file.mp3';
      setSelectedFile({
        name: fileName,
        url: importUrl,
      });
      setAudioUrl(importUrl);
      setShowUrlModal(false);
      setImportUrl('');
      setErrorMessage(null);
    } catch {
      setErrorMessage('Please enter a valid media URL.');
    }
  };

  // Helper to read file/blob as base64 data string
  const readBlobAsBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file as base64 string'));
        }
      };
      reader.onerror = () => reject(new Error('Failed reading file data.'));
      reader.readAsDataURL(blob);
    });
  };

  // Start transcription process
  const handleStartTranscribe = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select or drop an audio or video file first.');
      return;
    }

    setIsTranscribing(true);
    setErrorMessage(null);
    setTranscribeStep('Reading audio file...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    // Dynamic progress ticker to show active status so it never feels stuck
    const progressStages = [
      'Reading media stream...',
      'Uploading to Gemini AI speech engine...',
      'Analyzing vocal timbres & speaker turns...',
      'Generating diarized segments & timestamps...',
      'Finalizing executive summary & action items...',
    ];
    let stageIdx = 0;
    const progressInterval = setInterval(() => {
      stageIdx = (stageIdx + 1) % progressStages.length;
      setTranscribeStep(progressStages[stageIdx]);
    }, 2800);

    try {
      let data: TranscriptionData;

      if (selectedFile.blob && selectedFile.blob.size > 0 && selectedFile.name !== defaultSample.name) {
        // Real upload to Gemini endpoint
        const base64Data = await readBlobAsBase64(selectedFile.blob);

        const res = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: base64Data,
            mimeType: selectedFile.blob.type || 'audio/mp3',
            fileName: selectedFile.name,
            language: audioLanguage,
            expectedSpeakers: expectedSpeakers ? Number(expectedSpeakers) : undefined,
            customPrompt: customVocabulary.trim() || undefined,
          }),
          signal: controller.signal,
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) {
          throw new Error(json.error || `Server returned error (${res.status})`);
        }

        data = json.data;
      } else if (selectedFile.url && selectedFile.name !== defaultSample.name) {
        // Direct media URL transcription
        setTranscribeStep('Fetching media from URL...');
        const res = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioUrl: selectedFile.url,
            fileName: selectedFile.name,
            language: audioLanguage,
            expectedSpeakers: expectedSpeakers ? Number(expectedSpeakers) : undefined,
            customPrompt: customVocabulary.trim() || undefined,
          }),
          signal: controller.signal,
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) {
          throw new Error(json.error || `Server returned error (${res.status})`);
        }

        data = json.data;
      } else {
        // Fast-path for demo sample file
        setTranscribeStep('Loading sample transcription...');
        await new Promise((r) => setTimeout(r, 600));
        data = defaultSample.data;
      }

      clearInterval(progressInterval);
      setActiveTranscription(data);
      setDuration(data.duration || 35);
      setCurrentTime(0);

      // Save to recent files
      const newRecord: SavedTranscription = {
        id: `item_${Date.now()}`,
        createdAt: Date.now(),
        fileName: selectedFile.name,
        data,
      };
      const updated = [newRecord, ...recentFiles.filter((r) => r.fileName !== selectedFile.name)];
      setRecentFiles(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      setCurrentView('transcript');
    } catch (err: any) {
      clearInterval(progressInterval);
      console.error(err);
      if (err.name === 'AbortError') {
        setErrorMessage('Transcription timed out after 90 seconds. Please try a shorter audio file or check your network connection.');
      } else {
        setErrorMessage(err.message || 'Error transcribing media. Please try again.');
      }
    } finally {
      clearInterval(progressInterval);
      clearTimeout(timeoutId);
      setIsTranscribing(false);
      setTranscribeStep('');
    }
  };

  // Load a record from recent files
  const handleOpenRecentRecord = (record: SavedTranscription) => {
    setActiveTranscription(record.data);
    setDuration(record.data.duration || 35);
    setCurrentTime(0);
    const dummyBlob = createSyntheticAudioBlob(record.data.duration || 35);
    setAudioUrl(URL.createObjectURL(dummyBlob));
    setCurrentView('transcript');
  };

  const handleCopyTranscript = () => {
    const text = activeTranscription.segments.map((s) => `(${formatTime(s.start)}) ${s.speakerLabel || s.speakerName}: ${s.text}`).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  // Filter segments for search / speaker
  const filteredSegments = activeTranscription.segments.filter((seg) => {
    const matchesSpeaker = speakerFilter === 'all' || seg.speakerId === speakerFilter || seg.speakerLabel === speakerFilter;
    const matchesSearch = !searchFilter.trim() || seg.text.toLowerCase().includes(searchFilter.toLowerCase()) || seg.speakerName.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesSpeaker && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#0878F9] text-slate-900 font-sans flex flex-col items-center justify-start py-6 px-4 select-none">
      {/* Hidden audio element for synchronized playback */}
      <audio
        ref={audioRef}
        src={audioUrl || undefined}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Top Banner Tagline */}
      <p className="text-white/90 text-xs text-center max-w-xl mb-4 px-2 font-normal leading-normal tracking-wide">
        Transcribe audio and video instantly with AI speaker diarization and timestamps. Supports 98+ languages. Export to SRT, VTT, PDF, DOCX, or TXT.
      </p>

      {/* Top Navigation Tabs */}
      <div className="flex items-center gap-1.5 mb-5 bg-white/10 backdrop-blur-md p-1 rounded-lg text-white text-xs font-medium">
        <button
          onClick={() => setCurrentView('upload')}
          className={`px-3 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
            currentView === 'upload' ? 'bg-white text-[#0878F9] shadow-xs font-semibold' : 'hover:bg-white/20'
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Transcribe Files</span>
        </button>

        <button
          onClick={() => setCurrentView('recent')}
          className={`px-3 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
            currentView === 'recent' ? 'bg-white text-[#0878F9] shadow-xs font-semibold' : 'hover:bg-white/20'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Recent Files ({recentFiles.length})</span>
        </button>

        {activeTranscription && (
          <button
            onClick={() => setCurrentView('transcript')}
            className={`px-3 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
              currentView === 'transcript' ? 'bg-white text-[#0878F9] shadow-xs font-semibold' : 'hover:bg-white/20'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Transcript View</span>
          </button>
        )}
      </div>

      {/* ============================================================== */}
      {/* VIEW 1: TRANSCRIBE FILES (Refined compact, balanced scale)      */}
      {/* ============================================================== */}
      {currentView === 'upload' && (
        <div className="w-full max-w-[560px] bg-white rounded-lg shadow-xl p-5 sm:p-7 animate-in fade-in duration-150">
          {/* Page Header: Cloud Icon + "Transcribe Files" */}
          <div className="flex items-center justify-center gap-2.5 mb-5">
            <UploadCloud className="w-6 h-6 text-[#292929] stroke-[2.2]" />
            <h1 className="text-xl sm:text-[22px] font-bold text-[#292929] tracking-tight">
              Transcribe Files
            </h1>
          </div>

          {/* Upload Section Header: "Audio / Video File" + Mic & Link icons */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm sm:text-base font-semibold text-[#292929]">
              Audio / Video File
            </span>
            <div className="flex items-center gap-3 text-[#292929]">
              <button
                type="button"
                onClick={() => setShowMicModal(true)}
                title="Record from Microphone"
                className="hover:text-[#0878F9] transition p-1 cursor-pointer"
              >
                <Mic className="w-4 h-4 stroke-[1.8]" />
              </button>
              <button
                type="button"
                onClick={() => setShowUrlModal(true)}
                title="Import via Media URL"
                className="hover:text-[#0878F9] transition p-1 cursor-pointer"
              >
                <Link2 className="w-4 h-4 stroke-[1.8]" />
              </button>
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.mp4,.m4a,.mov,.aac,.wav,.ogg,.opus,.mpeg,.wma,.wmv,audio/*,video/*"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {/* Drag & Drop Upload Dropzone Box (Proportionate, compact height ~200px) */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full min-h-[190px] sm:h-[200px] bg-[#EEEEEE] border rounded-[6px] flex flex-col items-center justify-center text-center cursor-pointer transition-all select-none relative overflow-hidden ${
              isDragging
                ? 'border-[#0878F9] bg-[#e4efff]'
                : 'border-[#d0d0d0] hover:border-[#a8a8a8]'
            }`}
          >
            {!selectedFile ? (
              /* State A: Empty Dropzone */
              <div className="px-4 py-3 flex flex-col items-center">
                {/* Main instruction: "Drag & Drop" */}
                <h2 className="text-[#292929] text-base sm:text-lg font-medium mb-1.5">
                  Drag & Drop
                </h2>

                {/* Supported formats: across two lines */}
                <p className="text-[#666666] text-xs sm:text-[13px] font-normal leading-snug max-w-sm mb-2.5">
                  MP3, MP4, M4A, MOV, AAC, WAV, OGG,
                  <br />
                  OPUS, MPEG, WMA, WMV
                </p>

                {/* Separator: "— OR —" */}
                <p className="text-[#777777] text-xs font-normal mb-2.5 tracking-wider">
                  — OR —
                </p>

                {/* Browse button: "BROWSE FILES" (~140px x 40px) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="w-[140px] h-[38px] sm:h-[40px] bg-[#E0E0E0] hover:bg-[#D5D5D5] text-[#292929] rounded-[5px] text-xs sm:text-[13px] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition flex items-center justify-center cursor-pointer tracking-wider"
                >
                  BROWSE FILES
                </button>
              </div>
            ) : (
              /* State B: File Selected */
              <div className="px-4 py-4 flex flex-col items-center text-center">
                <p className="text-[#292929] text-xs sm:text-sm font-medium max-w-md truncate mb-2.5">
                  {selectedFile.name}
                </p>
                <div className="w-6 h-6 rounded-full bg-[#0878F9] text-white flex items-center justify-center shadow-xs">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <p className="text-[11px] text-[#666666] mt-2.5 underline hover:text-[#0878F9]">
                  Click or drag to choose a different file
                </p>
              </div>
            )}
          </div>

          {/* Quick Demo Sample Selector Button */}
          {!selectedFile && (
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  const dummyBlob = createSyntheticAudioBlob(defaultSample.duration || 35);
                  setSelectedFile({
                    name: '20261020-140215_0745345282_CLFUNCC_IN250508-all.mp3',
                    size: dummyBlob.size,
                    blob: dummyBlob,
                  });
                  setAudioUrl(URL.createObjectURL(dummyBlob));
                  setErrorMessage(null);
                }}
                className="text-[11px] text-[#0878F9] hover:underline flex items-center gap-1 font-medium cursor-pointer"
              >
                <span>⚡ Use demo multi-speaker audio file</span>
              </button>
            </div>
          )}

          {/* Configuration Options Section */}
          <div className="mt-4 space-y-4">
            {/* Audio Language */}
            <div>
              <label className="block text-xs font-medium text-[#292929] mb-1">
                Audio Language
              </label>
              <div className="relative">
                <select
                  value={audioLanguage}
                  onChange={(e) => setAudioLanguage(e.target.value)}
                  className="w-full h-[38px] bg-white border border-[#d0d0d0] rounded-md px-3 text-xs sm:text-sm text-[#292929] focus:outline-none focus:border-[#0878F9] appearance-none cursor-pointer"
                >
                  <option value="English">English 🇺🇸</option>
                  <option value="Spanish">Spanish (Español) 🇪🇸</option>
                  <option value="French">French (Français) 🇫🇷</option>
                  <option value="German">German (Deutsch) 🇩🇪</option>
                  <option value="Italian">Italian (Italiano) 🇮🇹</option>
                  <option value="Portuguese">Portuguese (Português) 🇵🇹</option>
                  <option value="Japanese">Japanese (日本語) 🇯🇵</option>
                  <option value="Chinese">Chinese (中文) 🇨🇳</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Transcription Mode (3 cards: Cheetah, Dolphin, Whale) */}
            <div>
              <label className="block text-xs font-medium text-[#292929] mb-1">
                Transcription Mode
              </label>
              <div className="grid grid-cols-3 rounded-md overflow-hidden border border-[#d0d0d0]">
                {/* 1. Cheetah */}
                <button
                  type="button"
                  onClick={() => setTranscriptionMode('cheetah')}
                  className={`py-2 px-1 flex flex-col items-center justify-center transition cursor-pointer border-r border-[#d0d0d0] ${
                    transcriptionMode === 'cheetah'
                      ? 'bg-[#0878F9] text-white font-semibold'
                      : 'bg-[#eeeeee] hover:bg-[#e4e4e4] text-[#292929]'
                  }`}
                >
                  <span className="text-lg mb-0.5">🐆</span>
                  <span className="text-xs font-semibold">Cheetah</span>
                  <span
                    className={`text-[10px] font-normal flex items-center gap-0.5 mt-0.5 ${
                      transcriptionMode === 'cheetah' ? 'text-white/90' : 'text-[#666666]'
                    }`}
                  >
                    ⚡ Fastest
                  </span>
                </button>

                {/* 2. Dolphin */}
                <button
                  type="button"
                  onClick={() => setTranscriptionMode('dolphin')}
                  className={`py-2 px-1 flex flex-col items-center justify-center transition cursor-pointer border-r border-[#d0d0d0] ${
                    transcriptionMode === 'dolphin'
                      ? 'bg-[#0878F9] text-white font-semibold'
                      : 'bg-[#eeeeee] hover:bg-[#e4e4e4] text-[#292929]'
                  }`}
                >
                  <span className="text-lg mb-0.5">🐬</span>
                  <span className="text-xs font-semibold">Dolphin</span>
                  <span
                    className={`text-[10px] font-normal flex items-center gap-0.5 mt-0.5 ${
                      transcriptionMode === 'dolphin' ? 'text-white/90' : 'text-[#666666]'
                    }`}
                  >
                    ✔ Balanced
                  </span>
                </button>

                {/* 3. Whale */}
                <button
                  type="button"
                  onClick={() => setTranscriptionMode('whale')}
                  className={`py-2 px-1 flex flex-col items-center justify-center transition cursor-pointer ${
                    transcriptionMode === 'whale'
                      ? 'bg-[#0878F9] text-white font-semibold'
                      : 'bg-[#eeeeee] hover:bg-[#e4e4e4] text-[#292929]'
                  }`}
                >
                  <span className="text-lg mb-0.5">🐳</span>
                  <span className="text-xs font-semibold">Whale</span>
                  <span
                    className={`text-[10px] font-normal flex items-center gap-0.5 mt-0.5 ${
                      transcriptionMode === 'whale' ? 'text-white/90' : 'text-[#666666]'
                    }`}
                  >
                    ★ Accurate
                  </span>
                </button>
              </div>
            </div>

            {/* Speaker Recognition & Diarization Settings Collapsible */}
            <div className="pt-0.5">
              <button
                type="button"
                onClick={() => setShowMoreSettings(!showMoreSettings)}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-normal text-[#292929] hover:text-[#0878F9] transition py-1 cursor-pointer"
              >
                <span>👥</span>
                <span>Speaker Diarization & Settings</span>
                {showMoreSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showMoreSettings && (
                <div className="mt-2 p-3 bg-[#f9f9f9] border border-[#e5e5e5] rounded-lg space-y-2.5 text-xs animate-in fade-in duration-100">
                  <div>
                    <label className="block text-[#292929] font-medium mb-1">
                      Expected Number of Speakers
                    </label>
                    <select
                      value={expectedSpeakers}
                      onChange={(e) => setExpectedSpeakers(e.target.value ? Number(e.target.value) : '')}
                      className="w-full bg-white border border-[#d0d0d0] rounded p-2 text-xs text-[#292929] focus:outline-none"
                    >
                      <option value="">Auto Detect (Default Diarization)</option>
                      <option value="1">1 Speaker (Monologue / Presentation)</option>
                      <option value="2">2 Speakers (Interview / Phone Call)</option>
                      <option value="3">3 Speakers</option>
                      <option value="4">4+ Speakers (Panel / Group Meeting)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#292929] font-medium mb-1">
                      Custom Vocabulary or Speaker Names
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Speakers: Tiffany Coates, Mikayla."
                      value={customVocabulary}
                      onChange={(e) => setCustomVocabulary(e.target.value)}
                      className="w-full bg-white border border-[#d0d0d0] rounded p-2 text-xs text-[#292929] focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Prominent Full-Width "TRANSCRIBE" Button */}
            <button
              type="button"
              onClick={handleStartTranscribe}
              disabled={isTranscribing}
              className="w-full h-[42px] bg-[#0878F9] hover:bg-[#076ee4] text-white text-xs sm:text-sm font-bold tracking-wider rounded-md shadow transition cursor-pointer flex items-center justify-center gap-2 uppercase active:scale-[0.99] disabled:opacity-60"
            >
              {isTranscribing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>{transcribeStep || 'TRANSCRIBING...'}</span>
                </>
              ) : (
                <span>TRANSCRIBE</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW 2: RECENT FILES (Compact scale)                          */}
      {/* ============================================================== */}
      {currentView === 'recent' && (
        <div className="w-full max-w-[700px] bg-white rounded-lg shadow-xl p-5 sm:p-6 animate-in fade-in duration-150">
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#f0f0f0]">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-[#292929]" />
              <h2 className="text-lg sm:text-xl font-bold text-[#292929] tracking-tight">
                Recent Files
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowMicModal(true)}
                title="Record"
                className="text-slate-500 hover:text-black cursor-pointer p-1"
              >
                <Mic className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentView('upload')}
                className="h-[34px] px-3.5 bg-[#0878F9] hover:bg-[#076ee4] text-white text-xs font-semibold rounded-md shadow-xs flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Transcribe Files</span>
              </button>
            </div>
          </div>

          {/* Files Table */}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[#666666] font-semibold text-[11px] border-b border-[#eeeeee]">
                  <th className="py-2.5 px-2.5 w-8">
                    <input type="checkbox" className="rounded text-[#0878F9]" />
                  </th>
                  <th className="py-2.5 px-2.5 font-semibold">Name</th>
                  <th className="py-2.5 px-2.5 font-semibold">Uploaded</th>
                  <th className="py-2.5 px-2.5 font-semibold">Duration</th>
                  <th className="py-2.5 px-2.5 font-semibold">Speakers</th>
                  <th className="py-2.5 px-2.5 font-semibold">Mode</th>
                  <th className="py-2.5 px-2.5 font-semibold">Status</th>
                  <th className="py-2.5 px-2.5 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eeeeee]">
                {recentFiles.map((file) => (
                  <tr
                    key={file.id}
                    onClick={() => handleOpenRecentRecord(file)}
                    className="hover:bg-slate-50 cursor-pointer transition text-[#292929]"
                  >
                    <td className="py-2.5 px-2.5" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="rounded text-[#0878F9]" />
                    </td>
                    <td className="py-2.5 px-2.5 font-medium text-slate-900 max-w-[200px] truncate">
                      {file.fileName}
                    </td>
                    <td className="py-2.5 px-2.5 text-[#666666]">
                      {new Date(file.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      }) + ', 13:06'}
                    </td>
                    <td className="py-2.5 px-2.5 text-[#666666]">
                      {file.data.duration ? `${Math.round(file.data.duration)}s` : '35s'}
                    </td>
                    <td className="py-2.5 px-2.5 text-[#666666]">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-50 text-[#0878F9] text-[10px] font-medium">
                        <Users className="w-2.5 h-2.5" />
                        {file.data.speakers?.length || 2} spk
                      </span>
                    </td>
                    <td className="py-2.5 px-2.5 text-base">
                      🐳
                    </td>
                    <td className="py-2.5 px-2.5">
                      <div className="w-4 h-4 rounded-full bg-[#10b981] text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    </td>
                    <td className="py-2.5 px-2.5 text-slate-400" onClick={(e) => e.stopPropagation()}>
                      <button className="p-1 hover:text-black">
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW 3: TRANSCRIPTION VIEW (Compact scale)                     */}
      {/* ============================================================== */}
      {currentView === 'transcript' && activeTranscription && (
        <div className="w-full max-w-[700px] bg-white rounded-lg shadow-xl p-5 sm:p-6 animate-in fade-in duration-150">
          {/* Top Header Controls: Back + View switcher + Export */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-[#f0f0f0]">
            <button
              onClick={() => setCurrentView('recent')}
              className="text-xs font-semibold text-[#0878F9] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Recent Files</span>
            </button>

            <div className="flex items-center gap-2">
              {/* Display view toggle: Document vs Diarized */}
              <div className="flex items-center bg-[#f0f0f0] p-0.5 rounded-md text-[11px] font-medium">
                <button
                  onClick={() => setTranscriptDisplayMode('inline')}
                  className={`px-2.5 py-1 rounded transition cursor-pointer ${
                    transcriptDisplayMode === 'inline' ? 'bg-white text-[#0878F9] shadow-2xs font-semibold' : 'text-[#666666]'
                  }`}
                >
                  Document View
                </button>
                <button
                  onClick={() => setTranscriptDisplayMode('diarized')}
                  className={`px-2.5 py-1 rounded transition cursor-pointer flex items-center gap-1 ${
                    transcriptDisplayMode === 'diarized' ? 'bg-white text-[#0878F9] shadow-2xs font-semibold' : 'text-[#666666]'
                  }`}
                >
                  <Users className="w-3 h-3" />
                  <span>Diarized</span>
                </button>
              </div>

              <button
                onClick={handleCopyTranscript}
                title="Copy Transcript Text"
                className="p-1.5 border border-[#d0d0d0] hover:bg-slate-50 text-[#292929] rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1"
              >
                {copiedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copiedSuccess ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={() => setIsExportOpen(true)}
                className="px-3 py-1.5 bg-[#0878F9] hover:bg-[#076ee4] text-white text-xs font-semibold rounded-md shadow-2xs flex items-center gap-1 cursor-pointer tracking-wide"
              >
                <Download className="w-3 h-3" />
                <span>Export</span>
              </button>
            </div>
          </div>

          {/* Title Header */}
          <div className="mb-4">
            <h1 className="text-lg sm:text-xl font-bold text-[#292929] leading-tight mb-1 tracking-tight">
              {activeTranscription.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#666666]">
              <span>21 Oct 2026, 13:06</span>
              <span>•</span>
              <span className="capitalize">{activeTranscription.languageDetected || 'English'}</span>
              <span>•</span>
              <span>{Math.round(duration)} seconds</span>
            </div>
          </div>

          {/* Synchronized Audio Player bar */}
          <div className="bg-[#f4f7fb] p-2.5 sm:p-3 rounded-lg border border-[#d9e5f3] mb-4 flex items-center gap-3">
            <button
              onClick={handlePlayPause}
              className="w-8 h-8 rounded-full bg-[#0878F9] hover:bg-[#076ee4] text-white flex items-center justify-center shrink-0 shadow-xs transition cursor-pointer"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />}
            </button>

            <div className="flex-1 flex flex-col justify-center">
              <input
                type="range"
                min="0"
                max={duration || 35}
                step="0.1"
                value={currentTime}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                className="w-full accent-[#0878F9] cursor-pointer h-1.5 bg-slate-200 rounded-lg"
              />
              <div className="flex justify-between text-[11px] font-mono text-[#666666] mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>

          {/* Diarization Speakers Bar */}
          <div className="mb-4 p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#0878F9]" />
              <span className="font-semibold text-slate-800 text-xs">Speakers ({activeTranscription.speakers?.length || 2}):</span>
              <div className="flex flex-wrap items-center gap-1">
                {activeTranscription.speakers?.map((spk, idx) => (
                  <span
                    key={spk.id || idx}
                    className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[11px] font-medium text-slate-800 shadow-2xs"
                  >
                    <span className="font-bold text-[#0878F9] mr-0.5">{spk.label || `Speaker ${idx + 1}`}</span>
                    {spk.name && spk.name !== spk.label && <span className="text-slate-500 font-normal">({spk.name})</span>}
                  </span>
                ))}
              </div>
            </div>

            {/* Quick search input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-6 pr-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs focus:outline-none focus:border-[#0878F9] w-28 sm:w-36"
              />
              <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Transcript Content: Mode A - Inline Document View */}
          {transcriptDisplayMode === 'inline' && (
            <div className="space-y-3 text-xs sm:text-sm text-[#292929] leading-relaxed">
              {filteredSegments.length === 0 ? (
                <p className="text-slate-400 italic">No matching segments found.</p>
              ) : (
                <div className="space-y-3">
                  {filteredSegments.map((seg) => {
                    const isActive = currentTime >= seg.start && currentTime <= seg.end;
                    return (
                      <span
                        key={seg.id}
                        className={`inline transition-colors rounded px-1 py-0.5 ${
                          isActive ? 'bg-blue-100/90 text-blue-950 font-medium' : ''
                        }`}
                      >
                        <button
                          onClick={() => handleSeek(seg.start)}
                          className="text-[#666666] hover:text-[#0878F9] font-mono mr-1 cursor-pointer font-normal underline decoration-slate-300 text-xs"
                        >
                          ({formatTime(seg.start)})
                        </button>
                        <span>{seg.text} </span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Transcript Content: Mode B - Diarized Speaker View */}
          {transcriptDisplayMode === 'diarized' && (
            <div className="space-y-2.5">
              {filteredSegments.map((seg) => {
                const isActive = currentTime >= seg.start && currentTime <= seg.end;
                return (
                  <div
                    key={seg.id}
                    onClick={() => handleSeek(seg.start)}
                    className={`p-3 rounded-lg border transition cursor-pointer ${
                      isActive
                        ? 'border-[#0878F9] bg-blue-50/50 shadow-2xs'
                        : 'border-[#eaeaea] hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-[#0878F9] text-white font-bold text-[10px]">
                          {seg.speakerLabel || 'Speaker'}
                        </span>
                        {seg.speakerName && seg.speakerName !== seg.speakerLabel && (
                          <span className="font-medium text-slate-700 text-xs">{seg.speakerName}</span>
                        )}
                      </div>
                      <span className="font-mono text-[#666666] text-[11px] flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatTime(seg.start)} – {formatTime(seg.end)}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-[#292929] leading-relaxed">
                      {seg.text}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Microphone Recording Modal */}
      {showMicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl w-full max-w-sm p-5 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Mic className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#292929] mb-1">Record Audio</h3>
            <p className="text-xs text-[#666666] mb-4">
              Record from your microphone to transcribe and diarize automatically.
            </p>

            {isRecording && (
              <p className="text-xl font-mono font-bold text-[#292929] mb-3 animate-pulse">
                {Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:
                {(recordingSeconds % 60).toString().padStart(2, '0')}
              </p>
            )}

            <div className="flex justify-center gap-2">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-md shadow-xs cursor-pointer"
                >
                  Start Recording
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-4 py-2 bg-black hover:bg-slate-800 text-white text-xs font-semibold rounded-md shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  Stop & Use Audio
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  stopRecording();
                  setShowMicModal(false);
                }}
                className="px-3 py-2 text-xs text-[#666666] hover:text-black cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* URL Import Modal */}
      {showUrlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl w-full max-w-sm p-5 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-[#292929] mb-1">Import Media from URL</h3>
            <p className="text-xs text-[#666666] mb-3">
              Enter a direct link to an MP3, MP4, WAV, or WebM media file:
            </p>
            <input
              type="url"
              placeholder="https://example.com/audio-sample.mp3"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              className="w-full h-9 px-3 text-xs border border-[#d0d0d0] rounded-md mb-3 focus:outline-none focus:border-[#0878F9]"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowUrlModal(false)}
                className="px-3 py-1.5 text-xs text-[#666666] hover:text-black cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportUrl}
                className="px-3 py-1.5 bg-[#0878F9] hover:bg-[#076ee4] text-white text-xs font-semibold rounded-md cursor-pointer"
              >
                Import Media
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {activeTranscription && (
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          data={activeTranscription}
        />
      )}
    </div>
  );
}
