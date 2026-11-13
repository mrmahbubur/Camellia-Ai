import React, { useState, useEffect } from 'react';
import { X, Settings, Brain, Globe, Terminal, RotateCcw, Search } from 'lucide-react';
import { UserSettings, DEFAULT_USER_SETTINGS } from '../types/chat';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSaveSettings: (settings: UserSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings
}) => {
  const [formData, setFormData] = useState<UserSettings>({ ...settings });

  useEffect(() => {
    if (isOpen) {
      setFormData({ ...settings });
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    onClose();
  };

  const handleReset = () => {
    setFormData({ ...DEFAULT_USER_SETTINGS, theme: formData.theme });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#18181b] border border-neutral-200 dark:border-[#27272a] shadow-2xl p-5 sm:p-6 space-y-5 text-neutral-900 dark:text-neutral-100 max-h-[92dvh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-[#27272a]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-600 dark:text-teal-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">Assistant Settings</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Configure reasoning depth, web search, and instructions</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-[#27272a] text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Custom System Instruction */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-teal-500" />
              <span>Custom System Instructions</span>
            </label>
            <textarea
              rows={3}
              value={formData.systemInstruction}
              onChange={(e) => setFormData({ ...formData, systemInstruction: e.target.value })}
              placeholder="e.g. Answer concisely with practical examples and clear trade-offs."
              className="w-full bg-neutral-50 dark:bg-[#121214] border border-neutral-300 dark:border-[#2a2a30] rounded-xl p-3 text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-teal-500 leading-relaxed"
            />
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Applied across all conversation turns when set.
            </p>
          </div>

          {/* Reasoning Depth */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-teal-500" />
              <span>Reasoning Depth (Gemini 3.8 Flash)</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-neutral-100 dark:bg-[#121214] border border-neutral-200 dark:border-[#2a2a30]">
              {(['low', 'medium', 'high'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setFormData({ ...formData, thinkingLevel: lvl })}
                  className={`py-2 px-3 rounded-lg text-xs font-medium capitalize transition-all cursor-pointer ${
                    formData.thinkingLevel === lvl
                      ? 'bg-white dark:bg-[#222228] text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                  }`}
                >
                  {lvl === 'low' ? 'Low · Fast' : lvl === 'medium' ? 'Medium · Balanced' : 'High · Deep'}
                </button>
              ))}
            </div>
          </div>

          {/* Live Google Search Grounding Default */}
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-neutral-50 dark:bg-[#121214] border border-neutral-200 dark:border-[#2a2a30]">
            <div className="flex items-start gap-2.5">
              <Search className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Live Google Search Grounding
                </div>
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Retrieve live web facts and verifiable source citations automatically.
                </div>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={formData.webSearchEnabled}
              onClick={() => setFormData({ ...formData, webSearchEnabled: !formData.webSearchEnabled })}
              className={`w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                formData.webSearchEnabled ? 'bg-teal-500' : 'bg-neutral-300 dark:bg-neutral-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                  formData.webSearchEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Reply Language Option */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-teal-500" />
              <span>Reply Language</span>
            </label>
            <select
              value={formData.language}
              onChange={(e) => setFormData({ ...formData, language: e.target.value as UserSettings['language'] })}
              className="w-full bg-neutral-50 dark:bg-[#121214] border border-neutral-300 dark:border-[#2a2a30] rounded-xl px-3 py-2 text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-teal-500"
            >
              <option value="auto">Auto-detect (Match query language)</option>
              <option value="en">English</option>
              <option value="bn">Bengali / বাংলা</option>
            </select>
          </div>

          {/* Buttons Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-neutral-200 dark:border-[#27272a]">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to default</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-[#222226] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-slate-950 transition-colors shadow-xs cursor-pointer"
              >
                Save Settings
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
