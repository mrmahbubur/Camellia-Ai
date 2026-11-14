import React, { useState, useEffect } from 'react';
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
  FileText,
  Search
} from 'lucide-react';
import { ChatMessage } from '../types/chat';
import { MarkdownRenderer } from './MarkdownRenderer';
import { voiceEngine } from '../utils/voiceEngine';
import { CamelliaLogo } from './CamelliaLogo';

interface MessageProps {
  message: ChatMessage;
  isLastAssistant: boolean;
  onRegenerate?: () => void;
  onEditMessage?: (id: string, newText: string) => void;
  onRetry?: () => void;
  is3DView?: boolean;
}

export const Message: React.FC<MessageProps> = ({
  message,
  isLastAssistant,
  onRegenerate,
  onEditMessage,
  onRetry,
  is3DView = false
}) => {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);

  const isUser = message.role === 'user';

  useEffect(() => {
    setEditText(message.text);
  }, [message.text]);

  useEffect(() => {
    return () => {
      if (isSpeaking) {
        voiceEngine.stop();
      }
    };
  }, [isSpeaking]);

  const handleCopy = () => {
    let textToCopy = message.text;
    if (message.sources && message.sources.length > 0) {
      const refs = message.sources.map((s) => `[${s.index}] ${s.title} - ${s.uri}`).join('\n');
      textToCopy += `\n\nSources:\n${refs}`;
    }
    navigator.clipboard.writeText(textToCopy);
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
      className={`group py-4 sm:py-6 px-3 sm:px-6 w-full transition-colors ${
        isUser
          ? is3DView
            ? 'bg-white/45 dark:bg-[#080C14]/45'
            : 'bg-transparent'
          : is3DView
            ? 'bg-white/84 dark:bg-[#0E1522]/82 border-y border-slate-200/80 dark:border-white/10'
            : 'bg-white/75 dark:bg-[#0E1522]/75 border-y border-slate-200/70 dark:border-white/7'
      }`}
    >
      <div className="max-w-3xl mx-auto flex gap-3 sm:gap-4">
        {/* Avatar */}
        <div className="shrink-0 pt-0.5">
          {isUser ? (
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-xs font-semibold text-slate-800 dark:text-slate-200">
              U
            </div>
          ) : (
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-teal-500/12 border border-teal-500/30 flex items-center justify-center">
              <CamelliaLogo size={18} />
            </div>
          )}
        </div>

        {/* Message Content Area */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Role Header */}
          <div className="flex items-center justify-between text-xs font-medium text-neutral-500 dark:text-neutral-400">
            <span>{isUser ? 'You' : 'Camellia AI'}</span>

            {isUser && !isEditing && onEditMessage && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="opacity-75 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 hover:text-neutral-900 dark:hover:text-white transition-opacity text-[11px] flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded"
                title="Edit message and resend"
              >
                <Edit3 className="w-3 h-3" />
                <span>Edit</span>
              </button>
            )}
          </div>

          {/* Attachments Preview */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1 pb-1">
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
                        referrerPolicy="no-referrer"
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
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-slate-950 transition-colors cursor-pointer"
                >
                  Save & Resend
                </button>
              </div>
            </form>
          ) : (
            <div className="text-sm sm:text-base leading-relaxed text-neutral-900 dark:text-neutral-100 min-w-0">
              {isUser ? (
                <p className="whitespace-pre-wrap break-words">{message.text}</p>
              ) : (
                <>
                  {message.text && <MarkdownRenderer content={message.text} />}

                  {/* Typing Indicator while waiting for first token */}
                  {message.isStreaming && !message.text && (
                    <div className="flex items-center gap-1.5 py-2" aria-label="Thinking">
                      <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" />
                    </div>
                  )}

                  {/* Error State with clear message & Retry */}
                  {message.error && (
                    <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                        <span>
                          {message.errorText || 'Response generation was interrupted or hit a rate limit.'}
                        </span>
                      </div>
                      {onRetry && (
                        <button
                          type="button"
                          onClick={onRetry}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 font-semibold transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  )}

                  {/* Cited Sources & Web Queries */}
                  {((message.sources && message.sources.length > 0) || (message.searchQueries && message.searchQueries.length > 0)) && (
                    <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-[#242428] space-y-2.5">
                      {message.searchQueries && message.searchQueries.length > 0 && (
                        <div className="flex items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400 flex-wrap">
                          <Search className="w-3 h-3 text-teal-500 shrink-0" />
                          <span>Searched:</span>
                          <span>{message.searchQueries.join(' · ')}</span>
                        </div>
                      )}

                      {message.sources && message.sources.length > 0 && (
                        <>
                          <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                            <Globe className="w-3.5 h-3.5 text-teal-500" />
                            <span>Sources ({message.sources.length})</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {message.sources.map((src) => (
                              <a
                                key={`${src.index}-${src.uri}`}
                                href={src.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2.5 rounded-xl bg-white dark:bg-[#1a1a1d] hover:bg-neutral-100 dark:hover:bg-[#222226] border border-neutral-200 dark:border-[#2a2a30] hover:border-teal-500/40 text-xs transition-all group/card flex flex-col justify-between"
                              >
                                <div className="flex items-center gap-1.5 text-[11px] text-teal-600 dark:text-teal-400 font-mono truncate">
                                  <span className="font-bold">[{src.index}]</span>
                                  <span className="truncate">{src.domain}</span>
                                  <ExternalLink className="w-2.5 h-2.5 ml-auto text-neutral-400 group-hover/card:text-teal-500 shrink-0" />
                                </div>
                                <span className="text-neutral-800 dark:text-neutral-200 font-medium line-clamp-1 mt-1">
                                  {src.title}
                                </span>
                              </a>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Assistant Actions Toolbar */}
                  {!message.isStreaming && message.text && (
                    <div className="mt-3 flex items-center gap-1 text-neutral-500 dark:text-neutral-400 pt-1">
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-[#222226] hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer text-xs flex items-center gap-1"
                        title="Copy response (with citations)"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-teal-500" />
                            <span className="text-[11px] text-teal-600 dark:text-teal-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="text-[11px]">Copy</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleToggleSpeak}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1 ${
                          isSpeaking
                            ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400 font-medium'
                            : 'hover:bg-neutral-200 dark:hover:bg-[#222226] hover:text-neutral-900 dark:hover:text-neutral-100'
                        }`}
                        title="Read aloud"
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

                      {isLastAssistant && onRegenerate && (
                        <button
                          type="button"
                          onClick={onRegenerate}
                          className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-[#222226] hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer text-xs flex items-center gap-1"
                          title="Regenerate response"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span className="text-[11px]">Regenerate</span>
                        </button>
                      )}

                      {message.modelUsed && (
                        <span
                          className="ml-auto text-[11px] text-neutral-400 dark:text-neutral-500 font-medium truncate max-w-[200px]"
                          title={message.modelIdUsed || message.modelUsed}
                        >
                          {message.modelUsed}
                          {message.providerUsed ? ` · ${message.providerUsed}` : ''}
                        </span>
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
