import type { CredentialsInput } from '@app/shared';

export interface PublicUser {
  id: string;
  username: string;
}

export interface ApiError {
  code: string;
  message: string;
}

export class AuthApiError extends Error {
  status: number;
  error: ApiError;
  constructor(status: number, error: ApiError) {
    super(error.message);
    this.name = 'AuthApiError';
    this.status = status;
    this.error = error;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const error: ApiError = body?.error ?? { code: 'unknown', message: 'Request failed' };
    throw new AuthApiError(res.status, error);
  }
  return body as T;
}

export function register(input: CredentialsInput): Promise<{ user: PublicUser }> {
  return request('/auth/register', { method: 'POST', body: JSON.stringify(input) });
}

export function login(input: CredentialsInput): Promise<{ user: PublicUser }> {
  return request('/auth/login', { method: 'POST', body: JSON.stringify(input) });
}

export function logout(): Promise<{ ok: true }> {
  return request('/auth/logout', { method: 'POST' });
}

export function getMe(): Promise<{ user: PublicUser }> {
  return request('/auth/me');
}
