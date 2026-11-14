import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { SettingsModal } from './components/SettingsModal';
import { AuthModal, AuthUser } from './components/AuthModal';
import { AdminModelsModal } from './components/AdminModelsModal';
import { PaidModelConfirmModal } from './components/PaidModelConfirmModal';
import {
  ChatMessage,
  ChatSession,
  MessageAttachment,
  UserSettings,
  ModelCatalogItem,
  ModelCatalogResponse,
  ModelProvider,
  DEFAULT_USER_SETTINGS,
  normalizeModelId
} from './types/chat';
import { getApiUrl, isJsonResponse } from './utils/api';

const SESSIONS_STORAGE_KEY = 'camellia_chat_sessions';
const ACTIVE_SESSION_STORAGE_KEY = 'camellia_active_session_id';
const SETTINGS_STORAGE_KEY = 'camellia_user_settings';
const AUTH_USER_KEY = 'camellia_auth_user';
const AUTH_TOKEN_KEY = 'camellia_auth_token';

function generateUniqueId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function toValidIsoTimestamp(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim() && !Number.isNaN(Date.parse(value))) {
    return value;
  }
  return fallback;
}

function createInitialSession(model?: string): ChatSession {
  const now = new Date().toISOString();
  return {
    id: generateUniqueId('session'),
    title: 'New conversation',
    messages: [],
    createdAt: now,
    updatedAt: now,
    model: normalizeModelId(model)
  };
}

function sanitizeRestoredSessions(raw: unknown): ChatSession[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [createInitialSession()];
  }

  const seenSessionIds = new Set<string>();
  const now = new Date().toISOString();
  const valid: ChatSession[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rawSession = item as Partial<ChatSession>;
    if (!Array.isArray(rawSession.messages)) continue;

    let sessionId =
      typeof rawSession.id === 'string' && rawSession.id.trim()
        ? rawSession.id.trim()
        : generateUniqueId('session');

    if (seenSessionIds.has(sessionId)) {
      sessionId = generateUniqueId('session');
    }
    seenSessionIds.add(sessionId);

    const seenMessageIds = new Set<string>();
    const sanitizedMessages: ChatMessage[] = [];

    for (const rawMsg of rawSession.messages) {
      if (!rawMsg || typeof rawMsg !== 'object') continue;
      const role = rawMsg.role === 'user' || rawMsg.role === 'assistant' ? rawMsg.role : null;
      if (!role) continue;

      let msgId =
        typeof rawMsg.id === 'string' && rawMsg.id.trim()
          ? rawMsg.id.trim()
          : generateUniqueId(role === 'user' ? 'msg' : 'asst');

      if (seenMessageIds.has(msgId)) {
        msgId = generateUniqueId(role === 'user' ? 'msg' : 'asst');
      }
      seenMessageIds.add(msgId);

      sanitizedMessages.push({
        ...rawMsg,
        id: msgId,
        role,
        text: typeof rawMsg.text === 'string' ? rawMsg.text : '',
        timestamp: toValidIsoTimestamp(rawMsg.timestamp, now),
        isStreaming: false
      });
    }

    const createdAt = toValidIsoTimestamp(rawSession.createdAt, now);
    const updatedAt = toValidIsoTimestamp(rawSession.updatedAt, createdAt);

    valid.push({
      id: sessionId,
      title:
        typeof rawSession.title === 'string' && rawSession.title.trim()
          ? rawSession.title.trim()
          : 'New conversation',
      messages: sanitizedMessages,
      createdAt,
      updatedAt,
      model: normalizeModelId(rawSession.model)
    });
  }

  return valid.length > 0 ? valid : [createInitialSession()];
}

