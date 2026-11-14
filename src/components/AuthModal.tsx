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
  Download
} from 'lucide-react';
import { ChatSession } from '../types/chat';
import { getApiUrl, isJsonResponse } from '../utils/api';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
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
  onLogout: () => void;
  onSyncChatsToServer?: () => Promise<boolean>;
  onRestoreChatsFromServer?: (chats: ChatSession[]) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAuthSuccess,
  onLogout,
  onSyncChatsToServer,
  onRestoreChatsFromServer
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [userNotes, setUserNotes] = useState(currentUser?.savedData?.notes || '');
  const [notesSaved, setNotesSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUserNotes(currentUser?.savedData?.notes || '');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const resetForm = () => {
    setUsernameOrEmail('');
    setPassword('');
    setPasswordConfirm('');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmedUser = usernameOrEmail.trim();
    if (!trimmedUser) {
      setErrorMsg('Please enter your username or email.');
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
      const payload = mode === 'signup'
        ? { usernameOrEmail: trimmedUser, password, passwordConfirm }
        : { usernameOrEmail: trimmedUser, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!isJsonResponse(res)) {
        throw new Error('Backend server is unavailable on static hosting. Configure VITE_API_BASE_URL or run the full-stack server.');
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Authentication failed. Please verify credentials.');
      }

      setSuccessMsg(mode === 'signup' ? 'Account created and secured!' : 'Signed in successfully!');
      setTimeout(() => {
        onAuthSuccess(data.user, data.token);
        resetForm();
      }, 450);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveNotes = async () => {
    const token = localStorage.getItem('camellia_auth_token');
    if (!token) return;

    try {
      const res = await fetch(getApiUrl('/api/auth/sync-data'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ notes: userNotes })
      });
      if (res.ok) {
        setNotesSaved(true);
        setTimeout(() => setNotesSaved(false), 2000);
      }
    } catch (err) {
      console.warn('Failed to save notes:', err);
    }
  };

  const handleSyncChats = async () => {
    if (!onSyncChatsToServer) return;
    setIsSyncing(true);
    setErrorMsg('');
    try {
      const ok = await onSyncChatsToServer();
      if (ok) {
        setSuccessMsg('Conversations backed up to your account.');
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setErrorMsg('Unable to sync conversations. Please sign in again.');
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
    try {
      const res = await fetch(getApiUrl('/api/auth/me'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!isJsonResponse(res)) {
        throw new Error('Backend server is unavailable on static hosting.');
      }
      const data = await res.json();
      if (res.ok && data.user?.savedData?.savedChats?.length) {
        onRestoreChatsFromServer(data.user.savedData.savedChats);
        setSuccessMsg(`Restored ${data.user.savedData.savedChats.length} conversations from your account.`);
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setErrorMsg('No backed-up conversations found on server.');
      }
    } catch {
      setErrorMsg('Failed to restore conversations.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white dark:bg-[#141418] border border-neutral-200 dark:border-[#27272e] rounded-2xl shadow-2xl text-neutral-900 dark:text-neutral-100 overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-[#27272e] flex items-center justify-between bg-neutral-50 dark:bg-[#1a1a20]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-600 dark:text-teal-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">
                {currentUser ? 'Account & Cloud Sync' : 'Camellia Account'}
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {currentUser ? `Signed in as ${currentUser.username}` : 'Sync conversations and notes securely'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-200/70 dark:hover:bg-[#27272e] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {currentUser ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-[#1a1a20] border border-neutral-200 dark:border-[#27272e] space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                  <span className="font-semibold">Account Details</span>
                  <span className="text-teal-600 dark:text-teal-400 font-medium">Verified</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div>
                    <span className="text-neutral-500 text-[11px] block">Username</span>
                    <span className="font-medium truncate block">{currentUser.username}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 text-[11px] block">Email</span>
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
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
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
                  className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-[#0e0e12] border border-neutral-200 dark:border-[#27272e] text-neutral-900 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:border-teal-500 resize-none"
                />
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className="w-full py-2 rounded-xl bg-neutral-100 dark:bg-[#222229] hover:bg-neutral-200 dark:hover:bg-[#2b2b34] text-neutral-800 dark:text-neutral-200 text-xs font-medium transition-colors cursor-pointer border border-neutral-200 dark:border-[#32323d]"
                >
                  Save Notes
                </button>
              </div>

              {/* Chat Sync Controls */}
              {onSyncChatsToServer && (
                <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-[#1a1a20] border border-neutral-200 dark:border-[#27272e] space-y-2.5">
                  <div>
                    <h4 className="text-xs font-semibold">Conversation Backup</h4>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Back up local conversations or restore from your account.
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
                        className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-[#222229] hover:bg-neutral-100 dark:hover:bg-[#2b2b34] border border-neutral-200 dark:border-[#32323d] text-neutral-800 dark:text-neutral-200 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Restore Chats</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Log Out */}
              <button
                type="button"
                onClick={onLogout}
                className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex rounded-xl bg-neutral-100 dark:bg-[#0e0e12] p-1 border border-neutral-200 dark:border-[#27272e]">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    mode === 'login'
                      ? 'bg-white dark:bg-[#222229] text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Log In</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setErrorMsg(''); setSuccessMsg(''); }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    mode === 'signup'
                      ? 'bg-white dark:bg-[#222229] text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Sign Up</span>
                </button>
              </div>

              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                {mode === 'signup'
                  ? 'Create an account to back up your conversations and notes across sessions.'
                  : 'Sign in with your username or email to access your saved chats.'}
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
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Username or Email</span>
                  </label>
                  <input
                    type="text"
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    placeholder="username or email@example.com"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-[#0e0e12] border border-neutral-200 dark:border-[#27272e] text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 text-xs focus:outline-none focus:border-teal-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Password</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password (min 6 characters)"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-[#0e0e12] border border-neutral-200 dark:border-[#27272e] text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 text-xs focus:outline-none focus:border-teal-500 transition-colors font-mono"
                  />
                </div>

                {mode === 'signup' && (
                  <div>
                    <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-teal-500" />
                      <span>Confirm Password</span>
                    </label>
                    <input
                      type="password"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="Re-enter password"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-[#0e0e12] border border-neutral-200 dark:border-[#27272e] text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 text-xs focus:outline-none focus:border-teal-500 transition-colors font-mono"
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
