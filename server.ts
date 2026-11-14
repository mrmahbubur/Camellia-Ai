import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import {
  registerUser,
  authenticateUser,
  getUserByToken,
  updateUserData,
  revokeSession,
  checkRateLimit
} from './server/authStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Security Headers
app.use((_req: Request, res: Response, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');
  next();
});

app.use(cors());
app.use(express.json({ limit: '15mb' }));

// Shared Google GenAI client (Server-Side only)
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

const DEFAULT_SYSTEM_INSTRUCTION = `You are Camellia AI, an advanced, highly intelligent AI assistant and real-time answer engine.
Your capabilities:
- Answer questions directly, putting the main conclusion first and expanding with clear structure (headings, lists, tables).
- Use Google Search grounding automatically whenever current events, recent developments, live facts, or verification are helpful. Never invent URLs or fabricate citations.
- Explain technical topics clearly and write clean, idiomatic, production-ready code in well-labeled markdown code blocks.
- Solve mathematics, engineering, and quantitative problems accurately, formatting equations cleanly with LaTeX ($...$ and $$...$$).
- Analyze uploaded images, PDFs, documents, and code files thoroughly.
- Adapt smoothly across multi-turn conversations and reply fluently in the user's preferred language (including English and Bengali / বাংলা).`;

// Supported models aligned with @google/genai catalog
const AVAILABLE_MODELS = [
  {
    id: 'gemini-4-hydrogen',
    name: 'Gemini 4 Hydrogen',
    tag: 'Default',
    description: 'Latest multimodal Flash model with adaptive reasoning and live Google Search grounding.',
    isDefault: true,
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    tag: 'Fast',
    description: 'Lightweight model optimized for ultra-low latency responses.',
    isDefault: false,
  },
];

// Normalize model ID (protects against legacy saved values in localStorage)
function normalizeModelId(requested?: string): string {
  const validIds = new Set(AVAILABLE_MODELS.map((m) => m.id));
  if (requested && validIds.has(requested)) {
    return requested;
  }
  return 'gemini-4-hydrogen';
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

function buildAttachmentParts(attachments: any[]): any[] {
  const parts: any[] = [];
  if (!Array.isArray(attachments)) return parts;

  for (const att of attachments) {
    if (!att) continue;
    const name = att.name || 'attachment';
    const mime = (att.type || '').toLowerCase();

    // If decoded text was provided or it's a text/code/json/csv file, decode UTF-8 as readable text context
    const isTextLike =
      Boolean(att.textContent) ||
      mime.startsWith('text/') ||
      mime === 'application/json' ||
      mime === 'application/javascript' ||
      mime === 'application/typescript' ||
      /\.(txt|md|markdown|json|csv|js|jsx|ts|tsx|py|html|css|scss|sql|xml|yaml|yml|sh|bash|env|log)$/i.test(name);

    if (isTextLike) {
      let decoded = att.textContent || '';
      if (!decoded && typeof att.data === 'string') {
        try {
          const b64 = att.data.includes(',') ? att.data.split(',')[1] : att.data;
          decoded = Buffer.from(b64, 'base64').toString('utf-8');
        } catch {
          decoded = '';
        }
      }
      if (decoded.trim()) {
        const truncated = decoded.length > 100000 ? `${decoded.slice(0, 100000)}\n...[truncated]` : decoded;
        parts.push({
          text: `[Attached file: ${name}]\n\`\`\`\n${truncated}\n\`\`\``,
        });
        continue;
      }
    }

    // Binary multimodal inputs supported directly by Gemini (images & PDFs)
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

function classifyGeminiError(err: any): { message: string; errorType: string } {
  const msg = String(err?.message || err || '');
  const status = err?.status || err?.code;

  if (status === 429 || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
    return {
      errorType: 'rate_limit',
      message:
        'Gemini API quota or rate limit reached. Please wait a moment and click Retry, or add a billing-enabled API key in Settings > Secrets.',
    };
  }
  if (status === 400 || status === 403 || msg.includes('API_KEY_INVALID') || msg.includes('PERMISSION_DENIED')) {
    return {
      errorType: 'auth',
      message: 'Gemini API authentication error. Please verify the API key in Settings > Secrets.',
    };
  }
  if (msg.toLowerCase().includes('safety') || msg.toLowerCase().includes('blocked')) {
    return {
      errorType: 'blocked',
      message: 'This response was blocked by safety filters. Please rephrase your request and try again.',
    };
  }
  return {
    errorType: 'network',
    message: 'Unable to complete the response due to a model or network interruption. Please click Retry.',
  };
}

// Health & Model Catalog
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'Camellia AI',
    timestamp: new Date().toISOString(),
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

app.get('/api/models', (_req: Request, res: Response) => {
  res.json({ models: AVAILABLE_MODELS });
});

app.get('/api/voice/config', (_req: Request, res: Response) => {
  res.json({
    voice: {
      provider: 'Camellia Voice Engine',
      name: 'Claude AI Female Voice',
      gender: 'female',
      preferredLang: 'en-US',
      rate: 1.0,
      pitch: 1.04,
      volume: 1.0,
      persona: 'Calm, articulate female assistant voice',
      description: 'On-demand message narration supporting English and Bengali.',
      priorityVoices: [
        'Google UK English Female',
        'Microsoft Sonia Online (Natural) - English (United Kingdom)',
        'Microsoft Jenny Online (Natural) - English (United States)',
        'Samantha',
        'Serena',
        'Google US English Female',
      ],
    },
  });
});

// Authentication Endpoints
app.post('/api/auth/signup', (req: Request, res: Response) => {
  const { usernameOrEmail, password, passwordConfirm } = req.body;
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  const rateCheck = checkRateLimit(`signup_${ip}`, 10, 60000);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      success: false,
      error: `Too many registration attempts. Please wait ${rateCheck.retryAfter}s.`,
    });
  }

  if (passwordConfirm !== undefined && password !== passwordConfirm) {
    return res.status(400).json({
      success: false,
      error: 'Passwords do not match.',
    });
  }

  const result = registerUser(usernameOrEmail || '', password || '');
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.json(result);
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { usernameOrEmail, password } = req.body;
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  const rateCheck = checkRateLimit(`login_${ip}_${usernameOrEmail}`, 8, 60000);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      success: false,
      error: `Too many login attempts. Please wait ${rateCheck.retryAfter}s.`,
    });
  }

  const result = authenticateUser(usernameOrEmail || '', password || '');
  if (!result.success) {
    return res.status(401).json(result);
  }
  return res.json(result);
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  const user = getUserByToken(token);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid or expired session' });
  }

  return res.json({ success: true, user });
});

