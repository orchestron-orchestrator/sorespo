<script>
  import { onMount } from 'svelte';
  import { link } from 'svelte-routing';
  import { 
    fetchAllDeviceQueues,
    approveConfigQueueItem,
    fetchConfigQueueItem
  } from '../services/api.js';

  let allQueues = [];
  let loading = true;
  let error = null;
  let selectedItem = null;
  let itemDetail = null;
  let approvingItem = null;
  let filter = 'all'; // 'all', 'pending', 'approved'
  let refreshInterval = null;

  onMount(() => {
    loadAllQueues();
    
    // Auto-refresh every 30 seconds
    refreshInterval = setInterval(loadAllQueues, 30000);
    
    // Listen for global refresh events
    const handleRefresh = () => loadAllQueues();
    window.addEventListener('global-refresh', handleRefresh);
    
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
      window.removeEventListener('global-refresh', handleRefresh);
    };
  });

  async function loadAllQueues() {
    try {
      loading = true;
      allQueues = await fetchAllDeviceQueues();
      loading = false;
    } catch (err) {
      error = err.message;
      loading = false;
    }
  }

  async function viewItem(deviceId, queueId) {
    try {
      selectedItem = { deviceId, queueId };
      itemDetail = await fetchConfigQueueItem(deviceId, queueId);
    } catch (err) {
      error = `Failed to load item details: ${err.message}`;
    }
  }

  async function handleApprove(deviceId, queueId) {
    try {
      approvingItem = `${deviceId}-${queueId}`;
      await approveConfigQueueItem(deviceId, queueId);
      
      // Clear selected item if it was the one we just approved
      if (selectedItem?.deviceId === deviceId && selectedItem?.queueId === queueId) {
        selectedItem = null;
        itemDetail = null;
      }
      
      // Reload all queues to reflect the removed item
      await loadAllQueues();
    } catch (err) {
      error = `Failed to approve: ${err.message}`;
    } finally {
      approvingItem = null;
    }
  }

  $: filteredQueues = allQueues.filter(item => {
    if (filter === 'pending') return !item.approved;
    if (filter === 'approved') return item.approved;
    return true;
  });

  $: pendingCount = allQueues.filter(item => !item.approved).length;
  $: approvedCount = allQueues.filter(item => item.approved).length;
</script>

