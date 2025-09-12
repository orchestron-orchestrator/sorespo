<script>
  import { onMount, onDestroy } from 'svelte';
  import { link } from 'svelte-routing';
  import { 
    fetchDevice,
    fetchDeviceConfigLog
  } from '../services/api.js';

  export let deviceId;

  let device = null;
  let configLog = [];
  let selectedEntry = null;
  let selectedIndex = null;
  let configFormat = 'xml';  // XML is the only working format currently
  let loading = true;
  let error = null;
  let loadingLog = false;
  let pollInterval = null;

  onMount(() => {
    loadDevice();
    // Start polling for updates every second
    pollInterval = setInterval(() => {
      if (!loadingLog) {
        loadLog(true); // true = silent update (no loading indicator)
      }
    }, 1000);
  });

  onDestroy(() => {
    // Clean up the interval when component is destroyed
    if (pollInterval) {
      clearInterval(pollInterval);
    }
  });

  async function loadDevice() {
    try {
      loading = true;
      device = await fetchDevice(deviceId);
      await loadLog();
      loading = false;
    } catch (err) {
      error = err.message;
      loading = false;
    }
  }

  async function loadLog(silent = false) {
    try {
      if (!silent) {
        loadingLog = true;
      }
      const response = await fetchDeviceConfigLog(deviceId, configFormat);
      const newLog = response.log || [];
      
      // Check if there are new entries
      const hasNewEntries = newLog.length !== configLog.length || 
        (newLog.length > 0 && configLog.length > 0 && 
         newLog[newLog.length - 1].timestamp !== configLog[configLog.length - 1].timestamp);
      
      if (hasNewEntries) {
        // Remember the currently selected entry
        const previousSelectedTimestamp = selectedEntry?.timestamp;
        
        configLog = newLog;
        
        // Try to restore selection by timestamp
        if (previousSelectedTimestamp) {
          const newIndex = configLog.findIndex(entry => entry.timestamp === previousSelectedTimestamp);
          if (newIndex !== -1) {
            selectedIndex = newIndex;
            selectedEntry = configLog[newIndex];
          } else {
            // If the selected entry no longer exists, select the first one
            if (configLog.length > 0) {
              selectEntry(0);
            }
          }
        } else if (configLog.length > 0 && !selectedEntry) {
          // Auto-select the first entry if nothing was selected
          selectEntry(0);
        }
      }
    } catch (err) {
      if (!silent) {
        console.error('Failed to load config log:', err);
      }
      // Don't clear the log on error during polling
      if (!silent) {
        configLog = [];
      }
    } finally {
      if (!silent) {
        loadingLog = false;
      }
    }
  }

  function selectEntry(index) {
    selectedIndex = index;
    selectedEntry = configLog[index];
  }

  async function changeFormat(format) {
    configFormat = format;
    await loadLog();
  }

  function formatTimestamp(timestamp) {
    // Handle both Unix timestamps and ISO strings
    let date;
    if (timestamp.includes('T')) {
      // ISO string format
      date = new Date(timestamp);
    } else {
      // Unix timestamp
      date = new Date(parseInt(timestamp) * 1000);
    }
    
    // Format as ISO 8601 style: YYYY-MM-DD HH:MM:SS
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  function getEventLabel(event) {
    switch(event) {
      case 'sent': return 'Configuration Sent';
      default: return event;
    }
  }

  function getEventColor(event) {
    switch(event) {
      case 'sent': return '#27ae60';
      case 'failed': return '#e74c3c';
      default: return '#3498db';
    }
  }
</script>

<div class="log-page">
  <div class="header">
    <div class="breadcrumb">
      <a href="/" use:link>Devices</a>
      <span class="separator">›</span>
      <a href="/device/{deviceId}" use:link>{device?.name || deviceId}</a>
      <span class="separator">›</span>
      <span>Configuration Log</span>
    </div>
  </div>

  {#if loading}
    <div class="loading">Loading device...</div>
  {:else if error}
    <div class="error">Error: {error}</div>
  {:else if device}
    <div class="log-container">
      <div class="sidebar">
        <div class="sidebar-header">
          <h3>Configuration History</h3>
        </div>
        
        <div class="log-list">
          {#if configLog.length === 0}
            <div class="empty-state">
              No configuration changes logged
            </div>
          {:else}
            {#each configLog as entry, index}
              <div 
                class="log-entry {selectedIndex === index ? 'selected' : ''}"
                on:click={() => selectEntry(index)}
              >
                <div class="entry-header">
                  <span 
                    class="entry-event"
                    style="color: {getEventColor(entry.event)}"
                  >
                    {getEventLabel(entry.event)}
                  </span>
                </div>
                <div class="entry-timestamp">
                  {formatTimestamp(entry.timestamp)}
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </div>

      <div class="main-content">
        <div class="content-header">
          <h2>Configuration Change Details</h2>
          <div class="format-selector">
            <span class="control-label">Format:</span>
            <div class="button-group">
              <button 
                class="control-btn disabled"
                disabled
                title="JSON format not yet available"
              >
                JSON
              </button>
              <button 
                class="control-btn {configFormat === 'xml' ? 'active' : ''}"
                on:click|preventDefault={() => changeFormat('xml')}
              >
                XML
              </button>
              <button 
                class="control-btn disabled"
                disabled
                title="GData format not yet available"
              >
                GData
              </button>
            </div>
          </div>
        </div>

        {#if selectedEntry}
          <div class="detail-section">
            <div class="detail-info">
              <div class="info-row">
                <span class="info-label">Event:</span>
                <span class="info-value" style="color: {getEventColor(selectedEntry.event)}">
                  {getEventLabel(selectedEntry.event)}
                </span>
              </div>
              <div class="info-row">
                <span class="info-label">Timestamp:</span>
                <span class="info-value">{formatTimestamp(selectedEntry.timestamp)}</span>
              </div>
            </div>
            
            <div class="diff-section">
              <h3>Configuration Diff</h3>
              {#if selectedEntry.conf_diff}
                <pre class="config-diff">{selectedEntry.conf_diff}</pre>
              {:else}
                <div class="no-diff">No configuration diff available</div>
              {/if}
            </div>
          </div>
        {:else}
          <div class="empty-detail">
            {#if configLog.length > 0}
              Select a log entry to view details
            {:else}
              No log entries available
            {/if}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .log-page {
    padding: 1rem 0;
    height: calc(100vh - 100px);
    display: flex;
    flex-direction: column;
  }

  .header {
    margin-bottom: 1.5rem;
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.95rem;
  }

  .breadcrumb a {
    color: #3498db;
    text-decoration: none;
  }

  .breadcrumb a:hover {
    text-decoration: underline;
  }

  .separator {
    color: #7f8c8d;
  }

  .loading, .error {
    text-align: center;
    padding: 2rem;
    color: #7f8c8d;
  }

  .error {
    color: #e74c3c;
  }

  .log-container {
    flex: 1;
    display: flex;
    gap: 1rem;
    min-height: 0;
  }

  .sidebar {
    width: 350px;
    background: white;
    border: 1px solid #ecf0f1;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .sidebar-header {
    padding: 1rem;
    border-bottom: 2px solid #ecf0f1;
  }

  .sidebar-header h3 {
    margin: 0;
    color: #2c3e50;
    font-size: 1.1rem;
  }

  .log-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
  }

  .empty-state {
    text-align: center;
    padding: 2rem;
    color: #7f8c8d;
    font-style: italic;
  }

  .log-entry {
    padding: 0.75rem;
    margin-bottom: 0.5rem;
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .log-entry:hover {
    background: #e9ecef;
    border-color: #adb5bd;
  }

  .log-entry.selected {
    background: #ebf5fb;
    border-color: #3498db;
    box-shadow: 0 0 0 1px #3498db;
  }

  .entry-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.25rem;
  }

  .entry-event {
    font-weight: 600;
    font-size: 0.875rem;
  }

  .entry-index {
    color: #6c757d;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .entry-timestamp {
    font-size: 0.75rem;
    color: #6c757d;
  }

  .main-content {
    flex: 1;
    background: white;
    border: 1px solid #ecf0f1;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .content-header {
    padding: 1rem 1.5rem;
    border-bottom: 2px solid #ecf0f1;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .content-header h2 {
    margin: 0;
    color: #2c3e50;
    font-size: 1.3rem;
  }

  .format-selector {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .control-label {
    color: #495057;
    font-weight: 500;
  }

  .button-group {
    display: flex;
    gap: 0.25rem;
    background: #f8f9fa;
    padding: 0.25rem;
    border-radius: 4px;
  }

  .control-btn {
    padding: 0.4rem 0.8rem;
    border: none;
    background: transparent;
    color: #495057;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .control-btn:hover {
    background: #e9ecef;
  }

  .control-btn.active {
    background: #3498db;
    color: white;
  }

  .control-btn.disabled,
  .control-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    color: #adb5bd;
  }

  .control-btn.disabled:hover {
    background: transparent;
  }

  .detail-section {
    flex: 1;
    padding: 1.5rem;
    overflow-y: auto;
  }

  .detail-info {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    padding: 1rem;
    margin-bottom: 1.5rem;
  }

  .info-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem 0;
  }

  .info-row:not(:last-child) {
    border-bottom: 1px solid #e9ecef;
  }

  .info-label {
    font-weight: 600;
    color: #495057;
    min-width: 100px;
  }

  .info-value {
    color: #212529;
  }

  .diff-section {
    margin-top: 1.5rem;
  }

  .diff-section h3 {
    margin: 0 0 1rem 0;
    color: #2c3e50;
    font-size: 1.1rem;
  }

  .config-diff {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    padding: 1rem;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 0.85rem;
    color: #495057;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: none;
    margin: 0;
  }

  .no-diff {
    text-align: center;
    padding: 2rem;
    color: #7f8c8d;
    font-style: italic;
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 4px;
  }

  .empty-detail {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #7f8c8d;
    font-style: italic;
  }
</style>