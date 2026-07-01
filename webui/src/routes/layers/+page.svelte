<script lang="ts">
  import { onMount } from 'svelte';

  import { fetchLayerConfig } from '$lib/core/orchestron/client';

  const LAYERS = [
    { index: 0, label: 'CFS' },
    { index: 1, label: 'Inter' },
    { index: 2, label: 'RFS' },
    { index: 3, label: 'Device' }
  ];

  let selectedLayer = $state(0);
  let configFormat = $state('xml');
  let configData = $state('');
  let loading = $state(false);

  onMount(() => {
    loadLayer(0);
  });

  async function loadLayer(index: number): Promise<void> {
    try {
      loading = true;
      selectedLayer = index;
      configData = '';
      configData = await fetchLayerConfig(index, configFormat);
    } catch (loadError) {
      configData = `# Error loading layer ${index} configuration: ${
        loadError instanceof Error ? loadError.message : 'Unknown failure'
      }`;
    } finally {
      loading = false;
    }
  }

  async function changeFormat(format: string): Promise<void> {
    configFormat = format;
    await loadLayer(selectedLayer);
  }
</script>

<div class="page-header">
  <div>
    <h2>Layer Configuration</h2>
    <p>Inspect the rendered system configuration at each transformation layer (CFS → Device) in XML, JSON, or AData form.</p>
  </div>
</div>

<div class="card config-page">
  <div class="config-page__header">
    <div class="config-page__controls">
      <div class="config-page__control-group">
        <span>Layer</span>
        <div class="segmented">
          {#each LAYERS as layer}
            <button
              class:active={selectedLayer === layer.index}
              type="button"
              onclick={() => loadLayer(layer.index)}
            >{layer.index} · {layer.label}</button>
          {/each}
        </div>
      </div>

      <div class="config-page__control-group">
        <span>Format</span>
        <div class="segmented">
          <button class:active={configFormat === 'xml'} type="button" onclick={() => changeFormat('xml')}>XML</button>
          <button class:active={configFormat === 'json'} type="button" onclick={() => changeFormat('json')}>JSON</button>
          <button class:active={configFormat === 'adata'} type="button" onclick={() => changeFormat('adata')}>AData</button>
        </div>
      </div>
    </div>
  </div>

  <div class="config-page__content">
    {#if loading}
      <div class="loading-state">Loading configuration...</div>
    {:else}
      <pre>{configData}</pre>
    {/if}
  </div>
</div>

<style>
  .config-page {
    display: grid;
    gap: 1.25rem;
    padding: 1.5rem;
  }

  .config-page__header {
    display: grid;
    gap: 1rem;
  }

  .config-page__controls {
    display: flex;
    gap: 1.25rem;
    flex-wrap: wrap;
  }

  .config-page__control-group {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    flex-wrap: wrap;
  }

  .config-page__control-group > span {
    color: var(--text-muted);
    font-weight: 600;
  }

  .segmented {
    display: flex;
    gap: 2px;
    padding: 3px;
    border-radius: var(--sw-radius-md);
    background: var(--sw-bg-deep);
  }

  .segmented button {
    padding: 7px 14px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--sw-text-secondary);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .segmented button:hover {
    color: var(--sw-text-primary);
  }

  .segmented button.active {
    background: var(--sw-bg-elevated);
    color: var(--sw-accent);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  }

  .config-page__content pre {
    margin: 0;
    padding: 1rem;
    min-height: 26rem;
    overflow: auto;
    border-radius: var(--sw-radius-md);
    background: var(--sw-bg-deep);
    border: 1px solid var(--sw-border-subtle);
    color: var(--sw-text-secondary);
  }
</style>
