import React, { useState } from 'react';
import {
  Copy,
  Check,
  RotateCcw,
  Volume2,
  VolumeX,
  Edit3,
  ExternalLink,
  AlertCircle,
  Globe,
  Sparkles,
  FileText
} from 'lucide-react';
import { ChatMessage, MessageAttachment } from '../types/chat';
import { MarkdownRenderer } from './MarkdownRenderer';
import { voiceEngine } from '../utils/voiceEngine';

interface MessageProps {
  message: ChatMessage;
  isLastAssistant: boolean;
  onRegenerate?: () => void;
  onEditMessage?: (id: string, newText: string) => void;
  onRetry?: () => void;
}

export const Message: React.FC<MessageProps> = ({
  message,
  isLastAssistant,
  onRegenerate,
  onEditMessage,
  onRetry
}) => {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);

  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleSpeak = () => {
    if (isSpeaking) {
      voiceEngine.stop();
      setIsSpeaking(false);
      return;
    }

    voiceEngine.stop();
    setIsSpeaking(true);

    voiceEngine.speak(message.text, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false)
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editText.trim() && onEditMessage) {
      onEditMessage(message.id, editText.trim());
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditText(message.text);
    setIsEditing(false);
  };

  return (
    <div
      className={`py-4 sm:py-6 px-3 sm:px-6 w-full transition-colors ${
        isUser ? 'bg-transparent' : 'bg-neutral-50/60 dark:bg-[#141416]/60 border-y border-neutral-100 dark:border-[#1e1e22]'
      }`}
    >
      <div className="max-w-3xl mx-auto flex gap-3 sm:gap-4">
        {/* Avatar */}
        <div className="shrink-0 pt-0.5">
          {isUser ? (
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-neutral-300 dark:bg-[#2b2b30] flex items-center justify-center text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              U
            </div>
          ) : (
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-500 shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Message Content Area */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Role Header */}
          <div className="flex items-center justify-between text-xs font-medium text-neutral-500 dark:text-neutral-400">
            <span>{isUser ? 'You' : 'Camellia AI'}</span>

            {/* User Edit Trigger */}
            {isUser && !isEditing && onEditMessage && (
              <button
                onClick={() => setIsEditing(true)}
                className="opacity-0 group-hover:opacity-100 hover:text-neutral-900 dark:hover:text-white transition-opacity text-[11px] flex items-center gap-1 cursor-pointer"
                title="Edit message"
              >
                <Edit3 className="w-3 h-3" />
                <span>Edit</span>
              </button>
            )}
          </div>

          {/* User Attachments Preview */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1 pb-2">
              {message.attachments.map((att) => {
                const isImage = att.type.startsWith('image/');
                return (
                  <div
                    key={att.id}
                    className="rounded-xl overflow-hidden border border-neutral-200 dark:border-[#2e2e34] bg-white dark:bg-[#1c1c20] shadow-2xs max-w-xs"
                  >
                    {isImage ? (
                      <img
                        src={att.data}
                        alt={att.name}
                        className="max-h-48 w-auto object-contain rounded-lg"
                      />
                    ) : (
                      <div className="flex items-center gap-2 p-2.5 text-xs text-neutral-700 dark:text-neutral-300">
                        <FileText className="w-4 h-4 text-teal-500 shrink-0" />
                        <span className="truncate font-medium">{att.name}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Inline Edit Form for User Message */}
          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="space-y-2 pt-1">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full bg-white dark:bg-[#1a1a1e] border border-teal-500 rounded-xl p-3 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none resize-none"
                rows={3}
                autoFocus
              />
              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-[#28282e] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-teal-500 hover:bg-teal-400 text-slate-950 transition-colors cursor-pointer font-semibold"
                >
                  Save & Resend
                </button>
              </div>
            </form>
          ) : (
            /* Regular Message Text / Markdown */
            <div className="text-sm sm:text-base leading-relaxed text-neutral-900 dark:text-neutral-100 min-w-0">
              {isUser ? (
                <p className="whitespace-pre-wrap">{message.text}</p>
              ) : (
                <>
                  <MarkdownRenderer content={message.text} />

                  {/* Typing Indicator while Streaming without text yet */}
                  {message.isStreaming && !message.text && (
                    <div className="flex items-center gap-1.5 py-2">
                      <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" />
                    </div>
                  )}

                  {/* Error State */}
                  {message.error && (
                    <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Generation was interrupted or encountered a rate limit.</span>
                      </div>
                      {onRetry && (
                        <button
                          onClick={onRetry}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 font-medium transition-colors cursor-pointer"
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  )}

                  {/* Cited Sources / Google Search Grounding Cards */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-[#242428] space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                        <Globe className="w-3.5 h-3.5 text-teal-500" />
                        <span>Sources & Real-time Evidence</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {message.sources.map((src) => (
                          <a
                            key={src.index}
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 rounded-xl bg-white dark:bg-[#1a1a1d] hover:bg-neutral-100 dark:hover:bg-[#222226] border border-neutral-200 dark:border-[#2a2a30] hover:border-teal-500/40 text-xs transition-all group flex flex-col justify-between"
                          >
                            <div className="flex items-center gap-1.5 text-[11px] text-teal-600 dark:text-teal-400 font-mono truncate">
                              <span className="font-bold">[{src.index}]</span>
                              <span className="truncate">{src.domain}</span>
                              <ExternalLink className="w-2.5 h-2.5 ml-auto text-neutral-400 group-hover:text-teal-500" />
                            </div>
                            <span className="text-neutral-800 dark:text-neutral-200 font-medium line-clamp-1 mt-1">
                              {src.title}
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assistant Actions Toolbar */}
                  {!message.isStreaming && (
                    <div className="mt-3 flex items-center gap-1 text-neutral-400 dark:text-neutral-500 pt-1">
                      {/* Copy */}
                      <button
                        onClick={handleCopy}
                        className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-[#222226] hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors cursor-pointer text-xs flex items-center gap-1"
                        title="Copy to clipboard"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-[11px] text-emerald-500">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="text-[11px]">Copy</span>
                          </>
                        )}
                      </button>

                      {/* Read Aloud (Claude AI Female Voice) - strictly on-demand, no auto-speaking */}
                      <button
                        onClick={handleToggleSpeak}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1 ${
                          isSpeaking
                            ? 'bg-teal-500/20 text-teal-500 font-medium'
                            : 'hover:bg-neutral-200 dark:hover:bg-[#222226] hover:text-neutral-800 dark:hover:text-neutral-200'
                        }`}
                        title="Read aloud (Claude AI Female Voice)"
                      >
                        {isSpeaking ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5 text-teal-500" />
                            <span className="text-[11px]">Stop</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5" />
                            <span className="text-[11px]">Listen</span>
                          </>
                        )}
                      </button>

                      {/* Regenerate (if last message) */}
                      {isLastAssistant && onRegenerate && (
                        <button
                          onClick={onRegenerate}
                          className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-[#222226] hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors cursor-pointer text-xs flex items-center gap-1"
                          title="Regenerate response"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span className="text-[11px]">Regenerate</span>
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
