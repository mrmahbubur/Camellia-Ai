import React, { useState } from 'react';
import { X, Settings, Sliders, Globe, Terminal, RotateCcw } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#18181b] border border-neutral-200 dark:border-[#27272a] shadow-2xl p-5 sm:p-6 space-y-6 text-neutral-900 dark:text-neutral-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-[#27272a]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-500">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">Chatbot Settings</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Configure model behavior and preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-[#27272a] text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Custom System Instruction */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-teal-500" />
              <span>Custom System Instructions</span>
            </label>
            <textarea
              rows={3}
              value={formData.systemInstruction}
              onChange={(e) => setFormData({ ...formData, systemInstruction: e.target.value })}
              placeholder="e.g. You are a senior software architect. Explain concepts with high precision and concise code."
              className="w-full bg-neutral-50 dark:bg-[#121214] border border-neutral-300 dark:border-[#2a2a30] rounded-xl p-3 text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-teal-500 leading-relaxed"
            />
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Injected into the system prompt for all new conversation turns.
            </p>
          </div>

          {/* Temperature Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-teal-500" />
                <span>Temperature (Creativity)</span>
              </label>
              <span className="text-xs font-mono font-bold text-teal-500">
                {formData.temperature.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={formData.temperature}
              onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
              className="w-full accent-teal-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10.5px] text-neutral-400 font-mono">
              <span>0.0 (Precise / Factual)</span>
              <span>0.7 (Balanced)</span>
              <span>1.0 (Creative)</span>
            </div>
          </div>

          {/* Reply Language Option */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-teal-500" />
              <span>Reply Language</span>
            </label>
            <select
              value={formData.language}
              onChange={(e) => setFormData({ ...formData, language: e.target.value as any })}
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
