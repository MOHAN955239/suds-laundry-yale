import { API_URL } from './api';

export function connectSocket(onMessage: (data: any) => void): () => void {
  const base = API_URL || window.location.origin;
  const wsUrl = base.replace(/^http/, 'ws') + '/ws';

  let ws: WebSocket | null = null;
  let stopped = false;
  let timer: number | null = null;

  const connect = () => {
    if (stopped) return;
    ws = new WebSocket(wsUrl);
    ws.onmessage = (e) => {
      try { onMessage(JSON.parse(e.data)); } catch { /* ignore */ }
    };
    ws.onclose = () => {
      if (!stopped) timer = window.setTimeout(connect, 2000);
    };
    ws.onerror = () => ws?.close();
  };

  connect();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    ws?.close();
  };
}
