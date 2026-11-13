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
  thinkingLevel: 'low' | 'medium' | 'high';
  webSearchEnabled: boolean;
  systemInstruction: string;
  language: 'auto' | 'en' | 'bn';
  theme: 'dark' | 'light';
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  model: 'gemini-3.8-flash',
  thinkingLevel: 'medium',
  webSearchEnabled: true,
  systemInstruction: '',
  language: 'auto',
  theme: 'dark'
};
