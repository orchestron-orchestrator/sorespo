<script>
  import { onMount } from 'svelte';
  import { link } from 'svelte-routing';
  import { 
    fetchDevice, 
    resyncDevice,
    fetchDeviceConfigQueue,
    fetchConfigQueueItem,
    approveConfigQueueItem
  } from '../services/api.js';

  export let deviceId;

  let device = null;
  let configQueue = {};
  let selectedQueueItem = null;
  let queueItemDetail = null;
  let loading = true;
  let error = null;
  let resyncing = false;
  let message = null;
  let loadingQueue = false;
  let approvingItem = null;

  onMount(() => {
    loadDevice();
    
    // Listen for global refresh events
    const handleRefresh = () => loadDevice();
    window.addEventListener('global-refresh', handleRefresh);
    
    return () => {
      window.removeEventListener('global-refresh', handleRefresh);
    };
  });

  async function loadDevice() {
    try {
      loading = true;
      device = await fetchDevice(deviceId);
      await loadConfigQueue();
      loading = false;
    } catch (err) {
      error = err.message;
      loading = false;
    }
  }

  async function loadConfigQueue() {
    try {
      loadingQueue = true;
      configQueue = await fetchDeviceConfigQueue(deviceId);
    } catch (err) {
      console.error('Failed to load config queue:', err);
      configQueue = {};
    } finally {
      loadingQueue = false;
    }
  }

  async function viewQueueItem(queueId) {
    try {
      selectedQueueItem = queueId;
      queueItemDetail = await fetchConfigQueueItem(deviceId, queueId);
    } catch (err) {
      message = { type: 'error', text: `Failed to load queue item: ${err.message}` };
    }
  }

  async function handleApproveItem(queueId) {
    try {
      approvingItem = queueId;
      await approveConfigQueueItem(deviceId, queueId);
      message = { type: 'success', text: `Queue item ${queueId} approved and pushed to device` };
      
      // Clear selected item if it was the one we just approved
      if (selectedQueueItem === queueId) {
        selectedQueueItem = null;
        queueItemDetail = null;
      }
      
      // Reload the queue to show updated state
      await loadConfigQueue();
    } catch (err) {
      message = { type: 'error', text: `Failed to approve item: ${err.message}` };
    } finally {
      approvingItem = null;
    }
  }

  async function handleResync() {
    try {
      resyncing = true;
      message = null;
      await resyncDevice(deviceId);
      message = { type: 'success', text: 'Device resynced successfully' };
      await loadDevice();
    } catch (err) {
      message = { type: 'error', text: `Failed to resync: ${err.message}` };
    } finally {
      resyncing = false;
    }
  }

  function getStatusColor(status) {
    switch(status) {
      case 'connected': return '#27ae60';
      case 'disconnected': return '#e74c3c';
      case 'error': return '#e67e22';
      default: return '#95a5a6';
    }
  }
</script>

