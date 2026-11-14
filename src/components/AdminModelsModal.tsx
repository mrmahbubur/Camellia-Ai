import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Ban,
  SlidersHorizontal,
  DollarSign,
  KeyRound,
  Cpu
} from 'lucide-react';
import {
  AdminCatalogueEntry,
  AdminCatalogueStore,
  ModelProvider,
  ModelReviewStatus
} from '../types/chat';
import { getApiUrl, isJsonResponse } from '../utils/api';

interface AdminModelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCatalogueUpdated: () => void;
}

type ProviderKeyMap = Record<ModelProvider, boolean>;

export const AdminModelsModal: React.FC<AdminModelsModalProps> = ({
  isOpen,
  onClose,
  onCatalogueUpdated
}) => {
  const [catalogue, setCatalogue] = useState<AdminCatalogueStore | null>(null);
  const [providers, setProviders] = useState<ProviderKeyMap>({
    gemini: false,
    anthropic: false,
    openrouter: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [busyModelId, setBusyModelId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | ModelReviewStatus>('all');
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [refreshNotes, setRefreshNotes] = useState<string[]>([]);

  // Settings form state
  const [defaultModelId, setDefaultModelId] = useState('');
  const [fallbackModelId, setFallbackModelId] = useState<string>('');
  const [enforceFreeModelsOnly, setEnforceFreeModelsOnly] = useState(false);
  const [maxOutputTokens, setMaxOutputTokens] = useState(8192);
  const [dailySpendCapUsd, setDailySpendCapUsd] = useState(5);

  const syncSettingsFields = (store: AdminCatalogueStore) => {
    setDefaultModelId(store.defaultModelId);
    setFallbackModelId(store.fallbackModelId || '');
    setEnforceFreeModelsOnly(Boolean(store.enforceFreeModelsOnly));
    setMaxOutputTokens(store.maxOutputTokens);
    setDailySpendCapUsd(store.dailySpendCapUsd);
  };

  const fetchCatalogue = useCallback(async () => {
    const token = localStorage.getItem('camellia_auth_token');
    if (!token) {
      setErrorMsg('Please sign in as an administrator to manage the model catalogue.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(getApiUrl('/api/admin/catalogue'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!isJsonResponse(res)) {
        throw new Error('Admin catalogue endpoint requires the Express backend server.');
      }
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load admin model catalogue.');
      }
      setCatalogue(data.catalogue);
      if (data.providers) setProviders(data.providers);
      syncSettingsFields(data.catalogue);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not load admin model catalogue.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setRefreshNotes([]);
      setInfoMsg('');
      fetchCatalogue();
    }
  }, [isOpen, fetchCatalogue]);

  if (!isOpen) return null;

  const handleRefreshFromProviders = async () => {
    const token = localStorage.getItem('camellia_auth_token');
    if (!token) return;

    setIsRefreshing(true);
    setErrorMsg('');
    setInfoMsg('');
    try {
      const res = await fetch(getApiUrl('/api/admin/catalogue/refresh'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!isJsonResponse(res)) {
        throw new Error('Backend server is unavailable.');
      }
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Catalogue refresh failed.');
      }
      setCatalogue(data.catalogue);
      if (data.providers) setProviders(data.providers);
      if (Array.isArray(data.notes)) setRefreshNotes(data.notes);
      syncSettingsFields(data.catalogue);
      setInfoMsg(
        data.discoveredCount > 0
          ? `Discovered ${data.discoveredCount} new model(s) marked as Needs review.`
          : 'Catalogue refreshed. No new models discovered.'
      );
      onCatalogueUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to refresh provider catalogues.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUpdateModelStatus = async (modelId: string, status: ModelReviewStatus) => {
    const token = localStorage.getItem('camellia_auth_token');
    if (!token) return;

    setBusyModelId(modelId);
    setErrorMsg('');
    setInfoMsg('');
    try {
      const res = await fetch(
        getApiUrl(`/api/admin/catalogue/models/${encodeURIComponent(modelId)}`),
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ status })
        }
      );
      if (!isJsonResponse(res)) {
        throw new Error('Backend server is unavailable.');
      }
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Could not update model status.');
      }
      setCatalogue(data.catalogue);
      syncSettingsFields(data.catalogue);
      setInfoMsg(`Updated "${modelId}" to ${status.replace('_', ' ')}.`);
      onCatalogueUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update model.');
    } finally {
      setBusyModelId(null);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('camellia_auth_token');
    if (!token) return;

    setIsSavingSettings(true);
    setErrorMsg('');
    setInfoMsg('');
    try {
      const res = await fetch(getApiUrl('/api/admin/catalogue/settings'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          defaultModelId,
          fallbackModelId: fallbackModelId || null,
          enforceFreeModelsOnly,
          maxOutputTokens: Number(maxOutputTokens),
          dailySpendCapUsd: Number(dailySpendCapUsd)
        })
      });
      if (!isJsonResponse(res)) {
        throw new Error('Backend server is unavailable.');
      }
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save routing settings.');
      }
      setCatalogue(data.catalogue);
      syncSettingsFields(data.catalogue);
      setInfoMsg('Routing and spend governance settings saved dynamically.');
      onCatalogueUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save settings.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const approvedModels = (catalogue?.models || []).filter((m) => m.status === 'approved');
  const approvedFreeModels = approvedModels.filter((m) => m.pricingTier === 'free');
  const filteredModels = (catalogue?.models || []).filter((m: AdminCatalogueEntry) =>
    statusFilter === 'all' ? true : m.status === statusFilter
  );

  const getStatusClass = (status: ModelReviewStatus) => {
    switch (status) {
      case 'approved':
        return 'text-teal-700 dark:text-teal-300';
      case 'needs_review':
        return 'text-amber-700 dark:text-amber-300';
      default:
        return 'text-rose-700 dark:text-rose-300';
    }
  };

  const getPricingText = (tier: AdminCatalogueEntry['pricingTier']) => {
    if (tier === 'free') return 'Free';
    if (tier === 'paid') return 'Paid';
    return 'Price not verified';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs">
      <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-[#0E1522] border border-slate-200 dark:border-white/12 shadow-2xl text-slate-900 dark:text-slate-100 overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/90 dark:bg-[#0B111C] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-600 dark:text-teal-400">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-sm sm:text-base">
                Model Catalogue Governance · Admin
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Refresh providers, review models, enforce free-only mode, and set spend limits without redeploying
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close admin model catalogue"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Provider Credential Status & Refresh Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-slate-200 dark:border-white/10">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <KeyRound className="w-3.5 h-3.5 text-teal-500 shrink-0" />
              <span className="font-medium">Server Keys:</span>
              {(['gemini', 'anthropic', 'openrouter'] as ModelProvider[]).map((prov, i) => (
                <React.Fragment key={prov}>
                  {i > 0 && <span aria-hidden="true" className="text-slate-400">·</span>}
                  <span className="capitalize">
                    {prov}:{' '}
                    <span className={providers[prov] ? 'text-teal-600 dark:text-teal-400 font-medium' : 'text-slate-500 dark:text-slate-400'}>
                      {providers[prov] ? 'Configured' : 'Not set'}
                    </span>
                  </span>
                </React.Fragment>
              ))}
            </div>

            <button
              type="button"
              onClick={handleRefreshFromProviders}
              disabled={isRefreshing || isLoading}
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh Catalogue'}</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-700 dark:text-teal-300 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div>{infoMsg}</div>
                {refreshNotes.length > 0 && (
                  <div className="text-[11px] opacity-85">{refreshNotes.join(' · ')}</div>
                )}
              </div>
            </div>
          )}

          {isLoading && !catalogue ? (
            <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
              Loading server model catalogue...
            </div>
          ) : catalogue ? (
            <>
              {/* Dynamic Routing & Spend Governance Settings */}
              <form
                onSubmit={handleSaveSettings}
                className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B111C] border border-slate-200 dark:border-white/10 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <ShieldCheck className="w-4 h-4 text-teal-500" />
                    <span>Default Routing &amp; Spend Controls</span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                    Spend today ({catalogue.spendDate}):{' '}
                    <strong className="text-slate-900 dark:text-white font-mono">
                      ${catalogue.estimatedSpendTodayUsd.toFixed(4)}
                    </strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-medium text-slate-600 dark:text-slate-300 block">
                      Default Model (Approved)
                    </label>
                    <select
                      value={defaultModelId}
                      onChange={(e) => setDefaultModelId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#080C14] border border-slate-200 dark:border-white/12 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                    >
                      {approvedModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.provider} · {getPricingText(m.pricingTier)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-slate-600 dark:text-slate-300 block">
                      Safe Fallback Model (Free Tier Only)
                    </label>
                    <select
                      value={fallbackModelId}
                      onChange={(e) => setFallbackModelId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#080C14] border border-slate-200 dark:border-white/12 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                    >
                      <option value="">No automatic fallback</option>
                      {approvedFreeModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.provider} · Free)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-slate-600 dark:text-slate-300 block">
                      Max Output Tokens (256 – 16,384)
                    </label>
                    <input
                      type="number"
                      min={256}
                      max={16384}
                      value={maxOutputTokens}
                      onChange={(e) => setMaxOutputTokens(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#080C14] border border-slate-200 dark:border-white/12 text-slate-900 dark:text-slate-100 font-mono tabular-nums focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                      <span>Daily Paid Spend Cap (USD)</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={500}
                      step={0.5}
                      value={dailySpendCapUsd}
                      onChange={(e) => setDailySpendCapUsd(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#080C14] border border-slate-200 dark:border-white/12 text-slate-900 dark:text-slate-100 font-mono tabular-nums focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                {/* Server-enforced Free Models Only toggle */}
                <div className="flex items-center justify-between gap-3 py-2.5 border-t border-slate-200 dark:border-white/10">
                  <div>
                    <div className="text-xs font-medium text-slate-800 dark:text-slate-100">
                      Enforce Free Models Only (Server-Wide)
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Rejects any paid or price-unverified model at the API level and hides them from selectors.
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enforceFreeModelsOnly}
                    onClick={() => setEnforceFreeModelsOnly(!enforceFreeModelsOnly)}
                    className={`w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                      enforceFreeModelsOnly ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                        enforceFreeModelsOnly ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Strict guard: Paid models are never used as silent fallbacks for free-tier requests.
                  </p>
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-semibold text-xs hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
                  >
                    {isSavingSettings ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </form>

              {/* Models List & Review Controls */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <Cpu className="w-4 h-4 text-teal-500" />
                    <span className="tabular-nums">Provider Models ({catalogue.models.length})</span>
                  </div>
                  <div className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-[#0B111C] p-1 border border-slate-200 dark:border-white/10 text-[11px]">
                    {(['all', 'approved', 'needs_review', 'disabled'] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setStatusFilter(tab)}
                        className={`px-2.5 py-1 rounded-lg font-medium capitalize transition-colors cursor-pointer whitespace-nowrap ${
                          statusFilter === tab
                            ? 'bg-white dark:bg-[#182235] text-slate-900 dark:text-white shadow-2xs'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        {tab.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="divide-y divide-slate-200 dark:divide-white/8 border border-slate-200 dark:border-white/10 rounded-xl bg-white dark:bg-[#0B111C]">
                  {filteredModels.map((m) => {
                    const isDefault = m.id === catalogue.defaultModelId;
                    const isBusy = busyModelId === m.id;
                    return (
                      <div
                        key={m.id}
                        className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                            <span className="font-semibold text-sm text-slate-900 dark:text-white">
                              {m.name}
                            </span>
                            {isDefault && (
                              <span className="font-semibold text-teal-600 dark:text-teal-400">
                                · Default
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                            <code className="font-mono text-slate-700 dark:text-slate-300">{m.id}</code>
                            <span aria-hidden="true">·</span>
                            <span className="capitalize">{m.provider}</span>
                            <span aria-hidden="true">·</span>
                            <span className={m.pricingTier === 'free' ? 'text-teal-600 dark:text-teal-400 font-medium' : 'text-amber-600 dark:text-amber-300 font-medium'}>
                              {getPricingText(m.pricingTier)}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className={`font-medium capitalize ${getStatusClass(m.status)}`}>
                              {m.status.replace('_', ' ')}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            {m.description} — {m.pricingNote}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {m.status !== 'approved' && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleUpdateModelStatus(m.id, 'approved')}
                              className="px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-[11px] transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                            >
                              Approve
                            </button>
                          )}
                          {m.status !== 'needs_review' && !isDefault && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleUpdateModelStatus(m.id, 'needs_review')}
                              className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 font-medium text-[11px] transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                            >
                              Mark Review
                            </button>
                          )}
                          {m.status !== 'disabled' && !isDefault && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleUpdateModelStatus(m.id, 'disabled')}
                              className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 font-medium text-[11px] transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                            >
                              <Ban className="w-3 h-3" />
                              <span>Disable</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
