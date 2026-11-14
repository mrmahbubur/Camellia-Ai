import React, { useRef, useEffect, useState, Suspense, lazy } from 'react';
import {
  PanelLeft,
  Code2,
  Compass,
  Calculator,
  Lightbulb,
  User,
  Settings,
  Moon,
  Sun,
  ArrowDown,
  SlidersHorizontal
} from 'lucide-react';
import { ChatMessage, MessageAttachment, ModelCatalogItem } from '../types/chat';
import { Message } from './Message';
import { Composer } from './Composer';
import { ModelSelector } from './ModelSelector';
import { AuthUser } from './AuthModal';
import { CamelliaLogo } from './CamelliaLogo';

const LazyCamellia3DScene = lazy(() => import('./Camellia3DScene'));

interface ChatWindowProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  onSendMessage: (text: string, attachments: MessageAttachment[]) => void;
  onStopStreaming: () => void;
  onRegenerate: () => void;
  onEditMessage: (id: string, newText: string) => void;
  onRetry: () => void;
  onSelectPrompt: (prompt: string) => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  models: ModelCatalogItem[];
  currentModel: string;
  onSelectModel: (model: string) => void;
  freeOnly: boolean;
  enforceFreeModelsOnly?: boolean;
  onToggleFreeOnly: () => void;
  webSearchEnabled: boolean;
  onToggleWebSearch: () => void;
  language: 'auto' | 'en' | 'bn';
  currentUser: AuthUser | null;
  onOpenAuth: () => void;
  onOpenSettings: () => void;
  onOpenAdminModels?: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  is3DView: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  isStreaming,
  onSendMessage,
  onStopStreaming,
  onRegenerate,
  onEditMessage,
  onRetry,
  onSelectPrompt,
  isSidebarOpen,
  onToggleSidebar,
  models,
  currentModel,
  onSelectModel,
  freeOnly,
  enforceFreeModelsOnly = false,
  onToggleFreeOnly,
  webSearchEnabled,
  onToggleWebSearch,
  language,
  currentUser,
  onOpenAuth,
  onOpenSettings,
  onOpenAdminModels,
  theme,
  onToggleTheme,
  is3DView
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const isNearBottomRef = useRef(true);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom < 120;
    isNearBottomRef.current = nearBottom;
    setShowScrollButton(!nearBottom && messages.length > 0);
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el && isNearBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isStreaming]);

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      isNearBottomRef.current = true;
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const suggestedPrompts = [
    {
      title: 'Explain quantum computing',
      subtitle: 'Clear intuition behind superposition and entanglement',
      icon: Lightbulb,
      prompt: 'Explain quantum computing in clear, accessible terms with a real-world analogy.'
    },
    {
      title: 'Write a Python script',
      subtitle: 'Clean automation code with error handling',
      icon: Code2,
      prompt: 'Write a clean Python script to organize files in a folder by extension with safe logging.'
    },
    {
      title: 'Research latest AI news',
      subtitle: 'Live web-grounded summary with cited sources',
      icon: Compass,
      prompt: 'What are the most notable recent developments in artificial intelligence?'
    },
    {
      title: 'Solve & format math',
      subtitle: 'Step-by-step calculation with LaTeX equations',
      icon: Calculator,
      prompt: 'Derive and explain the quadratic formula step by step using LaTeX math.'
    }
  ];

  return (
    <div
      className={`flex-1 flex flex-col h-full text-slate-900 dark:text-slate-100 min-w-0 relative ${
        is3DView ? 'bg-[#eaf1f7] dark:bg-[#080C14]' : 'camellia-garden-bg'
      }`}
    >
      {/* Dynamic Three.js 3D Room Canvas Behind Chat Interface */}
      {is3DView && (
        <Suspense fallback={null}>
          <LazyCamellia3DScene theme={theme} isStreaming={isStreaming} />
        </Suspense>
      )}

      {/* Top Header Bar */}
      <header
        className={`h-14 border-b border-slate-200 dark:border-white/8 px-3 sm:px-5 flex items-center justify-between gap-2 shrink-0 z-20 ${
          is3DView
            ? 'bg-white/92 dark:bg-[#080C14]/92'
            : 'bg-white/80 dark:bg-[#080C14]/85 backdrop-blur-md'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="min-h-10 min-w-10 flex items-center justify-center rounded-xl hover:bg-slate-200/70 dark:hover:bg-white/8 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60"
            title={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            aria-label={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          >
            <PanelLeft className="w-4 h-4" />
          </button>

          {!isSidebarOpen && (
            <div className="hidden sm:flex items-center gap-2 whitespace-nowrap shrink-0 mr-1">
              <CamelliaLogo size={20} />
              <span className="font-semibold text-sm tracking-tight font-['Outfit'] text-slate-900 dark:text-white">
                Camellia AI
              </span>
              <span className="hidden lg:inline text-xs text-slate-500 dark:text-slate-400">
                · Assistant of M R S
              </span>
            </div>
          )}

          <ModelSelector
            models={models}
            currentModel={currentModel}
            onSelectModel={onSelectModel}
            freeOnly={freeOnly}
            enforceFreeModelsOnly={enforceFreeModelsOnly}
            onToggleFreeOnly={onToggleFreeOnly}
            isAdmin={currentUser?.role === 'admin'}
            onOpenAdminModels={onOpenAdminModels}
          />
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {currentUser?.role === 'admin' && onOpenAdminModels && (
            <button
              type="button"
              onClick={onOpenAdminModels}
              className="min-h-10 min-w-10 flex items-center justify-center rounded-xl hover:bg-slate-200/70 dark:hover:bg-white/8 text-teal-600 dark:text-teal-400 transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60"
              title="Manage Model Catalogue (Admin)"
              aria-label="Manage Model Catalogue (Admin)"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onOpenAuth}
            className="min-h-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-white/8 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60"
            title={currentUser ? `Account: ${currentUser.username}` : 'Log in / Sign up'}
          >
            <div className="w-6 h-6 rounded-full bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
              <User className="w-3.5 h-3.5" />
            </div>
            <span className="hidden sm:inline-block text-xs font-medium max-w-[110px] truncate">
              {currentUser ? currentUser.username : 'Log in'}
            </span>
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            className="min-h-10 min-w-10 flex items-center justify-center rounded-xl hover:bg-slate-200/70 dark:hover:bg-white/8 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="min-h-10 min-w-10 flex items-center justify-center rounded-xl hover:bg-slate-200/70 dark:hover:bg-white/8 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0 flex flex-col relative z-10"
      >
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-2xl mx-auto w-full text-center my-auto">
            <div
              className={`space-y-3 mb-8 ${
                is3DView
                  ? 'px-6 py-5 rounded-3xl bg-white/75 dark:bg-[#080C14]/72 border border-slate-200/80 dark:border-white/10 shadow-sm'
                  : ''
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-white/90 dark:bg-[#0E1522]/90 border border-slate-200 dark:border-white/12 flex items-center justify-center mx-auto shadow-xs">
                <CamelliaLogo size={36} />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-teal-700 dark:text-teal-400">
                  Camellia AI · Assistant of M R S
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-['Outfit'] text-balance text-slate-900 dark:text-white">
                  How can I help you today?
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                Ask any question, search the live web with citations, write code, solve math, or upload documents and images.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
              {suggestedPrompts.map((card, idx) => {
                const Icon = card.icon;
                return (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => onSelectPrompt(card.prompt)}
                    className={`p-4 rounded-2xl border border-slate-200 dark:border-white/10 hover:border-teal-500/40 transition-colors text-left group cursor-pointer ${
                      is3DView
                        ? 'bg-white/88 dark:bg-[#0E1522]/84 hover:bg-white/96 dark:hover:bg-[#131D2F]/96'
                        : 'bg-white/85 dark:bg-[#0E1522]/80 backdrop-blur-xs hover:bg-white dark:hover:bg-[#131D2F]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/6 text-slate-600 dark:text-slate-300 group-hover:text-teal-500 transition-colors">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-100 group-hover:text-slate-950 dark:group-hover:text-white transition-colors">
                        {card.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pl-7">
                      {card.subtitle}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 pb-4">
            {messages.map((msg, index) => (
              <Message
                key={msg.id}
                message={msg}
                isLastAssistant={index === messages.length - 1 && msg.role === 'assistant'}
                onRegenerate={onRegenerate}
                onEditMessage={onEditMessage}
                onRetry={onRetry}
                is3DView={is3DView}
              />
            ))}
          </div>
        )}
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          type="button"
          onClick={scrollToBottom}
          aria-label="Scroll to bottom"
          className="absolute bottom-32 right-5 z-20 p-2.5 rounded-full bg-white dark:bg-[#0E1522] border border-slate-200 dark:border-white/12 shadow-lg text-slate-600 dark:text-slate-300 hover:text-teal-500 transition-colors cursor-pointer"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}

      {/* Sticky Bottom Composer */}
      <div
        className={`shrink-0 pt-3 z-10 ${
          is3DView
            ? 'bg-gradient-to-t from-[#eaf1f7]/92 via-[#eaf1f7]/60 dark:from-[#080C14]/92 dark:via-[#080C14]/60 to-transparent'
            : 'bg-gradient-to-t from-[#f8fafc] via-[#f8fafc]/95 dark:from-[#080C14] dark:via-[#080C14]/95 to-transparent'
        }`}
      >
        <Composer
          onSendMessage={onSendMessage}
          isStreaming={isStreaming}
          onStopStreaming={onStopStreaming}
          webSearchEnabled={webSearchEnabled}
          onToggleWebSearch={onToggleWebSearch}
          language={language}
          is3DView={is3DView}
        />
      </div>
    </div>
  );
};
