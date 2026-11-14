import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const CATALOGUE_FILE = path.join(DATA_DIR, 'model-catalogue.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export type ModelProvider = 'gemini' | 'anthropic' | 'openrouter';
export type ModelPricingTier = 'free' | 'paid' | 'unverified';
export type ModelReviewStatus = 'approved' | 'needs_review' | 'disabled' | 'retired';

export interface CatalogModelEntry {
  id: string;
  provider: ModelProvider;
  name: string;
  tag: string;
  description: string;
  pricingTier: ModelPricingTier;
  pricingNote: string;
  status: ModelReviewStatus;
  capabilities: {
    streaming: boolean;
    searchGrounding?: boolean;
    thinking?: boolean;
    multimodal?: boolean;
  };
  discoveredAt?: string;
}

export interface ModelCatalogueStore {
  defaultModelId: string;
  fallbackModelId: string | null;
  enforceFreeModelsOnly: boolean;
  maxOutputTokens: number;
  dailySpendCapUsd: number;
  estimatedSpendTodayUsd: number;
  spendDate: string;
  lastRefreshedAt: string;
  models: CatalogModelEntry[];
}

const DEPRECATED_PATTERNS = [
  'gemini-1.5',
  'gemini-2.0',
  'gemini-pro',
  'claude-2',
  'claude-instant',
  'retired',
];

function isRetiredOrUnsupported(id: string): boolean {
  const lower = id.toLowerCase();
  return DEPRECATED_PATTERNS.some((p) => lower.includes(p));
}

function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultCatalogue(): ModelCatalogueStore {
  const now = new Date().toISOString();
  return {
    defaultModelId: 'gemini-4-hydrogen',
    fallbackModelId: 'gemini-3.1-flash-lite',
    enforceFreeModelsOnly: false,
    maxOutputTokens: 8192,
    dailySpendCapUsd: 5.0,
    estimatedSpendTodayUsd: 0,
    spendDate: getTodayDateString(),
    lastRefreshedAt: now,
    models: [
      {
        id: 'gemini-4-hydrogen',
        provider: 'gemini',
        name: 'Gemini 4 Hydrogen',
        tag: 'Default · Grounded',
        description: 'Latest multimodal Flash model with adaptive reasoning and live Google Search grounding.',
        pricingTier: 'free',
        pricingNote: 'Free tier / quota limited',
        status: 'approved',
        capabilities: { streaming: true, searchGrounding: true, thinking: true, multimodal: true },
      },
      {
        id: 'gemini-3.1-flash-lite',
        provider: 'gemini',
        name: 'Gemini 3.1 Flash Lite',
        tag: 'Fast',
        description: 'Lightweight model optimized for ultra-low latency responses.',
        pricingTier: 'free',
        pricingNote: 'Free tier / lightweight quota',
        status: 'approved',
        capabilities: { streaming: true, searchGrounding: false, thinking: false, multimodal: true },
      },
      {
        id: 'claude-fable-5-2',
        provider: 'anthropic',
        name: 'Claude Fable 5.2',
        tag: 'Anthropic · Paid',
        description: 'Anthropic Claude Fable 5.2 for nuanced writing, analysis, and reasoning (requires ANTHROPIC_API_KEY & admin approval).',
        pricingTier: 'paid',
        pricingNote: 'Paid ($8/M input · $40/M output est.)',
        status: 'needs_review',
        capabilities: { streaming: true, searchGrounding: false, thinking: false, multimodal: true },
      },
      {
        id: 'openrouter/free',
        provider: 'openrouter',
        name: 'OpenRouter Free Router',
        tag: 'OpenRouter · Free',
        description: 'Dynamic free-model router via OpenRouter (requires OPENROUTER_API_KEY & admin approval).',
        pricingTier: 'free',
        pricingNote: 'Free router (availability & latency vary)',
        status: 'needs_review',
        capabilities: { streaming: true, searchGrounding: false, thinking: false, multimodal: false },
      },
    ],
  };
}

export function isProviderConfigured(provider: ModelProvider): boolean {
  switch (provider) {
    case 'gemini':
      return Boolean(process.env.GEMINI_API_KEY);
    case 'anthropic':
      return Boolean(process.env.ANTHROPIC_API_KEY);
    case 'openrouter':
      return Boolean(process.env.OPENROUTER_API_KEY);
    default:
      return false;
  }
}

export function getProviderKeyStatus(): Record<ModelProvider, boolean> {
  return {
    gemini: isProviderConfigured('gemini'),
    anthropic: isProviderConfigured('anthropic'),
    openrouter: isProviderConfigured('openrouter'),
  };
}

export function loadCatalogue(): ModelCatalogueStore {
  try {
    if (!fs.existsSync(CATALOGUE_FILE)) {
      const initial = getDefaultCatalogue();
      fs.writeFileSync(CATALOGUE_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const raw = fs.readFileSync(CATALOGUE_FILE, 'utf-8');
    const parsed = JSON.parse(raw || '{}') as Partial<ModelCatalogueStore>;
    const base = getDefaultCatalogue();
    const today = getTodayDateString();
    const store: ModelCatalogueStore = {
      defaultModelId: parsed.defaultModelId || base.defaultModelId,
      fallbackModelId: parsed.fallbackModelId !== undefined ? parsed.fallbackModelId : base.fallbackModelId,
      enforceFreeModelsOnly:
        typeof parsed.enforceFreeModelsOnly === 'boolean'
          ? parsed.enforceFreeModelsOnly
          : base.enforceFreeModelsOnly,
      maxOutputTokens: typeof parsed.maxOutputTokens === 'number' ? parsed.maxOutputTokens : base.maxOutputTokens,
      dailySpendCapUsd: typeof parsed.dailySpendCapUsd === 'number' ? parsed.dailySpendCapUsd : base.dailySpendCapUsd,
      estimatedSpendTodayUsd: parsed.spendDate === today && typeof parsed.estimatedSpendTodayUsd === 'number' ? parsed.estimatedSpendTodayUsd : 0,
      spendDate: today,
      lastRefreshedAt: parsed.lastRefreshedAt || base.lastRefreshedAt,
      models: Array.isArray(parsed.models) && parsed.models.length > 0 ? parsed.models : base.models,
    };
    return store;
  } catch (err) {
    console.error('[MODEL REGISTRY] Error reading catalogue, using defaults:', err);
    return getDefaultCatalogue();
  }
}

function saveCatalogue(store: ModelCatalogueStore): void {
  try {
    fs.writeFileSync(CATALOGUE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('[MODEL REGISTRY] Error saving catalogue:', err);
  }
}

export function recordEstimatedSpend(provider: ModelProvider, pricingTier: ModelPricingTier, outputChars: number): void {
  if (pricingTier === 'free') return;
  const store = loadCatalogue();
  const estTokens = Math.max(100, Math.ceil(outputChars / 4));
  const ratePerMillion = provider === 'anthropic' ? 40 : 5;
  const delta = (estTokens / 1_000_000) * ratePerMillion;
  store.estimatedSpendTodayUsd = Number((store.estimatedSpendTodayUsd + delta).toFixed(6));
  saveCatalogue(store);
}

export function getPublicModels(options: { freeOnly?: boolean } = {}) {
  const store = loadCatalogue();
  const freeOnlyActive = Boolean(store.enforceFreeModelsOnly || options.freeOnly);
  const configuredProviders = getProviderKeyStatus();

  const approved = store.models
    .filter((m) => {
      if (m.status !== 'approved' || isRetiredOrUnsupported(m.id)) return false;
      // Do not present unconfigured providers as working choices
      if (!isProviderConfigured(m.provider)) return false;
      if (freeOnlyActive && m.pricingTier !== 'free') return false;
      return true;
    })
    .map((m) => ({
      ...m,
      isDefault: m.id === store.defaultModelId,
      providerConfigured: true,
    }));

  const effectiveDefault =
    approved.find((m) => m.id === store.defaultModelId)?.id ||
    approved[0]?.id ||
    store.defaultModelId;

  return {
    defaultModelId: effectiveDefault,
    enforceFreeModelsOnly: store.enforceFreeModelsOnly,
    freeOnlyApplied: freeOnlyActive,
    configuredProviders,
    lastRefreshedAt: store.lastRefreshedAt,
    models: approved,
  };
}

export interface ChatRoutingResult {
  ok: boolean;
  status?: number;
  error?: string;
  requiresPaidConfirmation?: boolean;
  primary?: CatalogModelEntry;
  candidates?: CatalogModelEntry[];
  maxOutputTokens?: number;
}

export function resolveChatRouting(
  requestedModelId?: string,
  options: { freeOnly?: boolean; confirmPaidModel?: boolean } = {}
): ChatRoutingResult {
  const store = loadCatalogue();
  const targetId = (requestedModelId || '').trim() || store.defaultModelId;
  const primary = store.models.find((m) => m.id === targetId);

  if (!primary) {
    return {
      ok: false,
      status: 400,
      error: `Model "${targetId}" is not in the approved catalogue. Please select an available model.`,
    };
  }

  if (primary.status === 'disabled' || primary.status === 'retired' || isRetiredOrUnsupported(primary.id)) {
    return {
      ok: false,
      status: 403,
      error: `Model "${primary.name}" is currently disabled or retired.`,
    };
  }

  if (primary.status === 'needs_review') {
    return {
      ok: false,
      status: 403,
      error: `Model "${primary.name}" is awaiting admin review and cannot be called yet.`,
    };
  }

  if (store.enforceFreeModelsOnly || options.freeOnly) {
    if (primary.pricingTier !== 'free') {
      return {
        ok: false,
        status: 403,
        error: `Free models only mode is active. "${primary.name}" (${primary.pricingTier === 'paid' ? 'Paid' : 'Price not verified'}) cannot be used.`,
      };
    }
  }

  if (!isProviderConfigured(primary.provider)) {
    const keyName =
      primary.provider === 'anthropic'
        ? 'ANTHROPIC_API_KEY'
        : primary.provider === 'openrouter'
          ? 'OPENROUTER_API_KEY'
          : 'GEMINI_API_KEY';
    return {
      ok: false,
      status: 500,
      error: `${primary.provider.toUpperCase()} credentials (${keyName}) are not configured in server Secrets.`,
    };
  }

  if (primary.pricingTier !== 'free' && !options.confirmPaidModel) {
    return {
      ok: false,
      status: 409,
      requiresPaidConfirmation: true,
      primary,
      error: `Confirmation is required before sending a prompt to paid/unverified model "${primary.name}".`,
    };
  }

  if (primary.pricingTier !== 'free' && store.estimatedSpendTodayUsd >= store.dailySpendCapUsd) {
    return {
      ok: false,
      status: 429,
      error: `Daily paid-model spend cap ($${store.dailySpendCapUsd.toFixed(2)}) has been reached. Please use a free-tier model or raise the cap in Admin Models.`,
    };
  }

  const candidates: CatalogModelEntry[] = [primary];

  // Strict No-Silent-Paid-Fallback Rule:
  // Only fall back to an approved, configured model that is VERIFIED FREE tier.
  // Never silently upgrade or route a free-tier request onto a paid or unverified model.
  if (store.fallbackModelId && store.fallbackModelId !== primary.id) {
    const fb = store.models.find((m) => m.id === store.fallbackModelId);
    if (
      fb &&
      fb.status === 'approved' &&
      !isRetiredOrUnsupported(fb.id) &&
      fb.pricingTier === 'free' &&
      isProviderConfigured(fb.provider)
    ) {
      candidates.push(fb);
    }
  }

  return {
    ok: true,
    primary,
    candidates,
    maxOutputTokens: store.maxOutputTokens,
  };
}

export async function refreshCatalogueFromProviders(): Promise<{
  store: ModelCatalogueStore;
  discoveredCount: number;
  notes: string[];
}> {
  const store = loadCatalogue();
  const existingIds = new Set(store.models.map((m) => m.id));
  let discoveredCount = 0;
  const notes: string[] = [];
  const now = new Date().toISOString();

  // 1. Anthropic List Models API (when ANTHROPIC_API_KEY is configured)
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const resp = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
      });
      if (resp.ok) {
        const data = (await resp.json()) as { data?: Array<{ id: string; display_name?: string }> };
        for (const m of data.data || []) {
          if (!m.id || isRetiredOrUnsupported(m.id) || existingIds.has(m.id)) continue;
          existingIds.add(m.id);
          discoveredCount += 1;
          store.models.push({
            id: m.id,
            provider: 'anthropic',
            name: m.display_name || m.id,
            tag: 'Anthropic · Paid',
            description: 'Discovered from Anthropic Models API (awaiting admin review).',
            pricingTier: 'paid',
            pricingNote: 'Paid API (verify Anthropic pricing)',
            status: 'needs_review',
            capabilities: { streaming: true, searchGrounding: false, thinking: false, multimodal: true },
            discoveredAt: now,
          });
        }
        notes.push('Anthropic models checked.');
      } else {
        notes.push(`Anthropic discovery returned HTTP ${resp.status}.`);
      }
    } catch {
      notes.push('Could not reach Anthropic Models API.');
    }
  } else {
    notes.push('Anthropic skipped (ANTHROPIC_API_KEY not set).');
  }

  // 2. OpenRouter Models API
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const resp = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
      });
      if (resp.ok) {
        const data = (await resp.json()) as {
          data?: Array<{ id: string; name?: string; pricing?: { prompt?: string; completion?: string } }>;
        };
        let orAdded = 0;
        for (const m of data.data || []) {
          if (!m.id || isRetiredOrUnsupported(m.id) || existingIds.has(m.id)) continue;

          const hasNumericPrice =
            m.pricing?.prompt !== undefined &&
            m.pricing?.completion !== undefined &&
            !Number.isNaN(Number(m.pricing.prompt)) &&
            !Number.isNaN(Number(m.pricing.completion));

          const isVerifiedFree =
            m.id.endsWith(':free') ||
            (hasNumericPrice && Number(m.pricing!.prompt) === 0 && Number(m.pricing!.completion) === 0);

          const isVerifiedPaid =
            !isVerifiedFree &&
            hasNumericPrice &&
            (Number(m.pricing!.prompt) > 0 || Number(m.pricing!.completion) > 0);

          const pricingTier: ModelPricingTier = isVerifiedFree
            ? 'free'
            : isVerifiedPaid
              ? 'paid'
              : 'unverified';

          if (pricingTier !== 'free' && orAdded >= 6) continue;
          if (orAdded >= 12) break;
          existingIds.add(m.id);
          discoveredCount += 1;
          orAdded += 1;
          store.models.push({
            id: m.id,
            provider: 'openrouter',
            name: m.name || m.id,
            tag:
              pricingTier === 'free'
                ? 'OpenRouter · Free'
                : pricingTier === 'paid'
                  ? 'OpenRouter · Paid'
                  : 'OpenRouter · Price not verified',
            description: 'Discovered from OpenRouter catalogue (awaiting admin review).',
            pricingTier,
            pricingNote:
              pricingTier === 'free'
                ? 'Free tier (availability & latency vary)'
                : pricingTier === 'paid'
                  ? 'Paid OpenRouter usage'
                  : 'Price not verified (confirmation required)',
            status: 'needs_review',
            capabilities: { streaming: true, searchGrounding: false, thinking: false, multimodal: false },
            discoveredAt: now,
          });
        }
        notes.push('OpenRouter models checked.');
      } else {
        notes.push(`OpenRouter discovery returned HTTP ${resp.status}.`);
      }
    } catch {
      notes.push('Could not reach OpenRouter Models API.');
    }
  } else {
    notes.push('OpenRouter skipped (OPENROUTER_API_KEY not set).');
  }

  store.lastRefreshedAt = now;
  saveCatalogue(store);
  return { store, discoveredCount, notes };
}

