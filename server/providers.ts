import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { CatalogModelEntry } from './modelRegistry.js';

export interface HistoryTurn {
  role: 'user' | 'assistant' | 'model';
  text?: string;
  content?: string;
  attachments?: any[];
}

export interface GroundedSourceItem {
  index: number;
  title: string;
  uri: string;
  domain: string;
}

export interface StreamCallbacks {
  isConnected: () => boolean;
  onText: (chunk: string) => void;
  onSearchQuery: (query: string) => void;
  onSource: (source: GroundedSourceItem) => void;
}

function getGenAIClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function mapThinkingLevel(level?: string): ThinkingLevel {
  switch ((level || '').toLowerCase()) {
    case 'low':
      return ThinkingLevel.LOW;
    case 'high':
      return ThinkingLevel.HIGH;
    default:
      return ThinkingLevel.MEDIUM;
  }
}

function extractDomain(uri: string): string {
  try {
    const parsed = new URL(uri);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return uri;
  }
}

function decodeTextAttachment(att: any): string | null {
  if (!att) return null;
  const name = att.name || 'attachment';
  const mime = (att.type || '').toLowerCase();
  const isTextLike =
    Boolean(att.textContent) ||
    mime.startsWith('text/') ||
    mime === 'application/json' ||
    mime === 'application/javascript' ||
    mime === 'application/typescript' ||
    /\.(txt|md|markdown|json|csv|js|jsx|ts|tsx|py|html|css|scss|sql|xml|yaml|yml|sh|bash|env|log)$/i.test(name);

  if (!isTextLike) return null;

  let decoded = att.textContent || '';
  if (!decoded && typeof att.data === 'string') {
    try {
      const b64 = att.data.includes(',') ? att.data.split(',')[1] : att.data;
      decoded = Buffer.from(b64, 'base64').toString('utf-8');
    } catch {
      decoded = '';
    }
  }
  if (!decoded.trim()) return null;
  const truncated = decoded.length > 100000 ? `${decoded.slice(0, 100000)}\n...[truncated]` : decoded;
  return `[Attached file: ${name}]\n\`\`\`\n${truncated}\n\`\`\``;
}

function buildGeminiAttachmentParts(attachments: any[]): any[] {
  const parts: any[] = [];
  if (!Array.isArray(attachments)) return parts;

  for (const att of attachments) {
    if (!att) continue;
    const textBlock = decodeTextAttachment(att);
    if (textBlock) {
      parts.push({ text: textBlock });
      continue;
    }

    const mime = (att.type || '').toLowerCase();
    if (att.data && (mime.startsWith('image/') || mime === 'application/pdf' || mime.startsWith('audio/'))) {
      const base64Data = att.data.includes(',') ? att.data.split(',')[1] : att.data;
      parts.push({
        inlineData: {
          mimeType: att.type,
          data: base64Data,
        },
      });
    }
  }
  return parts;
}

export function classifyProviderError(err: any, provider: string): { message: string; errorType: string } {
  const msg = String(err?.message || err || '');
  const status = err?.status || err?.code;

  if (status === 429 || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.toLowerCase().includes('rate limit')) {
    return {
      errorType: 'rate_limit',
      message: `${provider.toUpperCase()} quota or rate limit reached. Please wait a moment and click Retry, or switch to an available model.`,
    };
  }
  if (
    status === 401 ||
    status === 403 ||
    msg.includes('API_KEY_INVALID') ||
    msg.includes('PERMISSION_DENIED') ||
    msg.toLowerCase().includes('invalid x-api-key') ||
    msg.toLowerCase().includes('unauthorized')
  ) {
    return {
      errorType: 'auth',
      message: `${provider.toUpperCase()} API authentication error. Please verify the server secret in Settings > Secrets.`,
    };
  }
  if (msg.toLowerCase().includes('credit') || msg.toLowerCase().includes('billing')) {
    return {
      errorType: 'auth',
      message: `${provider.toUpperCase()} billing or credit balance is required for this paid model.`,
    };
  }
  if (msg.toLowerCase().includes('safety') || msg.toLowerCase().includes('blocked')) {
    return {
      errorType: 'blocked',
      message: 'This response was blocked by safety filters. Please rephrase your request and try again.',
    };
  }
  if (
    status === 504 ||
    err?.code === 'ETIMEDOUT' ||
    msg.includes('FIRST_CHUNK_TIMEOUT') ||
    msg.toLowerCase().includes('timed out')
  ) {
    return {
      errorType: 'timeout',
      message: `${provider.toUpperCase()} took too long to respond. Please click Retry or switch to a faster model.`,
    };
  }
  return {
    errorType: 'network',
    message: 'Unable to complete the response due to a provider or network interruption. Please click Retry.',
  };
}

function createTimeoutError(label: string): Error {
  const err: any = new Error(`FIRST_CHUNK_TIMEOUT: ${label}`);
  err.code = 'ETIMEDOUT';
  err.status = 504;
  return err;
}

function raceWithTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  if (!timeoutMs || timeoutMs <= 0) return promise;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(createTimeoutError(label)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function composeAbortSignal(external?: AbortSignal): {
  controller: AbortController;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (external) {
    if (external.aborted) {
      controller.abort();
    } else {
      external.addEventListener('abort', onAbort, { once: true });
    }
  }
  return {
    controller,
    cleanup: () => {
      if (external) external.removeEventListener('abort', onAbort);
    },
  };
}

export async function streamFromProvider(params: {
  modelEntry: CatalogModelEntry;
  message: string;
  history: HistoryTurn[];
  attachments: any[];
  systemInstruction: string;
  thinkingLevel: string;
  webSearchEnabled: boolean;
  maxOutputTokens: number;
  firstChunkTimeoutMs?: number;
  abortSignal?: AbortSignal;
  callbacks: StreamCallbacks;
}): Promise<{ streamedChars: number }> {
  const {
    modelEntry,
    message,
    history,
    attachments,
    systemInstruction,
    thinkingLevel,
    webSearchEnabled,
    maxOutputTokens,
    firstChunkTimeoutMs = 10000,
    abortSignal,
    callbacks,
  } = params;

  if (modelEntry.provider === 'gemini') {
    const ai = getGenAIClient();
    const contents: any[] = [];
    for (const h of history) {
      const textVal = h.content || h.text || '';
      const parts: any[] = [...buildGeminiAttachmentParts(h.attachments || [])];
      if (textVal) parts.push({ text: textVal });
      if (parts.length > 0) {
        contents.push({
          role: h.role === 'assistant' || h.role === 'model' ? 'model' : 'user',
          parts,
        });
      }
    }

    const currentParts: any[] = [...buildGeminiAttachmentParts(attachments)];
    if (message) currentParts.push({ text: message });
    contents.push({ role: 'user', parts: currentParts });

    const { controller, cleanup } = composeAbortSignal(abortSignal);
    const config: any = {
      systemInstruction,
      maxOutputTokens,
      abortSignal: controller.signal,
    };
    if (modelEntry.capabilities.thinking) {
      config.thinkingConfig = { thinkingLevel: mapThinkingLevel(thinkingLevel) };
    }
    if (webSearchEnabled && modelEntry.capabilities.searchGrounding) {
      config.tools = [{ googleSearch: {} }];
    }

    let iterator: AsyncIterator<any> | null = null;
    try {
      const stream = await raceWithTimeout(
        ai.models.generateContentStream({
          model: modelEntry.id,
          contents,
          config,
        }),
        firstChunkTimeoutMs,
        `${modelEntry.id} stream open timed out`
      );

      iterator = stream[Symbol.asyncIterator]();
      let streamedChars = 0;

      while (true) {
        if (!callbacks.isConnected() || controller.signal.aborted) break;

        const nextStep = await raceWithTimeout(
          iterator.next(),
          streamedChars === 0 ? firstChunkTimeoutMs : 45000,
          `${modelEntry.id} response timed out`
        );
        if (nextStep.done) break;
        const chunk = nextStep.value;

        const finishReason = chunk.candidates?.[0]?.finishReason;
        if (finishReason === 'SAFETY' || finishReason === 'PROHIBITED_CONTENT') {
          throw new Error('BLOCKED_BY_SAFETY');
        }

        if (chunk.text) {
          streamedChars += chunk.text.length;
          callbacks.onText(chunk.text);
        }

        const metadata = chunk.candidates?.[0]?.groundingMetadata;
        if (Array.isArray(metadata?.webSearchQueries)) {
          for (const q of metadata.webSearchQueries) {
            if (typeof q === 'string' && q.trim()) callbacks.onSearchQuery(q.trim());
          }
        }
        if (Array.isArray(metadata?.groundingChunks)) {
          for (const gChunk of metadata.groundingChunks) {
            const web = (gChunk as any).web;
            if (web?.uri) {
              callbacks.onSource({
                index: 0,
                title: web.title || extractDomain(web.uri),
                uri: web.uri,
                domain: extractDomain(web.uri),
              });
            }
          }
        }
      }

      return { streamedChars };
    } catch (err) {
      controller.abort();
      await iterator?.return?.().catch(() => {});
      throw err;
    } finally {
      cleanup();
    }
  }

  if (modelEntry.provider === 'anthropic') {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      const err: any = new Error('ANTHROPIC_API_KEY missing');
      err.status = 401;
      throw err;
    }

    const buildAnthropicContent = (text: string, atts: any[] = []) => {
      const blocks: any[] = [];
      for (const att of atts) {
        const textBlock = decodeTextAttachment(att);
        if (textBlock) {
          blocks.push({ type: 'text', text: textBlock });
        } else if (att?.data && (att.type || '').startsWith('image/')) {
          const base64Data = att.data.includes(',') ? att.data.split(',')[1] : att.data;
          blocks.push({
            type: 'image',
            source: { type: 'base64', media_type: att.type, data: base64Data },
          });
        }
      }
      if (text) blocks.push({ type: 'text', text });
      return blocks;
    };

    const messagesPayload: any[] = [];
    for (const h of history) {
      const textVal = h.content || h.text || '';
      const blocks = buildAnthropicContent(textVal, h.attachments || []);
      if (blocks.length > 0) {
        messagesPayload.push({
          role: h.role === 'assistant' || h.role === 'model' ? 'assistant' : 'user',
          content: blocks,
        });
      }
    }
    messagesPayload.push({
      role: 'user',
      content: buildAnthropicContent(message, attachments),
    });

    const { controller, cleanup } = composeAbortSignal(abortSignal);
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    try {
      const resp = await raceWithTimeout(
        fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: modelEntry.id,
            max_tokens: maxOutputTokens,
            system: systemInstruction,
            stream: true,
            messages: messagesPayload,
          }),
        }),
        firstChunkTimeoutMs,
        `${modelEntry.id} request timed out`
      );

      if (!resp.ok || !resp.body) {
        const errText = await resp.text().catch(() => '');
        const err: any = new Error(errText || `Anthropic HTTP ${resp.status}`);
        err.status = resp.status;
        throw err;
      }

      reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let streamedChars = 0;

      while (true) {
        const { done, value } = await raceWithTimeout(
          reader.read(),
          streamedChars === 0 ? firstChunkTimeoutMs : 45000,
          `${modelEntry.id} stream timed out`
        );
        if (done || !callbacks.isConnected() || controller.signal.aborted) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const jsonPart = trimmed.replace(/^data:\s*/, '');
          if (!jsonPart || jsonPart === '[DONE]') continue;
          try {
            const evt = JSON.parse(jsonPart);
            if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta' && evt.delta?.text) {
              streamedChars += evt.delta.text.length;
              callbacks.onText(evt.delta.text);
            } else if (evt.type === 'error') {
              throw new Error(evt.error?.message || 'Anthropic stream error');
            }
          } catch (parseErr: any) {
            if (parseErr?.message?.includes('Anthropic stream error')) throw parseErr;
          }
        }
      }
      return { streamedChars };
    } catch (err) {
      controller.abort();
      await reader?.cancel().catch(() => {});
      throw err;
    } finally {
      cleanup();
    }
  }

  // OpenRouter adapter (OpenAI-compatible SSE)
  const orKey = process.env.OPENROUTER_API_KEY;
  if (!orKey) {
    const err: any = new Error('OPENROUTER_API_KEY missing');
    err.status = 401;
    throw err;
  }

  const orMessages: Array<{ role: string; content: string }> = [{ role: 'system', content: systemInstruction }];
  for (const h of history) {
    const textVal = h.content || h.text || '';
    const extraTexts = (h.attachments || []).map(decodeTextAttachment).filter(Boolean).join('\n\n');
    const combined = [extraTexts, textVal].filter(Boolean).join('\n\n');
    if (combined) {
      orMessages.push({
        role: h.role === 'assistant' || h.role === 'model' ? 'assistant' : 'user',
        content: combined,
      });
    }
  }
  const currentExtras = (attachments || []).map(decodeTextAttachment).filter(Boolean).join('\n\n');
  orMessages.push({
    role: 'user',
    content: [currentExtras, message].filter(Boolean).join('\n\n'),
  });

  const { controller, cleanup } = composeAbortSignal(abortSignal);
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  try {
    const resp = await raceWithTimeout(
      fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${orKey}`,
          'X-Title': 'Camellia AI',
        },
        body: JSON.stringify({
          model: modelEntry.id,
          max_tokens: maxOutputTokens,
          stream: true,
          messages: orMessages,
        }),
      }),
      firstChunkTimeoutMs,
      `${modelEntry.id} request timed out`
    );

    if (!resp.ok || !resp.body) {
      const errText = await resp.text().catch(() => '');
      const err: any = new Error(errText || `OpenRouter HTTP ${resp.status}`);
      err.status = resp.status;
      throw err;
    }

    reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let streamedChars = 0;

    while (true) {
      const { done, value } = await raceWithTimeout(
        reader.read(),
        streamedChars === 0 ? firstChunkTimeoutMs : 45000,
        `${modelEntry.id} stream timed out`
      );
      if (done || !callbacks.isConnected() || controller.signal.aborted) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const jsonPart = trimmed.replace(/^data:\s*/, '');
        if (!jsonPart || jsonPart === '[DONE]') continue;
        try {
          const evt = JSON.parse(jsonPart);
          const delta = evt?.choices?.[0]?.delta?.content;
          if (typeof delta === 'string' && delta.length > 0) {
            streamedChars += delta.length;
            callbacks.onText(delta);
          }
        } catch {
          // ignore partial SSE JSON
        }
      }
    }
    return { streamedChars };
  } catch (err) {
    controller.abort();
    await reader?.cancel().catch(() => {});
    throw err;
  } finally {
    cleanup();
  }
}
