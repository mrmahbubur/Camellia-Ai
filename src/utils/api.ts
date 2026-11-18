const BACKEND_STORAGE_KEY = 'camellia_api_base_url';

function normalizeBaseUrl(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return '';
}

function initBaseUrlFromQuery(): string {
  if (typeof window === 'undefined') return '';
  try {
    const params = new URLSearchParams(window.location.search);
    const paramVal = params.get('apiBase') || params.get('api');
    if (paramVal) {
      const normalized = normalizeBaseUrl(paramVal);
      if (normalized) {
        localStorage.setItem(BACKEND_STORAGE_KEY, normalized);
        return normalized;
      }
    }
  } catch {
    // ignore URL/storage access errors
  }
  return '';
}

export function getEnvApiBaseUrl(): string {
  return typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
    ? normalizeBaseUrl(String(import.meta.env.VITE_API_BASE_URL))
    : '';
}

export function getStoredApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  const fromQuery = initBaseUrlFromQuery();
  if (fromQuery) return fromQuery;
  try {
    return normalizeBaseUrl(localStorage.getItem(BACKEND_STORAGE_KEY));
  } catch {
    return '';
  }
}

export function getApiBaseUrl(): string {
  return getStoredApiBaseUrl() || getEnvApiBaseUrl();
}

export function setApiBaseUrl(url: string): string {
  const normalized = normalizeBaseUrl(url);
  if (typeof window !== 'undefined') {
    try {
      if (normalized) {
        localStorage.setItem(BACKEND_STORAGE_KEY, normalized);
      } else {
        localStorage.removeItem(BACKEND_STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }
  return normalized;
}

export function getApiUrl(path: string, overrideBase?: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = overrideBase !== undefined ? normalizeBaseUrl(overrideBase) : getApiBaseUrl();
  return base ? `${base}${normalizedPath}` : normalizedPath;
}

export function isJsonResponse(response: Response): boolean {
  const contentType = response.headers.get('content-type') || '';
  return contentType.toLowerCase().includes('application/json');
}

export async function testBackendConnection(customBase?: string): Promise<{
  ok: boolean;
  message: string;
}> {
  try {
    const targetUrl = getApiUrl('/api/health', customBase);
    const res = await fetch(targetUrl, { method: 'GET' });
    if (!res.ok || !isJsonResponse(res)) {
      return {
        ok: false,
        message: 'No Express backend detected at this URL (static response returned).',
      };
    }
    const data = await res.json();
    if (data?.status === 'ok') {
      return {
        ok: true,
        message: `Connected to ${data.app || 'Camellia AI'} backend.`,
      };
    }
    return { ok: false, message: 'Unexpected health response from server.' };
  } catch {
    return {
      ok: false,
      message: 'Could not reach backend server. Check URL and CORS settings.',
    };
  }
}
