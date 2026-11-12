export interface MessageAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string; // Base64 data URL
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
  isStreaming?: boolean;
  error?: boolean;
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
  temperature: number;
  systemInstruction: string;
  language: 'auto' | 'en' | 'bn';
  theme: 'dark' | 'light';
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  model: 'gemini-3.8-flash',
  temperature: 0.7,
  systemInstruction: '',
  language: 'auto',
  theme: 'dark'
};
