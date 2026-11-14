import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  passwordHash: string;
  salt: string;
  createdAt: string;
  lastLogin: string;
  savedData?: {
    notes?: string;
    themePreference?: string;
    chatSessionCount?: number;
    savedChats?: any[];
  };
}

export interface UserSession {
  tokenHash: string;
  userId: string;
  username: string;
  expiresAt: number;
}

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function loadSessionsFromDisk(): Map<string, UserSession> {
  const map = new Map<string, UserSession>();
  try {
    if (!fs.existsSync(SESSIONS_FILE)) {
      return map;
    }
    const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8');
    const parsed = JSON.parse(raw || '{}') as Record<string, UserSession>;
    const now = Date.now();
    let pruned = false;
    for (const [k, s] of Object.entries(parsed)) {
      if (s && s.tokenHash && s.userId && typeof s.expiresAt === 'number' && s.expiresAt > now) {
        map.set(k, s);
      } else {
        pruned = true;
      }
    }
    if (pruned) {
      saveSessionsToDisk(map);
    }
  } catch (err) {
    console.error('[AUTH STORE] Error reading sessions file:', err);
  }
  return map;
}

function saveSessionsToDisk(sessions: Map<string, UserSession>): void {
  try {
    const obj: Record<string, UserSession> = {};
    const now = Date.now();
    for (const [k, v] of sessions.entries()) {
      if (v.expiresAt > now) {
        obj[k] = v;
      }
    }
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    console.error('[AUTH STORE] Error writing sessions file:', err);
  }
}

const activeSessions = loadSessionsFromDisk();

// In-memory rate limiting tracker (defense against brute-force attacks)
interface RateLimitBucket {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitBucket>();

export function checkRateLimit(
  key: string,
  maxAttempts = 10,
  windowMs = 60000
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const bucket = rateLimitMap.get(key);

  if (!bucket || now > bucket.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (bucket.count >= maxAttempts) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  bucket.count += 1;
  return { allowed: true };
}

export function resetRateLimit(key: string): void {
  rateLimitMap.delete(key);
}

function isDesignatedAdminEmail(emailOrIdentifier: string): boolean {
  const configuredAdmin = (process.env.ADMIN_EMAIL || 'mr216873@gmail.com').trim().toLowerCase();
  return emailOrIdentifier.trim().toLowerCase() === configuredAdmin;
}

function loadUsers(): Record<string, UserRecord> {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, JSON.stringify({}), 'utf-8');
      return {};
    }
    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    const parsed = JSON.parse(raw || '{}') as Record<string, UserRecord>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    const entries = Object.values(parsed);
    const hasAdmin = entries.some((u) => u.role === 'admin');
    let dirty = false;
    for (let i = 0; i < entries.length; i++) {
      const u = entries[i];
      if (!u.role) {
        u.role = !hasAdmin && (i === 0 || isDesignatedAdminEmail(u.email)) ? 'admin' : 'user';
        dirty = true;
      } else if (isDesignatedAdminEmail(u.email) && u.role !== 'admin') {
        u.role = 'admin';
        dirty = true;
      }
    }
    if (dirty) {
      saveUsers(parsed);
    }
    return parsed;
  } catch (err) {
    console.error('[AUTH STORE] Error reading users file:', err);
    return {};
  }
}

function saveUsers(users: Record<string, UserRecord>): void {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('[AUTH STORE] Error writing users file:', err);
  }
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function issueSessionForUser(user: UserRecord): string {
  const token = crypto.randomBytes(48).toString('hex');
  const tokenHash = hashSessionToken(token);
  const expiresAt = Date.now() + SESSION_TTL_MS;
  activeSessions.set(tokenHash, {
    tokenHash,
    userId: user.id,
    username: user.username,
    expiresAt,
  });
  saveSessionsToDisk(activeSessions);
  return token;
}

function buildUniqueUsername(desired: string, users: Record<string, UserRecord>): string {
  const normalizedBase = desired.replace(/[^a-z0-9._-]/g, '').slice(0, 40) || 'user';
  const taken = new Set(Object.values(users).map((u) => u.username.toLowerCase()));
  if (!taken.has(normalizedBase)) return normalizedBase;
  let counter = 2;
  while (taken.has(`${normalizedBase}_${counter}`)) {
    counter += 1;
  }
  return `${normalizedBase}_${counter}`;
}

