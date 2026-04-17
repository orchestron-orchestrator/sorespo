<script lang="ts">
  import '../app.css';

  import { invalidateAll } from '$app/navigation';
  import { page } from '$app/state';
  import { onMount } from 'svelte';

  import { fetchAllDeviceQueues } from '$lib/core/orchestron/client';

  let totalPendingCount = 0;
  let pollHandle: ReturnType<typeof setInterval> | null = null;

  async function refreshPendingCount(): Promise<void> {
    try {
      totalPendingCount = (await fetchAllDeviceQueues()).length;
    } catch (error) {
      console.error('Failed to fetch queue counts:', error);
    }
  }

  async function handleRefresh(): Promise<void> {
    window.dispatchEvent(new CustomEvent('global-refresh'));
    await Promise.all([refreshPendingCount(), invalidateAll()]);
  }

  onMount(() => {
    refreshPendingCount();
    pollHandle = setInterval(refreshPendingCount, 1000);

    return () => {
      if (pollHandle) {
        clearInterval(pollHandle);
      }
    };
  });
</script>

<svelte:head>
  <title>Orchestron Web UI</title>
</svelte:head>

<div class="app-shell">
  <header class="site-nav">
    <div class="site-nav__inner">
      <div class="site-nav__brand">
        <div>
          <h1 class="site-nav__title">Orchestron</h1>
        </div>
        <nav class="site-nav__links" aria-label="Primary navigation">
          <a class:active={page.url.pathname.startsWith('/devices')} class="site-link" href="/devices">Devices</a>
          <a class:active={page.url.pathname.startsWith('/operations/config-queue')} class="site-link" href="/operations/config-queue">
            Config Queue
            {#if totalPendingCount > 0}
              <span class="notification-badge">{totalPendingCount}</span>
            {/if}
          </a>
          <a class:active={page.url.pathname.startsWith('/services')} class="site-link" href="/services">Services</a>
        </nav>
      </div>

      <button class="toolbar-button" type="button" on:click={handleRefresh}>
        Refresh current view
      </button>
    </div>
  </header>

  <main class="app-main">
    <slot />
  </main>
</div>