<div class="queue-dashboard">
  <div class="dashboard-header">
    <h2>Config Queue</h2>
    <span class="auto-refresh">Auto-refresh: 30s</span>
  </div>

  <div class="stats-bar">
    <div class="stat-card" class:alert={pendingCount > 0}>
      <div class="stat-value">{pendingCount}</div>
      <div class="stat-label">Pending Approval</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{approvedCount}</div>
      <div class="stat-label">Approved</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{allQueues.length}</div>
      <div class="stat-label">Total Items</div>
    </div>
  </div>

  <div class="filter-tabs">
    <button 
      class="tab" 
      class:active={filter === 'all'}
      on:click={() => filter = 'all'}
    >
      All ({allQueues.length})
    </button>
    <button 
      class="tab" 
      class:active={filter === 'pending'}
      on:click={() => filter = 'pending'}
    >
      Pending ({pendingCount})
    </button>
    <button 
      class="tab" 
      class:active={filter === 'approved'}
      on:click={() => filter = 'approved'}
    >
      Approved ({approvedCount})
    </button>
  </div>

  {#if loading && allQueues.length === 0}
    <div class="loading">Loading configuration queues...</div>
  {:else if error}
    <div class="error">{error}</div>
  {:else if filteredQueues.length === 0}
    <div class="empty">
      {#if filter === 'pending'}
        No pending approvals - all caught up! 🎉
      {:else if filter === 'approved'}
        No approved items in queue
      {:else}
        No configuration changes in queue
      {/if}
    </div>
  {:else}
    <div class="queue-table">
      <table>
        <thead>
          <tr>
            <th>Device</th>
            <th>Queue ID</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredQueues as item}
            <tr class:selected={selectedItem?.deviceId === item.deviceId && selectedItem?.queueId === item.queueId}>
              <td>
                <a href="/device/{item.deviceId}" use:link class="device-link">
                  {item.deviceId}
                </a>
              </td>
              <td>{item.queueId}</td>
              <td>
                <span class="status-badge" class:approved={item.approved} class:pending={!item.approved}>
                  {item.approved ? '✓ Approved' : '⏳ Pending'}
                </span>
              </td>
              <td>
                <div class="action-buttons">
                  <button class="btn btn-small" on:click={() => viewItem(item.deviceId, item.queueId)}>
                    View
                  </button>
                  {#if !item.approved}
                    <button 
                      class="btn btn-small btn-success"
                      on:click={() => handleApprove(item.deviceId, item.queueId)}
                      disabled={approvingItem === `${item.deviceId}-${item.queueId}`}
                    >
                      {approvingItem === `${item.deviceId}-${item.queueId}` ? 'Approving...' : 'Approve'}
                    </button>
                  {/if}
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  {#if selectedItem && itemDetail}
    <div class="detail-panel">
      <div class="detail-header">
        <h3>Configuration Details</h3>
        <button class="close-btn" on:click={() => { selectedItem = null; itemDetail = null; }}>
          ✕
        </button>
      </div>
      <div class="detail-content">
        <dl>
          <dt>Device</dt>
          <dd>{selectedItem.deviceId}</dd>
          <dt>Queue ID</dt>
          <dd>{selectedItem.queueId}</dd>
          <dt>Status</dt>
          <dd>{itemDetail.approved ? 'Approved' : 'Pending Approval'}</dd>
        </dl>
        {#if itemDetail.config}
          <h4>Configuration Diff</h4>
          <pre class="config-diff">{itemDetail.config}</pre>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .queue-dashboard {
    padding: 1rem 0;
  }

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .dashboard-header h2 {
    margin: 0;
    color: #2c3e50;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .auto-refresh {
    color: #7f8c8d;
    font-size: 0.875rem;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn-primary {
    background-color: #3498db;
    color: white;
  }

  .btn-primary:hover {
    background-color: #2980b9;
  }

  .btn-small {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }

  .btn-success {
    background-color: #27ae60;
    color: white;
  }

  .btn-success:hover:not(:disabled) {
    background-color: #229954;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .stats-bar {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    background: white;
    border: 1px solid #ecf0f1;
    border-radius: 8px;
    padding: 1.5rem;
    text-align: center;
  }

  .stat-card.alert {
    background: #fff5f5;
    border-color: #e74c3c;
  }

  .stat-value {
    font-size: 2.5rem;
    font-weight: bold;
    color: #2c3e50;
  }

  .stat-card.alert .stat-value {
    color: #e74c3c;
  }

  .stat-label {
    color: #7f8c8d;
    font-size: 0.875rem;
    text-transform: uppercase;
    margin-top: 0.5rem;
  }

  .filter-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    border-bottom: 2px solid #ecf0f1;
  }

  .tab {
    padding: 0.75rem 1.5rem;
    background: none;
    border: none;
    color: #7f8c8d;
    cursor: pointer;
    font-size: 1rem;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    transition: all 0.2s;
  }

  .tab:hover {
    color: #2c3e50;
  }

  .tab.active {
    color: #3498db;
    border-bottom-color: #3498db;
  }

  .loading, .error, .empty {
    text-align: center;
    padding: 3rem;
    color: #7f8c8d;
  }

  .error {
    color: #e74c3c;
  }

  .queue-table {
    background: white;
    border: 1px solid #ecf0f1;
    border-radius: 8px;
    overflow: hidden;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  thead {
    background: #f8f9fa;
  }

  th {
    padding: 1rem;
    text-align: left;
    color: #2c3e50;
    font-weight: 600;
    border-bottom: 2px solid #ecf0f1;
  }

  td {
    padding: 1rem;
    border-bottom: 1px solid #ecf0f1;
  }

  tbody tr:hover {
    background: #f8f9fa;
  }

  tbody tr.selected {
    background: #ebf5fb;
  }

  .device-link {
    color: #3498db;
    text-decoration: none;
    font-weight: 500;
  }

  .device-link:hover {
    text-decoration: underline;
  }

  .status-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .status-badge.approved {
    background: #d4edda;
    color: #155724;
  }

  .status-badge.pending {
    background: #fff3cd;
    color: #856404;
  }

  .action-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .detail-panel {
    position: fixed;
    right: 0;
    top: 0;
    width: 500px;
    height: 100vh;
    background: white;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
    overflow-y: auto;
    z-index: 1000;
  }

  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 2px solid #ecf0f1;
  }

  .detail-header h3 {
    margin: 0;
    color: #2c3e50;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: #7f8c8d;
    cursor: pointer;
  }

  .close-btn:hover {
    color: #2c3e50;
  }

  .detail-content {
    padding: 1.5rem;
  }

  dl {
    margin: 0 0 1.5rem 0;
  }

  dt {
    font-weight: 600;
    color: #2c3e50;
    margin-bottom: 0.25rem;
  }

  dd {
    margin: 0 0 1rem 0;
    color: #7f8c8d;
  }

  .detail-content h4 {
    color: #2c3e50;
    margin: 1.5rem 0 0.75rem 0;
  }

  .config-diff {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    padding: 1rem;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 0.85rem;
    color: #495057;
    overflow-x: auto;
    max-height: 400px;
    overflow-y: auto;
  }
</style>