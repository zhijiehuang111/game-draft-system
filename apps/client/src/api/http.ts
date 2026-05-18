export interface ApiError {
  code: string;
  message: string;
}

export class ApiRequestError extends Error {
  status: number;
  error: ApiError;
  constructor(status: number, error: ApiError) {
    super(error.message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.error = error;
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
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
    throw new ApiRequestError(res.status, error);
  }
  return body as T;
}
