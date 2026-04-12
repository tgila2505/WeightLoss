import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearAccessToken,
  getAccessToken,
  isLoggedIn,
  login,
  logout,
  register,
  setAccessToken
} from '@/lib/auth';
import { saveFunnelProfile, getFunnelProfile } from '@/lib/funnel-session';

function createToken(expiresAtSeconds: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ sub: '123', exp: expiresAtSeconds }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  return `${header}.${payload}.signature`;
}

describe('auth helpers', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    // Clear cookies between tests
    document.cookie = 'has_session=; path=/; max-age=0';
  });

  it('getAccessToken returns null (tokens now in httpOnly cookies)', () => {
    expect(getAccessToken()).toBeNull();
  });

  it('setAccessToken sets has_session cookie and clearAccessToken removes it', () => {
    const token = createToken(Math.floor(Date.now() / 1000) + 3600);
    setAccessToken(token);

    expect(isLoggedIn()).toBe(true);
    expect(document.cookie).toContain('has_session=1');

    clearAccessToken();

    expect(isLoggedIn()).toBe(false);
  });

  it('register sends the expected payload with credentials: include', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(new Response(null, { status: 201 }));

    await register('person@example.com', 'password123');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/auth/register',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({
          email: 'person@example.com',
          password: 'password123'
        })
      })
    );
  });

  it('login sets has_session cookie from received access token', async () => {
    const fetchMock = vi.mocked(fetch);
    const token = createToken(Math.floor(Date.now() / 1000) + 3600);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ access_token: token }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    await login('person@example.com', 'password123');

    // getAccessToken returns null now (tokens in httpOnly cookies)
    expect(getAccessToken()).toBeNull();
    // But has_session cookie should be set
    expect(isLoggedIn()).toBe(true);
  });

  it('login surfaces backend errors', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Invalid email or password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    await expect(login('person@example.com', 'wrong-password')).rejects.toThrow(
      'Invalid email or password'
    );
  });

  it('logout calls backend and clears client state', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    // Simulate logged-in state
    const token = createToken(Math.floor(Date.now() / 1000) + 3600);
    setAccessToken(token);
    expect(isLoggedIn()).toBe(true);

    await logout();

    expect(isLoggedIn()).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/auth/logout',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      })
    );
  });

  it('funnel profile survives setAccessToken (C4)', () => {
    saveFunnelProfile({
      name: 'Alice',
      age: 30,
      gender: 'female',
      height_cm: 165,
      weight_kg: 70,
      goal_weight_kg: 60,
      timeline_weeks: 12,
      health_conditions: '',
      activity_level: 'moderate',
      diet_pattern: 'balanced',
    });

    const token = createToken(Math.floor(Date.now() / 1000) + 3600);
    setAccessToken(token); // used to call sessionStorage.clear() — wiping the profile

    expect(getFunnelProfile()?.name).toBe('Alice');
  });

  it('clearAccessToken removes funnel profile keys', () => {
    saveFunnelProfile({
      name: 'Bob',
      age: 25,
      gender: 'male',
      height_cm: 180,
      weight_kg: 85,
      goal_weight_kg: 75,
      timeline_weeks: 16,
      health_conditions: '',
      activity_level: 'active',
      diet_pattern: 'high-protein',
    });

    clearAccessToken();

    expect(getFunnelProfile()).toBeNull();
  });
});
