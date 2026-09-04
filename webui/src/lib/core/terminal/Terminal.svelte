<script lang="ts">
  import { onMount } from 'svelte';
  import { FitAddon } from '@xterm/addon-fit';
  import { Terminal } from '@xterm/xterm';
  import '@xterm/xterm/css/xterm.css';

  import {
    describeClose,
    openTerminalSocket,
    parseControlMessage,
    sendResize,
    type TerminalStatus
  } from './client';

  let {
    deviceId,
    onStatus
  }: {
    deviceId: string;
    onStatus?: (status: TerminalStatus) => void;
  } = $props();

  let host: HTMLDivElement | undefined = $state();

  let term: Terminal | null = null;
  let fit: FitAddon | null = null;
  let socket: WebSocket | null = null;
  // Bumped on every connect so callbacks from an old socket are ignored.
  let generation = 0;
  let ended = false;

  const encoder = new TextEncoder();

  function report(status: TerminalStatus): void {
    onStatus?.(status);
  }

  function send(data: Uint8Array): void {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(data);
    }
  }

  function disconnect(): void {
    const s = socket;
    socket = null;
    if (s && (s.readyState === WebSocket.OPEN || s.readyState === WebSocket.CONNECTING)) {
      s.close(1000, 'client closed');
    }
  }

  /** Open (or reopen) the session. Exposed so the page can offer a Reconnect button. */
  export function connect(): void {
    if (!term || !fit) return;
    disconnect();
    generation += 1;
    const gen = generation;
    ended = false;

    term.reset();
    fit.fit();
    report({ state: 'connecting', message: '' });

    const s = openTerminalSocket(deviceId, term.cols, term.rows);
    socket = s;

    s.onmessage = (event: MessageEvent) => {
      if (gen !== generation) return;
      if (event.data instanceof ArrayBuffer) {
        term?.write(new Uint8Array(event.data));
        return;
      }
      if (typeof event.data === 'string') {
        const status = parseControlMessage(event.data);
        if (status) {
          if (status.state === 'error' || status.state === 'closed') ended = true;
          report(status);
          if (status.state === 'error') {
            term?.writeln(`\r\n\x1b[31m${status.message}\x1b[0m`);
          }
        }
      }
    };
    s.onclose = (event: CloseEvent) => {
      if (gen !== generation) return;
      socket = null;
      if (!ended) {
        ended = true;
        report({ state: 'closed', message: describeClose(event) });
      }
      term?.writeln('\r\n\x1b[2m[connection closed]\x1b[0m');
    };
    s.onerror = () => {
      if (gen !== generation) return;
      // onclose follows with the details; nothing to report separately.
    };
  }

  onMount(() => {
    if (!host) return;

    const t = new Terminal({
      cursorBlink: true,
      scrollback: 5000,
      fontSize: 13,
      fontFamily: "'JetBrains Mono', ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, monospace",
      theme: {
        background: '#081020',
        foreground: '#c7d1e4',
        cursor: '#22d3ee',
        selectionBackground: 'rgba(34, 211, 238, 0.35)'
      }
    });
    const f = new FitAddon();
    t.loadAddon(f);
    t.open(host);
    term = t;
    fit = f;

    t.onData((data: string) => send(encoder.encode(data)));
    t.onBinary((data: string) => {
      const bytes = new Uint8Array(data.length);
      for (let i = 0; i < data.length; i += 1) bytes[i] = data.charCodeAt(i) & 0xff;
      send(bytes);
    });

    // Refit only when the box itself changed size. The box has a bounded
    // height (see the page layout), so fitting never changes the box size;
    // the guard makes sure a loop cannot start even if a parent lets it grow.
    let lastWidth = host.clientWidth;
    let lastHeight = host.clientHeight;
    let pending = 0;
    const observer = new ResizeObserver(() => {
      if (!host || pending) return;
      pending = requestAnimationFrame(() => {
        pending = 0;
        if (!term || !fit || !host) return;
        const w = host.clientWidth;
        const h = host.clientHeight;
        if (w === lastWidth && h === lastHeight) return;
        lastWidth = w;
        lastHeight = h;
        const before = `${term.cols}x${term.rows}`;
        fit.fit();
        if (socket && `${term.cols}x${term.rows}` !== before) {
          sendResize(socket, term.cols, term.rows);
        }
      });
    });
    observer.observe(host);

    connect();
    t.focus();

    return () => {
      observer.disconnect();
      if (pending) cancelAnimationFrame(pending);
      generation += 1;
      disconnect();
      t.dispose();
      term = null;
      fit = null;
    };
  });
</script>

<div class="terminal" bind:this={host}></div>

<style>
  /* The box must never size itself from its content: xterm's row count
     follows the box (FitAddon), so a content-driven height would grow on
     every fit. The parent decides the height; we just fill it. */
  .terminal {
    width: 100%;
    height: 100%;
    min-height: 0;
    padding: 0.5rem;
    box-sizing: border-box;
    background: var(--sw-bg-deep);
    border-radius: var(--sw-radius-md);
    border: 1px solid var(--sw-border-subtle);
    overflow: hidden;
  }

  .terminal :global(.xterm) {
    height: 100%;
  }

  .terminal :global(.xterm-viewport) {
    overflow-y: auto;
  }
</style>
