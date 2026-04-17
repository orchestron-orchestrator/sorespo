<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';

  import {
    fetchDevice,
    fetchDeviceConfigLog,
    type ConfigLogEntry,
    type DeviceInfo
  } from '$lib/core/orchestron/client';

  export let data: { deviceId: string };

  let deviceId = data.deviceId;
  let lastLoadedId = '';

  let device: DeviceInfo | null = null;
  let configLog: ConfigLogEntry[] = [];
  let selectedEntry: ConfigLogEntry | null = null;
  let selectedIndex = -1;
  let configFormat = 'xml';
  let loading = true;
  let error = '';
  let loadingLog = false;
  let pollHandle: ReturnType<typeof setInterval> | null = null;

  $: deviceId = data.deviceId;
  $: if (browser && deviceId && deviceId !== lastLoadedId) {
    lastLoadedId = deviceId;
    loadDevice();
  }

  onMount(() => {
    const handleRefresh = () => loadLog();
    window.addEventListener('global-refresh', handleRefresh);

    pollHandle = setInterval(() => {
      if (!loadingLog) {
        loadLog(true);
      }
    }, 1000);

    return () => {
      window.removeEventListener('global-refresh', handleRefresh);
      if (pollHandle) {
        clearInterval(pollHandle);
      }
    };
  });

  async function loadDevice(): Promise<void> {
    try {
      loading = true;
      error = '';
      device = await fetchDevice(deviceId);
      await loadLog();
    } catch (loadError) {
      error = loadError instanceof Error ? loadError.message : 'Failed to load device.';
    } finally {
      loading = false;
    }
  }

  async function loadLog(silent = false): Promise<void> {
    try {
      if (!silent) {
        loadingLog = true;
      }

      const response = await fetchDeviceConfigLog(deviceId, configFormat);
      const nextLog = response.log || [];
      const previousTimestamp = selectedEntry?.timestamp;

      configLog = nextLog;

      if (previousTimestamp) {
        const nextIndex = configLog.findIndex((entry) => entry.timestamp === previousTimestamp);
        if (nextIndex >= 0) {
          selectEntry(nextIndex);
        } else if (configLog.length > 0) {
          selectEntry(0);
        } else {
          selectedEntry = null;
          selectedIndex = -1;
        }
      } else if (configLog.length > 0 && !selectedEntry) {
        selectEntry(0);
      }
    } catch (loadError) {
      if (!silent) {
        console.error('Failed to load config log:', loadError);
        configLog = [];
      }
    } finally {
      if (!silent) {
        loadingLog = false;
      }
    }
  }

  function selectEntry(index: number): void {
    selectedIndex = index;
    selectedEntry = configLog[index] ?? null;
  }

  async function changeFormat(format: string): Promise<void> {
    configFormat = format;
    await loadLog();
  }

  function formatTimestamp(timestamp: string): string {
    const asString = String(timestamp);
    const date = asString.includes('T') ? new Date(asString) : new Date(Number(asString) * 1000);

    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date);
  }

  function getEventColor(event: string): string {
    switch (event) {
      case 'sent':
        return 'var(--success)';
      case 'failed':
        return 'var(--danger)';
      default:
        return 'var(--brand)';
    }
  }
</script>

<div class="page-header">
  <div>
    <div class="breadcrumb">
      <a href="/devices">Devices</a>
      <span>›</span>
      <a href={`/devices/${deviceId}`}>{device?.name || deviceId}</a>
      <span>›</span>
      <span>Configuration Log</span>
    </div>
    <h2>Configuration Log</h2>
    <p>Watch configuration delivery history with live polling every second.</p>
  </div>
</div>

