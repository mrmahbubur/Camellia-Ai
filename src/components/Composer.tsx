import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Square,
  Paperclip,
  Mic,
  MicOff,
  X,
  FileText,
  Globe
} from 'lucide-react';
import { MessageAttachment } from '../types/chat';

interface ComposerProps {
  onSendMessage: (text: string, attachments: MessageAttachment[]) => void;
  isStreaming: boolean;
  onStopStreaming: () => void;
  webSearchEnabled: boolean;
  onToggleWebSearch: () => void;
  language?: 'auto' | 'en' | 'bn';
  placeholder?: string;
  disabled?: boolean;
}

const TEXT_EXTENSIONS = /\.(txt|md|markdown|json|csv|js|jsx|ts|tsx|py|html|css|scss|sql|xml|yaml|yml|sh|bash|log)$/i;

export const Composer: React.FC<ComposerProps> = ({
  onSendMessage,
  isStreaming,
  onStopStreaming,
  webSearchEnabled,
  onToggleWebSearch,
  language = 'auto',
  placeholder = 'Message Camellia AI...',
  disabled = false
}) => {
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const showNotice = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(null), 3500);
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputText]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language === 'bn' ? 'bn-BD' : 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript;
          }
        }
        if (transcript.trim()) {
          setInputText((prev) => (prev ? `${prev.trimEnd()} ${transcript.trim()}` : transcript.trim()));
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore cleanup errors
      }
    };
  }, [language]);

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      showNotice('Voice dictation is not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.lang = language === 'bn' ? 'bn-BD' : 'en-US';
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
        showNotice('Could not start microphone dictation. Please check permissions.');
      }
    }
  };

  const processFiles = (files: FileList | File[]) => {
    Array.from(files).forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        showNotice(`"${file.name}" exceeds the 10MB file limit.`);
        return;
      }

      const isTextLike =
        file.type.startsWith('text/') ||
        file.type === 'application/json' ||
        TEXT_EXTENSIONS.test(file.name);

      const dataReader = new FileReader();
      dataReader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (!dataUrl) return;

        if (isTextLike) {
          const textReader = new FileReader();
          textReader.onload = (te) => {
            setAttachments((prev) => [
              ...prev,
              {
                id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                name: file.name,
                type: file.type || 'text/plain',
                size: file.size,
                data: dataUrl,
                textContent: (te.target?.result as string) || ''
              }
            ]);
          };
          textReader.readAsText(file);
        } else {
          setAttachments((prev) => [
            ...prev,
            {
              id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              name: file.name,
              type: file.type || 'application/octet-stream',
              size: file.size,
              data: dataUrl
            }
          ]);
        }
      };
      dataReader.readAsDataURL(file);
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      processFiles(files);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (isStreaming) {
      onStopStreaming();
      return;
    }

    const clean = inputText.trim();
    if (!clean && attachments.length === 0) return;

    onSendMessage(clean, attachments);
    setInputText('');
    setAttachments([]);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const canSend = (inputText.trim().length > 0 || attachments.length > 0) && !disabled;

  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 pb-3 sm:pb-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative rounded-2xl bg-white/90 dark:bg-[#0E1522]/90 backdrop-blur-md border shadow-sm transition-colors p-2.5 ${
          isDragging
            ? 'border-teal-500 ring-2 ring-teal-500/20'
            : 'border-slate-200 dark:border-white/12 focus-within:border-teal-500/60 dark:focus-within:border-teal-400/60'
        }`}
      >
        {/* Inline status notice banner */}
        {statusNotice && (
          <div className="mb-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between">
            <span>{statusNotice}</span>
            <button
              type="button"
              onClick={() => setStatusNotice(null)}
              className="text-neutral-500 hover:text-neutral-800 dark:hover:text-white cursor-pointer ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 p-1">
            {attachments.map((att) => {
              const isImage = att.type.startsWith('image/');
              return (
                <div
                  key={att.id}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#121215] border border-neutral-200 dark:border-[#2a2a30] text-xs text-neutral-800 dark:text-neutral-200 shadow-2xs"
                >
                  {isImage ? (
                    <img
                      src={att.data}
                      alt={att.name}
                      referrerPolicy="no-referrer"
                      className="w-5 h-5 rounded object-cover shrink-0"
                    />
                  ) : (
                    <FileText className="w-4 h-4 text-teal-500 shrink-0" />
                  )}
                  <span className="max-w-[140px] truncate font-medium text-[11.5px]">
                    {att.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    aria-label={`Remove ${att.name}`}
                    className="p-0.5 rounded-full hover:bg-neutral-200 dark:hover:bg-[#2b2b30] text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Input Textarea */}
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          className="w-full bg-transparent text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 text-sm sm:text-[15px] focus:outline-none resize-none px-2 pt-1 pb-1 max-h-48 leading-relaxed"
        />

        {/* Toolbar */}
        <div className="flex items-center justify-between pt-1.5 px-1 gap-2">
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf,text/*,.json,.md,.js,.jsx,.ts,.tsx,.py,.csv,.html,.css,.sql,.xml,.yaml,.yml"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-10 min-w-10 flex items-center justify-center rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200/80 dark:hover:bg-[#28282e] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60"
              title="Attach image, PDF, or text/code file (max 10MB)"
              aria-label="Attach image, PDF, or text file"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={toggleVoice}
              className={`min-h-10 min-w-10 flex items-center justify-center rounded-xl transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 ${
                isListening
                  ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30 animate-pulse'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200/80 dark:hover:bg-[#28282e]'
              }`}
              title={isListening ? 'Listening... click to stop' : 'Voice input'}
              aria-label={isListening ? 'Stop voice dictation' : 'Voice dictation'}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onToggleWebSearch}
              className={`min-h-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 ${
                webSearchEnabled
                  ? 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200/80 dark:hover:bg-[#28282e] border border-transparent'
              }`}
              title={webSearchEnabled ? 'Live Google Search grounding is enabled' : 'Enable live Google Search grounding'}
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden xs:inline sm:inline">Web Search</span>
            </button>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isStreaming ? (
              <button
                type="button"
                onClick={onStopStreaming}
                className="p-2.5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 transition-all shadow-sm cursor-pointer"
                title="Stop generating"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend}
                className={`p-2.5 rounded-full transition-all shadow-sm ${
                  canSend
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 cursor-pointer'
                    : 'bg-neutral-300 dark:bg-[#2b2b30] text-neutral-400 dark:text-neutral-600 cursor-not-allowed'
                }`}
                title="Send message (Enter)"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="text-center mt-2">
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 select-none">
          AI responses can be inaccurate. Avoid sharing passwords or sensitive information.
        </p>
      </div>
    </div>
  );
};
