<script lang="ts">
  import { invalidate } from '$app/navigation';
  import { onMount } from 'svelte';

  import DeviceConfigStatus from '$lib/core/ui/DeviceConfigStatus.svelte';
  import { onGlobalRefresh } from '$lib/core/util/global-refresh';
  import { appHref } from '$lib/core/util/nav';

  import type { DeviceSummary } from '$lib/core/orchestron/client';

  let { data }: { data: { devices: DeviceSummary[]; loadError: string } } = $props();

  let searchQuery = $state('');

  let devices = $derived<DeviceSummary[]>(data.devices);
  let error = $derived(data.loadError);
  let filteredDevices = $derived(
    devices.filter((device) => device.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  onMount(() => onGlobalRefresh(() => invalidate('data:devices')));
</script>

<div class="page-header">
  <div>
    <h2>Devices</h2>
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
  <div class="empty-state">No devices found.</div>
{:else if filteredDevices.length === 0}
  <div class="empty-state">No devices match "{searchQuery}".</div>
{:else}
  <div class="device-grid" data-tour="device-grid">
    {#each filteredDevices as device}
      <a class="device-card card" href={appHref(`/devices/${encodeURIComponent(device.id)}`)}>
        <div class="device-card__header">
          <h3>{device.name}</h3>
          <DeviceConfigStatus hasRunningConfig={device.hasRunningConfig} />
        </div>
        {#if device.id !== device.name}
          <p class="device-card__id">{device.id}</p>
        {/if}
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
    gap: 6px;
    padding: 16px;
    text-decoration: none;
    transition: background-color 0.15s;
  }

  .device-card:hover {
    background: var(--sw-bg-hover);
  }

  .device-card:focus-visible {
    outline: 2px solid var(--sw-accent);
    outline-offset: 2px;
  }

  .device-card__header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .device-card__header h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  .device-card__id {
    margin: 0;
    font-family: var(--sw-font-mono);
    font-size: 12px;
    color: var(--sw-text-muted);
    overflow-wrap: anywhere;
  }

  @media (max-width: 640px) {
    .device-search {
      width: 100%;
      min-width: 0;
    }
  }
</style>
