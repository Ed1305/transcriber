import React, { useState } from 'react';
import { X, Sparkles, Send, Bot, Tag, Check, Copy } from 'lucide-react';
import { TranscriptionData } from '../types/transcription';

interface AIAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: TranscriptionData;
}

export const AIAnalysisModal: React.FC<AIAnalysisModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'qa'>('summary');
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    { role: 'user' | 'assistant'; text: string }[]
  >([]);

  if (!isOpen) return null;

  const handleCopySummary = () => {
    navigator.clipboard.writeText(data.summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAsk = async (promptQuery?: string) => {
    const q = promptQuery || question;
    if (!q.trim() || isAsking) return;

    const userMessage = { role: 'user' as const, text: q };
    setChatMessages((prev) => [...prev, userMessage]);
    setQuestion('');
    setIsAsking(true);

    const fullText = data.segments
      .map((s) => `[${s.start.toFixed(1)}s] ${s.speakerName}: ${s.text}`)
      .join('\n');

    try {
      const res = await fetch('/api/ask-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcriptText: fullText,
          question: q,
        }),
      });
      const json = await res.json();
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', text: json.answer || 'No response generated.' },
      ]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `Error: ${err.message || 'Could not query transcript.'}` },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-r from-[#3b82f6] to-[#2563eb] text-white rounded-xl shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Nixtio AI Analysis</h3>
              <p className="text-xs text-slate-500">Intelligent insights for {data.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-100 px-5 pt-3 gap-3">
          <button
            onClick={() => setActiveTab('summary')}
            className={`pb-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'summary'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Executive Summary & Topics
          </button>
          <button
            onClick={() => setActiveTab('qa')}
            className={`pb-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'qa'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            Ask Nixtio AI
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {activeTab === 'summary' ? (
            <div className="space-y-4">
              {/* Executive Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Key Discussion Summary
                  </span>
                  <button
                    onClick={handleCopySummary}
                    className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                  {data.summary}
                </p>
              </div>

              {/* Topics */}
              {data.keyTopics && data.keyTopics.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    <Tag className="w-3.5 h-3.5" />
                    Main Topics
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {data.keyTopics.map((topic, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-full text-xs bg-slate-100 text-slate-700 font-medium"
                      >
                        #{topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col h-[320px]">
              {/* Quick suggestions */}
              {chatMessages.length === 0 && (
                <div className="space-y-2 mb-3">
                  <p className="text-xs text-slate-500">Ask about this meeting:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'What is Kate delivering by Wednesday?',
                      'Why are we sticking with the brand guide?',
                      'Draft a recap email for Jenny and Kate',
                    ].map((p, i) => (
                      <button
                        key={i}
                        onClick={() => handleAsk(p)}
                        className="text-[11px] px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 transition text-left"
                      >
                        ✨ {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat list */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-slate-100 text-slate-800 rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isAsking && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Bot className="w-4 h-4 text-blue-500 animate-spin" />
                    <span>Analyzing transcript...</span>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="flex gap-2 pt-3 border-t border-slate-100 mt-2">
                <input
                  type="text"
                  placeholder="Ask any question about the discussion..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleAsk()}
                  disabled={!question.trim() || isAsking}
                  className="p-2 bg-blue-600 text-white rounded-xl disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