<div class="device-detail">
  <div class="header">
    <a href="/" use:link class="back-link">← Back to Devices</a>
  </div>

  {#if loading}
    <div class="loading">Loading device details...</div>
  {:else if error}
    <div class="error">Error: {error}</div>
  {:else if device}
    <div class="device-container">
      <div class="device-header">
        <h2>{device.name || device.id}</h2>
        {#if device.approvalRequired}
          <span class="approval-badge">Approval Required</span>
        {/if}
      </div>

      {#if message}
        <div class="message {message.type}">
          {message.text}
        </div>
      {/if}

      <div class="actions">
        <button 
          class="btn btn-primary" 
          on:click={handleResync}
          disabled={resyncing}
        >
          {resyncing ? 'Resyncing...' : 'Resync'}
        </button>
        <a 
          href="/device/{deviceId}/config" 
          use:link 
          class="btn btn-secondary"
        >
          View Configuration
        </a>
        <a 
          href="/device/{deviceId}/log" 
          use:link 
          class="btn btn-secondary"
        >
          Configuration Log
        </a>
      </div>

      <div class="info-grid">
        <div class="info-section">
          <h3>Device Information</h3>
          <dl>
            <dt>ID</dt>
            <dd>{device.id}</dd>
            
            <dt>Device Type</dt>
            <dd>{device.type || 'Unknown'}</dd>
            
            {#if device.username}
              <dt>Username</dt>
              <dd>{device.username}</dd>
            {/if}
            
            {#if device.addresses && device.addresses.length > 0}
              <dt>Addresses</dt>
              <dd>
                {#each device.addresses as addr}
                  <div class="address-item">
                    <strong>{addr.name}:</strong> {addr.address}:{addr.port}
                  </div>
                {/each}
              </dd>
            {/if}
            
            <dt>Approval Required</dt>
            <dd>{device.approvalRequired ? 'Yes' : 'No'}</dd>
            
            {#if device.version}
              <dt>Version</dt>
              <dd>{device.version}</dd>
            {/if}
            
            {#if device.uptime}
              <dt>Uptime</dt>
              <dd>{device.uptime}</dd>
            {/if}
          </dl>
        </div>

        <div class="info-section">
          <h3>Device Status</h3>
          <dl>
            <dt>Has Running Config</dt>
            <dd>{device.hasRunningConfig ? 'Yes' : 'No'}</dd>
            
            <dt>Has Target Config</dt>
            <dd>{device.hasTargetConfig ? 'Yes' : 'No'}</dd>
            
            {#if device.queueLength > 0}
              <dt>Queue Length</dt>
              <dd>{device.queueLength}</dd>
            {/if}
            
            {#if device.pendingApprovals > 0}
              <dt>Pending Approvals</dt>
              <dd class="pending-approvals">{device.pendingApprovals}</dd>
            {/if}
          </dl>
        </div>
      </div>

      <div class="config-queue-section">
        <h3>Configuration Queue</h3>
        {#if loadingQueue}
          <p>Loading queue...</p>
        {:else if Object.keys(configQueue).length === 0}
          <p class="empty-queue">No items in configuration queue</p>
        {:else}
          <div class="queue-list">
            {#each Object.entries(configQueue) as [queueId, item]}
              <div class="queue-item" class:selected={selectedQueueItem === queueId}>
                <div class="queue-item-header">
                  <span class="queue-id">Queue ID: {queueId}</span>
                  <span class="approval-status" class:approved={item.approved === true}>
                    {item.approved === true ? '✓ Approved' : '⏳ Pending Approval'}
                  </span>
                </div>
                <div class="queue-item-actions">
                  <button class="btn btn-small" on:click={() => viewQueueItem(queueId)}>
                    View Details
                  </button>
                  {#if item.approved !== true}
                    <button 
                      class="btn btn-small btn-success" 
                      on:click={() => handleApproveItem(queueId)}
                      disabled={approvingItem === queueId}
                    >
                      {approvingItem === queueId ? 'Approving...' : 'Approve'}
                    </button>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
        
        {#if selectedQueueItem && queueItemDetail}
          <div class="queue-detail">
            <h4>Queue Item {selectedQueueItem} Details</h4>
            <div class="detail-status">
              Status: {queueItemDetail.approved === true ? 'Approved' : 'Pending Approval'}
            </div>
            {#if queueItemDetail.config}
              <h5>Configuration Diff:</h5>
              <pre class="config-diff">{queueItemDetail.config}</pre>
            {/if}
          </div>
        {/if}
      </div>

    </div>
  {/if}
</div>

<style>
  .device-detail {
    padding: 1rem 0;
  }

  .header {
    margin-bottom: 2rem;
  }

  .back-link {
    color: #3498db;
    text-decoration: none;
    font-size: 1rem;
  }

  .back-link:hover {
    text-decoration: underline;
  }

  .loading, .error {
    text-align: center;
    padding: 2rem;
    color: #7f8c8d;
  }

  .error {
    color: #e74c3c;
  }

  .device-container {
    background: white;
    border: 1px solid #ecf0f1;
    border-radius: 8px;
    padding: 2rem;
  }

  .device-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid #ecf0f1;
  }

  .device-header h2 {
    margin: 0;
    color: #2c3e50;
  }

  .status {
    padding: 0.5rem 1rem;
    border-radius: 20px;
    color: white;
    font-weight: 500;
  }

  .approval-badge {
    padding: 0.5rem 1rem;
    border-radius: 20px;
    background-color: #f39c12;
    color: white;
    font-weight: 500;
    font-size: 0.9rem;
  }

  .address-item {
    margin: 0.25rem 0;
    padding: 0.25rem 0;
  }

  .connection-state {
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-weight: 500;
    text-transform: capitalize;
  }

  .connection-state.connected {
    background-color: #d4edda;
    color: #155724;
  }

  .connection-state.disconnected {
    background-color: #f8d7da;
    color: #721c24;
  }

  .connection-state.connecting {
    background-color: #fff3cd;
    color: #856404;
  }

  .connection-state.transaction {
    background-color: #d1ecf1;
    color: #0c5460;
  }

  .pending-approvals {
    color: #f39c12;
    font-weight: 600;
  }

  .message {
    padding: 1rem;
    border-radius: 4px;
    margin-bottom: 1.5rem;
  }

  .message.success {
    background-color: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }

  .message.error {
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }

  .actions {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-primary {
    background-color: #3498db;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background-color: #2980b9;
  }

  .btn-secondary {
    background-color: #95a5a6;
    color: white;
    text-decoration: none;
    display: inline-block;
  }

  .btn-secondary:hover:not(:disabled) {
    background-color: #7f8c8d;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    margin-bottom: 2rem;
  }

  .info-section {
    background: #f8f9fa;
    padding: 1.5rem;
    border-radius: 4px;
  }

  .info-section h3 {
    margin: 0 0 1rem 0;
    color: #2c3e50;
    font-size: 1.1rem;
  }

  dl {
    margin: 0;
  }

  dt {
    font-weight: 600;
    color: #2c3e50;
    margin-top: 0.75rem;
  }

  dt:first-child {
    margin-top: 0;
  }

  dd {
    margin: 0.25rem 0 0 0;
    color: #7f8c8d;
  }

  .btn-small {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }

  .btn-success {
    background-color: #27ae60;
  }

  .btn-success:hover:not(:disabled) {
    background-color: #229954;
  }

  .config-queue-section {
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 2px solid #ecf0f1;
  }

  .config-queue-section h3 {
    color: #2c3e50;
    margin-bottom: 1rem;
  }

  .empty-queue {
    color: #7f8c8d;
    font-style: italic;
  }

  .queue-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .queue-item {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    padding: 1rem;
    transition: all 0.2s;
  }

  .queue-item:hover {
    background: #e9ecef;
  }

  .queue-item.selected {
    border-color: #3498db;
    background: #ebf5fb;
  }

  .queue-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .queue-id {
    font-weight: 600;
    color: #2c3e50;
  }

  .approval-status {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.875rem;
    background: #fff3cd;
    color: #856404;
  }

  .approval-status.approved {
    background: #d4edda;
    color: #155724;
  }

  .queue-item-actions {
    display: flex;
    gap: 0.5rem;
  }

  .queue-detail {
    margin-top: 1.5rem;
    padding: 1.5rem;
    background: white;
    border: 2px solid #3498db;
    border-radius: 4px;
  }

  .queue-detail h4 {
    margin-top: 0;
    color: #2c3e50;
  }

  .queue-detail h5 {
    margin-top: 1rem;
    margin-bottom: 0.5rem;
    color: #2c3e50;
  }

  .detail-status {
    color: #7f8c8d;
    margin-bottom: 1rem;
  }

  .config-diff {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    padding: 1rem;
    overflow-x: auto;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 0.85rem;
    color: #495057;
    max-height: 400px;
    overflow-y: auto;
  }
</style>