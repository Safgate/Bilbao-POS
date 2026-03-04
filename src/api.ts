export function getApiBaseUrl(): string {
  const protocol = window.location.protocol;

  // When running inside packaged Electron, the app is loaded over file://
  // and the backend runs on localhost:3000.
  if (protocol === 'file:') {
    return 'http://localhost:3000';
  }

  // In dev / web mode we rely on same-origin requests (Vite dev server or server.ts)
  return '';
}

export function apiFetch(input: string, init?: RequestInit) {
  const baseUrl = getApiBaseUrl();
  return fetch(`${baseUrl}${input}`, init);
}

/** Backend WebSocket server port (must match electron/main.ts). */
const WS_PORT = 3000;

export function createAppWebSocket(): WebSocket {
  const isSecure = window.location.protocol === 'https:';
  const isFile = window.location.protocol === 'file:';

  const protocol = isSecure ? 'wss:' : 'ws:';
  // In dev (Vite) and Electron (file:) the backend runs on port 3000; connect there for real-time updates.
  const host =
    isFile || window.location.hostname === 'localhost'
      ? `localhost:${WS_PORT}`
      : window.location.host;

  const wsUrl = `${protocol}//${host}`;
  return new WebSocket(wsUrl);
}