{#if loading}
  <div class="loading-state">Loading device...</div>
{:else if error}
  <div class="error-state">{error}</div>
{:else if device}
  <div class="log-layout">
    <section class="card log-layout__sidebar">
      <div class="log-layout__sidebar-header">
        <h3>History</h3>
        <span class="pill">{configLog.length} entr{configLog.length === 1 ? 'y' : 'ies'}</span>
      </div>
      <div class="log-layout__list">
        {#if configLog.length === 0}
          <div class="empty-state">No configuration changes logged.</div>
        {:else}
          {#each configLog as entry, index}
            <button class:selected={selectedIndex === index} class="log-entry" type="button" on:click={() => selectEntry(index)}>
              <span style={`color: ${getEventColor(entry.event)}`}>{entry.event}</span>
              <small>{formatTimestamp(entry.timestamp)}</small>
            </button>
          {/each}
        {/if}
      </div>
    </section>

    <section class="card log-layout__detail">
      <div class="log-layout__detail-header">
        <div>
          <h3>Entry Detail</h3>
          <p>Auto-refresh is active. XML remains the only reliable format in the current backend.</p>
        </div>
        <div class="segmented">
          <button type="button" disabled>JSON</button>
          <button class:active={configFormat === 'xml'} type="button" on:click={() => changeFormat('xml')}>XML</button>
          <button type="button" disabled>GData</button>
        </div>
      </div>

      {#if selectedEntry}
        <div class="log-layout__detail-meta">
          <span class="pill">{selectedEntry.event}</span>
          <span class="pill">{formatTimestamp(selectedEntry.timestamp)}</span>
        </div>
        {#if selectedEntry.conf_diff}
          <pre>{selectedEntry.conf_diff}</pre>
        {:else}
          <div class="empty-state">No configuration diff available for this entry.</div>
        {/if}
      {:else}
        <div class="empty-state">Select a log entry to inspect its diff.</div>
      {/if}
    </section>
  </div>
{/if}

<style>
  .breadcrumb {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 0.7rem;
    color: var(--text-muted);
    font-size: 0.95rem;
  }

  .breadcrumb a {
    color: var(--brand);
    text-decoration: none;
  }

  .log-layout {
    display: grid;
    gap: 1rem;
    grid-template-columns: minmax(260px, 0.85fr) minmax(0, 1.4fr);
  }

  .log-layout__sidebar,
  .log-layout__detail {
    padding: 1.2rem;
  }

  .log-layout__sidebar {
    display: grid;
    gap: 1rem;
    align-content: start;
  }

  .log-layout__sidebar-header,
  .log-layout__detail-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  .log-layout__sidebar-header h3,
  .log-layout__detail-header h3,
  .log-layout__detail-header p {
    margin: 0;
  }

  .log-layout__detail-header p {
    margin-top: 0.35rem;
    color: var(--text-muted);
  }

  .log-layout__list {
    display: grid;
    gap: 0.65rem;
  }

  .log-entry {
    display: grid;
    gap: 0.25rem;
    padding: 0.9rem;
    border: 1px solid var(--border);
    border-radius: 1rem;
    background: var(--surface-alt);
    text-align: left;
    cursor: pointer;
  }

  .log-entry.selected {
    border-color: var(--brand);
    background: var(--brand-soft);
  }

  .log-entry small {
    color: var(--text-muted);
  }

  .log-layout__detail {
    display: grid;
    gap: 1rem;
  }

  .log-layout__detail-meta {
    display: flex;
    gap: 0.6rem;
    flex-wrap: wrap;
  }

  .segmented {
    display: flex;
    gap: 0.3rem;
    flex-wrap: wrap;
    padding: 0.3rem;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--surface-alt);
  }

  .segmented button {
    padding: 0.55rem 0.9rem;
    border: none;
    border-radius: 999px;
    background: transparent;
  }

  .segmented button.active {
    background: var(--brand);
    color: white;
  }

  .log-layout__detail pre {
    margin: 0;
    padding: 1rem;
    min-height: 28rem;
    overflow: auto;
    border-radius: 1rem;
    background: #0f2335;
    color: #dcecf9;
  }

  @media (max-width: 960px) {
    .log-layout {
      grid-template-columns: 1fr;
    }
  }
</style>
