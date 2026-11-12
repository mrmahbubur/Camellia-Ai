import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface UserRecord {
  id: string;
  username: string;
  email: string;
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
  token: string;
  userId: string;
  username: string;
  expiresAt: number;
}

// In-memory active sessions
const activeSessions = new Map<string, UserSession>();

// In-memory rate limiting tracker (defense against brute-force attacks)
interface RateLimitBucket {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitBucket>();

export function checkRateLimit(key: string, maxAttempts = 10, windowMs = 60000): { allowed: boolean; retryAfter?: number } {
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

function loadUsers(): Record<string, UserRecord> {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, JSON.stringify({}), 'utf-8');
      return {};
    }
    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(raw || '{}');
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

// High security PBKDF2 hashing with unique cryptographic salt per user
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

export function registerUser(usernameOrEmail: string, password: string): { success: boolean; user?: Omit<UserRecord, 'passwordHash' | 'salt'>; token?: string; error?: string } {
  const identifier = usernameOrEmail.trim().toLowerCase();
  if (!identifier || identifier.length < 3) {
    return { success: false, error: 'Username or email must be at least 3 characters long.' };
  }

  if (!password || password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  // Prevent prototype pollution or malicious input
  if (identifier.includes('__proto__') || identifier.includes('constructor')) {
    return { success: false, error: 'Invalid username format.' };
  }

  const users = loadUsers();
  // Check if identifier already exists
  const existing = Object.values(users).find(
    (u) => u.username.toLowerCase() === identifier || u.email.toLowerCase() === identifier
  );

  if (existing) {
    return { success: false, error: 'An account with this username or email already exists. Please log in.' };
  }

  const userId = `usr_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const salt = crypto.randomBytes(32).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const isEmail = identifier.includes('@');

  const now = new Date().toISOString();
  const newUser: UserRecord = {
    id: userId,
    username: isEmail ? identifier.split('@')[0] : identifier,
    email: isEmail ? identifier : `${identifier}@user.local`,
    passwordHash,
    salt,
    createdAt: now,
    lastLogin: now,
    savedData: {
      notes: 'Welcome to your private encrypted workspace session.',
      themePreference: 'dark-realistic-cyan',
      chatSessionCount: 0,
      savedChats: []
    }
  };

  users[userId] = newUser;
  saveUsers(users);

  // Generate secure session token
  const token = crypto.randomBytes(48).toString('hex');
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 14; // 14 days
  activeSessions.set(token, {
    token,
    userId,
    username: newUser.username,
    expiresAt
  });

  const { passwordHash: _, salt: __, ...safeUser } = newUser;
  return { success: true, user: safeUser, token };
}

export function authenticateUser(usernameOrEmail: string, password: string): { success: boolean; user?: Omit<UserRecord, 'passwordHash' | 'salt'>; token?: string; error?: string } {
  const identifier = usernameOrEmail.trim().toLowerCase();
  if (!identifier || !password) {
    return { success: false, error: 'Username/email and password are required.' };
  }

  const users = loadUsers();
  const user = Object.values(users).find(
    (u) => u.username.toLowerCase() === identifier || u.email.toLowerCase() === identifier
  );

  if (!user) {
    return { success: false, error: 'Invalid username or password.' };
  }

  const testHash = hashPassword(password, user.salt);
  // Constant-time buffer comparison to prevent timing attacks
  const hashBufA = Buffer.from(testHash, 'hex');
  const hashBufB = Buffer.from(user.passwordHash, 'hex');
  if (hashBufA.length !== hashBufB.length || !crypto.timingSafeEqual(hashBufA, hashBufB)) {
    return { success: false, error: 'Invalid username or password.' };
  }

  // Update last login
  user.lastLogin = new Date().toISOString();
  users[user.id] = user;
  saveUsers(users);

  const token = crypto.randomBytes(48).toString('hex');
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 14;
  activeSessions.set(token, {
    token,
    userId: user.id,
    username: user.username,
    expiresAt
  });

  const { passwordHash: _, salt: __, ...safeUser } = user;
  return { success: true, user: safeUser, token };
}

export function getUserByToken(token: string): Omit<UserRecord, 'passwordHash' | 'salt'> | null {
  if (!token) return null;
  const session = activeSessions.get(token);
  if (!session || Date.now() > session.expiresAt) {
    if (session) activeSessions.delete(token);
    return null;
  }

  const users = loadUsers();
  const user = users[session.userId];
  if (!user) return null;

  const { passwordHash: _, salt: __, ...safeUser } = user;
  return safeUser;
}

export function updateUserData(userId: string, data: any): boolean {
  const users = loadUsers();
  if (!users[userId]) return false;

  users[userId].savedData = {
    ...users[userId].savedData,
    ...data
  };
  saveUsers(users);
  return true;
}

export function revokeSession(token: string): void {
  activeSessions.delete(token);
}
