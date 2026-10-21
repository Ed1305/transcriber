import React, { useState } from 'react';
import { X, CheckSquare, Plus, Check, Copy } from 'lucide-react';

interface TasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionItems: string[];
}

export const TasksModal: React.FC<TasksModalProps> = ({
  isOpen,
  onClose,
  actionItems,
}) => {
  const [tasks, setTasks] = useState<{ text: string; done: boolean }[]>(() =>
    actionItems.map((item) => ({ text: item, done: false }))
  );
  const [newTaskText, setNewTaskText] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const toggleTask = (idx: number) => {
    setTasks((prev) =>
      prev.map((t, i) => (i === idx ? { ...t, done: !t.done } : t))
    );
  };

  const handleAddTask = () => {
    if (!newTaskText.trim()) return;
    setTasks((prev) => [...prev, { text: newTaskText.trim(), done: false }]);
    setNewTaskText('');
  };

  const handleCopy = () => {
    const text = tasks.map((t) => `[${t.done ? 'x' : ' '}] ${t.text}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-black text-white rounded-xl">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Meeting Tasks & Action Items</h3>
              <p className="text-xs text-slate-500">Kick-Off Meeting deliverables</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task list */}
        <div className="p-5 space-y-2.5 max-h-[380px] overflow-y-auto">
          {tasks.map((task, idx) => (
            <div
              key={idx}
              onClick={() => toggleTask(idx)}
              className={`p-3 rounded-2xl border text-xs cursor-pointer flex items-start gap-3 transition ${
                task.done
                  ? 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                  : 'bg-white border-slate-200/90 text-slate-800 hover:border-slate-300'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-md border mt-0.5 flex items-center justify-center transition ${
                  task.done ? 'bg-black border-black text-white' : 'border-slate-300 bg-white'
                }`}
              >
                {task.done && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
              <span className="flex-1 font-medium">{task.text}</span>
            </div>
          ))}

          {/* Add custom task */}
          <div className="flex gap-2 pt-2">
            <input
              type="text"
              placeholder="Add another action item..."
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-black"
            />
            <button
              onClick={handleAddTask}
              disabled={!newTaskText.trim()}
              className="px-3.5 py-2 bg-black text-white rounded-xl text-xs font-semibold disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={handleCopy}
            className="text-xs text-slate-600 hover:text-black flex items-center gap-1.5 font-medium"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy Tasks'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-black text-white text-xs font-semibold rounded-xl"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
