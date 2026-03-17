/**
 * Axios-style fetch wrapper for the Express.js backend API
 * All MongoDB-related operations (exams, questions, notifications) go through here
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';

type FetchOptions = RequestInit & { token?: string };

async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...rest } = options;
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...rest.headers,
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ message: 'An unknown error occurred' }));
    throw new Error(errorBody.message ?? `API error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(endpoint: string, opts?: FetchOptions) =>
    apiFetch<T>(endpoint, { method: 'GET', ...opts }),
  post: <T>(endpoint: string, body: unknown, opts?: FetchOptions) =>
    apiFetch<T>(endpoint, { method: 'POST', body: JSON.stringify(body), ...opts }),
  patch: <T>(endpoint: string, body: unknown, opts?: FetchOptions) =>
    apiFetch<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body), ...opts }),
  delete: <T>(endpoint: string, opts?: FetchOptions) =>
    apiFetch<T>(endpoint, { method: 'DELETE', ...opts }),
};