app.post('/api/auth/sync-data', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  const user = getUserByToken(token);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid or expired session' });
  }

  const payload = req.body?.savedData && typeof req.body.savedData === 'object' ? req.body.savedData : req.body;
  const cleanData: Record<string, any> = {};
  if (payload.notes !== undefined) cleanData.notes = payload.notes;
  if (payload.themePreference !== undefined) cleanData.themePreference = payload.themePreference;
  if (payload.chatSessionCount !== undefined) cleanData.chatSessionCount = payload.chatSessionCount;
  if (payload.savedChats !== undefined) cleanData.savedChats = payload.savedChats;

  updateUserData(user.id, cleanData);
  const updatedUser = getUserByToken(token);

  return res.json({ success: true, user: updatedUser });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const bodyToken = req.body?.token;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : bodyToken;
  if (token) {
    revokeSession(token);
  }
  return res.json({ success: true, message: 'Logged out successfully' });
});

// Real-Time Token Streaming Endpoint (Server-Sent Events)
app.post('/api/chat/stream', async (req: Request, res: Response) => {
  const {
    message,
    history = [],
    attachments = [],
    model = 'gemini-4-hydrogen',
    thinkingLevel = 'medium',
    webSearchEnabled = true,
    systemInstruction,
    replyLanguage = 'auto',
    language,
  } = req.body;

  if (!message && (!attachments || attachments.length === 0)) {
    return res.status(400).json({ error: 'Message or attachment is required.' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      error: 'Gemini API key is not configured on the server. Please add it in Settings > Secrets.',
    });
  }

  // Setup Server-Sent Events headers
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  let isConnected = true;
  res.on('close', () => {
    if (!res.writableEnded) {
      isConnected = false;
    }
  });

  // System instructions + language guidance
  const targetLang = language || replyLanguage || 'auto';
  let finalInstruction = systemInstruction?.trim() || DEFAULT_SYSTEM_INSTRUCTION;
  if (targetLang === 'bn' || targetLang === 'bengali') {
    finalInstruction += '\nAlways reply in natural, fluent Bengali (বাংলা) unless explicitly asked otherwise.';
  } else if (targetLang === 'en' || targetLang === 'english') {
    finalInstruction += '\nAlways reply in clear, professional English.';
  }

  // Build multi-turn Gemini contents
  const contents: any[] = [];
  if (Array.isArray(history)) {
    for (const h of history) {
      const textVal = h.content || h.text || '';
      const attParts = buildAttachmentParts(h.attachments || []);
      const parts: any[] = [...attParts];
      if (textVal) {
        parts.push({ text: textVal });
      }
      if (parts.length > 0) {
        const role = h.role === 'assistant' || h.role === 'model' ? 'model' : 'user';
        contents.push({ role, parts });
      }
    }
  }

  const currentParts: any[] = [...buildAttachmentParts(attachments)];
  if (message) {
    currentParts.push({ text: message });
  }
  contents.push({ role: 'user', parts: currentParts });

  const primaryModel = normalizeModelId(model);
  // Ordered attempts: requested model -> fallback active Flash/Lite models
  const candidateModels = Array.from(
    new Set([primaryModel, 'gemini-4-hydrogen', 'gemini-3.1-flash-lite'])
  );

  const ai = getGenAIClient();
  const sourcesMap = new Map<string, { index: number; title: string; uri: string; domain: string }>();
  const searchQueriesSet = new Set<string>();
  let lastError: any = null;

  for (let idx = 0; idx < candidateModels.length; idx++) {
    if (!isConnected) return;

    const currentModel = candidateModels[idx];
    const useSearch = Boolean(webSearchEnabled) && currentModel !== 'gemini-3.1-flash-lite';

    const config: any = {
      systemInstruction: finalInstruction,
    };

    if (currentModel === 'gemini-4-hydrogen') {
      config.thinkingConfig = {
        thinkingLevel: mapThinkingLevel(thinkingLevel),
      };
    }

    if (useSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    let streamedAnyText = false;
    const maxModelAttempts = currentModel === 'gemini-4-hydrogen' ? 2 : 1;

    for (let retryAttempt = 0; retryAttempt < maxModelAttempts; retryAttempt++) {
      if (!isConnected) return;
      streamedAnyText = false;

      try {
        const stream = await ai.models.generateContentStream({
          model: currentModel,
          contents,
          config,
        });

        for await (const chunk of stream) {
          if (!isConnected) return;

          // Check block reason
          const finishReason = chunk.candidates?.[0]?.finishReason;
          if (finishReason === 'SAFETY' || finishReason === 'PROHIBITED_CONTENT') {
            throw new Error('BLOCKED_BY_SAFETY');
          }

          const chunkText = chunk.text;
          if (chunkText) {
            streamedAnyText = true;
            res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
          }

          const metadata = chunk.candidates?.[0]?.groundingMetadata;
          if (metadata?.webSearchQueries && Array.isArray(metadata.webSearchQueries)) {
            for (const q of metadata.webSearchQueries) {
              if (typeof q === 'string' && q.trim()) {
                searchQueriesSet.add(q.trim());
              }
            }
          }

          if (metadata?.groundingChunks && Array.isArray(metadata.groundingChunks)) {
            for (const gChunk of metadata.groundingChunks) {
              const web = (gChunk as any).web;
              if (web?.uri && !sourcesMap.has(web.uri)) {
                sourcesMap.set(web.uri, {
                  index: sourcesMap.size + 1,
                  title: web.title || extractDomain(web.uri),
                  uri: web.uri,
                  domain: extractDomain(web.uri),
                });
              }
            }
          }
        }

        if (streamedAnyText) {
          if (isConnected) {
            res.write(
              `data: ${JSON.stringify({
                done: true,
                modelUsed: currentModel,
                sources: Array.from(sourcesMap.values()),
                searchQueries: Array.from(searchQueriesSet),
              })}\n\n`
            );
            res.end();
          }
          return;
        }
      } catch (err: any) {
        lastError = err;
        const classified = classifyGeminiError(err);

        // If partial text was already streamed before interruption, close cleanly with error note
        if (streamedAnyText) {
          if (isConnected) {
            res.write(`data: ${JSON.stringify({ error: classified.message, errorType: classified.errorType })}\n\n`);
            res.end();
          }
          return;
        }

        // If safety block or invalid auth key, stop immediately without fallback loops
        if (classified.errorType === 'auth' || classified.errorType === 'blocked') {
          if (isConnected) {
            res.write(`data: ${JSON.stringify({ error: classified.message, errorType: classified.errorType })}\n\n`);
            res.end();
          }
          return;
        }

        // Brief jittered backoff on transient 429 before retrying or falling back to next candidate model
        if (classified.errorType === 'rate_limit' && retryAttempt + 1 < maxModelAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 650));
          continue;
        }

        console.info(
          `[GEMINI STREAM] ${currentModel} fallback (${classified.errorType}); trying next candidate if available.`
        );
        break;
      }
    }
  }

  // All attempts failed: propagate real structured error to UI so user sees Retry button
  if (lastError) {
    console.error('[GEMINI STREAM TERMINAL FAILURE]', lastError?.message || lastError);
  }
  if (isConnected) {
    const classified = classifyGeminiError(lastError);
    res.write(`data: ${JSON.stringify({ error: classified.message, errorType: classified.errorType })}\n\n`);
    res.end();
  }
});

// Server Startup with Vite integration
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    } else {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Camellia AI server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
