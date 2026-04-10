import { identifyUser, resetUser } from './posthog'

const TOKEN_KEY = 'access_token';
const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

type JwtPayload = {
  sub?: string;
  exp?: number;
};

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return atob(padded);
}

function readTokenPayload(token: string): JwtPayload | null {
  try {
    const [, payloadSegment] = token.split('.');
    if (!payloadSegment) {
      return null;
    }

    return JSON.parse(decodeBase64Url(payloadSegment)) as JwtPayload;
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token)
  window.sessionStorage.clear()

  const payload = readTokenPayload(token)
  const userId = parseInt(payload?.sub ?? '', 10)
  if (!isNaN(userId)) {
    identifyUser(userId)
  }
}

export function clearAccessToken(): void {
  window.localStorage.removeItem(TOKEN_KEY)
  resetUser()
}

export function isLoggedIn(): boolean {
  const token = getAccessToken();
  if (!token) {
    return false;
  }

  const payload = readTokenPayload(token);
  if (!payload?.exp) {
    clearAccessToken();
    return false;
  }

  if (Date.now() >= payload.exp * 1000) {
    clearAccessToken();
    return false;
  }

  return true;
}

async function apiFetch(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`${apiBaseUrl}${path}`, init);
  } catch {
    throw new Error('Unable to reach the server. Please check that the backend is running.');
  }
}

export const REF_CODE_KEY = 'ref_code';

export async function register(
  email: string,
  password: string,
  refCode?: string | null
): Promise<void> {
  const body: Record<string, unknown> = { email, password };
  if (refCode) body.ref_code = refCode;

  const response = await apiFetch('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail ?? 'Registration failed.');
  }
}

export async function login(
  email: string,
  password: string
): Promise<void> {
  const response = await apiFetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail ?? 'Login failed.');
  }

  const data = await response.json();
  setAccessToken(data.access_token);
}
