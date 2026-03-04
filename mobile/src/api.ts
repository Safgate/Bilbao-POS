const STORAGE_KEY = 'bilbao_server_url';

export function getServerUrl(): string {
  return localStorage.getItem(STORAGE_KEY) || '';
}

export function setServerUrl(url: string) {
  localStorage.setItem(STORAGE_KEY, url.replace(/\/$/, ''));
}

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const base = getServerUrl();
  return fetch(`${base}${path}`, init);
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export function getWsUrl(): string {
  const base = getServerUrl();
  return base.replace(/^http/, 'ws');
}
