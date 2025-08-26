<script>
  import { onMount } from 'svelte';
  import { link } from 'svelte-routing';
  import { fetchDevices } from '../services/api.js';

  let devices = [];
  let loading = true;
  let error = null;

  async function loadDevices() {
    try {
      loading = true;
      devices = await fetchDevices();
      loading = false;
    } catch (err) {
      error = err.message;
      loading = false;
    }
  }

  onMount(() => {
    loadDevices();
    
    // Listen for global refresh events
    const handleRefresh = () => loadDevices();
    window.addEventListener('global-refresh', handleRefresh);
    
    return () => {
      window.removeEventListener('global-refresh', handleRefresh);
    };
  });

  function getStatusColor(status) {
    switch(status) {
      case 'connected': return '#27ae60';
      case 'disconnected': return '#e74c3c';
      case 'error': return '#e67e22';
      default: return '#95a5a6';
    }
  }
</script>

<div class="device-list">
  <div class="header">
    <h2>Devices</h2>
  </div>

  {#if loading}
    <div class="loading">Loading devices...</div>
  {:else if error}
    <div class="error">Error: {error}</div>
  {:else if devices.length === 0}
    <div class="empty">No devices found</div>
  {:else}
    <div class="grid">
      {#each devices as device}
        <a href="/device/{device.id}" use:link class="device-card">
          <div class="device-header">
            <h3>{device.name || device.id}</h3>
            <span class="status" style="background-color: {getStatusColor(device.status)}">
              {device.status || 'unknown'}
            </span>
          </div>
          <div class="device-info">
            <p><strong>Type:</strong> {device.type || 'Unknown'}</p>
            <p><strong>Address:</strong> {device.address || 'N/A'}</p>
            {#if device.version}
              <p><strong>Version:</strong> {device.version}</p>
            {/if}
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>

<style>
  .device-list {
    padding: 1rem 0;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  h2 {
    margin: 0;
    color: #2c3e50;
  }

  .refresh-btn {
    padding: 0.5rem 1rem;
    background-color: #3498db;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    transition: background-color 0.2s;
  }

  .refresh-btn:hover {
    background-color: #2980b9;
  }

  .loading, .error, .empty {
    text-align: center;
    padding: 2rem;
    color: #7f8c8d;
  }

  .error {
    color: #e74c3c;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .device-card {
    background: white;
    border: 1px solid #ecf0f1;
    border-radius: 8px;
    padding: 1.5rem;
    text-decoration: none;
    color: inherit;
    transition: transform 0.2s, box-shadow 0.2s;
    display: block;
  }

  .device-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .device-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .device-header h3 {
    margin: 0;
    color: #2c3e50;
    font-size: 1.2rem;
  }

  .status {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    color: white;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .device-info p {
    margin: 0.5rem 0;
    color: #7f8c8d;
    font-size: 0.95rem;
  }

  .device-info strong {
    color: #2c3e50;
  }
</style>