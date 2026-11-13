import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Sparkles, Zap, Compass, Check } from 'lucide-react';

interface ModelSelectorProps {
  currentModel: string;
  onSelectModel: (model: string) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  currentModel,
  onSelectModel
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const models = [
    {
      id: 'gemini-3.8-flash',
      name: 'Gemini 3.8 Flash',
      tag: 'Default · Grounded',
      desc: 'Adaptive reasoning, multimodal input, and live Google Search grounding.',
      icon: Zap
    },
    {
      id: 'gemini-flash-latest',
      name: 'Gemini Flash Latest',
      tag: 'Balanced',
      desc: 'Versatile Flash model for writing, research, and technical tasks.',
      icon: Compass
    },
    {
      id: 'gemini-3.1-flash-lite',
      name: 'Gemini 3.1 Flash Lite',
      tag: 'Lightweight',
      desc: 'High-efficiency model optimized for lowest latency replies.',
      icon: Sparkles
    }
  ];

  const activeModel = models.find((m) => m.id === currentModel) || models[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-[#1f1f23] text-neutral-800 dark:text-neutral-200 text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60"
      >
        <span>{activeModel.name}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-72 rounded-2xl bg-white dark:bg-[#18181b] border border-neutral-200 dark:border-[#27272a] shadow-xl p-1.5 z-50">
          <div className="space-y-1">
            {models.map((m) => {
              const Icon = m.icon;
              const isSelected = m.id === activeModel.id;
              return (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => {
                    onSelectModel(m.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-neutral-100 dark:bg-[#222226] text-neutral-900 dark:text-white'
                      : 'hover:bg-neutral-50 dark:hover:bg-[#1e1e22] text-neutral-600 dark:text-neutral-300'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400' : 'bg-neutral-200/70 dark:bg-[#28282e] text-neutral-500 dark:text-neutral-400'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs sm:text-sm truncate">{m.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                          {m.tag}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-teal-500" />}
                      </div>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-0.5 leading-relaxed">
                      {m.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
