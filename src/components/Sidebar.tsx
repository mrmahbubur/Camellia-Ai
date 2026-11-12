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
  Sparkles,
  ShieldCheck,
  Globe
} from 'lucide-react';
import { ChatSession } from '../types/chat';
import { AuthUser } from './AuthModal';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  currentUser: AuthUser | null;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
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
  onOpenSettings,
  onOpenAuth,
  currentUser,
  theme,
  onToggleTheme
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
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

  // Group sessions by date
  const now = new Date();
  const todaySessions: ChatSession[] = [];
  const yesterdaySessions: ChatSession[] = [];
  const pastWeekSessions: ChatSession[] = [];
  const olderSessions: ChatSession[] = [];

  for (const s of filteredSessions) {
    const sDate = new Date(s.updatedAt || s.createdAt);
    const diffMs = now.getTime() - sDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      todaySessions.push(s);
    } else if (diffDays === 1) {
      yesterdaySessions.push(s);
    } else if (diffDays <= 7) {
      pastWeekSessions.push(s);
    } else {
      olderSessions.push(s);
    }
  }

  const renderGroup = (title: string, groupList: ChatSession[]) => {
    if (groupList.length === 0) return null;
    return (
      <div className="mb-4">
        <div className="px-3 pb-1 text-[11px] font-medium tracking-wider uppercase text-neutral-400 dark:text-neutral-500 font-mono">
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
                    ? 'bg-neutral-200 dark:bg-[#202123] text-neutral-900 dark:text-neutral-100 font-medium shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-[#1a1a1c] hover:text-neutral-900 dark:hover:text-neutral-200'
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
                      className="p-1 hover:text-emerald-500 text-neutral-400"
                      title="Save title"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={cancelRename}
                      className="p-1 hover:text-rose-500 text-neutral-400"
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

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={(e) => startRename(s, e)}
                        className="p-1 hover:text-neutral-900 dark:hover:text-white text-neutral-400 transition-colors"
                        title="Rename conversation"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(s.id);
                        }}
                        className="p-1 hover:text-rose-400 text-neutral-400 transition-colors"
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
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 sm:w-72 flex flex-col bg-neutral-50 dark:bg-[#111113] border-r border-neutral-200 dark:border-[#202024] transition-transform duration-300 ease-in-out shrink-0 select-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:opacity-0 md:overflow-hidden md:border-none'
        }`}
      >
        {/* Top Header & New Chat */}
        <div className="p-3.5 space-y-3 border-b border-neutral-200 dark:border-[#202024]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-500 font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-semibold text-neutral-900 dark:text-white text-sm tracking-tight font-['Outfit']">
                Camellia <span className="text-teal-500">AI</span>
              </span>
            </div>

            <button
              onClick={onToggle}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-[#1e1e22] transition-colors md:hidden"
              title="Close sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1a1a1d] hover:bg-neutral-100 dark:hover:bg-[#222226] border border-neutral-200 dark:border-[#2a2a30] text-neutral-900 dark:text-neutral-100 text-xs sm:text-sm font-medium transition-all shadow-xs group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-teal-500 group-hover:rotate-90 transition-transform duration-200" />
              <span>New chat</span>
            </div>
            <kbd className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-[#141416] text-neutral-400 border border-neutral-200 dark:border-neutral-800">
              ⌘K
            </kbd>
          </button>

          {/* Search sessions */}
          {sessions.length > 2 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search history..."
                className="w-full bg-white dark:bg-[#1a1a1d] border border-neutral-200 dark:border-[#2a2a30] rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-900 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:border-teal-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Scrollable Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-8 text-neutral-400 dark:text-neutral-500 text-xs">
              {searchQuery ? 'No conversations found.' : 'No conversations yet.'}
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

        {/* Bottom Bar: Settings, Theme & Account */}
        <div className="p-3 border-t border-neutral-200 dark:border-[#202024] space-y-1">
          <div className="flex items-center justify-between gap-1">
            {/* Account Profile Button */}
            <button
              onClick={onOpenAuth}
              className="flex-1 flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-[#1e1e22] transition-colors truncate cursor-pointer"
              title={currentUser ? `Logged in as ${currentUser.username}` : 'Sign up / Log in to sync chats'}
            >
              <div className="w-6 h-6 rounded-full bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-500 shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
              <span className="truncate">
                {currentUser ? currentUser.username : 'Account'}
              </span>
              {currentUser && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 ml-auto" />
              )}
            </button>

            {/* Theme Toggle */}
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-[#1e1e22] transition-colors cursor-pointer shrink-0"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Settings Button */}
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-[#1e1e22] transition-colors cursor-pointer shrink-0"
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
