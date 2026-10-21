import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Mic,
  Square,
  FileAudio,
  Sparkles,
  Settings2,
  AlertCircle,
  PlayCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SAMPLE_TRANSCRIPTIONS, createSyntheticAudioBlob } from '../utils/audioUtils';
import { TranscriptionData } from '../types/transcription';

interface AudioUploaderProps {
  onAudioReady: (params: {
    audioBlob: Blob;
    fileName: string;
    mimeType: string;
    language: string;
    expectedSpeakers?: number;
    customPrompt?: string;
  }) => void;
  onLoadSample: (sampleData: TranscriptionData, audioBlob: Blob) => void;
  isTranscribing: boolean;
}

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  onAudioReady,
  onLoadSample,
  isTranscribing,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'record' | 'samples'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Advanced transcription options
  const [showOptions, setShowOptions] = useState(false);
  const [language, setLanguage] = useState('auto');
  const [expectedSpeakers, setExpectedSpeakers] = useState<number | ''>('');
  const [customPrompt, setCustomPrompt] = useState('');

  // Mic Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micAudioBlob, setMicAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

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
      if (file.type.startsWith('audio/') || file.type.startsWith('video/') || file.name.match(/\.(mp3|wav|m4a|ogg|webm|flac|aac)$/i)) {
        setSelectedFile(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const triggerUploadProcess = () => {
    if (!selectedFile) return;
    onAudioReady({
      audioBlob: selectedFile,
      fileName: selectedFile.name,
      mimeType: selectedFile.type || 'audio/mp3',
      language,
      expectedSpeakers: expectedSpeakers ? Number(expectedSpeakers) : undefined,
      customPrompt: customPrompt.trim() || undefined,
    });
  };

  // Start Mic Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mime = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mime });
        setMicAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250); // chunk every 250ms
      setIsRecording(true);
      setRecordingSeconds(0);
      setMicAudioBlob(null);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      alert('Could not access microphone. Please ensure microphone permissions are granted in your browser.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const triggerMicProcess = () => {
    if (!micAudioBlob) return;
    onAudioReady({
      audioBlob: micAudioBlob,
      fileName: `mic-recording-${Date.now()}.webm`,
      mimeType: micAudioBlob.type || 'audio/webm',
      language,
      expectedSpeakers: expectedSpeakers ? Number(expectedSpeakers) : undefined,
      customPrompt: customPrompt.trim() || undefined,
    });
  };

  const handleSelectSample = (sample: (typeof SAMPLE_TRANSCRIPTIONS)[0]) => {
    const audioBlob = createSyntheticAudioBlob(sample.duration);
    onLoadSample(sample.data, audioBlob);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl transition-all">
      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 pb-3 mb-6 gap-2">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition ${
            activeTab === 'upload'
              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Upload className="w-4 h-4" />
          Upload Audio File
        </button>

        <button
          onClick={() => setActiveTab('record')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition ${
            activeTab === 'record'
              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Mic className="w-4 h-4" />
          Record Microphone
        </button>

        <button
          onClick={() => setActiveTab('samples')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition ${
            activeTab === 'samples'
              ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-500" />
          Try Sample Demos
        </button>
      </div>

      {/* Tab 1: Upload */}
      {activeTab === 'upload' && (
        <div>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 scale-[1.01]'
                : selectedFile
                ? 'border-indigo-400 dark:border-indigo-700 bg-indigo-50/20 dark:bg-indigo-950/10'
                : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-800/20'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/mp4,video/webm,.mp3,.wav,.m4a,.ogg,.webm,.flac,.aac"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="w-16 h-16 mx-auto mb-4 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shadow-inner">
              <FileAudio className="w-8 h-8" />
            </div>

            {selectedFile ? (
              <div className="space-y-1">
                <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-slate-500">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type || 'audio file'}
                </p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 pt-2 font-medium">
                  Click or drag another file to replace
                </p>
              </div>
            ) : (
              <div>
                <p className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Drag and drop your audio or video file here
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Supports MP3, WAV, M4A, WEBM, OGG, FLAC, AAC (up to 100MB)
                </p>
              </div>
            )}
          </div>

          {selectedFile && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={triggerUploadProcess}
                disabled={isTranscribing}
                className="w-full sm:w-auto px-6 py-3 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-xl font-medium shadow-md shadow-indigo-500/20 transition flex items-center justify-center gap-2"
              >
                {isTranscribing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Transcribing with Speaker Diarization...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Transcribe with Speaker Diarization
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Mic Recording */}
      {activeTab === 'record' && (
        <div className="py-6 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div
              className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center transition-all ${
                isRecording
                  ? 'bg-rose-500/20 text-rose-600 animate-pulse ring-8 ring-rose-500/10'
                  : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
              }`}
            >
              <Mic className={`w-10 h-10 ${isRecording ? 'animate-bounce' : ''}`} />
            </div>

            <div>
              <p className="text-2xl font-mono font-bold text-slate-800 dark:text-slate-100">
                {Math.floor(recordingSeconds / 60)
                  .toString()
                  .padStart(2, '0')}
                :
                {(recordingSeconds % 60).toString().padStart(2, '0')}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {isRecording
                  ? 'Recording in progress... Speak clearly into your microphone.'
                  : micAudioBlob
                  ? 'Recording complete! Ready to transcribe.'
                  : 'Click below to start recording high-quality speech.'}
              </p>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  disabled={isTranscribing}
                  className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-medium shadow-lg shadow-rose-600/25 transition flex items-center gap-2"
                >
                  <Mic className="w-4 h-4" />
                  {micAudioBlob ? 'Record Again' : 'Start Recording'}
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl font-medium shadow-lg transition flex items-center gap-2"
                >
                  <Square className="w-4 h-4 fill-current" />
                  Stop Recording
                </button>
              )}

              {micAudioBlob && !isRecording && (
                <button
                  onClick={triggerMicProcess}
                  disabled={isTranscribing}
                  className="px-6 py-3 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-xl font-medium shadow-lg shadow-indigo-600/25 transition flex items-center gap-2"
                >
                  {isTranscribing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Transcribing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Transcribe Recording
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Pre-loaded Demo Samples */}
      {activeTab === 'samples' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            Click any pre-recorded multi-speaker scenario to test timestamps, speaker diarization, audio sync, and AI insights immediately:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {SAMPLE_TRANSCRIPTIONS.map((sample) => (
              <div
                key={sample.id}
                onClick={() => handleSelectSample(sample)}
                className="group border border-slate-200 dark:border-slate-800 hover:border-purple-500 dark:hover:border-purple-500 rounded-2xl p-4 cursor-pointer bg-slate-50/50 dark:bg-slate-800/30 hover:bg-purple-50/30 dark:hover:bg-purple-950/20 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                      {sample.duration}s Audio
                    </span>
                    <PlayCircle className="w-4 h-4 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {sample.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {sample.description}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500">
                  <span>{sample.data.speakers.length} Speakers</span>
                  <span className="text-purple-600 dark:text-purple-400 font-medium">Load Demo &rarr;</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advanced Transcription Customization Accordion */}
      <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-4">
        <button
          onClick={() => setShowOptions(!showOptions)}
          className="flex items-center justify-between w-full text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
        >
          <span className="flex items-center gap-1.5">
            <Settings2 className="w-3.5 h-3.5" />
            Transcription Settings & Speaker Hints
          </span>
          {showOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showOptions && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Audio Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="auto">Auto Detect Language</option>
                <option value="English">English</option>
                <option value="Spanish">Spanish (Español)</option>
                <option value="French">French (Français)</option>
                <option value="German">German (Deutsch)</option>
                <option value="Italian">Italian (Italiano)</option>
                <option value="Portuguese">Portuguese (Português)</option>
                <option value="Dutch">Dutch (Nederlands)</option>
                <option value="Japanese">Japanese (日本語)</option>
                <option value="Chinese">Chinese (中文)</option>
                <option value="Arabic">Arabic (العربية)</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Expected Speakers (Optional Hint)
              </label>
              <select
                value={expectedSpeakers}
                onChange={(e) => setExpectedSpeakers(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Auto Detect Speaker Count</option>
                <option value="1">1 Speaker (Monologue / Presentation)</option>
                <option value="2">2 Speakers (Interview / Dialogue / 1-on-1)</option>
                <option value="3">3 Speakers</option>
                <option value="4">4 Speakers</option>
                <option value="5">5+ Speakers (Panel / Large Meeting)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Speaker Names / Vocabulary Hints
              </label>
              <input
                type="text"
                placeholder="e.g. Speakers are Alice (CEO) and Bob (Lead Architect). Terms: Kubernetes, GraphQL."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