let refreshTimer: ReturnType<typeof setInterval> | null = null;

export function startScheduledCatalogueRefresh(intervalMs = 6 * 60 * 60 * 1000): void {
  if (refreshTimer) return;
  if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENROUTER_API_KEY) {
    return;
  }
  refreshTimer = setInterval(() => {
    refreshCatalogueFromProviders().catch((err) => {
      console.warn('[MODEL REGISTRY] Scheduled refresh warning:', err?.message || err);
    });
  }, intervalMs);
  refreshTimer.unref?.();
}

export function updateModelEntry(
  modelId: string,
  updates: { status?: ModelReviewStatus; pricingTier?: ModelPricingTier; name?: string; pricingNote?: string }
): { ok: boolean; error?: string; store?: ModelCatalogueStore } {
  const store = loadCatalogue();
  const target = store.models.find((m) => m.id === modelId);
  if (!target) {
    return { ok: false, error: 'Model not found in catalogue.' };
  }

  if (updates.status && !['approved', 'needs_review', 'disabled', 'retired'].includes(updates.status)) {
    return { ok: false, error: 'Invalid model status.' };
  }

  if (updates.pricingTier && !['free', 'paid', 'unverified'].includes(updates.pricingTier)) {
    return { ok: false, error: 'Invalid pricing tier.' };
  }

  if (modelId === store.defaultModelId && updates.status && updates.status !== 'approved') {
    return { ok: false, error: 'Cannot disable the active default model. Select another default model first.' };
  }

  if (updates.status) target.status = updates.status;
  if (updates.pricingTier) target.pricingTier = updates.pricingTier;
  if (typeof updates.name === 'string' && updates.name.trim()) target.name = updates.name.trim();
  if (typeof updates.pricingNote === 'string' && updates.pricingNote.trim()) target.pricingNote = updates.pricingNote.trim();

  // Detach fallback if changed away from verified free + approved
  if (store.fallbackModelId === modelId && (target.pricingTier !== 'free' || target.status !== 'approved')) {
    store.fallbackModelId = null;
  }

  saveCatalogue(store);
  return { ok: true, store };
}

