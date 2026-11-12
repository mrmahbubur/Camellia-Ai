import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { SettingsModal } from './components/SettingsModal';
import { AuthModal, AuthUser } from './components/AuthModal';
import {
  ChatMessage,
  ChatSession,
  MessageAttachment,
  UserSettings,
  DEFAULT_USER_SETTINGS
} from './types/chat';

const SESSIONS_STORAGE_KEY = 'camellia_chat_sessions';
const SETTINGS_STORAGE_KEY = 'camellia_user_settings';
const AUTH_USER_KEY = 'camellia_auth_user';
const AUTH_TOKEN_KEY = 'camellia_auth_token';

export function App() {
  // Settings & Theme
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      return saved ? { ...DEFAULT_USER_SETTINGS, ...JSON.parse(saved) } : DEFAULT_USER_SETTINGS;
    } catch {
      return DEFAULT_USER_SETTINGS;
    }
  });

  // Theme Sync
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // Auth User
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Chat Sessions
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(SESSIONS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    // Default initial session
    const initialSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: 'New conversation',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return [initialSession];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return sessions[0]?.id || `session-${Date.now()}`;
  });

  // UI state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Save sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.warn('Failed to save sessions to localStorage:', e);
    }
  }, [sessions]);

  // Save settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save settings to localStorage:', e);
    }
  }, [settings]);

  // Active session
  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const activeMessages = activeSession ? activeSession.messages : [];

  // Toggle theme
  const handleToggleTheme = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    setSettings((prev) => ({ ...prev, theme: nextTheme }));
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        handleNewChat();
      }
      if (e.key === 'Escape') {
        setIsSettingsOpen(false);
        setIsAuthModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sessions]);

  // Create New Chat
  const handleNewChat = () => {
    if (isStreaming) {
      handleStopStreaming();
    }
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: 'New conversation',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      model: settings.model
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  // Delete Session
  const handleDeleteSession = (id: string) => {
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      if (remaining.length === 0) {
        const fresh: ChatSession = {
          id: `session-${Date.now()}`,
          title: 'New conversation',
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setActiveSessionId(fresh.id);
        return [fresh];
      }
      if (activeSessionId === id) {
        setActiveSessionId(remaining[0].id);
      }
      return remaining;
    });
  };

  // Rename Session
  const handleRenameSession = (id: string, newTitle: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: newTitle, updatedAt: new Date().toISOString() } : s))
    );
  };

  // Auto-generate title from first prompt
  const generateShortTitle = (text: string): string => {
    const clean = text.replace(/^[#*>\-\s]+/, '').trim();
    if (clean.length <= 32) return clean;
    const words = clean.split(/\s+/);
    let title = '';
    for (const w of words) {
      if ((title + ' ' + w).trim().length > 30) break;
      title = (title + ' ' + w).trim();
    }
    return title ? `${title}...` : clean.slice(0, 30) + '...';
  };

  // Stop Streaming
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);

    // Update active assistant message isStreaming flag
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeSessionId) return s;
        return {
          ...s,
          messages: s.messages.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
        };
      })
    );
  };

  // Send message and execute token-by-token stream
  const handleSendMessage = async (text: string, attachments: MessageAttachment[] = []) => {
    if (isStreaming) {
      handleStopStreaming();
    }

    const userMsgId = `msg-${Date.now()}`;
    const assistantMsgId = `asst-${Date.now() + 1}`;

    const userMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      text,
      attachments,
      timestamp: new Date().toISOString()
    };

    const assistantPlaceholder: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      text: '',
      isStreaming: true,
      timestamp: new Date().toISOString()
    };

    // Calculate updated messages list
    const updatedMessages = [...activeMessages, userMessage, assistantPlaceholder];

    // Determine if title should be auto-generated
    const isFirstMessage = activeMessages.length === 0;
    const newTitle = isFirstMessage ? generateShortTitle(text) : (activeSession?.title || 'New conversation');

    // Update session with user message and placeholder assistant message
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeSessionId) return s;
        return {
          ...s,
          title: newTitle,
          messages: updatedMessages,
          updatedAt: new Date().toISOString()
        };
      })
    );

    setIsStreaming(true);
    abortControllerRef.current = new AbortController();

    // Prepare payload history for multi-turn
    const historyPayload = activeMessages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      text: m.text
    }));

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          message: text,
          history: historyPayload,
          model: settings.model,
          temperature: settings.temperature,
          systemInstruction: settings.systemInstruction,
          language: settings.language,
          attachments: attachments.map((a) => ({
            name: a.name,
            type: a.type,
            data: a.data
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to connect to chat stream`);
      }

      if (!response.body) {
        throw new Error('Response body stream is unavailable.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedText = '';
      let collectedSources: any[] = [];
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;

          try {
            const data = JSON.parse(trimmed.replace(/^data:\s*/, ''));

            if (data.text) {
              streamedText += data.text;
              // Update live message text
              setSessions((prev) =>
                prev.map((s) => {
                  if (s.id !== activeSessionId) return s;
                  return {
                    ...s,
                    messages: s.messages.map((m) =>
                      m.id === assistantMsgId ? { ...m, text: streamedText } : m
                    )
                  };
                })
              );
            }

            if (data.done) {
              if (data.sources && Array.isArray(data.sources)) {
                collectedSources = data.sources;
              }
            }

            if (data.error) {
              throw new Error(data.error);
            }
          } catch (parseErr) {
            // Ignore partial SSE chunk parse errors
          }
        }
      }

      // Mark streaming complete
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== activeSessionId) return s;
          return {
            ...s,
            messages: s.messages.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    text: streamedText,
                    isStreaming: false,
                    sources: collectedSources.length > 0 ? collectedSources : undefined
                  }
                : m
            ),
            updatedAt: new Date().toISOString()
          };
        })
      );

      // Trigger background sync to server if authenticated
      if (currentUser) {
        syncChatsToServer();
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Stream generation aborted by user.');
      } else {
        console.error('Chat stream error:', err);
        // Mark assistant message as error
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== activeSessionId) return s;
            return {
              ...s,
              messages: s.messages.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      text: m.text || 'An error occurred while generating the response. Please retry.',
                      isStreaming: false,
                      error: true
                    }
                  : m
              )
            };
          })
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  // Regenerate last assistant reply
  const handleRegenerate = () => {
    if (activeMessages.length < 2) return;

    // Find the last user message
    let lastUserIndex = -1;
    for (let i = activeMessages.length - 1; i >= 0; i--) {
      if (activeMessages[i].role === 'user') {
        lastUserIndex = i;
        break;
      }
    }

    if (lastUserIndex === -1) return;

    const userMsg = activeMessages[lastUserIndex];
    // Trim conversation up to the last user message
    const pruned = activeMessages.slice(0, lastUserIndex);

    setSessions((prev) =>
      prev.map((s) => (s.id === activeSessionId ? { ...s, messages: pruned } : s))
    );

    // Resend message with user text & attachments
    handleSendMessage(userMsg.text, userMsg.attachments || []);
  };

  // Edit previous user message and re-run
  const handleEditMessage = (id: string, newText: string) => {
    const targetIndex = activeMessages.findIndex((m) => m.id === id);
    if (targetIndex === -1) return;

    const oldMsg = activeMessages[targetIndex];
    // Prune everything from targetIndex onwards
    const pruned = activeMessages.slice(0, targetIndex);

    setSessions((prev) =>
      prev.map((s) => (s.id === activeSessionId ? { ...s, messages: pruned } : s))
    );

    // Send with new edited text
    handleSendMessage(newText, oldMsg.attachments || []);
  };

  // Retry last failed response
  const handleRetry = () => {
    handleRegenerate();
  };

  // Sync saved chats to server backend
  const syncChatsToServer = async (): Promise<boolean> => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return false;

    try {
      const res = await fetch('/api/auth/sync-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          savedData: {
            savedChats: sessions.map((s) => ({
              id: s.id,
              title: s.title,
              messageCount: s.messages.length,
              updatedAt: s.updatedAt
            })),
            chatSessionCount: sessions.length,
            themePreference: settings.theme
          }
        })
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  // Auth Success Handler
  const handleAuthSuccess = (user: AuthUser, token: string) => {
    setCurrentUser(user);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  };

  // Logout Handler
  const handleLogout = () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      }).catch(() => {});
    }
    setCurrentUser(null);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
  };

  return (
    <div className="flex h-screen h-[100dvh] w-full overflow-hidden bg-white dark:bg-[#0e0e10] text-neutral-900 dark:text-neutral-100 font-sans">
      {/* Sidebar with conversation history */}
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => {
          setActiveSessionId(id);
          // On mobile, close sidebar on selection
          if (window.innerWidth < 768) {
            setIsSidebarOpen(false);
          }
        }}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        currentUser={currentUser}
        theme={settings.theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Chat Interface */}
      <ChatWindow
        messages={activeMessages}
        isStreaming={isStreaming}
        onSendMessage={handleSendMessage}
        onStopStreaming={handleStopStreaming}
        onRegenerate={handleRegenerate}
        onEditMessage={handleEditMessage}
        onRetry={handleRetry}
        onSelectPrompt={(prompt) => handleSendMessage(prompt, [])}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        currentModel={settings.model}
        onSelectModel={(model) => setSettings((prev) => ({ ...prev, model }))}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        theme={settings.theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={(newSettings) => setSettings(newSettings)}
      />

      {/* Account System Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onAuthSuccess={handleAuthSuccess}
        onLogout={handleLogout}
        onSyncChatsToServer={syncChatsToServer}
      />
    </div>
  );
}
export default App;
