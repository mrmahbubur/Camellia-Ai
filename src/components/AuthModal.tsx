import React, { useState } from 'react';
import { X, Lock, User, Mail, ShieldCheck, LogIn, UserPlus, LogOut, CheckCircle2, AlertCircle, RefreshCw, KeyRound, Database } from 'lucide-react';

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
    savedChats?: any[];
  };
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  onAuthSuccess: (user: AuthUser, token: string) => void;
  onLogout: () => void;
  onSyncChatsToServer?: () => Promise<boolean>;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAuthSuccess,
  onLogout,
  onSyncChatsToServer
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
      const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const payload = mode === 'signup'
        ? { usernameOrEmail: trimmedUser, password, passwordConfirm }
        : { usernameOrEmail: trimmedUser, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Authentication failed. Please verify credentials.');
      }

      setSuccessMsg(mode === 'signup' ? 'Account created and secured on server!' : 'Login verified!');
      setTimeout(() => {
        onAuthSuccess(data.user, data.token);
        resetForm();
      }, 600);
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
      const res = await fetch('/api/auth/sync-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          savedData: { notes: userNotes }
        })
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
    try {
      await onSyncChatsToServer();
      setSuccessMsg('All conversation history successfully synchronized to server backend.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setErrorMsg('Chat synchronization failed.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#0f172a] border border-[#1e293b] rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.7)] text-neutral-100 overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-[#1e293b] flex items-center justify-between bg-[#162032]/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base text-neutral-100">
                {currentUser ? 'User Account & Server Data' : 'User Account System'}
              </h3>
              <p className="text-[11px] text-teal-300/80 font-mono">
                {currentUser ? `Signed in as @${currentUser.username}` : 'Encrypted Server Storage'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#1e293b] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {currentUser ? (
            /* ---------------- LOGGED IN USER DATA DASHBOARD ---------------- */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#131d2e] border border-[#1e293b] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Account Credentials</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300 font-mono">
                    Server Verified
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div>
                    <span className="text-neutral-500 text-[11px] block">Username:</span>
                    <span className="font-medium text-neutral-200 truncate block">@{currentUser.username}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 text-[11px] block">Email Identifier:</span>
                    <span className="font-medium text-neutral-200 truncate block">{currentUser.email}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 text-[11px] block">Account ID:</span>
                    <span className="font-mono text-[10px] text-neutral-400 block truncate">{currentUser.id}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 text-[11px] block">Encryption:</span>
                    <span className="font-mono text-[10px] text-emerald-400 block">PBKDF2 SHA-512</span>
                  </div>
                </div>
              </div>

              {/* Private User Notes / Saved Workspace Data */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-teal-400" />
                    <span>Your Server-Reserved Notes & Preferences</span>
                  </label>
                  {notesSaved && (
                    <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Saved to server
                    </span>
                  )}
                </div>
                <textarea
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  placeholder="Store private instructions, API configurations, or personal notes reserved securely on the server..."
                  rows={3}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#0b0f19] border border-[#1e293b] text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-teal-500/50 resize-none font-mono"
                />
                <button
                  onClick={handleSaveNotes}
                  className="w-full py-1.5 rounded-lg bg-[#1e293b] hover:bg-[#28384f] text-neutral-200 text-xs font-medium transition-colors cursor-pointer border border-[#334155]"
                >
                  Save Notes to Server
                </button>
              </div>

              {/* Chat Session Backup & Sync */}
              {onSyncChatsToServer && (
                <div className="p-3 rounded-xl bg-[#131d2e] border border-[#1e293b] flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-medium text-neutral-200">Sync Chat History to Server</h4>
                    <p className="text-[11px] text-neutral-400">Back up all your conversations to your account.</p>
                  </div>
                  <button
                    onClick={handleSyncChats}
                    disabled={isSyncing}
                    className="px-3 py-1.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-300 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                  </button>
                </div>
              )}

              {/* Log Out Button */}
              <div className="pt-2">
                <button
                  onClick={onLogout}
                  className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out from Device</span>
                </button>
              </div>
            </div>
          ) : (
            /* ---------------- AUTHENTICATION FORM (SIGN UP & LOGIN) ---------------- */
            <div className="space-y-4">
              {/* Tab Selector: Login vs Sign Up */}
              <div className="flex rounded-xl bg-[#0b0f19] p-1 border border-[#1e293b]">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    mode === 'login'
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
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
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Sign Up</span>
                </button>
              </div>

              {/* Explanatory subtitle */}
              <p className="text-xs text-neutral-400 leading-relaxed">
                {mode === 'signup'
                  ? 'Create your account. No email or phone verification required—enter your username/email and confirm your password twice to reserve your data on the server.'
                  : 'Enter your username or email and password to log in and open your reserved server data.'}
              </p>

              {/* Feedback messages */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-3 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-teal-400" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-3.5">
                {/* Username or Email */}
                <div>
                  <label className="text-xs font-medium text-neutral-300 block mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Username or Email</span>
                  </label>
                  <input
                    type="text"
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    placeholder="e.g. shahin or user@example.com"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0f19] border border-[#1e293b] text-neutral-100 placeholder-neutral-500 text-xs focus:outline-none focus:border-teal-500/50 transition-colors font-sans"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="text-xs font-medium text-neutral-300 block mb-1.5 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Password</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password (min 6 characters)"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0f19] border border-[#1e293b] text-neutral-100 placeholder-neutral-500 text-xs focus:outline-none focus:border-teal-500/50 transition-colors font-mono"
                  />
                </div>

                {/* Password Confirmation (Required for Sign Up) */}
                {mode === 'signup' && (
                  <div>
                    <label className="text-xs font-medium text-neutral-300 block mb-1.5 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-teal-400" />
                      <span>Confirm Password (Twice for verification)</span>
                    </label>
                    <input
                      type="password"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="Re-enter password for exact confirmation"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0f19] border border-[#1e293b] text-neutral-100 placeholder-neutral-500 text-xs focus:outline-none focus:border-teal-500/50 transition-colors font-mono"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Connecting to Server...</span>
                    </>
                  ) : mode === 'signup' ? (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Sign Up & Reserve Data</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Log In & Open Data</span>
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