export function registerUser(
  usernameOrEmail: string,
  password: string
): { success: boolean; user?: Omit<UserRecord, 'passwordHash' | 'salt'>; token?: string; error?: string } {
  const identifier = usernameOrEmail.trim().toLowerCase();
  if (!identifier || identifier.length < 3 || identifier.length > 120) {
    return { success: false, error: 'Username or email must be between 3 and 120 characters.' };
  }

  if (/\s/.test(identifier)) {
    return { success: false, error: 'Username or email cannot contain spaces.' };
  }

  if (identifier.includes('__proto__') || identifier.includes('constructor') || identifier.includes('prototype')) {
    return { success: false, error: 'Invalid username or email format.' };
  }

  const isEmail = identifier.includes('@');
  if (isEmail) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailPattern.test(identifier)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
  } else {
    if (identifier.length > 50 || !/^[a-z0-9._-]+$/.test(identifier)) {
      return {
        success: false,
        error: 'Username may only use letters, numbers, dots, underscores, and hyphens (3–50 characters).',
      };
    }
  }

  if (!password || password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }
  if (password.length > 256) {
    return { success: false, error: 'Password is too long.' };
  }

  const users = loadUsers();
  const targetEmail = isEmail ? identifier : `${identifier}@user.local`;

  const existing = Object.values(users).find((u) => {
    const uEmail = u.email.toLowerCase();
    const uName = u.username.toLowerCase();
    if (isEmail) {
      return uEmail === targetEmail;
    }
    return uName === identifier || uEmail === targetEmail;
  });

  if (existing) {
    return {
      success: false,
      error: 'An account with this username or email already exists. Please log in.',
    };
  }

  const username = isEmail
    ? buildUniqueUsername(identifier.split('@')[0], users)
    : identifier;

  const userId = `usr_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const salt = crypto.randomBytes(32).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const existingAdmins = Object.values(users).some((u) => u.role === 'admin');
  const role: 'admin' | 'user' = !existingAdmins || isDesignatedAdminEmail(targetEmail) ? 'admin' : 'user';

  const now = new Date().toISOString();
  const newUser: UserRecord = {
    id: userId,
    username,
    email: targetEmail,
    role,
    passwordHash,
    salt,
    createdAt: now,
    lastLogin: now,
    savedData: {
      notes: 'Welcome to your private workspace session.',
      themePreference: 'dark',
      chatSessionCount: 0,
      savedChats: [],
    },
  };

  users[userId] = newUser;
  saveUsers(users);

  const token = issueSessionForUser(newUser);
  const { passwordHash: _, salt: __, ...safeUser } = newUser;
  return { success: true, user: safeUser, token };
}

export function authenticateUser(
  usernameOrEmail: string,
  password: string
): { success: boolean; user?: Omit<UserRecord, 'passwordHash' | 'salt'>; token?: string; error?: string } {
  const identifier = usernameOrEmail.trim().toLowerCase();
  if (!identifier || !password) {
    return { success: false, error: 'Username/email and password are required.' };
  }

  const users = loadUsers();
  const allUsers = Object.values(users);
  const user =
    allUsers.find((u) => u.email.toLowerCase() === identifier) ||
    allUsers.find((u) => u.username.toLowerCase() === identifier);

  if (!user) {
    return { success: false, error: 'Invalid username or password.' };
  }

  const testHash = hashPassword(password, user.salt);
  const hashBufA = Buffer.from(testHash, 'hex');
  const hashBufB = Buffer.from(user.passwordHash, 'hex');
  if (hashBufA.length !== hashBufB.length || !crypto.timingSafeEqual(hashBufA, hashBufB)) {
    return { success: false, error: 'Invalid username or password.' };
  }

  user.lastLogin = new Date().toISOString();
  users[user.id] = user;
  saveUsers(users);

  const token = issueSessionForUser(user);
  const { passwordHash: _, salt: __, ...safeUser } = user;
  return { success: true, user: safeUser, token };
}

export function getUserByToken(token: string): Omit<UserRecord, 'passwordHash' | 'salt'> | null {
  if (!token || typeof token !== 'string') return null;
  const tokenHash = hashSessionToken(token);
  let session = activeSessions.get(tokenHash);

  if (!session) {
    const diskSessions = loadSessionsFromDisk();
    session = diskSessions.get(tokenHash);
    if (session) {
      activeSessions.set(tokenHash, session);
    }
  }

  if (!session || Date.now() > session.expiresAt) {
    if (session) {
      activeSessions.delete(tokenHash);
      saveSessionsToDisk(activeSessions);
    }
    return null;
  }

  const users = loadUsers();
  const user = users[session.userId];
  if (!user) {
    activeSessions.delete(tokenHash);
    saveSessionsToDisk(activeSessions);
    return null;
  }

  const { passwordHash: _, salt: __, ...safeUser } = user;
  return safeUser;
}

export function updateUserData(userId: string, data: any): boolean {
  const users = loadUsers();
  if (!users[userId]) return false;

  users[userId].savedData = {
    ...users[userId].savedData,
    ...data,
  };
  saveUsers(users);
  return true;
}

export function revokeSession(token: string): void {
  if (!token || typeof token !== 'string') return;
  const tokenHash = hashSessionToken(token);
  activeSessions.delete(tokenHash);
  saveSessionsToDisk(activeSessions);
}
