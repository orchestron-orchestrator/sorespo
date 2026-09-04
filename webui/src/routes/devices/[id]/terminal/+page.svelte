<script lang="ts">
  import type { DeviceInfo } from '$lib/core/orchestron/client';
  import TerminalPane from '$lib/core/terminal/Terminal.svelte';
  import { terminalAvailable, type TerminalStatus } from '$lib/core/terminal/client';

  let {
    data
  }: { data: { deviceId: string; device: DeviceInfo | null; loadError: string } } = $props();

  let device = $derived(data.device);
  let deviceId = $derived(data.deviceId);
  let error = $derived(data.loadError);
  let target = $derived.by(() => {
    const addr = device?.addresses?.[0]?.address ?? '';
    const user = device?.username ? `${device.username}@` : '';
    return addr ? `${user}${addr}` : '';
  });

  let status: TerminalStatus = $state({ state: 'connecting', message: '' });
  let pane: TerminalPane | undefined = $state();

  const STATE_LABELS: Record<TerminalStatus['state'], string> = {
    connecting: 'Connecting',
    connected: 'Connected',
    closed: 'Closed',
    error: 'Error'
  };

  let canReconnect = $derived(status.state === 'closed' || status.state === 'error');
</script>

<div class="terminal-route">
<div class="page-header">
  <div>
    <h2>Terminal</h2>
    <p>Interactive SSH session to the device, using the credentials StratoWeave manages it with.</p>
  </div>
</div>

{#if error}
  <div class="error-state">{error}</div>
{:else if !terminalAvailable}
  <div class="card terminal-page__notice">
    The terminal needs a live StratoWeave backend and is not available in the demo build.
  </div>
{:else if device}
  <div class="card terminal-page">
    <div class="terminal-page__header">
      <div class="terminal-page__title">
        <h3>{device.name || device.id}</h3>
        {#if target}
          <span class="terminal-page__target">{target}</span>
        {/if}
      </div>
      <div class="terminal-page__status">
        <span class="terminal-page__pill terminal-page__pill--{status.state}">{STATE_LABELS[status.state]}</span>
        {#if status.message}
          <span class="terminal-page__message">{status.message}</span>
        {/if}
        {#if canReconnect}
          <button class="btn btn-secondary" type="button" onclick={() => pane?.connect()}>Reconnect</button>
        {/if}
      </div>
    </div>
    <div class="terminal-page__body">
      {#key deviceId}
        <TerminalPane bind:this={pane} {deviceId} onStatus={(s) => (status = s)} />
      {/key}
    </div>
  </div>
{/if}
</div>

<style>
  /* Fill the scrollable content area exactly, so the terminal gets a fixed
     height and the page itself never needs to scroll. .app-content is a
     column-flex item with a definite height, so 100% resolves against it;
     the vh fallback caps it if it ever does not (header + 2 x 32px padding). */
  .terminal-route {
    display: flex;
    flex-direction: column;
    height: 100%;
    max-height: calc(100vh - var(--sw-header-height) - 64px);
    min-height: 0;
  }

  .terminal-route > .page-header {
    flex-shrink: 0;
  }

  .terminal-page {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.5rem;
    flex: 1 1 auto;
    min-height: 0;
    box-sizing: border-box;
  }

  .terminal-page__notice {
    padding: 1.5rem;
    color: var(--sw-text-secondary);
  }

  .terminal-page__header {
    flex-shrink: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .terminal-page__title {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .terminal-page__title h3 {
    margin: 0;
  }

  .terminal-page__target {
    font-family: var(--sw-font-mono);
    font-size: 0.85rem;
    color: var(--sw-text-muted);
  }

  .terminal-page__status {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .terminal-page__message {
    font-size: 0.85rem;
    color: var(--sw-text-muted);
  }

  .terminal-page__pill {
    display: inline-block;
    padding: 0.15rem 0.6rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    border: 1px solid var(--sw-border-default);
    color: var(--sw-text-secondary);
  }

  .terminal-page__pill--connecting {
    color: var(--sw-text-secondary);
  }

  .terminal-page__pill--connected {
    color: var(--sw-accent);
    border-color: var(--sw-accent-dim);
    background: var(--sw-accent-glow);
  }

  .terminal-page__pill--closed {
    color: var(--sw-text-muted);
  }

  .terminal-page__pill--error {
    color: #fca5a5;
    border-color: rgba(252, 165, 165, 0.5);
    background: rgba(252, 165, 165, 0.1);
  }

  .terminal-page__body {
    flex: 1 1 auto;
    min-height: 12rem;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .terminal-page__body > :global(*) {
    flex: 1 1 auto;
    min-height: 0;
  }
</style>
