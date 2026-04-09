import { identifyUser, resetUser } from './posthog'

const TOKEN_KEY = 'access_token';
const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token)
  // Clear any session data from a previous user
  window.sessionStorage.clear()

  // Identify in PostHog — decode userId from JWT payload (middle segment)
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { sub?: string }
    const userId = parseInt(payload.sub ?? '', 10)
    if (!isNaN(userId)) {
      identifyUser(userId)
    }
  } catch {
    // Non-fatal — PostHog identification is best-effort
  }
}

export function clearAccessToken(): void {
  window.localStorage.removeItem(TOKEN_KEY)
  window.localStorage.removeItem('mindmap-graph-state')
  resetUser()
}

export function isLoggedIn(): boolean {
  return getAccessToken() !== null;
}

async function apiFetch(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`${apiBaseUrl}${path}`, init);
  } catch {
    throw new Error('Unable to reach the server. Please check that the backend is running.');
  }
}

export async function register(
  email: string,
  password: string
): Promise<void> {
  const response = await apiFetch('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
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