export function App() {
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_USER_SETTINGS,
          ...parsed,
          model: normalizeModelId(parsed?.model)
        };
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_USER_SETTINGS;
  });

  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(SESSIONS_STORAGE_KEY);
      if (saved) {
        return sanitizeRestoredSessions(JSON.parse(saved));
      }
    } catch {
      // ignore storage errors
    }
    return [createInitialSession(settings.model)];
  });

  const sessionsRef = useRef<ChatSession[]>(sessions);
  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
      if (savedId && sessions.some((s) => s.id === savedId)) {
        return savedId;
      }
    } catch {
      // ignore storage errors
    }
    return sessions[0]?.id || createInitialSession().id;
  });

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, activeSessionId);
    } catch {
      // ignore storage errors
    }
  }, [activeSessionId]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAdminModelsOpen, setIsAdminModelsOpen] = useState(false);
  const [catalogModels, setCatalogModels] = useState<ModelCatalogItem[]>([]);
  const [catalogDefaultModelId, setCatalogDefaultModelId] = useState<string>('gemini-4-hydrogen');
  const [enforceFreeModelsOnly, setEnforceFreeModelsOnly] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [confirmedPaidModels, setConfirmedPaidModels] = useState<string[]>([]);
  const confirmedPaidModelsRef = useRef<string[]>([]);
  const [pendingPaidRequest, setPendingPaidRequest] = useState<{
    text: string;
    attachments: MessageAttachment[];
    overrideBaseMessages?: ChatMessage[];
    modelItem: ModelCatalogItem;
  } | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchModelCatalogue = useCallback(async () => {
    try {
      const qs = settings.freeModelsOnly ? '?freeOnly=1' : '';
      const res = await fetch(getApiUrl(`/api/models${qs}`));
      if (!res.ok || !isJsonResponse(res)) return;
      const data = (await res.json()) as ModelCatalogResponse;
      setEnforceFreeModelsOnly(Boolean(data?.enforceFreeModelsOnly));
      if (!Array.isArray(data?.models)) return;
      setCatalogModels(data.models);
      if (data.models.length === 0) return;
      const nextDefault = data.defaultModelId || data.models[0].id;
      setCatalogDefaultModelId(nextDefault);

      const approvedIds = data.models.map((m) => m.id);
      setSettings((prev) => {
        if (approvedIds.includes(prev.model)) return prev;
        return {
          ...prev,
          model: normalizeModelId(prev.model, approvedIds, nextDefault)
        };
      });
    } catch {
      // keep existing models on network interruption
    }
  }, [settings.freeModelsOnly]);

  useEffect(() => {
    fetchModelCatalogue();
  }, [fetchModelCatalogue]);

  const handleSessionExpired = useCallback(() => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(AUTH_USER_KEY);
      localStorage.removeItem(AUTH_TOKEN_KEY);
    } catch {
      // ignore storage errors
    }
  }, []);

  const handleUserUpdated = useCallback((user: AuthUser) => {
    setCurrentUser(user);
    try {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    let token: string | null = null;
    try {
      token = localStorage.getItem(AUTH_TOKEN_KEY);
    } catch {
      return;
    }
    if (!token) {
      if (currentUser) handleSessionExpired();
      return;
    }

    let cancelled = false;
    fetch(getApiUrl('/api/auth/me'), {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          handleSessionExpired();
          return;
        }
        if (res.ok && isJsonResponse(res)) {
          const data = await res.json();
          if (data?.success && data?.user) {
            handleUserUpdated(data.user);
          }
        }
      })
      .catch(() => {
        // Keep cached session offline until next network request
      });

    return () => {
      cancelled = true;
    };
  }, [handleSessionExpired, handleUserUpdated]);

  useEffect(() => {
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.warn('Failed to save sessions to localStorage:', e);
    }
  }, [sessions]);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save settings to localStorage:', e);
    }
  }, [settings]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const activeMessages = activeSession ? activeSession.messages : [];

  const handleToggleTheme = () => {
    setSettings((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark'
    }));
  };

  const handleToggleWebSearch = () => {
    setSettings((prev) => ({
      ...prev,
      webSearchEnabled: !prev.webSearchEnabled
    }));
  };

  const handleToggleFreeOnly = () => {
    if (enforceFreeModelsOnly) return;
    setSettings((prev) => ({
      ...prev,
      freeModelsOnly: !prev.freeModelsOnly
    }));
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);

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

  const handleNewChat = () => {
    if (isStreaming) {
      handleStopStreaming();
    }
    const approvedIds = catalogModels.length > 0 ? catalogModels.map((m) => m.id) : undefined;
    const initialModel = normalizeModelId(settings.model, approvedIds, catalogDefaultModelId);
    const newSession = createInitialSession(initialModel);
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        handleNewChat();
      }
      if (e.key === 'Escape') {
        setIsSettingsOpen(false);
        setIsAuthModalOpen(false);
        setIsAdminModelsOpen(false);
        setPendingPaidRequest(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleDeleteSession = (id: string) => {
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      if (remaining.length === 0) {
        const fresh = createInitialSession(settings.model);
        setActiveSessionId(fresh.id);
        return [fresh];
      }
      if (activeSessionId === id) {
        setActiveSessionId(remaining[0].id);
      }
      return remaining;
    });
  };

  const handleRenameSession = (id: string, newTitle: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: newTitle, updatedAt: new Date().toISOString() } : s))
    );
  };

  const handleClearAllSessions = () => {
    if (isStreaming) {
      handleStopStreaming();
    }
    const fresh = createInitialSession(settings.model);
    setSessions([fresh]);
    setActiveSessionId(fresh.id);
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify([fresh]));
      localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, fresh.id);
    } catch {
      // ignore storage errors
    }
  };

  const generateShortTitle = (text: string, attachments: MessageAttachment[]): string => {
    const clean = text.replace(/https?:\/\/\S+/g, '').replace(/^[#*>\-\s]+/, '').trim();
    if (!clean && attachments.length > 0) {
      return attachments[0].name.slice(0, 32);
    }
    if (clean.length <= 36) return clean || 'New conversation';
    const words = clean.split(/\s+/);
    let title = '';
    for (const w of words) {
      if ((title + ' ' + w).trim().length > 34) break;
      title = (title + ' ' + w).trim();
    }
    return title ? `${title}...` : clean.slice(0, 34) + '...';
  };

  const syncChatsToServer = async (overrideSessions?: ChatSession[]): Promise<boolean> => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return false;

    const listToSync = overrideSessions || sessionsRef.current;

    try {
      const res = await fetch(getApiUrl('/api/auth/sync-data'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          savedChats: listToSync.slice(0, 30).map((s) => ({
            id: s.id,
            title: s.title,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
            model: s.model,
            messages: s.messages.map((m) => ({
              id: m.id,
              role: m.role,
              text: m.text,
              timestamp: m.timestamp,
              sources: m.sources,
              searchQueries: m.searchQueries,
              modelUsed: m.modelUsed,
              modelIdUsed: m.modelIdUsed,
              providerUsed: m.providerUsed
            }))
          })),
          chatSessionCount: listToSync.length,
          themePreference: settings.theme
        })
      });
      if (res.status === 401) {
        handleSessionExpired();
        return false;
      }
      if (res.ok && isJsonResponse(res)) {
        const data = await res.json();
        if (data?.user) {
          handleUserUpdated(data.user);
        }
        return true;
      }
      return res.ok;
    } catch {
      return false;
    }
  };

  const handleRestoreChatsFromServer = (serverChats: ChatSession[]) => {
    if (!Array.isArray(serverChats) || serverChats.length === 0) return;
    const sanitizedServerChats = sanitizeRestoredSessions(serverChats);
    setSessions((prev) => {
      const existingIds = new Set(prev.map((s) => s.id));
      const merged = [...prev];
      for (const sc of sanitizedServerChats) {
        if (!existingIds.has(sc.id)) {
          merged.push(sc);
        }
      }
      merged.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      return merged;
    });
  };

  const handleSendMessage = async (
    text: string,
    attachments: MessageAttachment[] = [],
    overrideBaseMessages?: ChatMessage[],
    explicitPaidConfirm = false
  ) => {
    const selectedModelEntry = catalogModels.find((m) => m.id === settings.model);
    if (
      selectedModelEntry &&
      selectedModelEntry.pricingTier !== 'free' &&
      !explicitPaidConfirm &&
      !confirmedPaidModelsRef.current.includes(selectedModelEntry.id)
    ) {
      setPendingPaidRequest({
        text,
        attachments,
        overrideBaseMessages,
        modelItem: selectedModelEntry
      });
      return;
    }

    if (isStreaming) {
      handleStopStreaming();
    }

    const baseMessages = overrideBaseMessages !== undefined ? overrideBaseMessages : activeMessages;
    const targetSessionId = activeSession?.id || activeSessionId;

    const userMsgId = generateUniqueId('msg');
    const assistantMsgId = generateUniqueId('asst');

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

    const updatedMessages = [...baseMessages, userMessage, assistantPlaceholder];
    const isFirstMessage = baseMessages.length === 0;
    const newTitle = isFirstMessage
      ? generateShortTitle(text, attachments)
      : (activeSession?.title || 'New conversation');

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== targetSessionId) return s;
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

    const historyPayload = baseMessages
      .filter((m) => !m.error && (m.text.trim() || (m.attachments && m.attachments.length > 0)))
      .map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        text: m.text,
        attachments: m.attachments?.map((a) => ({
          name: a.name,
          type: a.type,
          data: a.data,
          textContent: a.textContent
        }))
      }));

    try {
      const response = await fetch(getApiUrl('/api/chat/stream'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          message: text,
          history: historyPayload,
          model: settings.model,
          freeOnly: settings.freeModelsOnly || enforceFreeModelsOnly,
          confirmPaidModel:
            explicitPaidConfirm || confirmedPaidModelsRef.current.includes(settings.model),
          thinkingLevel: settings.thinkingLevel,
          webSearchEnabled: settings.webSearchEnabled,
          systemInstruction: settings.systemInstruction,
          language: settings.language,
          attachments: attachments.map((a) => ({
            name: a.name,
            type: a.type,
            data: a.data,
            textContent: a.textContent
          }))
        })
      });

      const responseType = (response.headers.get('content-type') || '').toLowerCase();
      if (!response.ok) {
        let serverError = `HTTP ${response.status}: Failed to connect to chat stream`;
        if (isJsonResponse(response)) {
          try {
            const errJson = await response.json();
            if (response.status === 409 && errJson?.requiresPaidConfirmation) {
              const previousTitle = activeSession?.title || 'New conversation';
              setSessions((prev) =>
                prev.map((s) =>
                  s.id !== targetSessionId
                    ? s
                    : { ...s, title: previousTitle, messages: baseMessages }
                )
              );
              const matchedModel: ModelCatalogItem =
                errJson.model ||
                selectedModelEntry || {
                  id: settings.model,
                  provider: settings.model.startsWith('claude')
                    ? 'anthropic'
                    : settings.model.includes('/')
                      ? 'openrouter'
                      : 'gemini',
                  name: settings.model,
                  tag: 'Paid / Unverified',
                  description: errJson.error || 'Explicit confirmation is required before sending.',
                  pricingTier: 'unverified',
                  pricingNote: 'Paid or price not verified',
                  capabilities: { streaming: true },
                  providerConfigured: true,
                };
              fetchModelCatalogue();
              setPendingPaidRequest({
                text,
                attachments,
                overrideBaseMessages,
                modelItem: matchedModel,
              });
              return;
            }
            if (errJson?.error) serverError = errJson.error;
          } catch {
            // keep generic HTTP message
          }
        } else if (response.status === 404 || response.status === 405) {
          serverError = 'Chat backend is unavailable on static hosting. Configure VITE_API_BASE_URL or deploy with the Express server.';
        }
        throw new Error(serverError);
      }

      if (responseType.includes('text/html')) {
        throw new Error('Chat backend is unavailable on static hosting. Configure VITE_API_BASE_URL or deploy with the Express server.');
      }

      if (!response.body) {
        throw new Error('Response stream is unavailable.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedText = '';
      let collectedSources: any[] = [];
      let collectedQueries: string[] = [];
      let resolvedModelUsed: string | undefined;
      let resolvedModelIdUsed: string | undefined;
      let resolvedProviderUsed: ModelProvider | undefined;
      let streamErrorMsg = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const evt of events) {
          const lines = evt.split('\n');
          for (const rawLine of lines) {
            const trimmed = rawLine.trim();
            if (!trimmed.startsWith('data:')) continue;

            let data: any;
            try {
              data = JSON.parse(trimmed.replace(/^data:\s*/, ''));
            } catch {
              continue;
            }

            if (data.text) {
              streamedText += data.text;
              setSessions((prev) =>
                prev.map((s) => {
                  if (s.id !== targetSessionId) return s;
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
              if (Array.isArray(data.sources)) collectedSources = data.sources;
              if (Array.isArray(data.searchQueries)) collectedQueries = data.searchQueries;
              if (typeof data.modelUsed === 'string') resolvedModelUsed = data.modelUsed;
              if (typeof data.modelIdUsed === 'string') resolvedModelIdUsed = data.modelIdUsed;
              if (typeof data.providerUsed === 'string') {
                resolvedProviderUsed = data.providerUsed as ModelProvider;
              }
            }

            if (data.error) {
              streamErrorMsg = data.error;
            }
          }
        }
      }

      if (streamErrorMsg) {
        throw new Error(streamErrorMsg);
      }

      let finalizedSessions: ChatSession[] = [];
      setSessions((prev) => {
        finalizedSessions = prev.map((s) => {
          if (s.id !== targetSessionId) return s;
          return {
            ...s,
            messages: s.messages.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    text: streamedText,
                    isStreaming: false,
                    modelUsed: resolvedModelUsed,
                    modelIdUsed: resolvedModelIdUsed,
                    providerUsed: resolvedProviderUsed,
                    sources: collectedSources.length > 0 ? collectedSources : undefined,
                    searchQueries: collectedQueries.length > 0 ? collectedQueries : undefined
                  }
                : m
            ),
            updatedAt: new Date().toISOString()
          };
        });
        return finalizedSessions;
      });

      if (currentUser && finalizedSessions.length > 0) {
        syncChatsToServer(finalizedSessions);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User intentionally stopped generation
      } else {
        const readableErr = err?.message || 'An error occurred while generating the response. Please retry.';
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== targetSessionId) return s;
            return {
              ...s,
              messages: s.messages.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      isStreaming: false,
                      error: true,
                      errorText: readableErr
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

  const handleRegenerate = () => {
    if (activeMessages.length < 2) return;

    let lastUserIndex = -1;
    for (let i = activeMessages.length - 1; i >= 0; i--) {
      if (activeMessages[i].role === 'user') {
        lastUserIndex = i;
        break;
      }
    }

    if (lastUserIndex === -1) return;

    const userMsg = activeMessages[lastUserIndex];
    const pruned = activeMessages.slice(0, lastUserIndex);

    handleSendMessage(userMsg.text, userMsg.attachments || [], pruned);
  };

  const handleEditMessage = (id: string, newText: string) => {
    const targetIndex = activeMessages.findIndex((m) => m.id === id);
    if (targetIndex === -1) return;

    const oldMsg = activeMessages[targetIndex];
    const pruned = activeMessages.slice(0, targetIndex);

    handleSendMessage(newText, oldMsg.attachments || [], pruned);
  };

  const handleRetry = () => {
    handleRegenerate();
  };

  const handleAuthSuccess = (user: AuthUser, token: string) => {
    setCurrentUser(user);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  };

  const handleLogout = () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      fetch(getApiUrl('/api/auth/logout'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ token })
      }).catch(() => {});
    }
    setCurrentUser(null);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
  };

  return (
    <div className="flex h-screen h-[100dvh] w-full overflow-hidden bg-[#f8fafc] dark:bg-[#080C14] text-slate-900 dark:text-slate-100 font-sans">
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => {
          setActiveSessionId(id);
          if (window.innerWidth < 768) {
            setIsSidebarOpen(false);
          }
        }}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        onClearAllSessions={handleClearAllSessions}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        currentUser={currentUser}
        theme={settings.theme}
        onToggleTheme={handleToggleTheme}
      />

      <ChatWindow
        messages={activeMessages}
        isStreaming={isStreaming}
        onSendMessage={(text, atts) => handleSendMessage(text, atts)}
        onStopStreaming={handleStopStreaming}
        onRegenerate={handleRegenerate}
        onEditMessage={handleEditMessage}
        onRetry={handleRetry}
        onSelectPrompt={(prompt) => handleSendMessage(prompt, [])}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        models={catalogModels}
        currentModel={settings.model}
        onSelectModel={(model) => setSettings((prev) => ({ ...prev, model }))}
        freeOnly={settings.freeModelsOnly}
        enforceFreeModelsOnly={enforceFreeModelsOnly}
        onToggleFreeOnly={handleToggleFreeOnly}
        webSearchEnabled={settings.webSearchEnabled}
        onToggleWebSearch={handleToggleWebSearch}
        language={settings.language}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAdminModels={
          currentUser?.role === 'admin' ? () => setIsAdminModelsOpen(true) : undefined
        }
        theme={settings.theme}
        onToggleTheme={handleToggleTheme}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        enforceFreeModelsOnly={enforceFreeModelsOnly}
        onSaveSettings={(newSettings) => setSettings(newSettings)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onAuthSuccess={handleAuthSuccess}
        onUserUpdated={handleUserUpdated}
        onSessionExpired={handleSessionExpired}
        onLogout={handleLogout}
        onSyncChatsToServer={() => syncChatsToServer()}
        onRestoreChatsFromServer={handleRestoreChatsFromServer}
        onOpenAdminModels={
          currentUser?.role === 'admin' ? () => setIsAdminModelsOpen(true) : undefined
        }
      />

      <AdminModelsModal
        isOpen={isAdminModelsOpen}
        onClose={() => setIsAdminModelsOpen(false)}
        onCatalogueUpdated={fetchModelCatalogue}
      />

      <PaidModelConfirmModal
        isOpen={Boolean(pendingPaidRequest)}
        model={pendingPaidRequest?.modelItem || null}
        onCancel={() => setPendingPaidRequest(null)}
        onSwitchToFree={
          catalogModels.some((m) => m.pricingTier === 'free')
            ? () => {
                const freeModel = catalogModels.find((m) => m.pricingTier === 'free');
                if (freeModel) {
                  setSettings((prev) => ({ ...prev, model: freeModel.id }));
                }
                setPendingPaidRequest(null);
              }
            : undefined
        }
        onConfirm={() => {
          if (!pendingPaidRequest) return;
          const req = pendingPaidRequest;
          const next = Array.from(new Set([...confirmedPaidModels, req.modelItem.id]));
          confirmedPaidModelsRef.current = next;
          setConfirmedPaidModels(next);
          setPendingPaidRequest(null);
          handleSendMessage(req.text, req.attachments, req.overrideBaseMessages, true);
        }}
      />
    </div>
  );
}

export default App;