export function updateRegistrySettings(updates: {
  defaultModelId?: string;
  fallbackModelId?: string | null;
  enforceFreeModelsOnly?: boolean;
  maxOutputTokens?: number;
  dailySpendCapUsd?: number;
}): { ok: boolean; error?: string; store?: ModelCatalogueStore } {
  const store = loadCatalogue();

  if (typeof updates.enforceFreeModelsOnly === 'boolean') {
    store.enforceFreeModelsOnly = updates.enforceFreeModelsOnly;
  }

  if (updates.defaultModelId !== undefined) {
    const def = store.models.find((m) => m.id === updates.defaultModelId);
    if (!def || def.status !== 'approved') {
      return { ok: false, error: 'Default model must be an approved model in the catalogue.' };
    }
    if (store.enforceFreeModelsOnly && def.pricingTier !== 'free') {
      return { ok: false, error: 'Default model must be Free while "Free models only" mode is enforced.' };
    }
    store.defaultModelId = def.id;
  }

  if (updates.fallbackModelId !== undefined) {
    if (updates.fallbackModelId === null || updates.fallbackModelId === '') {
      store.fallbackModelId = null;
    } else {
      const fb = store.models.find((m) => m.id === updates.fallbackModelId);
      if (!fb || fb.status !== 'approved') {
        return { ok: false, error: 'Fallback model must be an approved model.' };
      }
      if (fb.pricingTier !== 'free') {
        return { ok: false, error: 'Paid or price-unverified models cannot be set as an automatic silent fallback.' };
      }
      store.fallbackModelId = fb.id;
    }
  }

  if (typeof updates.maxOutputTokens === 'number' && !Number.isNaN(updates.maxOutputTokens)) {
    store.maxOutputTokens = Math.max(256, Math.min(16384, Math.floor(updates.maxOutputTokens)));
  }

  if (typeof updates.dailySpendCapUsd === 'number' && !Number.isNaN(updates.dailySpendCapUsd)) {
    store.dailySpendCapUsd = Math.max(0, Math.min(500, Number(updates.dailySpendCapUsd)));
  }

  saveCatalogue(store);
  return { ok: true, store };
}
