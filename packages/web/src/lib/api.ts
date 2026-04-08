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

export function fetchApiSafe<T = unknown>(path: string, fallback: T): Promise<T> {
  return fetchApi<T>(path).catch((err) => {
    console.error(`[fetchApi] ${path} failed:`, err.message);
    return fallback;
  });
}
