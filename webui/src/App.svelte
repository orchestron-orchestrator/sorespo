<script>
  import { Router, Link, Route } from "svelte-routing";
  import { onMount, onDestroy } from 'svelte';
  import DeviceList from "./components/DeviceList.svelte";
  import DeviceDetail from "./components/DeviceDetail.svelte";
  import DeviceConfig from "./components/DeviceConfig.svelte";
  import DeviceConfigLog from "./components/DeviceConfigLog.svelte";
  import QueueDashboard from "./components/QueueDashboard.svelte";
  import { fetchAllDeviceQueues } from './services/api.js';

  export let url = "";
  
  let totalPendingCount = 0;
  let pollInterval = null;
  
  // Create a custom event for refresh that components can listen to
  function handleRefresh() {
    window.dispatchEvent(new CustomEvent('global-refresh'));
  }
  
  async function checkPendingQueues() {
    try {
      const queueItems = await fetchAllDeviceQueues();
      // The API returns a flat array of queue items that need approval
      totalPendingCount = queueItems.length;
    } catch (error) {
      console.error('Failed to fetch queue counts:', error);
    }
  }
  
  onMount(() => {
    // Initial check
    checkPendingQueues();
    
    // Poll every second
    pollInterval = setInterval(checkPendingQueues, 1000);
  });
  
  onDestroy(() => {
    if (pollInterval) {
      clearInterval(pollInterval);
    }
  });
</script>

<Router {url}>
  <nav>
    <div class="nav-container">
      <div class="nav-left">
        <h1>Orchestron</h1>
        <ul>
          <li>
            <Link to="/">Devices</Link>
          </li>
          <li class="config-queue-nav">
            <Link to="/config-queue">
              Config Queue
              {#if totalPendingCount > 0}
                <span class="notification-bubble">{totalPendingCount}</span>
              {/if}
            </Link>
          </li>
        </ul>
      </div>
      <button class="refresh-btn" on:click={handleRefresh} title="Refresh current view">
        ↻ Refresh
      </button>
    </div>
  </nav>

  <main>
    <Route path="device/:id/log" let:params>
      <DeviceConfigLog deviceId={params.id} />
    </Route>
    <Route path="device/:id/config" let:params>
      <DeviceConfig deviceId={params.id} />
    </Route>
    <Route path="device/:id" let:params>
      <DeviceDetail deviceId={params.id} />
    </Route>
    <Route path="config-queue">
      <QueueDashboard />
    </Route>
    <Route path="/">
      <DeviceList />
    </Route>
  </main>
</Router>

<style>
  nav {
    background-color: #2c3e50;
    color: white;
    padding: 1rem 0;
    margin-bottom: 2rem;
  }

  .nav-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .nav-left {
    display: flex;
    align-items: center;
    gap: 2rem;
  }

  h1 {
    margin: 0;
    font-size: 1.5rem;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    gap: 1rem;
  }

  li :global(a) {
    color: white;
    text-decoration: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    transition: background-color 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  li :global(a:hover) {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .config-queue-nav {
    position: relative;
  }
  
  .notification-bubble {
    background-color: #f39c12;
    color: white;
    border-radius: 10px;
    padding: 0.125rem 0.375rem;
    font-size: 0.75rem;
    font-weight: bold;
    min-width: 1.2rem;
    text-align: center;
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.9;
      transform: scale(1.05);
    }
  }

  .refresh-btn {
    padding: 0.5rem 1rem;
    background-color: rgba(255, 255, 255, 0.1);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: background-color 0.2s;
  }

  .refresh-btn:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }

  main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
  }
</style>