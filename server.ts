import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import {
  registerUser,
  authenticateUser,
  getUserByToken,
  updateUserData,
  revokeSession,
  checkRateLimit
} from './server/authStore';

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
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const DEFAULT_SYSTEM_INSTRUCTION = `You are Camellia AI, an advanced, highly intelligent conversational AI assistant similar to ChatGPT and Claude.
You excel at:
- Answering questions directly, accurately, and thoroughly.
- Providing real-time web-grounded research, recent news, and verifiable facts.
- Writing clean, idiomatic code across all modern programming languages with markdown formatting and explanations.
- Performing precise mathematical calculations and rendering LaTeX formulas when helpful.
- Analyzing uploaded documents, codebases, text files, and images.
- Supporting multi-turn conversational nuance, creative writing, translation, and structured explanations.
- Adapting seamlessly to user instructions and responding fluently in any requested language (e.g., English, Bengali/Bangla, etc.).
Structure your responses with readable markdown, informative headings, lists, tables, and concise code blocks.`;

// Supported models catalog
const AVAILABLE_MODELS = [
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    tag: 'Fast & Intelligent (Default)',
    description: 'Latest high-speed multimodal model with advanced reasoning and real-time Google Search grounding.',
    isDefault: true,
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    tag: 'Ultra Fast',
    description: 'Lightweight model optimized for rapid answers and lowest latency.',
    isDefault: false,
  },
  {
    id: 'gemini-flash-latest',
    name: 'Gemini Flash Latest',
    tag: 'Balanced',
    description: 'Production stable Gemini Flash model.',
    isDefault: false,
  },
];

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

// Authentication Endpoints
app.post('/api/auth/signup', (req: Request, res: Response) => {
  const { usernameOrEmail, password } = req.body;
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  const rateCheck = checkRateLimit(`signup_${ip}`, 10, 60000);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      success: false,
      error: `Too many registration attempts. Please wait ${rateCheck.retryAfter}s.`,
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

  const { notes, themePreference, chatSessionCount, savedChats } = req.body;
  const updated = updateUserData(user.id, {
    notes,
    themePreference,
    chatSessionCount,
    savedChats,
  });

  return res.json({ success: true, user: updated });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    revokeSession(token);
  }
  return res.json({ success: true, message: 'Logged out successfully' });
});

// Helper to stream text smoothly token-by-token
async function streamTextTokens(res: Response, text: string, isClientConnected: () => boolean, sources: any[] = []) {
  const tokens = text.split(/(\s+)/);
  for (let i = 0; i < tokens.length; i++) {
    if (!isClientConnected()) break;
    res.write(`data: ${JSON.stringify({ text: tokens[i] })}\n\n`);
    if (i % 2 === 0) {
      await new Promise((r) => setTimeout(r, 12));
    }
  }

  if (isClientConnected()) {
    res.write(`data: ${JSON.stringify({ done: true, sources })}\n\n`);
    res.end();
  }
}

