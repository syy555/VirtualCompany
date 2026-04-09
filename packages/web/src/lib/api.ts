const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function fetchApi<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `API error: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export class ApiConnectionError extends Error {}

export function fetchApiSafe<T = unknown>(path: string, fallback: T): Promise<T> {
  return fetchApi<T>(path).catch((err) => {
    const msg: string = err.message ?? '';
    // fetch() throws TypeError on network failure (ECONNREFUSED, etc.)
    if (err instanceof TypeError || msg.includes('fetch') || msg.includes('ECONNREFUSED') || msg.includes('Failed to fetch')) {
      throw new ApiConnectionError(msg);
    }
    console.error(`[fetchApi] ${path} failed:`, msg);
    return fallback;
  });
}
