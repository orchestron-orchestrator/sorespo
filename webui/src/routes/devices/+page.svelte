<script lang="ts">
  import { invalidate } from '$app/navigation';
  import { onMount } from 'svelte';

  import { onGlobalRefresh } from '$lib/core/util/global-refresh';

  import type { DeviceSummary } from '$lib/core/orchestron/client';

  let { data }: { data: { devices: DeviceSummary[]; loadError: string } } = $props();

  let searchQuery = $state('');

  let devices = $derived<DeviceSummary[]>(data.devices);
  let error = $derived(data.loadError);
  let filteredDevices = $derived(
    devices.filter((device) => device.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  function configDotColor(device: DeviceSummary): string {
    return device.hasRunningConfig === false ? 'var(--sw-danger)' : 'var(--sw-success)';
  }

  onMount(() => onGlobalRefresh(() => invalidate('data:devices')));
</script>

<div class="page-header">
  <div>
    <h2>Devices</h2>
    <p>Browse discovered devices and open their configuration and queue views.</p>
  </div>

  <label>
    <span class="sr-only">Search devices</span>
    <input
      class="device-search"
      type="search"
      bind:value={searchQuery}
      placeholder="Search devices..."
    />
  </label>
</div>

{#if error}
  <div class="error-state">{error}</div>
{:else if devices.length === 0}
  <div class="empty-state">No devices were returned by the backend.</div>
{:else if filteredDevices.length === 0}
  <div class="empty-state">No devices match "{searchQuery}".</div>
{:else}
  <div class="device-grid">
    {#each filteredDevices as device}
      <a class="device-card card" href={`/devices/${encodeURIComponent(device.id)}`}>
        <div class="device-card__header">
          <h3>{device.name}</h3>
          <span class="pill">
            <span class="dot" style={`background: ${configDotColor(device)};`}></span>
            Device
          </span>
        </div>
        <p class="device-card__id">{device.id}</p>
      </a>
    {/each}
  </div>
{/if}

<style>
  .device-search {
    min-width: 16rem;
    padding: 9px 12px;
    border-radius: var(--sw-radius-md);
    border: 1px solid var(--sw-border-default);
    background: var(--sw-bg-input);
    color: var(--sw-text-primary);
    font-size: 13px;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .device-search::placeholder {
    color: var(--sw-text-muted);
  }

  .device-search:focus {
    border-color: var(--sw-accent);
    box-shadow: 0 0 0 3px var(--sw-accent-glow);
  }

  .device-grid {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }

  .device-card {
    display: grid;
    gap: 10px;
    padding: 20px;
    text-decoration: none;
    transition: border-color 0.2s, transform 0.2s;
  }

  .device-card:hover {
    transform: translateY(-2px);
    border-color: var(--sw-accent-dim);
  }

  .device-card__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .device-card__header h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
  }

  .device-card__id {
    margin: 0;
    font-family: var(--sw-font-mono);
    font-size: 12px;
    color: var(--sw-accent);
  }

  @media (max-width: 640px) {
    .device-search {
      width: 100%;
      min-width: 0;
    }
  }
</style>