// Real-Time Token Streaming Endpoint (Server-Sent Events)
app.post('/api/chat/stream', async (req: Request, res: Response) => {
  const {
    message,
    history = [],
    attachments = [],
    model = 'gemini-3.8-flash',
    systemInstruction,
    replyLanguage = 'auto',
    language,
  } = req.body;

  if (!message && (!attachments || attachments.length === 0)) {
    return res.status(400).json({ error: 'Message or attachment is required.' });
  }

  // Setup Server-Sent Events headers
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  let isConnected = true;
  res.on('close', () => {
    if (!res.writableEnded) {
      isConnected = false;
    }
  });

  const targetLang = language || replyLanguage || 'auto';
  let finalInstruction = (systemInstruction?.trim() || DEFAULT_SYSTEM_INSTRUCTION);
  if (targetLang === 'bn' || targetLang === 'bengali') {
    finalInstruction += '\nAlways reply in natural, fluent Bengali (বাংলা) unless explicitly asked otherwise.';
  } else if (targetLang === 'en' || targetLang === 'english') {
    finalInstruction += '\nAlways reply in clear, professional English.';
  }

  // Build conversation history contents for Gemini API
  const contents: any[] = [];

  // Prior turns
  if (Array.isArray(history)) {
    for (const h of history) {
      const textVal = h.content || h.text || '';
      if (!textVal && (!h.attachments || h.attachments.length === 0)) continue;
      const role = h.role === 'assistant' || h.role === 'model' ? 'model' : 'user';
      const parts: any[] = [];

      if (h.attachments && Array.isArray(h.attachments)) {
        for (const att of h.attachments) {
          if (att.data && att.type) {
            const base64Data = att.data.includes(',') ? att.data.split(',')[1] : att.data;
            parts.push({
              inlineData: {
                mimeType: att.type,
                data: base64Data,
              },
            });
          }
        }
      }

      if (textVal) {
        parts.push({ text: textVal });
      }

      if (parts.length > 0) {
        contents.push({ role, parts });
      }
    }
  }

  // Current turn
  const currentParts: any[] = [];
  if (Array.isArray(attachments)) {
    for (const att of attachments) {
      if (att.data && att.type) {
        const base64Data = att.data.includes(',') ? att.data.split(',')[1] : att.data;
        currentParts.push({
          inlineData: {
            mimeType: att.type,
            data: base64Data,
          },
        });
      }
    }
  }
  if (message) {
    currentParts.push({ text: message });
  }
  contents.push({ role: 'user', parts: currentParts });

  const chosenModel = model || 'gemini-3.8-flash';
  const sourcesCollected: Array<{ title: string; url: string }> = [];

  // Step 1: Generate response with primary model (with search grounding if recent info/search is needed)
  let generatedText = '';
  const searchKeywords = ['latest', 'news', 'today', 'current', 'price', 'weather', 'who won', 'recent', 'score'];
  const needsWebSearch = searchKeywords.some((kw) => (message || '').toLowerCase().includes(kw));

  try {
    const config: any = { systemInstruction: finalInstruction };
    if (needsWebSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    const genPromise = ai.models.generateContent({
      model: chosenModel,
      contents,
      config,
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT_EXCEEDED')), 3500)
    );

    const response: any = await Promise.race([genPromise, timeoutPromise]);
    generatedText = response.text || '';

    // Collect search sources if present
    const metadata = response.candidates?.[0]?.groundingMetadata;
    if (metadata?.groundingChunks && Array.isArray(metadata.groundingChunks)) {
      for (const gChunk of metadata.groundingChunks) {
        const web = (gChunk as any).web;
        if (web?.uri && !sourcesCollected.some((s) => s.url === web.uri)) {
          sourcesCollected.push({
            title: web.title || web.uri,
            url: web.uri,
          });
        }
      }
    }
  } catch (err: any) {
    console.warn(`[PRIMARY MODEL ${chosenModel} FAILED/TIMED OUT, TRYING FAST LITE MODEL]`, err?.message || err);
  }

  // Step 2: Fallback to gemini-3.1-flash-lite (ultra-fast 800ms response) if primary failed or timed out
  if (!generatedText && isConnected) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents,
        config: { systemInstruction: finalInstruction },
      });
      generatedText = response.text || '';
    } catch (fbErr: any) {
      console.warn('[FLASH-LITE FALLBACK FAILED]', fbErr?.message || fbErr);
    }
  }

  // Step 3: Stream tokens to client
  if (generatedText && isConnected) {
    await streamTextTokens(res, generatedText, () => isConnected, sourcesCollected);
    return;
  }

  // Step 4: Graceful notice if completely offline/out of quota
  if (isConnected) {
    const errorMsg = 'Camellia AI is temporarily experiencing high API traffic. Please try sending your message again.';
    await streamTextTokens(res, errorMsg, () => isConnected, []);
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
