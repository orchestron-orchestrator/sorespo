<script lang="ts">
  import { onMount } from 'svelte';

  import { fetchDevices, type DeviceSummary } from '$lib/core/orchestron/client';

  let devices: DeviceSummary[] = [];
  let loading = true;
  let error = '';
  let searchQuery = '';

  $: filteredDevices = devices.filter((device) =>
    device.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function loadDevices(): Promise<void> {
    try {
      loading = true;
      error = '';
      devices = await fetchDevices();
    } catch (loadError) {
      error = loadError instanceof Error ? loadError.message : 'Failed to load devices.';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadDevices();

    const handleRefresh = () => loadDevices();
    window.addEventListener('global-refresh', handleRefresh);

    return () => {
      window.removeEventListener('global-refresh', handleRefresh);
    };
  });
</script>

<div class="page-header">
  <div>
    <h2>Devices</h2>
    <p>Browse discovered devices and open their configuration and queue views.</p>
  </div>

  <label class="device-search">
    <span class="sr-only">Search devices</span>
    <input type="search" bind:value={searchQuery} placeholder="Search devices..." />
  </label>
</div>

{#if loading}
  <div class="loading-state">Loading devices...</div>
{:else if error}
  <div class="error-state">{error}</div>
{:else if devices.length === 0}
  <div class="empty-state">No devices were returned by the backend.</div>
{:else if filteredDevices.length === 0}
  <div class="empty-state">No devices match "{searchQuery}".</div>
{:else}
  <div class="device-grid">
    {#each filteredDevices as device}
      <a class="device-card card" href={`/devices/${device.id}`}>
        <div class="device-card__header">
          <h3>{device.name}</h3>
          <span class="pill">Device</span>
        </div>
        <p class="device-card__meta monospace">{device.id}</p>
      </a>
    {/each}
  </div>
{/if}

<style>
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .device-search input {
    min-width: 18rem;
    padding: 0.8rem 1rem;
    border-radius: 1rem;
    border: 1px solid var(--border);
    background: rgba(255, 255, 255, 0.88);
  }

  .device-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }

  .device-card {
    display: grid;
    gap: 0.9rem;
    padding: 1.35rem;
    text-decoration: none;
    transition: transform 0.2s ease, border-color 0.2s ease;
  }

  .device-card:hover {
    transform: translateY(-2px);
    border-color: var(--brand);
  }

  .device-card__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.8rem;
  }

  .device-card__header h3,
  .device-card__meta {
    margin: 0;
  }

  .device-card__meta {
    color: var(--text-muted);
  }

  @media (max-width: 640px) {
    .device-search {
      width: 100%;
    }

    .device-search input {
      width: 100%;
      min-width: 0;
    }
  }
</style>
