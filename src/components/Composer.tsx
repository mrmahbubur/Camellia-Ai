import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Square,
  Paperclip,
  Mic,
  MicOff,
  X,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { MessageAttachment } from '../types/chat';

interface ComposerProps {
  onSendMessage: (text: string, attachments: MessageAttachment[]) => void;
  isStreaming: boolean;
  onStopStreaming: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export const Composer: React.FC<ComposerProps> = ({
  onSendMessage,
  isStreaming,
  onStopStreaming,
  placeholder = 'Message Camellia AI...',
  disabled = false
}) => {
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const showNotice = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(null), 3500);
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputText]);

  // Handle Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
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
  }, []);

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      showNotice('Speech recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Voice recognition error:', err);
      }
    }
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      // 10MB limit per file
      if (file.size > 10 * 1024 * 1024) {
        showNotice(`File "${file.name}" exceeds the 10MB limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
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
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const canSend = (inputText.trim().length > 0 || attachments.length > 0) && !disabled;

  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 pb-3 sm:pb-5">
      <div className="relative rounded-2xl sm:rounded-3xl bg-neutral-100 dark:bg-[#1e1e22] border border-neutral-300 dark:border-[#2e2e34] shadow-md focus-within:border-teal-500/60 dark:focus-within:border-teal-500/60 transition-all p-2 sm:p-2.5">
        {/* Inline status notice banner */}
        {statusNotice && (
          <div className="mb-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-between">
            <span>{statusNotice}</span>
            <button
              type="button"
              onClick={() => setStatusNotice(null)}
              className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Attachment preview pills */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 p-1.5">
            {attachments.map((att) => {
              const isImage = att.type.startsWith('image/');
              return (
                <div
                  key={att.id}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#141416] border border-neutral-200 dark:border-[#2a2a30] text-xs text-neutral-800 dark:text-neutral-200 shadow-2xs group"
                >
                  {isImage ? (
                    <img
                      src={att.data}
                      alt={att.name}
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
                    className="p-0.5 rounded-full hover:bg-neutral-200 dark:hover:bg-[#2b2b30] text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors"
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
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          className="w-full bg-transparent text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 text-sm sm:text-base focus:outline-none resize-none px-2 sm:px-3 pt-1 pb-1 max-h-48 leading-relaxed"
        />

        {/* Action Controls Toolbar */}
        <div className="flex items-center justify-between pt-1 px-1">
          <div className="flex items-center gap-1">
            {/* File upload button */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf,text/*,.json,.md,.js,.ts,.py"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-[#28282e] transition-colors cursor-pointer"
              title="Attach images or documents (max 10MB)"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Voice input button */}
            <button
              type="button"
              onClick={toggleVoice}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isListening
                  ? 'bg-rose-500/20 text-rose-500 animate-pulse border border-rose-500/30'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-[#28282e]'
              }`}
              title={isListening ? 'Listening... click to stop' : 'Voice input (Speech to text)'}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center gap-1">
            {/* Send or Stop button */}
            {isStreaming ? (
              <button
                type="button"
                onClick={onStopStreaming}
                className="p-2.5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 transition-all shadow-sm cursor-pointer"
                title="Stop generation"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend}
                className={`p-2.5 rounded-full transition-all shadow-sm cursor-pointer ${
                  canSend
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 hover:scale-105 active:scale-95'
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
        <p className="text-[11px] text-neutral-400 dark:text-neutral-500 select-none">
          Camellia AI can make mistakes. Consider checking important information.
        </p>
      </div>
    </div>
  );
};
