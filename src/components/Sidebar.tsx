import React, { useState } from 'react';
import {
  Plus,
  Search,
  MessageSquare,
  Trash2,
  Edit2,
  Check,
  X,
  Settings,
  Moon,
  Sun,
  User,
  PanelLeftClose,
  Box
} from 'lucide-react';
import { ChatSession } from '../types/chat';
import { AuthUser } from './AuthModal';
import { CamelliaLogo } from './CamelliaLogo';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onClearAllSessions: () => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  currentUser: AuthUser | null;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  is3DView: boolean;
  onToggle3DView: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  onClearAllSessions,
  onOpenSettings,
  onOpenAuth,
  currentUser,
  theme,
  onToggleTheme,
  is3DView,
  onToggle3DView
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.messages.some((m) => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const startRename = (s: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(s.id);
    setEditTitle(s.title);
  };

  const confirmRename = (id: string, e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (editTitle.trim()) {
      onRenameSession(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  // Group sessions chronologically by calendar date
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  const weekStart = todayStart - 7 * 86400000;

  const todaySessions: ChatSession[] = [];
  const yesterdaySessions: ChatSession[] = [];
  const pastWeekSessions: ChatSession[] = [];
  const olderSessions: ChatSession[] = [];

  for (const s of filteredSessions) {
    const sTime = new Date(s.updatedAt || s.createdAt).getTime();
    if (sTime >= todayStart) {
      todaySessions.push(s);
    } else if (sTime >= yesterdayStart) {
      yesterdaySessions.push(s);
    } else if (sTime >= weekStart) {
      pastWeekSessions.push(s);
    } else {
      olderSessions.push(s);
    }
  }

  const renderGroup = (title: string, groupList: ChatSession[]) => {
    if (groupList.length === 0) return null;
    return (
      <div className="mb-4">
        <div className="px-3 pb-1 text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
          {title}
        </div>
        <div className="space-y-1">
          {groupList.map((s) => {
            const isActive = s.id === activeSessionId;
            const isEditing = s.id === editingId;

            return (
              <div
                key={s.id}
                onClick={() => onSelectSession(s.id)}
                className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm cursor-pointer transition-all ${
                  isActive
                    ? 'bg-neutral-200 dark:bg-[#202126] text-neutral-900 dark:text-neutral-100 font-medium'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-[#1a1a1d] hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                {isEditing ? (
                  <form
                    onSubmit={(e) => confirmRename(s.id, e)}
                    className="flex items-center gap-1 w-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full bg-white dark:bg-[#121214] border border-teal-500 text-xs px-2 py-1 rounded text-neutral-900 dark:text-white focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="p-1 hover:text-teal-500 text-neutral-400 cursor-pointer"
                      title="Save title"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={cancelRename}
                      className="p-1 hover:text-rose-500 text-neutral-400 cursor-pointer"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                      <MessageSquare className="w-4 h-4 shrink-0 text-neutral-400 group-hover:text-teal-500 transition-colors" />
                      <span className="truncate">{s.title || 'New conversation'}</span>
                    </div>

                    <div className="flex items-center gap-0.5 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        type="button"
                        onClick={(e) => startRename(s, e)}
                        className="p-1 hover:text-neutral-900 dark:hover:text-white text-neutral-400 transition-colors cursor-pointer"
                        title="Rename conversation"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(s.id);
                        }}
                        className="p-1 hover:text-rose-500 text-neutral-400 transition-colors cursor-pointer"
                        title="Delete conversation"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {isOpen && (
        <div
          onClick={onToggle}
          className={`fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity ${
            is3DView ? '' : 'backdrop-blur-xs'
          }`}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 sm:w-72 flex flex-col border-r border-slate-200 dark:border-white/8 transition-transform duration-200 ease-out shrink-0 select-none ${
          is3DView
            ? 'bg-white/96 dark:bg-[#0B111C]/96'
            : 'bg-white/95 dark:bg-[#0B111C]/95 backdrop-blur-md'
        } ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:opacity-0 md:overflow-hidden md:border-none'
        }`}
      >
        {/* Top Header & New Chat */}
        <div className="p-3.5 space-y-3 border-b border-slate-200 dark:border-white/8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/25 flex items-center justify-center shrink-0">
                <CamelliaLogo size={20} />
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-slate-900 dark:text-white text-sm tracking-tight font-['Outfit'] whitespace-nowrap block">
                  Camellia <span className="text-teal-600 dark:text-teal-400">AI</span>
                </span>
                <span className="text-[10.5px] text-slate-500 dark:text-slate-400 whitespace-nowrap block truncate">
                  Assistant of M R S
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggle}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors md:hidden cursor-pointer"
              title="Close sidebar"
              aria-label="Close sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={onNewChat}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1a1a1e] hover:bg-neutral-100 dark:hover:bg-[#222228] border border-neutral-200 dark:border-[#2a2a30] text-neutral-900 dark:text-neutral-100 text-xs sm:text-sm font-medium transition-all shadow-2xs group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-teal-500 group-hover:rotate-90 transition-transform duration-200" />
              <span>New chat</span>
            </div>
            <kbd className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-[#141416] text-neutral-400 border border-neutral-200 dark:border-neutral-800">
              ⌘K
            </kbd>
          </button>

          {/* Search conversations */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full bg-white dark:bg-[#1a1a1e] border border-neutral-200 dark:border-[#2a2a30] rounded-lg pl-8 pr-7 py-1.5 text-xs text-neutral-900 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:border-teal-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-8 text-neutral-400 dark:text-neutral-500 text-xs">
              {searchQuery ? 'No matching conversations.' : 'No conversations yet.'}
            </div>
          ) : (
            <>
              {renderGroup('Today', todaySessions)}
              {renderGroup('Yesterday', yesterdaySessions)}
              {renderGroup('Previous 7 Days', pastWeekSessions)}
              {renderGroup('Older', olderSessions)}
            </>
          )}
        </div>

        {/* 3D Room Scene Toggle */}
        <div className="px-3 pt-2.5 pb-1 border-t border-neutral-200 dark:border-[#202026]">
          <button
            type="button"
            onClick={onToggle3DView}
            aria-pressed={is3DView}
            data-testid="toggle-3d-view"
            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 ${
              is3DView
                ? 'bg-teal-500/15 border-teal-500/40 text-teal-700 dark:text-teal-300'
                : 'bg-slate-100/80 dark:bg-[#141B29] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-teal-500/35 hover:text-slate-950 dark:hover:text-white'
            }`}
            title={is3DView ? 'Turn off 3D View canvas' : 'Enable interactive 3D room scene behind chat'}
          >
            <span className="flex items-center gap-2 min-w-0">
              <Box className={`w-4 h-4 shrink-0 ${is3DView ? 'text-teal-500 dark:text-teal-400' : 'text-slate-400'}`} />
              <span>3D View</span>
            </span>
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                is3DView
                  ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300'
                  : 'bg-slate-200/80 dark:bg-white/8 text-slate-500 dark:text-slate-400'
              }`}
            >
              {is3DView ? 'On' : 'Off'}
            </span>
          </button>
        </div>

        {/* Device History Notice & Clear Control */}
        <div className="px-3.5 py-2 flex items-center justify-between gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
          <span className="truncate">History is stored on this device</span>
          {confirmClearAll ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onClearAllSessions();
                  setConfirmClearAll(false);
                }}
                className="text-rose-500 hover:text-rose-400 font-semibold cursor-pointer"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setConfirmClearAll(false)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmClearAll(true)}
              className="text-neutral-500 hover:text-rose-500 font-medium transition-colors cursor-pointer shrink-0"
              title="Clear all saved conversations on this device"
            >
              Clear
            </button>
          )}
        </div>

        {/* Bottom Bar */}
        <div className="p-3 border-t border-neutral-200 dark:border-[#202026]">
          <div className="flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex-1 flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/70 dark:hover:bg-[#1e1e22] transition-colors truncate cursor-pointer"
              title={currentUser ? `Account: ${currentUser.username}` : 'Log in or create account'}
            >
              <div className="w-6 h-6 rounded-full bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
              <span className="truncate">
                {currentUser ? currentUser.username : 'Account'}
              </span>
            </button>

            <button
              type="button"
              onClick={onToggleTheme}
              className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/70 dark:hover:bg-[#1e1e22] transition-colors cursor-pointer shrink-0"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onOpenSettings}
              className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/70 dark:hover:bg-[#1e1e22] transition-colors cursor-pointer shrink-0"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
