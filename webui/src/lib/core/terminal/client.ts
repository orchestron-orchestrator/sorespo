import { demoFetch } from '$lib/demo/gate';

/**
 * Browser terminal transport: a WebSocket to
 * `GET /device/<name>/terminal` on the StratoWeave HTTP API (same origin).
 *
 * Binary frames carry raw terminal bytes both ways. Text frames carry small
 * JSON control messages: the client sends `resize`, the server sends
 * `status` and `error`.
 */

export type TerminalState = 'connecting' | 'connected' | 'closed' | 'error';

export interface TerminalStatus {
  state: TerminalState;
  message: string;
}

/** The demo build has no backend, so it cannot open a shell. */
export const terminalAvailable = demoFetch === null;

export function terminalUrl(deviceId: string, cols: number, rows: number): string {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const params = new URLSearchParams({ cols: String(cols), rows: String(rows) });
  return `${proto}//${location.host}/device/${encodeURIComponent(deviceId)}/terminal?${params}`;
}

export function openTerminalSocket(deviceId: string, cols: number, rows: number): WebSocket {
  const socket = new WebSocket(terminalUrl(deviceId, cols, rows));
  socket.binaryType = 'arraybuffer';
  return socket;
}

export function sendResize(socket: WebSocket, cols: number, rows: number): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'resize', cols, rows }));
  }
}

/** Decode a server control message; null when it is not one we understand. */
export function parseControlMessage(text: string): TerminalStatus | null {
  let msg: unknown;
  try {
    msg = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof msg !== 'object' || msg === null) return null;
  const m = msg as Record<string, unknown>;
  const message = typeof m.message === 'string' ? m.message : '';
  if (m.type === 'status') {
    const state = m.state;
    if (state === 'connecting' || state === 'connected' || state === 'closed') {
      return { state, message };
    }
    return null;
  }
  if (m.type === 'error') {
    return { state: 'error', message: message || 'Unknown error' };
  }
  return null;
}

/** Human-readable reason for a WebSocket close event. */
export function describeClose(event: CloseEvent): string {
  if (event.reason) return event.reason;
  switch (event.code) {
    case 1000:
      return 'Session ended';
    case 1006:
      return 'Connection lost';
    case 1011:
      return 'Server error';
    default:
      return `Connection closed (${event.code})`;
  }
}
