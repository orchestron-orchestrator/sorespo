<script lang="ts">
  import { onMount } from 'svelte';

  import { fetchLayerConfig } from '$lib/core/orchestron/client';
  import ConfigViewerCard from '$lib/core/ui/ConfigViewerCard.svelte';
  import SegmentedControl from '$lib/core/ui/SegmentedControl.svelte';
  import { LatestRequest } from '$lib/core/util/latest-request';

  const LAYER_OPTIONS = [
    { value: 0, label: '0 · CFS' },
    { value: 1, label: '1 · Inter' },
    { value: 2, label: '2 · RFS' },
    { value: 3, label: '3 · Device' }
  ];
  const FORMAT_OPTIONS = [
    { value: 'xml', label: 'XML' },
    { value: 'json', label: 'JSON' },
    { value: 'adata', label: 'AData' }
  ];

  let selectedLayer = $state(0);
  let configFormat = $state('xml');
  let configData = $state('');
  let loading = $state(false);

  const layerRequest = new LatestRequest();

  onMount(() => {
    loadLayer(0);
  });

  async function loadLayer(index: number): Promise<void> {
    const token = layerRequest.begin();
    try {
      loading = true;
      selectedLayer = index;
      configData = '';
      const result = await fetchLayerConfig(index, configFormat);
      if (!layerRequest.isCurrent(token)) return;
      configData = result;
    } catch (loadError) {
      if (!layerRequest.isCurrent(token)) return;
      configData = `# Error loading layer ${index} configuration: ${
        loadError instanceof Error ? loadError.message : 'Unknown failure'
      }`;
    } finally {
      if (layerRequest.isCurrent(token)) {
        loading = false;
      }
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

<div data-tour="layer-viewer">
  <ConfigViewerCard loading={loading} content={configData}>
    {#snippet controls()}
      <SegmentedControl
        label="Layer"
        options={LAYER_OPTIONS}
        value={selectedLayer}
        onchange={(index) => loadLayer(index)}
      />
      <SegmentedControl
        label="Format"
        options={FORMAT_OPTIONS}
        value={configFormat}
        onchange={(format) => changeFormat(format)}
      />
    {/snippet}
  </ConfigViewerCard>
</div>
