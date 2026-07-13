<script lang="ts">
  import { browser } from '$app/environment';

  import {
    fetchDeviceRunningConfig,
    fetchDeviceTargetConfig,
    type DeviceInfo
  } from '$lib/core/orchestron/client';
  import ConfigViewerCard from '$lib/core/ui/ConfigViewerCard.svelte';
  import SegmentedControl from '$lib/core/ui/SegmentedControl.svelte';
  import { LatestRequest } from '$lib/core/util/latest-request';

  let { data }: { data: { deviceId: string; device: DeviceInfo | null; loadError: string } } = $props();

  const VIEW_OPTIONS: { value: 'running' | 'target'; label: string }[] = [
    { value: 'running', label: 'Running' },
    { value: 'target', label: 'Target' }
  ];
  const FORMAT_OPTIONS = [
    { value: 'json', label: 'JSON' },
    { value: 'xml', label: 'XML' },
    { value: 'gdata', label: 'GData' },
    { value: 'adata', label: 'AData' }
  ];

  let lastLoadedId = $state('');

  let configViewMode: 'running' | 'target' = $state('running');
  let configFormat = $state('xml');
  let configData = $state('');
  let loadingConfig = $state(false);

  let device = $derived(data.device);
  let deviceId = $derived(data.deviceId);
  let error = $derived(data.loadError);

  const configRequest = new LatestRequest();

  $effect(() => {
    if (browser && deviceId && deviceId !== lastLoadedId) {
      lastLoadedId = deviceId;
      loadConfigView('running');
    }
  });

  async function loadConfigView(mode: 'running' | 'target'): Promise<void> {
    const token = configRequest.begin();
    try {
      loadingConfig = true;
      configViewMode = mode;
      configData = '';

      const fetcher = mode === 'running' ? fetchDeviceRunningConfig : fetchDeviceTargetConfig;
      const result = await fetcher(data.deviceId, configFormat);
      if (!configRequest.isCurrent(token)) return;
      configData = result;
    } catch (loadError) {
      if (!configRequest.isCurrent(token)) return;
      configData = `# Error loading ${mode} configuration: ${
        loadError instanceof Error ? loadError.message : 'Unknown failure'
      }`;
    } finally {
      if (configRequest.isCurrent(token)) {
        loadingConfig = false;
      }
    }
  }

  async function changeFormat(format: string): Promise<void> {
    configFormat = format;
    await loadConfigView(configViewMode);
  }
</script>

<div class="page-header">
  <div>
    <h2>Device Configuration</h2>
    <p>Inspect the running or target configuration in JSON, XML, GData, or AData form.</p>
  </div>
</div>

{#if error}
  <div class="error-state">{error}</div>
{:else if device}
  <ConfigViewerCard title={device.name || device.id} loading={loadingConfig} content={configData}>
    {#snippet controls()}
      <SegmentedControl
        label="View"
        options={VIEW_OPTIONS}
        value={configViewMode}
        onchange={(mode) => loadConfigView(mode)}
      />
      <SegmentedControl
        label="Format"
        options={FORMAT_OPTIONS}
        value={configFormat}
        onchange={(format) => changeFormat(format)}
      />
    {/snippet}
  </ConfigViewerCard>
{/if}
