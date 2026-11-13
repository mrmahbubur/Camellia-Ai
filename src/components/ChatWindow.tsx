import React, { useRef, useEffect, useState } from 'react';
import {
  PanelLeft,
  Sparkles,
  Code2,
  Compass,
  Calculator,
  Lightbulb,
  User,
  Settings,
  Moon,
  Sun,
  ArrowDown
} from 'lucide-react';
import { ChatMessage, MessageAttachment } from '../types/chat';
import { Message } from './Message';
import { Composer } from './Composer';
import { ModelSelector } from './ModelSelector';
import { AuthUser } from './AuthModal';

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
  currentModel: string;
  onSelectModel: (model: string) => void;
  webSearchEnabled: boolean;
  onToggleWebSearch: () => void;
  language: 'auto' | 'en' | 'bn';
  currentUser: AuthUser | null;
  onOpenAuth: () => void;
  onOpenSettings: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
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
  currentModel,
  onSelectModel,
  webSearchEnabled,
  onToggleWebSearch,
  language,
  currentUser,
  onOpenAuth,
  onOpenSettings,
  theme,
  onToggleTheme
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
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#0e0e10] text-neutral-900 dark:text-neutral-100 min-w-0 relative">
      {/* Top Header Bar */}
      <header className="h-14 border-b border-neutral-200 dark:border-[#202026] px-3 sm:px-4 flex items-center justify-between shrink-0 bg-white/90 dark:bg-[#0e0e10]/90 backdrop-blur-md z-20">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-[#1a1a1e] text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
            title={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          >
            <PanelLeft className="w-4 h-4" />
          </button>

          {!isSidebarOpen && (
            <span className="hidden sm:inline-block font-semibold text-sm tracking-tight font-['Outfit'] text-neutral-900 dark:text-white whitespace-nowrap shrink-0 mr-1">
              Camellia <span className="text-teal-600 dark:text-teal-400">AI</span>
            </span>
          )}

          <ModelSelector currentModel={currentModel} onSelectModel={onSelectModel} />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-[#1a1a1e] text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title={currentUser ? `Account: ${currentUser.username}` : 'Log in / Sign up'}
          >
            <div className="w-6 h-6 rounded-full bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
              <User className="w-3.5 h-3.5" />
            </div>
            <span className="hidden sm:inline-block text-xs font-medium max-w-[120px] truncate">
              {currentUser ? currentUser.username : 'Log in'}
            </span>
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-[#1a1a1e] text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-[#1a1a1e] text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0 flex flex-col relative"
      >
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-2xl mx-auto w-full text-center my-auto">
            <div className="space-y-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-['Outfit'] text-balance">
                How can I help you today?
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-md mx-auto leading-relaxed">
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
                    className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#141418] hover:bg-neutral-100 dark:hover:bg-[#1c1c22] border border-neutral-200 dark:border-[#24242a] hover:border-teal-500/40 transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-1.5 rounded-lg bg-neutral-200/70 dark:bg-[#202026] text-neutral-600 dark:text-neutral-300 group-hover:text-teal-500 transition-colors">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-semibold text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">
                        {card.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed pl-7">
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
          className="absolute bottom-32 right-5 z-20 p-2 rounded-full bg-white dark:bg-[#1e1e24] border border-neutral-200 dark:border-[#2e2e36] shadow-lg text-neutral-600 dark:text-neutral-300 hover:text-teal-500 transition-all cursor-pointer"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}

      {/* Sticky Bottom Composer */}
      <div className="shrink-0 bg-gradient-to-t from-white via-white dark:from-[#0e0e10] dark:via-[#0e0e10] to-transparent pt-3 z-10">
        <Composer
          onSendMessage={onSendMessage}
          isStreaming={isStreaming}
          onStopStreaming={onStopStreaming}
          webSearchEnabled={webSearchEnabled}
          onToggleWebSearch={onToggleWebSearch}
          language={language}
        />
      </div>
    </div>
  );
};
