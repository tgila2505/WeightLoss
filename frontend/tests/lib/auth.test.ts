import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearAccessToken,
  getAccessToken,
  isLoggedIn,
  login,
  register,
  setAccessToken
} from '@/lib/auth';

describe('auth helpers', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('stores and clears the access token', () => {
    setAccessToken('token-123');

    expect(getAccessToken()).toBe('token-123');
    expect(isLoggedIn()).toBe(true);

    clearAccessToken();

    expect(getAccessToken()).toBeNull();
    expect(isLoggedIn()).toBe(false);
  });

  it('register sends the expected payload', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(new Response(null, { status: 201 }));

    await register('person@example.com', 'password123');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/auth/register',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'person@example.com',
          password: 'password123'
        })
      })
    );
  });

  it('login saves the received access token', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ access_token: 'token-123' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    await login('person@example.com', 'password123');

    expect(getAccessToken()).toBe('token-123');
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
});
