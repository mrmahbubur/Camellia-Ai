import React, { useState, useMemo } from 'react';
import { X, ExternalLink, Search, Megaphone } from 'lucide-react';
import {
  SPONSOR_LINKS,
  SPONSOR_CATEGORIES,
  SponsorCategory
} from '../data/sponsors';

interface SponsorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  is3DView?: boolean;
}

export const SponsorsModal: React.FC<SponsorsModalProps> = ({
  isOpen,
  onClose,
  is3DView = false
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'All' | SponsorCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSponsors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return SPONSOR_LINKS.filter((item) => {
      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.tagline.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.slotCode.includes(q)
      );
    });
  }, [selectedCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 ${
        is3DView ? '' : 'backdrop-blur-xs'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sponsors-modal-title"
    >
      <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-[#0E1522] border border-slate-200 dark:border-white/12 shadow-2xl flex flex-col max-h-[88dvh] text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-200 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-teal-500/12 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
              <Megaphone className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2
                id="sponsors-modal-title"
                className="text-base sm:text-lg font-bold tracking-tight font-['Outfit'] truncate"
              >
                Sponsors & Partner Links
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Sponsored placements supporting Camellia AI · {SPONSOR_LINKS.length} partner links
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close sponsors directory"
            className="min-h-10 min-w-10 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="px-5 py-3.5 border-b border-slate-200/80 dark:border-white/8 space-y-3 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter sponsors by topic or partner..."
              aria-label="Filter sponsors"
              className="w-full bg-slate-50 dark:bg-[#080C14] border border-slate-200 dark:border-white/12 rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-2 p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap" role="tablist" aria-label="Sponsor categories">
            <button
              type="button"
              role="tab"
              aria-selected={selectedCategory === 'All'}
              onClick={() => setSelectedCategory('All')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                selectedCategory === 'All'
                  ? 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/35'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent'
              }`}
            >
              All ({SPONSOR_LINKS.length})
            </button>
            {SPONSOR_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={selectedCategory === category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  selectedCategory === category
                    ? 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/35'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Sponsor Cards Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {filteredSponsors.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No matching sponsor links found.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('All');
                  setSearchQuery('');
                }}
                className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredSponsors.map((sponsor) => (
                <a
                  key={sponsor.id}
                  href={sponsor.url}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="group p-4 rounded-xl bg-slate-50/85 dark:bg-[#080C14]/85 hover:bg-white dark:hover:bg-[#131C2E] border border-slate-200 dark:border-white/10 hover:border-teal-500/45 transition-colors flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="truncate">
                        Sponsored · {sponsor.category}
                      </span>
                      <span className="font-mono tabular-nums shrink-0 text-slate-400 dark:text-slate-500">
                        #{sponsor.slotCode}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-300 transition-colors">
                      {sponsor.name}
                    </h3>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {sponsor.tagline}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 dark:border-white/8 text-xs">
                    <span className="font-medium text-teal-600 dark:text-teal-400 whitespace-nowrap">
                      {sponsor.ctaLabel}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-500 transition-colors shrink-0" />
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Footer Disclosure */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
          <span>Links open external partner pages in a new tab.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
