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

  if (isFile) {
    // Packaged Electron loads via file:// — connect directly to the backend.
    return new WebSocket(`${protocol}//localhost:${WS_PORT}`);
  }

  // In dev or browser mode the app is served by a dev server / reverse proxy.
  // Route through the same host so the Vite proxy (or any reverse proxy) can
  // forward the upgrade to the backend on port 3000.
  return new WebSocket(`${protocol}//${window.location.host}/ws`);
}

