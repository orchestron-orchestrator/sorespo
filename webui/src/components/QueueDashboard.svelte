<script>
  import { onMount, tick } from 'svelte';
  import { link } from 'svelte-routing';
  import { fade, slide } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { 
    fetchAllDeviceQueues,
    approveConfigQueueItem,
    fetchConfigQueueItem
  } from '../services/api.js';

  let allQueues = [];
  let loading = true;
  let error = null;
  let selectedDevice = null;
  let selectedQueueIndex = 0;
  let itemDetail = null;
  let approvingItem = null;
  let refreshInterval = null;
  let diffFormat = 'xml'; // 'xml', 'json', or 'adata'

  onMount(async () => {
    await loadAllQueues();
    
    // Auto-select first item if there are any
    if (allQueues.length > 0) {
      await selectFirstAvailable();
    }
    
    // Auto-refresh every second
    refreshInterval = setInterval(loadAllQueues, 1000);
    
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
  
  async function selectFirstAvailable() {
    // Select the first device with pending items
    if (deviceList && deviceList.length > 0) {
      const firstDevice = deviceList[0];
      await selectDevice(firstDevice.deviceId, 0);
    }
  }

  async function selectDevice(deviceId, index = 0) {
    // If switching to a different device, refresh data and start at index 0
    if (selectedDevice !== deviceId) {
      index = 0;
      // Refresh queue data when switching devices
      await loadAllQueues();
    }
    
    // Set the selected device and index
    selectedDevice = deviceId;
    selectedQueueIndex = index;
    
    // Use the current deviceGroups data (which should now be fresh)
    const deviceItems = deviceGroups[deviceId];
    if (deviceItems && deviceItems.length > 0) {
      const itemIndex = Math.min(index, deviceItems.length - 1);
      selectedQueueIndex = itemIndex;
      const item = deviceItems[itemIndex];
      if (item) {
        await loadItemDetail(item.deviceId, item.queueId);
      }
    }
  }
  
  async function loadItemDetail(deviceId, queueId) {
    try {
      const detail = await fetchConfigQueueItem(deviceId, queueId);
      // Transform backend response to expected format
      itemDetail = {
        tid: detail.tid,
        deviceTxid: detail.device_txid,
        configDiff: detail.config_diff,
        approved: false  // Items in queue are pending
      };
    } catch (err) {
      error = `Failed to load item details: ${err.message}`;
    }
  }
  
  function navigateQueue(direction) {
    if (!selectedDevice || !deviceGroups[selectedDevice]) return;
    
    const items = deviceGroups[selectedDevice];
    if (direction === 'next' && selectedQueueIndex < items.length - 1) {
      selectedQueueIndex++;
    } else if (direction === 'prev' && selectedQueueIndex > 0) {
      selectedQueueIndex--;
    }
    
    const item = items[selectedQueueIndex];
    if (item) {
      loadItemDetail(item.deviceId, item.queueId);
    }
  }

  async function handleApprove(deviceId, queueId) {
    try {
      approvingItem = `${deviceId}-${queueId}`;
      
      // Find the item to get its deviceTxid
      const item = allQueues.find(q => q.deviceId === deviceId && q.queueId === queueId);
      if (!item) {
        throw new Error('Queue item not found');
      }
      
      // Approve with the device_txid
      await approveConfigQueueItem(deviceId, queueId, item.deviceTxid, true);
      
      // Don't clear itemDetail to keep the layout stable
      // Just reload the queue
      await loadAllQueues();
      
      // Auto-select next item
      if (deviceGroups[deviceId] && deviceGroups[deviceId].length > 0) {
        // Same device still has items, stay on it
        // Adjust index if necessary
        if (selectedQueueIndex >= deviceGroups[deviceId].length) {
          selectedQueueIndex = deviceGroups[deviceId].length - 1;
        }
        await loadItemDetail(deviceGroups[deviceId][selectedQueueIndex].deviceId, 
                           deviceGroups[deviceId][selectedQueueIndex].queueId);
      } else {
        // Current device has no more items, select next available device
        if (deviceList && deviceList.length > 0) {
          // Find next device after current one, or wrap to first
          const currentIndex = deviceList.findIndex(d => d.deviceId === deviceId);
          let nextIndex = (currentIndex + 1) % deviceList.length;
          
          // If we wrapped and there's only one device left, try it
          if (deviceList.length === 1) {
            nextIndex = 0;
          }
          
          if (nextIndex < deviceList.length && deviceList[nextIndex]) {
            await selectDevice(deviceList[nextIndex].deviceId, 0);
          } else if (deviceList.length > 0) {
            // Fallback to first device
            await selectDevice(deviceList[0].deviceId, 0);
          } else {
            // No more items at all
            selectedDevice = null;
            selectedQueueIndex = 0;
            itemDetail = null;
          }
        } else {
          // No devices with pending items
          selectedDevice = null;
          selectedQueueIndex = 0;
          itemDetail = null;
        }
      }
    } catch (err) {
      error = `Failed to approve: ${err.message}`;
    } finally {
      approvingItem = null;
    }
  }

  async function handleReject(deviceId, queueId) {
    try {
      approvingItem = `${deviceId}-${queueId}`;
      
      // Find the item to get its deviceTxid
      const item = allQueues.find(q => q.deviceId === deviceId && q.queueId === queueId);
      if (!item) {
        throw new Error('Queue item not found');
      }
      
      // Reject by calling with approved: false
      await approveConfigQueueItem(deviceId, queueId, item.deviceTxid, false);
      
      // Reload the queue
      await loadAllQueues();
      
      // Auto-select next item if available
      if (deviceGroups[deviceId] && deviceGroups[deviceId].length > 0) {
        // Same device still has items, select first one
        selectedQueueIndex = 0;
        await loadItemDetail(deviceGroups[deviceId][0].deviceId, deviceGroups[deviceId][0].queueId);
      } else if (deviceList && deviceList.length > 0) {
        // Current device has no more items, select first available device
        await selectDevice(deviceList[0].deviceId, 0);
      } else {
        // No more items at all
        selectedDevice = null;
        selectedQueueIndex = 0;
        itemDetail = null;
      }
    } catch (err) {
      error = `Failed to reject: ${err.message}`;
    } finally {
      approvingItem = null;
    }
  }

  $: pendingCount = allQueues.length; // All items in queue are pending
  
  // Group queue items by device
  $: deviceGroups = allQueues.reduce((groups, item) => {
    if (!groups[item.deviceId]) {
      groups[item.deviceId] = [];
    }
    groups[item.deviceId].push(item);
    return groups;
  }, {});
  
  $: deviceList = Object.entries(deviceGroups).map(([deviceId, items]) => ({
    deviceId,
    items,
    count: items.filter(item => item.approved !== false && item.approved !== true).length
  }));
  
  $: selectedItem = selectedDevice && deviceGroups[selectedDevice] 
    ? deviceGroups[selectedDevice][selectedQueueIndex]
    : null;
</script>

<div class="queue-dashboard" class:has-selection={selectedItem}>
  <div class="dashboard-header">
    <h2>Config Queue</h2>
    <div class="header-right">
      <span class="pending-count" class:alert={pendingCount > 0}>
        {pendingCount} pending
      </span>
      <span class="auto-refresh">Auto-refresh: 1s</span>
    </div>
  </div>

  <div class="main-container">
    <!-- Queue List Sidebar -->
    <div class="queue-sidebar">
      {#if loading && allQueues.length === 0}
        <div class="loading">Loading...</div>
      {:else if error}
        <div class="error">{error}</div>
      {:else if allQueues.length === 0}
        <div class="empty">
          No pending approvals! 🎉
        </div>
      {:else}
        <div class="queue-list">
          {#each deviceList as device (device.deviceId)}
            <div 
              class="device-card"
              class:selected={selectedDevice === device.deviceId}
              on:click={() => selectDevice(device.deviceId, 0)}
              transition:slide|local={{duration: 300, easing: quintOut}}
            >
              <div class="device-card-header">
                <span class="device-name">{device.deviceId}</span>
                <span class="queue-count">{device.count}</span>
              </div>
              <div class="device-card-body">
                {#if selectedDevice === device.deviceId}
                  <div class="queue-items" 
                    in:slide|local={{duration: 300, delay: 150, easing: quintOut}} 
                    out:slide|local={{duration: 400, delay: 0, easing: quintOut}}
                  >
                    {#each device.items as item, index (item.queueId)}
                      <div 
                        class="queue-item-mini"
                        class:active={selectedQueueIndex === index}
                        on:click|stopPropagation={() => selectDevice(device.deviceId, index)}
                        in:fade|local={{duration: 200, delay: 150 + index * 30}}
                      >
                        <span class="queue-num">#{item.queueId}</span>
                        <span class="queue-status">
                          {#if item.approved === true}
                            <span class="status-icon approved" title="Approved">✓</span>
                          {:else if item.approved === false}
                            <span class="status-icon rejected" title="Rejected">✕</span>
                          {:else}
                            <span class="status-icon pending" title="Pending">●</span>
                          {/if}
                        </span>
                      </div>
                    {/each}
                  </div>
                {:else}
                  <div class="device-card-status" 
                    in:fade|local={{duration: 250, delay: 200}} 
                    out:fade|local={{duration: 150}}
                  >
                    {device.count} pending approval{device.count > 1 ? 's' : ''}
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Detail View -->
    {#if selectedItem && itemDetail}
      <div class="detail-view">
        <div class="detail-header">
          <div class="header-top">
            <div class="device-title">
              <h3>{selectedItem.deviceId}</h3>
            </div>
            <div class="nav-controls">
              <span class="queue-position">Item {selectedQueueIndex + 1} of {deviceGroups[selectedDevice].length}</span>
              <button 
                class="btn btn-nav"
                disabled={!deviceGroups[selectedDevice] || deviceGroups[selectedDevice].length <= 1 || selectedQueueIndex === 0}
                on:click={() => navigateQueue('prev')}
              >
                ← Previous
              </button>
              <button 
                class="btn btn-nav"
                disabled={!deviceGroups[selectedDevice] || deviceGroups[selectedDevice].length <= 1 || selectedQueueIndex === deviceGroups[selectedDevice].length - 1}
                on:click={() => navigateQueue('next')}
              >
                Next →
              </button>
            </div>
          </div>
          
          <div class="header-middle">
            <div class="detail-meta">
              <span>Queue #{selectedItem.queueId}</span>
              <span class="separator">•</span>
              <span>TID: {itemDetail.tid || 'N/A'}</span>
              <span class="separator">•</span>
              <span>Device TxID: {itemDetail.deviceTxid || 'N/A'}</span>
              <span class="separator">•</span>
              <span class="status-display">
                Status: 
                {#if selectedItem.approved === true}
                  <span class="status-icon approved">✓</span> Approved
                {:else if selectedItem.approved === false}
                  <span class="status-icon rejected">✕</span> Rejected
                {:else}
                  <span class="status-icon pending">●</span> Pending
                {/if}
              </span>
            </div>
            <div class="format-selector">
              <button 
                class="format-btn"
                class:active={diffFormat === 'xml'}
                on:click={() => diffFormat = 'xml'}
              >
                XML
              </button>
              <button 
                class="format-btn"
                class:active={diffFormat === 'json'}
                on:click={() => diffFormat = 'json'}
              >
                JSON
              </button>
              <button 
                class="format-btn"
                class:active={diffFormat === 'adata'}
                on:click={() => diffFormat = 'adata'}
              >
                AData
              </button>
            </div>
          </div>
          
          <div class="header-actions">
            <button 
              class="btn btn-danger"
              on:click={() => handleReject(selectedItem.deviceId, selectedItem.queueId)}
              disabled={approvingItem === `${selectedItem.deviceId}-${selectedItem.queueId}` || selectedQueueIndex !== 0}
              title={selectedQueueIndex !== 0 ? 'Only the first item in the queue can be approved/rejected' : ''}
            >
              {approvingItem === `${selectedItem.deviceId}-${selectedItem.queueId}` ? 'Rejecting...' : 'Reject'}
            </button>
            <button 
              class="btn btn-success"
              on:click={() => handleApprove(selectedItem.deviceId, selectedItem.queueId)}
              disabled={approvingItem === `${selectedItem.deviceId}-${selectedItem.queueId}` || selectedQueueIndex !== 0}
              title={selectedQueueIndex !== 0 ? 'Only the first item in the queue can be approved/rejected' : ''}
            >
              {approvingItem === `${selectedItem.deviceId}-${selectedItem.queueId}` ? 'Approving...' : 'Approve & Apply'}
            </button>
          </div>
        </div>
        
        <div class="diff-content">
          {#key `${selectedItem?.deviceId}-${selectedItem?.queueId}`}
            {#if itemDetail.configDiff}
              <pre class="config-diff" in:fade={{duration: 400, delay: 100}} out:fade={{duration: 300}}>{itemDetail.configDiff}</pre>
            {:else}
              <div class="no-diff">No configuration diff available</div>
            {/if}
          {/key}
        </div>
      </div>
    {:else if allQueues.length > 0}
      <div class="no-selection">
        <p>Loading first item for review...</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .queue-dashboard {
    height: calc(100vh - 100px);
    display: flex;
    flex-direction: column;
  }

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 2px solid #ecf0f1;
    background: white;
  }

  .dashboard-header h2 {
    margin: 0;
    color: #2c3e50;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .pending-count {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    background: #ecf0f1;
    font-weight: 500;
    transition: all 0.3s ease;
  }

  .pending-count.alert {
    background: #fff4e6;  /* Light orange background */
    color: #f39c12;  /* Orange text */
  }

  .auto-refresh {
    color: #7f8c8d;
    font-size: 0.875rem;
  }

  .main-container {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .queue-sidebar {
    width: 320px;
    background: #f8f9fa;
    border-right: 1px solid #dee2e6;
    overflow-y: auto;
  }

  .queue-list {
    padding: 0.5rem;
  }

  .device-card {
    background: white;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    padding: 0.75rem;
    margin-bottom: 0.5rem;
    cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s, background-color 0.3s;
  }

  .device-card:hover {
    border-color: #3498db;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  }

  .device-card.selected {
    background: #ebf5fb;
    border-color: #3498db;
    border-width: 2px;
    transition: all 0.3s ease;
  }

  .device-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .device-name {
    font-weight: 600;
    color: #2c3e50;
  }

  .queue-count {
    background: #f39c12;  /* Warm orange - attention needed but not urgent */
    color: white;
    border-radius: 10px;
    padding: 0.125rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    min-width: 20px;
    text-align: center;
  }

  .device-card-body {
    min-height: 1.75rem;
    position: relative;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
  }

  .device-card.selected .device-card-body {
    min-height: 3rem;
    transition-delay: 0.1s;
  }

  .device-card-status {
    font-size: 0.875rem;
    color: #7f8c8d;
    padding: 0.25rem 0;
  }

  .queue-items {
    padding-top: 0.25rem;
    transform-origin: top;
  }
  
  /* Smoother list reflow */
  .queue-list {
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .queue-item-mini {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.375rem 0.5rem;
    margin: 0.25rem 0;
    border-radius: 4px;
    background: #f8f9fa;
    font-size: 0.8125rem;
    transition: all 0.2s;
  }

  .queue-item-mini:hover {
    background: #e9ecef;
  }

  .queue-item-mini.active {
    background: #3498db;
    color: white;
  }

  .queue-num {
    font-weight: 500;
  }

  .queue-status {
    display: flex;
    align-items: center;
  }

  .status-icon {
    font-size: 0.875rem;
    font-weight: bold;
  }

  .status-icon.approved {
    color: #27ae60;
  }

  .status-icon.rejected {
    color: #dc3545;
  }

  .status-icon.pending {
    color: #ff9500;
    font-size: 0.625rem;
  }

  .queue-item-mini.active .status-icon {
    color: white;
  }

  .detail-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: white;
  }

  .detail-header {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #dee2e6;
    background: #f8f9fa;
  }

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .device-title h3 {
    margin: 0;
    color: #2c3e50;
    font-size: 1.5rem;
  }

  .nav-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .queue-position {
    font-size: 0.875rem;
    color: #6c757d;
    font-weight: 500;
    padding-right: 0.5rem;
  }

  .header-middle {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .detail-meta {
    display: flex;
    gap: 0.75rem;
    color: #6c757d;
    font-size: 0.8125rem;
    white-space: nowrap;
  }
  
  .status-display {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }
  
  .status-display .status-icon {
    font-size: 0.875rem;
  }

  .separator {
    color: #adb5bd;
  }

  .format-selector {
    display: flex;
    gap: 0;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    overflow: hidden;
  }

  .format-btn {
    padding: 0.25rem 0.75rem;
    border: none;
    background: white;
    color: #6c757d;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border-right: 1px solid #dee2e6;
  }

  .format-btn:last-child {
    border-right: none;
  }

  .format-btn:hover {
    background: #f8f9fa;
  }

  .format-btn.active {
    background: #3498db;
    color: white;
  }

  .header-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
  }

  .btn-nav {
    background: #6c757d;
    color: white;
    padding: 0.375rem 0.75rem;
    font-size: 0.8125rem;
  }

  .btn-nav:hover:not(:disabled) {
    background: #5a6268;
  }

  .btn-nav:disabled {
    background: #dee2e6;
    color: #adb5bd;
  }

  .diff-content {
    flex: 1;
    overflow: auto;
    padding: 1.5rem;
  }

  .config-diff {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    padding: 1rem;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 0.9rem;
    line-height: 1.5;
    color: #212529;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .no-selection {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6c757d;
  }

  .loading, .empty, .error {
    padding: 2rem;
    text-align: center;
    color: #6c757d;
  }

  .error {
    color: #dc3545;
  }

  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;  /* Prevent button text from wrapping */
  }

  .btn-success {
    background-color: #28a745;
    color: white;
  }

  .btn-success:hover:not(:disabled) {
    background-color: #218838;
  }

  .btn-danger {
    background-color: #dc3545;
    color: white;
  }

  .btn-danger:hover {
    background-color: #c82333;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .no-diff {
    padding: 3rem;
    text-align: center;
    color: #6c757d;
  }

  /* Smooth animations for queue updates */
  .queue-count {
    transition: all 0.3s ease;
  }
  
  .device-card {
    overflow: hidden;
  }
  
  .queue-items {
    overflow: hidden;
  }
  
  /* Clean fade transitions */
  .detail-view {
    position: relative;
  }
  
  .diff-content {
    position: relative;
    min-height: 200px;
  }
  
  .config-diff {
    animation: gentleFadeIn 0.5s ease;
  }
  
  @keyframes gentleFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>