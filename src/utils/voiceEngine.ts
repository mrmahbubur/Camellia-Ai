import { getApiUrl, isJsonResponse } from './api';

export interface VoiceEngineCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onBoundary?: (charIndex: number, currentWord: string) => void;
  onError?: (err: unknown) => void;
}

export interface BackendVoiceConfig {
  provider: string;
  name: string;
  gender: string;
  preferredLang: string;
  rate: number;
  pitch: number;
  volume: number;
  persona: string;
  description: string;
  priorityVoices: string[];
}

const DEFAULT_VOICE_CONFIG: BackendVoiceConfig = {
  provider: 'Camellia Voice Engine',
  name: 'Claude AI Female Voice',
  gender: 'female',
  preferredLang: 'en-US',
  rate: 1.0,
  pitch: 1.04,
  volume: 1.0,
  persona: 'Calm, articulate female assistant voice',
  description: 'On-demand narration for English and Bengali messages.',
  priorityVoices: [
    'Google UK English Female',
    'Microsoft Sonia Online (Natural) - English (United Kingdom)',
    'Microsoft Libby Online (Natural) - English (United Kingdom)',
    'Microsoft Jenny Online (Natural) - English (United States)',
    'Serena',
    'Samantha',
    'Victoria',
    'Google US English Female',
    'Karen'
  ]
};

class VoiceEngine {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isMuted: boolean = false;
  private voices: SpeechSynthesisVoice[] = [];
  private backendConfig: BackendVoiceConfig = DEFAULT_VOICE_CONFIG;

  constructor() {
    if (typeof window !== 'undefined') {
      if ('speechSynthesis' in window) {
        this.synth = window.speechSynthesis;
        this.loadVoices();
        if (this.synth.onvoiceschanged !== undefined) {
          this.synth.onvoiceschanged = () => this.loadVoices();
        }
      }
      this.syncWithBackend();
    }
  }

  public async syncWithBackend(): Promise<void> {
    try {
      const res = await fetch(getApiUrl('/api/voice/config'));
      if (res.ok && isJsonResponse(res)) {
        const data = await res.json();
        if (data.voice) {
          this.backendConfig = data.voice;
        }
      }
    } catch {
      // Fallback to default config silently
    }
  }

  private loadVoices(): void {
    if (!this.synth) return;
    const list = this.synth.getVoices();
    if (list && list.length > 0) {
      this.voices = list;
    }
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (this.voices.length === 0 && this.synth) {
      this.voices = this.synth.getVoices();
    }
    return this.voices;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted && this.synth) {
      this.stop();
    }
  }

  public stop(): void {
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
  }

  public cleanText(rawText: string): string {
    let clean = rawText
      .replace(/```[\s\S]*?```/g, ' code block omitted ')
      .replace(/\$\$[\s\S]*?\$\$/g, ' equation ')
      .replace(/\$[^$\n]+\$/g, ' formula ')
      .replace(/[*#_`~[\]()<>{}^]/g, ' ')
      .replace(/https?:\/\/\S+/gi, 'link')
      .replace(/\s+/g, ' ')
      .trim();
    return clean;
  }

  private resolveVoice(isBengali: boolean): SpeechSynthesisVoice | null {
    const available = this.getVoices();
    if (!available || available.length === 0) return null;

    if (isBengali) {
      const bnVoice =
        available.find((v) => v.lang.toLowerCase().startsWith('bn')) ||
        available.find((v) => v.name.toLowerCase().includes('bengali') || v.name.toLowerCase().includes('bangla'));
      if (bnVoice) return bnVoice;
    }

    const priorities = this.backendConfig.priorityVoices || DEFAULT_VOICE_CONFIG.priorityVoices;

    for (const target of priorities) {
      const match = available.find((v) => v.name.toLowerCase() === target.toLowerCase());
      if (match) return match;
    }

    for (const target of priorities) {
      const match = available.find((v) => v.name.toLowerCase().includes(target.toLowerCase()));
      if (match) return match;
    }

    const naturalFemale = available.find(
      (v) =>
        v.lang.toLowerCase().startsWith('en') &&
        (v.name.toLowerCase().includes('female') ||
          v.name.toLowerCase().includes('natural') ||
          v.name.toLowerCase().includes('samantha') ||
          v.name.toLowerCase().includes('victoria') ||
          v.name.toLowerCase().includes('karen') ||
          v.name.toLowerCase().includes('zira') ||
          v.name.toLowerCase().includes('jenny'))
    );
    if (naturalFemale) return naturalFemale;

    return available.find((v) => v.lang.toLowerCase().startsWith('en')) || available[0] || null;
  }

  public speak(text: string, callbacks?: VoiceEngineCallbacks): void {
    if (this.isMuted || !this.synth) {
      callbacks?.onEnd?.();
      return;
    }

    this.stop();

    const spokenText = this.cleanText(text);
    if (!spokenText) {
      callbacks?.onEnd?.();
      return;
    }

    const isBengali = /[\u0980-\u09FF]/.test(spokenText);
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.lang = isBengali ? 'bn-BD' : (this.backendConfig.preferredLang || 'en-US');
    utterance.rate = this.backendConfig.rate || 1.0;
    utterance.pitch = isBengali ? 1.0 : (this.backendConfig.pitch || 1.04);
    utterance.volume = this.backendConfig.volume || 1.0;

    const selectedVoice = this.resolveVoice(isBengali);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => callbacks?.onStart?.();
    utterance.onend = () => {
      this.currentUtterance = null;
      callbacks?.onEnd?.();
    };
    utterance.onerror = (e) => {
      this.currentUtterance = null;
      callbacks?.onError?.(e);
      callbacks?.onEnd?.();
    };

    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const textFromIndex = spokenText.slice(event.charIndex);
        const match = textFromIndex.match(/\S+/);
        callbacks?.onBoundary?.(event.charIndex, match ? match[0] : '');
      }
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }
}

export const voiceEngine = new VoiceEngine();
