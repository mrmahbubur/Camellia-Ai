export type ModelProvider = 'gemini' | 'anthropic' | 'openrouter';
export type ModelPricingTier = 'free' | 'paid' | 'unverified';
export type ModelReviewStatus = 'approved' | 'needs_review' | 'disabled' | 'retired';

export interface ModelCatalogItem {
  id: string;
  provider: ModelProvider;
  name: string;
  tag: string;
  description: string;
  pricingTier: ModelPricingTier;
  pricingNote: string;
  status?: ModelReviewStatus;
  capabilities: {
    streaming: boolean;
    searchGrounding?: boolean;
    thinking?: boolean;
    multimodal?: boolean;
  };
  isDefault?: boolean;
  providerConfigured: boolean;
}

export interface ModelCatalogResponse {
  defaultModelId: string;
  enforceFreeModelsOnly?: boolean;
  freeOnlyApplied?: boolean;
  lastRefreshedAt?: string;
  models: ModelCatalogItem[];
}

export interface AdminCatalogueEntry extends Omit<ModelCatalogItem, 'isDefault' | 'providerConfigured'> {
  status: ModelReviewStatus;
  discoveredAt?: string;
}

export interface AdminCatalogueStore {
  defaultModelId: string;
  fallbackModelId: string | null;
  enforceFreeModelsOnly: boolean;
  maxOutputTokens: number;
  dailySpendCapUsd: number;
  estimatedSpendTodayUsd: number;
  spendDate: string;
  lastRefreshedAt: string;
  models: AdminCatalogueEntry[];
}

export interface MessageAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string; // Base64 data URL
  textContent?: string; // Decoded text for code/text files
}

export interface GroundedSource {
  index: number;
  title: string;
  uri: string;
  domain: string;
  snippet?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  attachments?: MessageAttachment[];
  sources?: GroundedSource[];
  searchQueries?: string[];
  modelUsed?: string;
  modelIdUsed?: string;
  providerUsed?: ModelProvider;
  isStreaming?: boolean;
  error?: boolean;
  errorText?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  model?: string;
}

export interface UserSettings {
  model: string;
  freeModelsOnly: boolean;
  thinkingLevel: 'low' | 'medium' | 'high';
  webSearchEnabled: boolean;
  systemInstruction: string;
  language: 'auto' | 'en' | 'bn';
  theme: 'dark' | 'light';
  threeDView: boolean;
}

export const AVAILABLE_MODEL_IDS = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'] as const;

export function normalizeModelId(
  requested?: string,
  availableIds: readonly string[] = AVAILABLE_MODEL_IDS,
  defaultId = 'gemini-4-hydrogen'
): string {
  if (requested && availableIds.includes(requested)) {
    return requested;
  }
  if (defaultId && availableIds.includes(defaultId)) {
    return defaultId;
  }
  return availableIds[0] || defaultId || 'gemini-4-hydrogen';
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  model: 'gemini-4-hydrogen',
  freeModelsOnly: false,
  thinkingLevel: 'medium',
  webSearchEnabled: true,
  systemInstruction: '',
  language: 'auto',
  theme: 'dark',
  threeDView: false
};
