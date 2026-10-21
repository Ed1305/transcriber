import React, { useState } from 'react';
import {
  FileText,
  CheckSquare,
  Sparkles,
  Send,
  Tag,
  Bot,
  User,
  ListTodo,
  Copy,
  Check,
} from 'lucide-react';
import { TranscriptionData } from '../types/transcription';

interface InsightsPanelProps {
  data: TranscriptionData;
}

export const InsightsPanel: React.FC<InsightsPanelProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'qa'>('summary');
  const [checkedActions, setCheckedActions] = useState<Record<number, boolean>>({});
  const [question, setQuestion] = useState('');
  const [chatMessages, setChatMessages] = useState<
    { role: 'user' | 'assistant'; text: string; time: string }[]
  >([]);
  const [isAsking, setIsAsking] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  const toggleAction = (idx: number) => {
    setCheckedActions((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(data.summary);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const askAssistant = async (queryText?: string) => {
    const q = queryText || question;
    if (!q.trim() || isAsking) return;

    const userMsg = {
      role: 'user' as const,
      text: q,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setQuestion('');
    setIsAsking(true);

    // Build raw text of transcript for prompt
    const fullTranscriptText = data.segments
      .map((s) => `[${s.start.toFixed(1)}s - ${s.end.toFixed(1)}s] ${s.speakerName}: ${s.text}`)
      .join('\n');

    try {
      const res = await fetch('/api/ask-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcriptText: fullTranscriptText,
          question: q,
        }),
      });

      const result = await res.json();
      if (result.answer) {
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: result.answer,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else {
        throw new Error(result.error || 'No answer received');
      }
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `⚠️ Error: ${err.message || 'Could not answer query.'}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col h-full">
      {/* Panel Nav */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 pb-3 mb-4 gap-2">
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeTab === 'summary'
              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Summary & Actions
        </button>

        <button
          onClick={() => setActiveTab('qa')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeTab === 'qa'
              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-500" />
          Ask Transcript AI
        </button>
      </div>

      {/* Tab: Summary */}
      {activeTab === 'summary' && (
        <div className="space-y-4 overflow-y-auto pr-1">
          {/* Executive Summary */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Executive Summary
              </span>
              <button
                onClick={handleCopySummary}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1"
              >
                {copiedSummary ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                {copiedSummary ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {data.summary || 'Summary generated automatically from audio transcription.'}
            </p>
          </div>

          {/* Key Topics */}
          {data.keyTopics && data.keyTopics.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                <Tag className="w-3.5 h-3.5" />
                Key Discussion Topics
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.keyTopics.map((topic, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                  >
                    #{topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Items */}
          {data.actionItems && data.actionItems.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                <ListTodo className="w-3.5 h-3.5 text-emerald-500" />
                Action Items & Decisions ({data.actionItems.length})
              </div>
              <div className="space-y-1.5">
                {data.actionItems.map((item, idx) => {
                  const isChecked = !!checkedActions[idx];
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleAction(idx)}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                        isChecked
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 text-slate-400 dark:text-slate-500 line-through'
                          : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="mt-0.5">
                        <CheckSquare
                          className={`w-3.5 h-3.5 ${
                            isChecked ? 'text-emerald-500' : 'text-slate-400'
                          }`}
                        />
                      </div>
                      <span className="flex-1">{item}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Ask Assistant */}
      {activeTab === 'qa' && (
        <div className="flex flex-col flex-1 min-h-[300px]">
          {/* Quick Prompts */}
          {chatMessages.length === 0 && (
            <div className="mb-3 space-y-2">
              <p className="text-xs text-slate-500">Suggested queries:</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'What were the key decisions made?',
                  'Summarize each speaker’s main points',
                  'Draft a follow-up email to attendees',
                  'Were there any deadlines or dates stated?',
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => askAssistant(prompt)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-600 dark:text-slate-300 transition text-left"
                  >
                    ✨ {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1 text-xs">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`p-3 rounded-2xl max-w-[85%] whitespace-pre-line leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'
                  }`}
                >
                  {msg.text}
                  <div
                    className={`text-[9px] mt-1 ${
                      msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'
                    }`}
                  >
                    {msg.time}
                  </div>
                </div>
              </div>
            ))}

            {isAsking && (
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <Bot className="w-4 h-4 text-purple-500 animate-spin" />
                <span>Analyzing audio transcript with Gemini...</span>
              </div>
            )}
          </div>

          {/* Question Input */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ask anything about this conversation..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') askAssistant();
              }}
              className="flex-1 py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={() => askAssistant()}
              disabled={!question.trim() || isAsking}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
