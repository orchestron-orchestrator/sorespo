<script lang="ts">
  import { onMount } from 'svelte';

  import {
    approveConfigQueueItem,
    fetchConfigQueueItem,
    isPendingQueueItem,
    type QueueItemDetail,
    type QueueItemSummary
  } from '$lib/core/orchestron/client';
  import { queuesPoll, refreshQueues, type QueuesPollValue } from '$lib/core/orchestron/poll-store';
  import XmlDiff from '$lib/core/diff/XmlDiff.svelte';
  import SegmentedControl from '$lib/core/ui/SegmentedControl.svelte';
  import { onGlobalRefresh } from '$lib/core/util/global-refresh';
  import { LatestRequest } from '$lib/core/util/latest-request';

  let allQueues: QueueItemSummary[] = $state([]);
  let loading = $state(true);
  let error = $state('');
  let selectedDevice: string | null = $state(null);
  let selectedQueueIndex = $state(0);
  let itemDetail: QueueItemDetail | null = $state(null);
  let approvingItem: string | null = $state(null);
  let diffFormat = $state('xml');

  let pendingCount = $derived(allQueues.filter(isPendingQueueItem).length);
  let deviceGroups = $derived(
    allQueues.reduce<Record<string, QueueItemSummary[]>>((groups, item) => {
      groups[item.deviceId] = [...(groups[item.deviceId] ?? []), item];
      return groups;
    }, {})
  );
  let deviceList = $derived(
    Object.entries(deviceGroups).map(([deviceId, items]) => ({
      deviceId,
      items,
      count: items.filter(isPendingQueueItem).length
    }))
  );
  let selectedItem = $derived(
    selectedDevice && deviceGroups[selectedDevice]
      ? deviceGroups[selectedDevice][selectedQueueIndex] ?? null
      : null
  );

  onMount(() => {
    const unsubscribePoll = queuesPoll.subscribe((value) => {
      if (!value.loaded && !value.error) return;
      applyPoll(value);
    });

    const offRefresh = onGlobalRefresh(() => {
      void refreshQueues();
    });

    return () => {
      unsubscribePoll();
      offRefresh();
    };
  });

  function applyPoll(value: QueuesPollValue): void {
    const previous = selectedItem
      ? { deviceId: selectedItem.deviceId, queueId: selectedItem.queueId }
      : null;

    allQueues = value.queues;
    loading = false;
    error = value.error ?? '';

    if (value.queues.length === 0) {
      selectedDevice = null;
      selectedQueueIndex = 0;
      itemDetail = null;
      return;
    }

    if (previous) {
      const deviceItems = value.queues.filter((item) => item.deviceId === previous.deviceId);
      const nextIndex = deviceItems.findIndex((item) => item.queueId === previous.queueId);
      if (nextIndex >= 0) {
        selectedDevice = previous.deviceId;
        selectedQueueIndex = nextIndex;
        return;
      }

      // The selected item was consumed (approved/rejected); stay on the same
      // device's queue and advance to its new head rather than jumping to an
      // unrelated device's diff.
      if (deviceItems.length > 0) {
        selectedDevice = previous.deviceId;
        selectedQueueIndex = 0;
        void loadItemDetail(previous.deviceId, deviceItems[0].queueId);
        return;
      }
    }

    const firstDeviceId = value.queues[0].deviceId;
    const firstItem = value.queues.find((item) => item.deviceId === firstDeviceId)!;
    selectedDevice = firstDeviceId;
    selectedQueueIndex = 0;
    void loadItemDetail(firstDeviceId, firstItem.queueId);
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

  const detailRequest = new LatestRequest();

  async function loadItemDetail(deviceId: string, queueId: string): Promise<void> {
    const token = detailRequest.begin();
    itemDetail = null;
    try {
      const detail = await fetchConfigQueueItem(deviceId, queueId, diffFormat);
      if (!detailRequest.isCurrent(token)) return;
      itemDetail = detail;
    } catch (loadError) {
      if (!detailRequest.isCurrent(token)) return;
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
      await refreshQueues();
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
  <section class="card queue-layout__sidebar" data-tour="queue-list">
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
            <button type="button" onclick={() => selectDevice(device.deviceId, 0)}>
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
                    onclick={() => selectDevice(device.deviceId, index)}
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

  <section class="card queue-layout__detail" data-tour="queue-detail">
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
        <SegmentedControl
          ariaLabel="Diff format"
          options={[
            { value: 'xml', label: 'XML' },
            { value: 'json', label: 'JSON' },
            { value: 'adata', label: 'AData' },
            { value: 'gdata', label: 'GData' }
          ]}
          value={diffFormat}
          onchange={(format) => changeFormat(format)}
        />
      </div>

      <div class="queue-layout__detail-toolbar">
        <div class="queue-layout__nav">
          <button class="btn btn-secondary" type="button" disabled={selectedQueueIndex === 0} onclick={() => navigateQueue('prev')}>
            Previous
          </button>
          <button
            class="btn btn-secondary"
            type="button"
            disabled={!selectedDevice || selectedQueueIndex >= (deviceGroups[selectedDevice]?.length ?? 1) - 1}
            onclick={() => navigateQueue('next')}
          >
            Next
          </button>
        </div>
        <div class="queue-layout__actions" data-tour="queue-actions">
          <button
            class="btn btn-danger"
            type="button"
            disabled={selectedQueueIndex !== 0 || approvingItem === `${selectedItem.deviceId}:${selectedItem.queueId}`}
            title={selectedQueueIndex !== 0 ? 'Only the first queued change per device can be approved or rejected.' : undefined}
            onclick={() => handleDecision(false)}
          >
            {approvingItem === `${selectedItem.deviceId}:${selectedItem.queueId}` ? 'Updating...' : 'Reject'}
          </button>
          <button
            class="btn btn-success"
            type="button"
            disabled={selectedQueueIndex !== 0 || approvingItem === `${selectedItem.deviceId}:${selectedItem.queueId}`}
            title={selectedQueueIndex !== 0 ? 'Only the first queued change per device can be approved or rejected.' : undefined}
            onclick={() => handleDecision(true)}
          >
            {approvingItem === `${selectedItem.deviceId}:${selectedItem.queueId}` ? 'Updating...' : 'Approve & Apply'}
          </button>
        </div>
      </div>

      {#if itemDetail.config_diff}
        <XmlDiff diff={itemDetail.config_diff} format={diffFormat} minHeight="28rem" />
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
    border: 1px solid var(--sw-border-subtle);
    border-radius: var(--sw-radius-md);
    background: var(--sw-bg-card);
    cursor: pointer;
    color: var(--sw-text-primary);
  }

  .queue-device__item.active {
    border-color: var(--sw-accent-dim);
    background: var(--sw-accent-glow);
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
  .queue-layout__actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  @media (max-width: 980px) {
    .queue-layout {
      grid-template-columns: 1fr;
    }
  }
</style>
