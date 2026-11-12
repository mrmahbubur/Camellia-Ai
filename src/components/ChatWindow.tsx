import React, { useRef, useEffect } from 'react';
import {
  PanelLeft,
  Sparkles,
  Code2,
  Compass,
  Calculator,
  Lightbulb,
  ExternalLink,
  ShieldCheck,
  User,
  Settings,
  Moon,
  Sun
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
  currentUser,
  onOpenAuth,
  onOpenSettings,
  theme,
  onToggleTheme
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as new tokens arrive
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const suggestedPrompts = [
    {
      title: 'Explain quantum computing',
      subtitle: 'In simple, intuitive terms with key principles',
      icon: Lightbulb,
      prompt: 'Explain quantum computing in simple terms, focusing on superposition and entanglement.'
    },
    {
      title: 'Write a Python automation script',
      subtitle: 'Clean, production-grade script for organizing files',
      icon: Code2,
      prompt: 'Write a clean Python script to automatically organize downloads by file extension with logging.'
    },
    {
      title: 'Today’s technology developments',
      subtitle: 'Live web-grounded analysis of computing & AI',
      icon: Compass,
      prompt: 'What are today’s top technology headlines and developments in artificial intelligence?'
    },
    {
      title: 'Convert 1,361 sq ft to sq meters',
      subtitle: 'Precise area calculation with mathematical breakdown',
      icon: Calculator,
      prompt: 'Convert 1,361 square feet to square metres'
    }
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#0e0e10] text-neutral-900 dark:text-neutral-100 min-w-0 relative">
      {/* Top Header Bar */}
      <header className="h-14 border-b border-neutral-200 dark:border-[#202024] px-3 sm:px-4 flex items-center justify-between shrink-0 bg-white/80 dark:bg-[#0e0e10]/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-2">
          {/* Sidebar Toggle */}
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-[#1a1a1e] text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
            title={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          >
            <PanelLeft className="w-4 h-4" />
          </button>

          {/* Model Selector Dropdown */}
          <ModelSelector currentModel={currentModel} onSelectModel={onSelectModel} />
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-1.5">
          {/* Single User Account Icon with Status */}
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-[#1a1a1e] text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
            title={currentUser ? `Logged in as ${currentUser.username} (Click to manage)` : 'Account (Sign up / Login)'}
          >
            <div className="w-6 h-6 rounded-full bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-500 shrink-0">
              <User className="w-3.5 h-3.5" />
            </div>
            <span className="hidden sm:inline-block text-xs font-medium max-w-[120px] truncate">
              {currentUser ? currentUser.username : 'Log in'}
            </span>
            {currentUser && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            )}
          </button>

          {/* Theme Switcher */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-[#1a1a1e] text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Settings Modal Toggle */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-[#1a1a1e] text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto min-h-0 flex flex-col"
      >
        {messages.length === 0 ? (
          /* Empty State like ChatGPT / Claude */
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-2xl mx-auto w-full text-center my-auto animate-fade-in">
            {/* Brand Logo & Greeting */}
            <div className="space-y-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-500 mx-auto shadow-md">
                <Sparkles className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-['Outfit']">
                How can I help you today?
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-md mx-auto leading-relaxed">
                Ask questions, generate code, analyze documents, calculate formulas, or explore live web information.
              </p>
            </div>

            {/* 4 Suggested Prompt Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
              {suggestedPrompts.map((card, idx) => {
                const Icon = card.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => onSelectPrompt(card.prompt)}
                    className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#141416] hover:bg-neutral-100 dark:hover:bg-[#1c1c20] border border-neutral-200 dark:border-[#242428] hover:border-teal-500/40 transition-all text-left shadow-2xs group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-1.5 rounded-lg bg-neutral-200/60 dark:bg-[#202024] text-neutral-600 dark:text-neutral-300 group-hover:text-teal-500 transition-colors">
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
          /* Message List */
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

      {/* Sticky Bottom Composer */}
      <div className="shrink-0 bg-gradient-to-t from-white via-white dark:from-[#0e0e10] dark:via-[#0e0e10] to-transparent pt-3 z-10">
        <Composer
          onSendMessage={onSendMessage}
          isStreaming={isStreaming}
          onStopStreaming={onStopStreaming}
        />
      </div>
    </div>
  );
};
