import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  User,
  ShieldCheck,
  LogIn,
  UserPlus,
  LogOut,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  KeyRound,
  Database,
  Download,
  SlidersHorizontal,
  Eye,
  EyeOff
} from 'lucide-react';
import { ChatSession } from '../types/chat';
import { getApiUrl, isJsonResponse } from '../utils/api';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role?: 'admin' | 'user';
  createdAt: string;
  lastLogin: string;
  savedData?: {
    notes?: string;
    themePreference?: string;
    chatSessionCount?: number;
    savedChats?: ChatSession[];
  };
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  onAuthSuccess: (user: AuthUser, token: string) => void;
  onUserUpdated?: (user: AuthUser) => void;
  onSessionExpired?: () => void;
  onLogout: () => void;
  onSyncChatsToServer?: () => Promise<boolean>;
  onRestoreChatsFromServer?: (chats: ChatSession[]) => void;
  onOpenAdminModels?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAuthSuccess,
  onUserUpdated,
  onSessionExpired,
  onLogout,
  onSyncChatsToServer,
  onRestoreChatsFromServer,
  onOpenAdminModels
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [userNotes, setUserNotes] = useState(currentUser?.savedData?.notes || '');
  const [notesSaved, setNotesSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUserNotes(currentUser?.savedData?.notes || '');
      setErrorMsg('');
      setNotesSaved(false);
    } else {
      setSuccessMsg('');
      setErrorMsg('');
      setShowPassword(false);
    }
  }, [isOpen, currentUser?.id, currentUser?.savedData?.notes]);

  if (!isOpen) return null;

  const resetForm = () => {
    setUsernameOrEmail('');
    setPassword('');
    setPasswordConfirm('');
    setShowPassword(false);
    setErrorMsg('');
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmedUser = usernameOrEmail.trim();
    if (!trimmedUser || trimmedUser.length < 3) {
      setErrorMsg('Please enter your username or email (minimum 3 characters).');
      return;
    }

    if (/\s/.test(trimmedUser)) {
      setErrorMsg('Username or email cannot contain spaces.');
      return;
    }

    if (trimmedUser.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmedUser)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters.');
        return;
      }
      if (password !== passwordConfirm) {
        setErrorMsg('Passwords do not match. Please verify both password fields.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const endpoint = getApiUrl(mode === 'signup' ? '/api/auth/signup' : '/api/auth/login');
      const payload =
        mode === 'signup'
          ? { usernameOrEmail: trimmedUser, password, passwordConfirm }
          : { usernameOrEmail: trimmedUser, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!isJsonResponse(res)) {
        throw new Error(
          'Backend server is unavailable on static hosting. Configure VITE_API_BASE_URL or run the full-stack server.'
        );
      }

      const data = await res.json();
      if (!res.ok || !data.success || !data.user || !data.token) {
        throw new Error(data.error || 'Authentication failed. Please verify credentials.');
      }

      onAuthSuccess(data.user, data.token);
      resetForm();
      setSuccessMsg(mode === 'signup' ? 'Account created and signed in!' : 'Signed in successfully!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveNotes = async () => {
    const token = localStorage.getItem('camellia_auth_token');
    if (!token) {
      onSessionExpired?.();
      setErrorMsg('Your session has expired. Please sign in again.');
      return;
    }

    setIsSavingNotes(true);
    setErrorMsg('');
    try {
      const res = await fetch(getApiUrl('/api/auth/sync-data'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ notes: userNotes })
      });

      if (res.status === 401) {
        onSessionExpired?.();
        setErrorMsg('Session expired. Please sign in again.');
        return;
      }

      if (!isJsonResponse(res)) {
        throw new Error('Backend server is unavailable.');
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save notes.');
      }

      if (data.user) {
        onUserUpdated?.(data.user);
      }
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not save notes. Please try again.');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleSyncChats = async () => {
    if (!onSyncChatsToServer) return;
    setIsSyncing(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const ok = await onSyncChatsToServer();
      if (ok) {
        setSuccessMsg('Conversations backed up to your account.');
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setErrorMsg('Unable to sync conversations. Your session may have expired — please sign in again.');
      }
    } catch {
      setErrorMsg('Chat synchronization failed.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreChats = async () => {
    const token = localStorage.getItem('camellia_auth_token');
    if (!token || !onRestoreChatsFromServer) return;
    setIsSyncing(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch(getApiUrl('/api/auth/me'), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 401) {
        onSessionExpired?.();
        setErrorMsg('Session expired. Please sign in again.');
        return;
      }

      if (!isJsonResponse(res)) {
        throw new Error('Backend server is unavailable on static hosting.');
      }

      const data = await res.json();
      if (data.user) {
        onUserUpdated?.(data.user);
      }
      const savedChats = data.user?.savedData?.savedChats;
      if (res.ok && Array.isArray(savedChats) && savedChats.length > 0) {
        onRestoreChatsFromServer(savedChats);
        setSuccessMsg(`Restored ${savedChats.length} conversation(s) from your account.`);
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setErrorMsg('No backed-up conversations found on server yet.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to restore conversations.');
    } finally {
      setIsSyncing(false);
    }
  };

  const savedChatCount = currentUser?.savedData?.savedChats?.length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white dark:bg-[#0E1522] border border-slate-200 dark:border-white/12 rounded-2xl shadow-2xl text-slate-900 dark:text-slate-100 overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-[#0B111C]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-600 dark:text-teal-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">
                {currentUser ? 'Account & Cloud Sync' : 'Camellia Account'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {currentUser
                  ? `Signed in as ${currentUser.username}`
                  : 'Sync conversations and notes securely'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {currentUser ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B111C] border border-slate-200 dark:border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold">Account Details</span>
                  <div className="flex items-center gap-1.5">
                    {currentUser.role === 'admin' && (
                      <>
                        <span className="text-teal-700 dark:text-teal-300 font-semibold">Admin</span>
                        <span aria-hidden="true">·</span>
                      </>
                    )}
                    <span className="text-teal-600 dark:text-teal-400 font-medium">Verified</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Username</span>
                    <span className="font-medium truncate block">{currentUser.username}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Email</span>
                    <span className="font-medium truncate block">{currentUser.email}</span>
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-700 dark:text-teal-300 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Saved Notes */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-teal-500" />
                    <span>Saved Notes</span>
                  </label>
                  {notesSaved && (
                    <span className="text-[11px] text-teal-600 dark:text-teal-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Saved
                    </span>
                  )}
                </div>
                <textarea
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  placeholder="Save personal notes or workspace reminders..."
                  rows={3}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#080C14] border border-slate-200 dark:border-white/12 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-500 resize-none"
                />
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                  className="w-full py-2 rounded-xl bg-slate-100 dark:bg-white/8 hover:bg-slate-200 dark:hover:bg-white/12 text-slate-800 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer border border-slate-200 dark:border-white/12 disabled:opacity-50"
                >
                  {isSavingNotes ? 'Saving...' : 'Save Notes'}
                </button>
              </div>

              {/* Chat Sync Controls */}
              {onSyncChatsToServer && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B111C] border border-slate-200 dark:border-white/10 space-y-2.5">
                  <div>
                    <h4 className="text-xs font-semibold">Conversation Backup</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Back up local conversations or restore synced sessions from your account.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSyncChats}
                      disabled={isSyncing}
                      className="flex-1 px-3 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Syncing...' : 'Back Up Chats'}</span>
                    </button>
                    {onRestoreChatsFromServer && (
                      <button
                        type="button"
                        onClick={handleRestoreChats}
                        disabled={isSyncing}
                        className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-white/8 hover:bg-slate-100 dark:hover:bg-white/12 border border-slate-200 dark:border-white/12 text-slate-800 dark:text-slate-200 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>
                          Restore{savedChatCount > 0 ? ` (${savedChatCount})` : ''}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {currentUser.role === 'admin' && onOpenAdminModels && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAdminModels();
                  }}
                  className="w-full py-2.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-700 dark:text-teal-300 text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Manage Model Catalogue (Admin)</span>
                </button>
              )}

              {/* Log Out */}
              <button
                type="button"
                onClick={() => {
                  setSuccessMsg('');
                  setErrorMsg('');
                  onLogout();
                }}
                className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex rounded-xl bg-slate-100 dark:bg-[#080C14] p-1 border border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    mode === 'login'
                      ? 'bg-white dark:bg-[#182235] text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Log In</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    mode === 'signup'
                      ? 'bg-white dark:bg-[#182235] text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Sign Up</span>
                </button>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {mode === 'signup'
                  ? 'Create an account with your email or a unique username to sync conversations and notes.'
                  : 'Sign in with your email or username to access your saved chats and notes.'}
              </p>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-700 dark:text-teal-300 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-3.5">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Username or Email</span>
                  </label>
                  <input
                    type="text"
                    name="usernameOrEmail"
                    autoComplete="username"
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    placeholder="username or email@example.com"
                    required
                    minLength={3}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#080C14] border border-slate-200 dark:border-white/12 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-xs focus:outline-none focus:border-teal-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Password</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password (min 6 characters)"
                      required
                      minLength={6}
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-[#080C14] border border-slate-200 dark:border-white/12 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-xs focus:outline-none focus:border-teal-500 transition-colors font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {mode === 'signup' && (
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-teal-500" />
                      <span>Confirm Password</span>
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="passwordConfirm"
                      autoComplete="new-password"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="Re-enter password"
                      required
                      minLength={6}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#080C14] border border-slate-200 dark:border-white/12 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-xs focus:outline-none focus:border-teal-500 transition-colors font-mono"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-2.5 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : mode === 'signup' ? (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Create Account</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Log In</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
