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

const DEFAULT_CLAUDE_VOICE_CONFIG: BackendVoiceConfig = {
  provider: 'Claude AI Voice Engine',
  name: 'Claude AI Female Voice',
  gender: 'female',
  preferredLang: 'en-US',
  rate: 1.0,
  pitch: 1.06,
  volume: 1.0,
  persona: 'Claude AI Signature Warm, Calm & Articulate Female',
  description: 'Single unified voice for all narrations, greetings, and message reads.',
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
  private audioCtx: AudioContext | null = null;
  private backendConfig: BackendVoiceConfig = DEFAULT_CLAUDE_VOICE_CONFIG;
  private isConfigLoaded: boolean = false;

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

  // Sync voice profile directly with the backend API
  public async syncWithBackend(): Promise<void> {
    try {
      const res = await fetch('/api/voice/config');
      if (res.ok) {
        const data = await res.json();
        if (data.voice) {
          this.backendConfig = data.voice;
          this.isConfigLoaded = true;
        }
      }
    } catch {
      // Use fallback Claude voice configuration
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

  public getVoiceConfig(): BackendVoiceConfig {
    return this.backendConfig;
  }

  public unlockAudioContext(): void {
    if (typeof window === 'undefined') return;
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    } catch {
      // AudioContext unavailable
    }
  }

  public playChime(type: 'click' | 'chime' | 'success' = 'chime'): void {
    if (typeof window === 'undefined') return;
    try {
      this.unlockAudioContext();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      const now = this.audioCtx.currentTime;
      if (type === 'click') {
        osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'success') {
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else {
        osc.frequency.setValueAtTime(783.99, now);
        osc.frequency.setValueAtTime(1046.50, now + 0.1);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch {
      // Ignore
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted && this.synth) {
      this.stop();
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public stop(): void {
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
  }

  public cleanText(rawText: string): string {
    let clean = rawText.replace(/[*#_`~[\]()<>{}^]/g, ' ');
    clean = clean.replace(/\bMRS\b/gi, 'M R S');
    clean = clean.replace(/\bMrs\.\b/gi, 'M R S');
    clean = clean.replace(/\bMrs\b/gi, 'M R S');
    clean = clean.replace(/\bmrs\b/gi, 'M R S');
    clean = clean.replace(/\bM\.R\.S\.\b/gi, 'M R S');
    clean = clean.replace(/\bM\.R\.S\b/gi, 'M R S');
    clean = clean.replace(/\bIT\b/g, 'I T');
    clean = clean.replace(/https?:\/\/\S+/gi, 'the website link');
    clean = clean.replace(/\s+/g, ' ').trim();
    return clean;
  }

  // Find the signature Claude AI female voice from browser synthesizers based on backend priorities
  private resolveClaudeAIFemaleVoice(): SpeechSynthesisVoice | null {
    const available = this.getVoices();
    if (!available || available.length === 0) return null;

    const priorities = this.backendConfig.priorityVoices || DEFAULT_CLAUDE_VOICE_CONFIG.priorityVoices;

    // 1. Try to find an exact match from backend priority list
    for (const target of priorities) {
      const match = available.find((v) => v.name.toLowerCase() === target.toLowerCase());
      if (match) return match;
    }

    // 2. Try partial match from priority list
    for (const target of priorities) {
      const match = available.find((v) => v.name.toLowerCase().includes(target.toLowerCase()));
      if (match) return match;
    }

    // 3. Fallback to any natural female English voice
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

    // 4. Any English voice
    const anyEnglish = available.find((v) => v.lang.toLowerCase().startsWith('en'));
    if (anyEnglish) return anyEnglish;

    return available[0] || null;
  }

  /**
   * Single Unified Voice for Everything:
   * Uses the Claude AI Female Voice configuration (en-US, rate 1.0, pitch 1.06)
   * governed directly by the backend for all audio playback.
   */
  public speak(
    text: string,
    callbacks?: VoiceEngineCallbacks
  ): void {
    if (this.isMuted || !this.synth) {
      callbacks?.onStart?.();
      setTimeout(() => {
        callbacks?.onEnd?.();
      }, 1000);
      return;
    }

    this.stop();

    const spokenText = this.cleanText(text);
    if (!spokenText) {
      callbacks?.onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.lang = this.backendConfig.preferredLang || 'en-US';
    utterance.rate = this.backendConfig.rate || 1.0;
    utterance.pitch = this.backendConfig.pitch || 1.06;
    utterance.volume = this.backendConfig.volume || 1.0;

    const claudeVoice = this.resolveClaudeAIFemaleVoice();
    if (claudeVoice) {
      utterance.voice = claudeVoice;
    }

    utterance.onstart = () => {
      callbacks?.onStart?.();
    };

    utterance.onend = () => {
      callbacks?.onEnd?.();
    };

    utterance.onerror = (e) => {
      callbacks?.onError?.(e);
      callbacks?.onEnd?.();
    };

    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const textFromIndex = spokenText.slice(event.charIndex);
        const match = textFromIndex.match(/\S+/);
        const word = match ? match[0] : '';
        callbacks?.onBoundary?.(event.charIndex, word);
      }
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }
}

export const voiceEngine = new VoiceEngine();
