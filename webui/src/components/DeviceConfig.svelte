<script>
  import { onMount } from 'svelte';
  import { link } from 'svelte-routing';
  import { 
    fetchDevice,
    fetchDeviceRunningConfig,
    fetchDeviceTargetConfig,
    fetchDeviceConfigDiff
  } from '../services/api.js';

  export let deviceId;

  let device = null;
  let configViewMode = 'running'; // Start with running config by default
  let configFormat = 'xml';  // XML is the only working format currently
  let configData = null;
  let loadingConfig = false;
  let loading = true;
  let error = null;

  onMount(() => {
    loadDevice();
  });

  async function loadDevice() {
    try {
      loading = true;
      device = await fetchDevice(deviceId);
      loading = false;
      // Load running config by default
      await loadConfigView('running');
    } catch (err) {
      error = err.message;
      loading = false;
    }
  }

  async function loadConfigView(mode) {
    if (!mode) return;
    
    try {
      loadingConfig = true;
      configViewMode = mode;
      configData = null;
      
      let fetchFn;
      switch(mode) {
        case 'running':
          fetchFn = fetchDeviceRunningConfig;
          break;
        case 'target':
          fetchFn = fetchDeviceTargetConfig;
          break;
        default:
          throw new Error('Invalid config view mode');
      }
      
      configData = await fetchFn(deviceId, configFormat);
    } catch (err) {
      configData = `# Error loading ${mode} configuration: ${err.message}`;
    } finally {
      loadingConfig = false;
    }
  }
  
  async function changeFormat(format) {
    configFormat = format;
    // Reload with new format
    if (configViewMode) {
      await loadConfigView(configViewMode);
    }
  }
</script>

<div class="config-page">
  <div class="header">
    <div class="breadcrumb">
      <a href="/" use:link>Devices</a>
      <span class="separator">›</span>
      <a href="/device/{deviceId}" use:link>{device?.name || deviceId}</a>
      <span class="separator">›</span>
      <span>Configuration</span>
    </div>
  </div>

  {#if loading}
    <div class="loading">Loading device...</div>
  {:else if error}
    <div class="error">Error: {error}</div>
  {:else if device}
    <div class="config-container">
      <div class="config-header">
        <h2>Configuration: {device.name || device.id}</h2>
      </div>

      <div class="config-controls">
        <div class="control-group">
          <span class="control-label">View:</span>
          <div class="button-group">
            <button 
              class="control-btn {configViewMode === 'running' ? 'active' : ''}"
              on:click|preventDefault={() => loadConfigView('running')}
            >
              Running
            </button>
            <button 
              class="control-btn {configViewMode === 'target' ? 'active' : ''}"
              on:click|preventDefault={() => loadConfigView('target')}
            >
              Target
            </button>
          </div>
        </div>
        <div class="control-group">
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
            <button 
              class="control-btn disabled"
              disabled
              title="AData format not yet available"
            >
              AData
            </button>
          </div>
        </div>
      </div>
      
      <div class="config-content">
        {#if loadingConfig}
          <div class="config-loading">Loading configuration...</div>
        {:else if configData !== null}
          <pre class="config-display">{configData}</pre>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .config-page {
    padding: 1rem 0;
    height: 100vh;
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

  .config-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: white;
    border: 1px solid #ecf0f1;
    border-radius: 8px;
    overflow: hidden;
  }

  .config-header {
    padding: 1.5rem;
    border-bottom: 2px solid #ecf0f1;
  }

  .config-header h2 {
    margin: 0;
    color: #2c3e50;
  }

  .config-controls {
    display: flex;
    gap: 2rem;
    padding: 1rem 1.5rem;
    background: #f8f9fa;
    border-bottom: 1px solid #dee2e6;
    flex-wrap: wrap;
  }
  
  .control-group {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .control-label {
    color: #495057;
    font-weight: 500;
    min-width: 50px;
  }
  
  .button-group {
    display: flex;
    gap: 0.25rem;
    background: white;
    padding: 0.25rem;
    border-radius: 4px;
    border: 1px solid #dee2e6;
  }
  
  .control-btn {
    padding: 0.5rem 1rem;
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

  .config-content {
    flex: 1;
    overflow: auto;
    padding: 1.5rem;
  }
  
  .config-loading {
    text-align: center;
    padding: 2rem;
    color: #7f8c8d;
  }

  .config-display {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    padding: 1rem;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 0.9rem;
    color: #495057;
    margin: 0;
    white-space: pre-wrap;
    word-break: break-all;
  }
</style>