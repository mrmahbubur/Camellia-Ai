import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Sparkles,
  Zap,
  Check,
  SlidersHorizontal,
  Cpu,
  ShieldCheck,
  Info
} from 'lucide-react';
import { ModelCatalogItem, ModelProvider } from '../types/chat';

interface ModelSelectorProps {
  models: ModelCatalogItem[];
  currentModel: string;
  onSelectModel: (model: string) => void;
  freeOnly: boolean;
  enforceFreeModelsOnly?: boolean;
  onToggleFreeOnly: () => void;
  isAdmin?: boolean;
  onOpenAdminModels?: () => void;
}

function getProviderLabel(provider: ModelProvider): string {
  switch (provider) {
    case 'gemini':
      return 'Gemini';
    case 'anthropic':
      return 'Anthropic';
    case 'openrouter':
      return 'OpenRouter';
    default:
      return provider;
  }
}

function getPricingLabel(tier: ModelCatalogItem['pricingTier']): string {
  if (tier === 'free') return 'Free';
  if (tier === 'paid') return 'Paid';
  return 'Price not verified';
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  currentModel,
  onSelectModel,
  freeOnly,
  enforceFreeModelsOnly = false,
  onToggleFreeOnly,
  isAdmin,
  onOpenAdminModels
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const configuredModels = models.filter((m) => m.providerConfigured);
  const displayModels: ModelCatalogItem[] =
    configuredModels.length > 0
      ? configuredModels
      : [
          {
            id: currentModel || 'gemini-4-hydrogen',
            provider: 'gemini',
            name: currentModel === 'gemini-3.1-flash-lite' ? 'Gemini 3.1 Flash Lite' : 'Gemini 4 Hydrogen',
            tag: 'Default · Grounded',
            description: 'Default adaptive multimodal model.',
            pricingTier: 'free',
            pricingNote: 'Free tier / quota limited',
            capabilities: { streaming: true, searchGrounding: true, thinking: true, multimodal: true },
            isDefault: true,
            providerConfigured: true
          }
        ];

  const activeModel =
    displayModels.find((m) => m.id === currentModel) ||
    displayModels.find((m) => m.isDefault) ||
    displayModels[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (m: ModelCatalogItem) => {
    if (m.provider === 'gemini' && m.capabilities.thinking) return Zap;
    if (m.provider === 'anthropic' || m.provider === 'openrouter') return Cpu;
    return Sparkles;
  };

  const effectiveFreeOnly = enforceFreeModelsOnly || freeOnly;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-200/70 dark:hover:bg-white/8 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60"
      >
        <span className="max-w-[140px] sm:max-w-[210px] truncate">{activeModel.name}</span>
        <span className="hidden md:inline text-xs font-normal text-slate-500 dark:text-slate-400">
          · {getPricingLabel(activeModel.pricingTier)}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 sm:w-96 max-w-[92vw] rounded-2xl bg-white/95 dark:bg-[#0E1522]/95 backdrop-blur-md border border-slate-200 dark:border-white/12 shadow-2xl p-2 z-50 space-y-2">
          {/* Free models only toggle (server-enforced) */}
          <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/70 dark:border-white/8">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate">
                  Free models only
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {enforceFreeModelsOnly ? 'Enforced by administrator' : 'Blocks paid/unverified models'}
                </div>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={effectiveFreeOnly}
              disabled={enforceFreeModelsOnly}
              onClick={onToggleFreeOnly}
              className={`w-10 h-5.5 rounded-full transition-colors p-0.5 shrink-0 ${
                enforceFreeModelsOnly ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
              } ${effectiveFreeOnly ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-700'}`}
              title={enforceFreeModelsOnly ? 'Enforced globally by admin' : 'Toggle free models only'}
            >
              <div
                className={`w-4.5 h-4.5 rounded-full bg-white shadow-xs transition-transform ${
                  effectiveFreeOnly ? 'translate-x-4.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-1 pr-0.5" role="listbox">
            {displayModels.map((m) => {
              const Icon = getIcon(m);
              const isSelected = m.id === activeModel.id;
              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  key={m.id}
                  onClick={() => {
                    onSelectModel(m.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl transition-colors flex items-start gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-teal-500/12 text-slate-950 dark:text-white border border-teal-500/30'
                      : 'hover:bg-slate-100 dark:hover:bg-white/6 text-slate-700 dark:text-slate-300 border border-transparent'
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                      isSelected
                        ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300'
                        : 'bg-slate-200/70 dark:bg-white/8 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs sm:text-sm truncate">{m.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      <span>{getProviderLabel(m.provider)}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          m.pricingTier === 'free'
                            ? 'text-teal-700 dark:text-teal-400 font-medium'
                            : 'text-amber-700 dark:text-amber-300 font-medium'
                        }
                      >
                        {getPricingLabel(m.pricingTier)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                      {m.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Truthful provider & cost disclosure */}
          <div className="px-2.5 py-2 border-t border-slate-200 dark:border-white/10 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2 leading-snug">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-teal-600 dark:text-teal-400" />
            <span>
              Prompts are processed by the selected provider. Paid or unverified models require confirmation and may incur charges to the app owner.
            </span>
          </div>

          {isAdmin && onOpenAdminModels && (
            <div className="pt-1 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenAdminModels();
                }}
                className="w-full px-3 py-2 rounded-xl text-xs font-medium text-teal-700 dark:text-teal-300 hover:bg-teal-500/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Manage Models &amp; Catalogue</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
