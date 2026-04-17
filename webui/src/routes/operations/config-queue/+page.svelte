<script lang="ts">
  import { onMount } from 'svelte';

  import {
    approveConfigQueueItem,
    fetchAllDeviceQueues,
    fetchConfigQueueItem,
    type QueueItemDetail,
    type QueueItemSummary
  } from '$lib/core/orchestron/client';

  let allQueues: QueueItemSummary[] = [];
  let loading = true;
  let error = '';
  let selectedDevice: string | null = null;
  let selectedQueueIndex = 0;
  let itemDetail: QueueItemDetail | null = null;
  let approvingItem: string | null = null;
  let refreshInterval: ReturnType<typeof setInterval> | null = null;
  let diffFormat = 'xml';

  $: pendingCount = allQueues.filter((item) => item.approved !== true && item.approved !== false).length;
  $: deviceGroups = allQueues.reduce<Record<string, QueueItemSummary[]>>((groups, item) => {
    groups[item.deviceId] = [...(groups[item.deviceId] ?? []), item];
    return groups;
  }, {});
  $: deviceList = Object.entries(deviceGroups).map(([deviceId, items]) => ({
    deviceId,
    items,
    count: items.filter((item) => item.approved !== true && item.approved !== false).length
  }));
  $: selectedItem =
    selectedDevice && deviceGroups[selectedDevice]
      ? deviceGroups[selectedDevice][selectedQueueIndex] ?? null
      : null;

  onMount(() => {
    loadAllQueues();

    const handleRefresh = () => loadAllQueues();
    window.addEventListener('global-refresh', handleRefresh);

    refreshInterval = setInterval(() => {
      loadAllQueues(true);
    }, 1000);

    return () => {
      window.removeEventListener('global-refresh', handleRefresh);
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  });

  async function loadAllQueues(silent = false): Promise<void> {
    try {
      if (!silent && allQueues.length === 0) {
        loading = true;
      }

      const nextQueues = await fetchAllDeviceQueues();
      const previousSelection = selectedItem ? `${selectedItem.deviceId}:${selectedItem.queueId}` : null;
      const nextDeviceGroups = nextQueues.reduce<Record<string, QueueItemSummary[]>>((groups, item) => {
        groups[item.deviceId] = [...(groups[item.deviceId] ?? []), item];
        return groups;
      }, {});
      const nextDeviceList = Object.entries(nextDeviceGroups).map(([deviceId, items]) => ({
        deviceId,
        items,
        count: items.filter((item) => item.approved !== true && item.approved !== false).length
      }));

      allQueues = nextQueues;
      loading = false;
      error = '';

      if (nextQueues.length === 0) {
        selectedDevice = null;
        selectedQueueIndex = 0;
        itemDetail = null;
        return;
      }

      if (previousSelection) {
        const [deviceId, queueId] = previousSelection.split(':');
        const group = nextDeviceGroups[deviceId] ?? [];
        const nextIndex = group.findIndex((item) => item.queueId === queueId);
        if (nextIndex >= 0) {
          selectedDevice = deviceId;
          selectedQueueIndex = nextIndex;
          return;
        }
      }

      await selectDevice(nextDeviceList[0].deviceId, 0);
    } catch (loadError) {
      loading = false;
      error = loadError instanceof Error ? loadError.message : 'Failed to load queue.';
    }
  }

  async function selectDevice(deviceId: string, index = 0): Promise<void> {
    selectedDevice = deviceId;
    selectedQueueIndex = index;

    const item = deviceGroups[deviceId]?.[index];
    if (item) {
      await loadItemDetail(item.deviceId, item.queueId);
    } else {
      itemDetail = null;
    }
  }

  async function loadItemDetail(deviceId: string, queueId: string): Promise<void> {
    try {
      itemDetail = await fetchConfigQueueItem(deviceId, queueId, diffFormat);
    } catch (loadError) {
      error = loadError instanceof Error ? loadError.message : 'Failed to load queue item detail.';
    }
  }

  async function changeFormat(format: string): Promise<void> {
    diffFormat = format;
    if (selectedItem) {
      await loadItemDetail(selectedItem.deviceId, selectedItem.queueId);
    }
  }

  async function handleDecision(approved: boolean): Promise<void> {
    if (!selectedItem) {
      return;
    }

    try {
      approvingItem = `${selectedItem.deviceId}:${selectedItem.queueId}`;
      await approveConfigQueueItem(
        selectedItem.deviceId,
        selectedItem.queueId,
        selectedItem.deviceTxid,
        approved
      );
      await loadAllQueues();
    } catch (decisionError) {
      error = decisionError instanceof Error ? decisionError.message : 'Failed to update queue item.';
    } finally {
      approvingItem = null;
    }
  }

  async function navigateQueue(direction: 'prev' | 'next'): Promise<void> {
    if (!selectedDevice || !deviceGroups[selectedDevice]) {
      return;
    }

    const items = deviceGroups[selectedDevice];
    const nextIndex =
      direction === 'next'
        ? Math.min(selectedQueueIndex + 1, items.length - 1)
        : Math.max(selectedQueueIndex - 1, 0);

    await selectDevice(selectedDevice, nextIndex);
  }
</script>

<div class="page-header">
  <div>
    <h2>Configuration Queue</h2>
    <p>Review pending device approvals and apply or reject the first queued change per device.</p>
  </div>
  <div class="queue-meta">
    <span class:warning={pendingCount > 0} class="pill">{pendingCount} pending</span>
    <span class="pill">Auto-refresh 1s</span>
  </div>
</div>

<div class="queue-layout">
  <section class="card queue-layout__sidebar">
    {#if loading && allQueues.length === 0}
      <div class="loading-state">Loading queue...</div>
    {:else if error && allQueues.length === 0}
      <div class="error-state">{error}</div>
    {:else if allQueues.length === 0}
      <div class="empty-state">No pending approvals.</div>
    {:else}
      <div class="queue-device-list">
        {#each deviceList as device}
          <div class:selected={selectedDevice === device.deviceId} class="queue-device">
            <button type="button" on:click={() => selectDevice(device.deviceId, 0)}>
              <strong>{device.deviceId}</strong>
              <span class="pill warning">{device.count}</span>
            </button>
            {#if selectedDevice === device.deviceId}
              <div class="queue-device__items">
                {#each device.items as item, index}
                  <button
                    class:active={selectedQueueIndex === index}
                    class="queue-device__item"
                    type="button"
                    on:click={() => selectDevice(device.deviceId, index)}
                  >
                    <span>#{item.queueId}</span>
                    <small>{item.approved === true ? 'Approved' : item.approved === false ? 'Rejected' : 'Pending'}</small>
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <section class="card queue-layout__detail">
    {#if error && allQueues.length > 0}
      <div class="flash error">{error}</div>
    {/if}

    {#if selectedItem && itemDetail}
      <div class="queue-layout__detail-header">
        <div>
          <h3>{selectedItem.deviceId}</h3>
          <p>
            Queue #{selectedItem.queueId}
            {#if itemDetail.tid}
              · TID {itemDetail.tid}
            {/if}
            {#if itemDetail.device_txid}
              · Device TxID {itemDetail.device_txid}
            {/if}
          </p>
        </div>
        <div class="segmented">
          <button class:active={diffFormat === 'xml'} type="button" on:click={() => changeFormat('xml')}>XML</button>
          <button class:active={diffFormat === 'json'} type="button" on:click={() => changeFormat('json')}>JSON</button>
          <button class:active={diffFormat === 'adata'} type="button" on:click={() => changeFormat('adata')}>AData</button>
          <button class:active={diffFormat === 'gdata'} type="button" on:click={() => changeFormat('gdata')}>GData</button>
        </div>
      </div>

      <div class="queue-layout__detail-toolbar">
        <div class="queue-layout__nav">
          <button class="btn btn-secondary" type="button" disabled={selectedQueueIndex === 0} on:click={() => navigateQueue('prev')}>
            Previous
          </button>
          <button
            class="btn btn-secondary"
            type="button"
            disabled={!selectedDevice || selectedQueueIndex >= (deviceGroups[selectedDevice]?.length ?? 1) - 1}
            on:click={() => navigateQueue('next')}
          >
            Next
          </button>
        </div>
        <div class="queue-layout__actions">
          <button
            class="btn btn-danger"
            type="button"
            disabled={selectedQueueIndex !== 0 || approvingItem === `${selectedItem.deviceId}:${selectedItem.queueId}`}
            on:click={() => handleDecision(false)}
          >
            {approvingItem === `${selectedItem.deviceId}:${selectedItem.queueId}` ? 'Updating...' : 'Reject'}
          </button>
          <button
            class="btn btn-success"
            type="button"
            disabled={selectedQueueIndex !== 0 || approvingItem === `${selectedItem.deviceId}:${selectedItem.queueId}`}
            on:click={() => handleDecision(true)}
          >
            {approvingItem === `${selectedItem.deviceId}:${selectedItem.queueId}` ? 'Updating...' : 'Approve & Apply'}
          </button>
        </div>
      </div>

      {#if itemDetail.config_diff}
        <pre>{itemDetail.config_diff}</pre>
      {:else}
        <div class="empty-state">No configuration diff available for this queue item.</div>
      {/if}
    {:else}
      <div class="empty-state">Select a device queue item to review its diff.</div>
    {/if}
  </section>
</div>

<style>
  .queue-meta {
    display: flex;
    gap: 0.6rem;
    flex-wrap: wrap;
  }

  .queue-layout {
    display: grid;
    gap: 1rem;
    grid-template-columns: minmax(280px, 0.85fr) minmax(0, 1.45fr);
  }

  .queue-layout__sidebar,
  .queue-layout__detail {
    padding: 1.2rem;
  }

  .queue-device-list {
    display: grid;
    gap: 0.75rem;
  }

  .queue-device {
    padding: 0.9rem;
    border-radius: 1rem;
    border: 1px solid var(--border);
    background: var(--surface-alt);
  }

  .queue-device.selected {
    border-color: var(--brand);
    background: var(--brand-soft);
  }

  .queue-device > button {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    border: none;
    background: transparent;
    padding: 0;
    cursor: pointer;
  }

  .queue-device__items {
    display: grid;
    gap: 0.45rem;
    margin-top: 0.8rem;
  }

  .queue-device__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.7rem 0.8rem;
    border: 1px solid var(--border);
    border-radius: 0.9rem;
    background: white;
    cursor: pointer;
  }

  .queue-device__item.active {
    border-color: var(--brand);
    background: rgba(13, 90, 136, 0.08);
  }

  .queue-device__item small {
    color: var(--text-muted);
  }

  .queue-layout__detail {
    display: grid;
    gap: 1rem;
  }

  .queue-layout__detail-header,
  .queue-layout__detail-toolbar {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .queue-layout__detail-header h3,
  .queue-layout__detail-header p {
    margin: 0;
  }

  .queue-layout__detail-header p {
    margin-top: 0.35rem;
    color: var(--text-muted);
  }

  .queue-layout__nav,
  .queue-layout__actions,
  .segmented {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .segmented {
    padding: 0.3rem;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--surface-alt);
  }

  .segmented button {
    padding: 0.55rem 0.9rem;
    border: none;
    border-radius: 999px;
    background: transparent;
  }

  .segmented button.active {
    background: var(--brand);
    color: white;
  }

  pre {
    margin: 0;
    min-height: 28rem;
    overflow: auto;
    padding: 1rem;
    border-radius: 1rem;
    background: #0f2335;
    color: #dcecf9;
  }

  @media (max-width: 980px) {
    .queue-layout {
      grid-template-columns: 1fr;
    }
  }
</style>
