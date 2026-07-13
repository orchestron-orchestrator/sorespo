<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';

  import {
    fetchDeviceConfigLog,
    type ConfigLogEntry,
    type DeviceInfo
  } from '$lib/core/orchestron/client';
  import SegmentedControl from '$lib/core/ui/SegmentedControl.svelte';
  import { onGlobalRefresh } from '$lib/core/util/global-refresh';

  let {
    data
  }: { data: { deviceId: string; device: DeviceInfo | null; loadError: string } } = $props();

  let lastLoadedId = $state('');

  let configLog: ConfigLogEntry[] = $state([]);
  let selectedEntry: ConfigLogEntry | null = $state(null);
  let selectedIndex = $state(-1);
  let configFormat = $state('xml');
  let loadingLog = $state(false);
  let pollHandle: ReturnType<typeof setInterval> | null = null;

  let device = $derived(data.device);
  let deviceId = $derived(data.deviceId);
  let error = $derived(data.loadError);

  $effect(() => {
    if (browser && deviceId && deviceId !== lastLoadedId) {
      lastLoadedId = deviceId;
      loadLog(false, deviceId);
    }
  });

  onMount(() => {
    const offRefresh = onGlobalRefresh(() => loadLog());

    pollHandle = setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      if (!loadingLog) {
        loadLog(true);
      }
    }, 1000);

    return () => {
      offRefresh();
      if (pollHandle) {
        clearInterval(pollHandle);
      }
    };
  });

  async function loadLog(silent = false, requestId = data.deviceId): Promise<void> {
    try {
      if (!silent) {
        loadingLog = true;
      }

      const response = await fetchDeviceConfigLog(requestId, configFormat);
      if (requestId !== data.deviceId) return;
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
      if (requestId !== data.deviceId) return;
      if (!silent) {
        console.error('Failed to load config log:', loadError);
        configLog = [];
      }
    } finally {
      if (!silent && requestId === data.deviceId) {
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
    <h2>Configuration Log</h2>
    <p>Watch configuration delivery history with live polling every second.</p>
  </div>
</div>

{#if error}
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
            <button class:selected={selectedIndex === index} class="log-entry" type="button" onclick={() => selectEntry(index)}>
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
        <SegmentedControl
          ariaLabel="Diff format"
          options={[
            { value: 'json', label: 'JSON', disabled: true },
            { value: 'xml', label: 'XML' },
            { value: 'gdata', label: 'GData', disabled: true }
          ]}
          value={configFormat}
          onchange={(format) => changeFormat(format)}
        />
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

  .log-layout__detail pre {
    margin: 0;
    padding: 1rem;
    min-height: 28rem;
    overflow: auto;
    border-radius: var(--sw-radius-md);
    background: var(--sw-bg-deep);
    border: 1px solid var(--sw-border-subtle);
    color: var(--sw-text-secondary);
  }

  @media (max-width: 960px) {
    .log-layout {
      grid-template-columns: 1fr;
    }
  }
</style>
