<script lang="ts">
  import { browser } from '$app/environment';
  import { invalidate } from '$app/navigation';
  import { onMount } from 'svelte';

  import {
    approveConfigQueueItem,
    fetchConfigQueueItem,
    fetchDeviceConfigQueue,
    resyncDevice,
    type DeviceInfo,
    type QueueItemDetail
  } from '$lib/core/orchestron/client';
  import XmlDiff from '$lib/core/diff/XmlDiff.svelte';
  import { onGlobalRefresh } from '$lib/core/util/global-refresh';
  import { appHref } from '$lib/core/util/nav';

  let {
    data
  }: { data: { deviceId: string; device: DeviceInfo | null; loadError: string } } = $props();

  let lastLoadedId = $state('');

  let configQueue: Record<string, { tid?: string }> = $state({});
  let selectedQueueItem: string | null = $state(null);
  let queueItemDetail: QueueItemDetail | null = $state(null);
  let resyncing = $state(false);
  let message: { type: 'success' | 'error'; text: string } | null = $state(null);
  let loadingQueue = $state(false);
  let approvingItem: string | null = $state(null);

  let device = $derived(data.device);
  let deviceId = $derived(data.deviceId);
  let error = $derived(data.loadError);

  $effect(() => {
    if (browser && deviceId && deviceId !== lastLoadedId) {
      lastLoadedId = deviceId;
      loadConfigQueue(deviceId);
    }
  });

  onMount(() =>
    onGlobalRefresh(() => {
      invalidate(`data:device:${data.deviceId}`);
      loadConfigQueue();
    })
  );

  async function loadConfigQueue(requestId = data.deviceId): Promise<void> {
    try {
      loadingQueue = true;
      const queue = await fetchDeviceConfigQueue(requestId);
      if (requestId !== data.deviceId) return;
      configQueue = queue;

      if (selectedQueueItem && !configQueue[selectedQueueItem]) {
        selectedQueueItem = null;
        queueItemDetail = null;
      }
    } catch (loadError) {
      if (requestId !== data.deviceId) return;
      console.error('Failed to load config queue:', loadError);
      configQueue = {};
    } finally {
      if (requestId === data.deviceId) {
        loadingQueue = false;
      }
    }
  }

  async function viewQueueItem(queueId: string): Promise<void> {
    try {
      selectedQueueItem = queueId;
      queueItemDetail = await fetchConfigQueueItem(deviceId, queueId);
    } catch (loadError) {
      message = {
        type: 'error',
        text: loadError instanceof Error ? loadError.message : 'Failed to load queue item.'
      };
    }
  }

  async function handleApproveItem(queueId: string): Promise<void> {
    try {
      approvingItem = queueId;
      const detail =
        selectedQueueItem === queueId && queueItemDetail
          ? queueItemDetail
          : await fetchConfigQueueItem(deviceId, queueId);

      await approveConfigQueueItem(deviceId, queueId, detail.device_txid, true);
      message = { type: 'success', text: `Queue item ${queueId} approved and pushed to device.` };

      if (selectedQueueItem === queueId) {
        selectedQueueItem = null;
        queueItemDetail = null;
      }

      await loadConfigQueue();
    } catch (approveError) {
      message = {
        type: 'error',
        text: approveError instanceof Error ? approveError.message : 'Failed to approve queue item.'
      };
    } finally {
      approvingItem = null;
    }
  }

  async function handleResync(): Promise<void> {
    try {
      resyncing = true;
      message = null;
      await resyncDevice(deviceId);
      message = { type: 'success', text: 'Device resynced successfully.' };
      await invalidate(`data:device:${data.deviceId}`);
      await loadConfigQueue();
    } catch (resyncError) {
      message = {
        type: 'error',
        text: resyncError instanceof Error ? resyncError.message : 'Failed to resync device.'
      };
    } finally {
      resyncing = false;
    }
  }
</script>

<div class="device-detail">
  <div class="page-header">
    <div>
      <a class="back-link" href={appHref('/devices')}>← Back to Devices</a>
      <h2>Device Detail</h2>
      <p>Inspect device metadata, queue state, and supported YANG modules.</p>
    </div>
  </div>

  {#if error}
    <div class="error-state">{error}</div>
  {:else if device}
    <div class="card device-detail__content">
      <div class="device-detail__header">
        <div>
          <h3>{device.name || device.id}</h3>
          <p class="monospace">{device.id}</p>
        </div>
        {#if device.approvalRequired}
          <span class="pill warning">Approval Required</span>
        {/if}
      </div>

      {#if message}
        <div class="flash {message.type}">{message.text}</div>
      {/if}

      <div class="device-detail__actions" data-tour="device-actions">
        <button class="btn btn-primary" type="button" disabled={resyncing} onclick={handleResync}>
          {resyncing ? 'Resyncing...' : 'Resync'}
        </button>
        <a class="btn btn-secondary" href={appHref(`/devices/${deviceId}/config`)}>View Configuration</a>
        <a class="btn btn-secondary" href={appHref(`/devices/${deviceId}/log`)}>Configuration Log</a>
        <a class="btn btn-secondary" href={appHref(`/devices/${deviceId}/terminal`)}>Terminal</a>
      </div>

      <div class="device-detail__grid">
        <section class="panel">
          <h4>Device Information</h4>
          <dl class="meta-list">
            <div>
              <dt>ID</dt>
              <dd class="monospace">{device.id}</dd>
            </div>
            <div>
              <dt>Device Type</dt>
              <dd>{device.type || 'Unknown'}</dd>
            </div>
            {#if device.username}
              <div>
                <dt>Username</dt>
                <dd>{device.username}</dd>
              </div>
            {/if}
            <div>
              <dt>Approval Required</dt>
              <dd>{device.approvalRequired ? 'Yes' : 'No'}</dd>
            </div>
            {#if device.addresses?.length}
              <div>
                <dt>Addresses</dt>
                <dd>
                  {#each device.addresses as address}
                    <div>{address.name}: {address.address}:{address.port}</div>
                  {/each}
                </dd>
              </div>
            {/if}
          </dl>
        </section>

        <section class="panel">
          <h4>Device Status</h4>
          <dl class="meta-list">
            <div>
              <dt>Has Running Config</dt>
              <dd>{device.hasRunningConfig ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt>Has Target Config</dt>
              <dd>{device.hasTargetConfig ? 'Yes' : 'No'}</dd>
            </div>
            {#if device.queueLength}
              <div>
                <dt>Queue Length</dt>
                <dd>{device.queueLength}</dd>
              </div>
            {/if}
            {#if device.pendingApprovals}
              <div>
                <dt>Pending Approvals</dt>
                <dd>{device.pendingApprovals}</dd>
              </div>
            {/if}
          </dl>
        </section>

        <section class="panel">
          <h4>Feature Flags</h4>
          {#if device.featureFlags && Object.keys(device.featureFlags).length > 0}
            <dl class="meta-list">
              {#each Object.entries(device.featureFlags) as [flag, enabled]}
                <div>
                  <dt>{flag.replace(/_/g, ' ')}</dt>
                  <dd>{enabled ? 'Enabled' : 'Disabled'}</dd>
                </div>
              {/each}
            </dl>
          {:else}
            <p class="device-detail__muted">No feature flags configured.</p>
          {/if}
        </section>
      </div>

      <section class="panel" data-tour="device-queue">
        <div class="device-detail__section-header">
          <h4>Configuration Queue</h4>
          <span class="pill">{Object.keys(configQueue).length} item{Object.keys(configQueue).length === 1 ? '' : 's'}</span>
        </div>

        {#if loadingQueue}
          <div class="loading-state">Loading queue...</div>
        {:else if Object.keys(configQueue).length === 0}
          <div class="empty-state">No items in this device queue.</div>
        {:else}
          <div class="queue-layout">
            <div class="queue-layout__list">
              {#each Object.entries(configQueue) as [queueId, item], index}
                <div class:selected={selectedQueueItem === queueId} class="queue-card">
                  <div class="queue-card__header">
                    <strong>Queue #{queueId}</strong>
                    {#if item.tid}
                      <span class="pill monospace" title="Transaction ID">{item.tid}</span>
                    {/if}
                  </div>
                  <div class="queue-card__actions">
                    <button class="btn btn-secondary" type="button" onclick={() => viewQueueItem(queueId)}>
                      View details
                    </button>
                    <button
                      class="btn btn-success"
                      type="button"
                      disabled={index !== 0 || approvingItem === queueId}
                      title={index !== 0 ? 'Only the first queued change per device can be approved.' : undefined}
                      onclick={() => handleApproveItem(queueId)}
                    >
                      {approvingItem === queueId ? 'Approving...' : 'Approve'}
                    </button>
                  </div>
                </div>
              {/each}
            </div>

            <div class="queue-layout__detail panel">
              {#if selectedQueueItem && queueItemDetail}
                <h5>Queue Item {selectedQueueItem}</h5>
                <p class="device-detail__muted">
                  Status: {queueItemDetail.approved === true
                    ? 'Approved'
                    : queueItemDetail.approved === false
                      ? 'Rejected'
                      : 'Pending approval'}
                </p>
                {#if queueItemDetail.config_diff}
                  <XmlDiff diff={queueItemDetail.config_diff} />
                {:else}
                  <p class="device-detail__muted">No configuration diff available for this item.</p>
                {/if}
              {:else}
                <div class="empty-state">Select a queue item to inspect its diff.</div>
              {/if}
            </div>
          </div>
        {/if}
      </section>

      <section class="panel" data-tour="device-modules">
        <div class="device-detail__section-header">
          <h4>YANG Modules</h4>
          <span class="pill">{device.modules?.length ?? 0} module{device.modules?.length === 1 ? '' : 's'}</span>
        </div>

        {#if device.modules?.length}
          <div class="module-table-wrap">
            <table class="module-table">
              <thead>
                <tr>
                  <th>Module Name</th>
                  <th>Namespace</th>
                  <th>Revision</th>
                  <th>Features</th>
                </tr>
              </thead>
              <tbody>
                {#each device.modules as moduleInfo}
                  <tr>
                    <td class="monospace">{moduleInfo.name}</td>
                    <td title={moduleInfo.namespace}>{moduleInfo.namespace}</td>
                    <td>{moduleInfo.revision || '-'}</td>
                    <td>{moduleInfo.features?.length ? `${moduleInfo.features.length} feature(s)` : '-'}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {:else}
          <div class="empty-state">No YANG modules reported by the device.</div>
        {/if}
      </section>
    </div>
  {/if}
</div>

<style>
  .back-link {
    display: inline-block;
    margin-bottom: 0.75rem;
    color: var(--brand);
    text-decoration: none;
  }

  .device-detail {
    display: grid;
    gap: 1rem;
  }

  .device-detail__content {
    display: grid;
    gap: 1.5rem;
    padding: 1.5rem;
  }

  .device-detail__header {
    display: flex;
    gap: 1rem;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border);
  }

  .device-detail__header h3,
  .device-detail__header p {
    margin: 0;
  }

  .device-detail__header p {
    margin-top: 0.25rem;
    color: var(--text-muted);
  }

  .device-detail__actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .device-detail__grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  }

  .device-detail__grid h4,
  .queue-layout__detail h5 {
    margin: 0 0 1rem;
  }

  .device-detail__muted {
    margin: 0;
    color: var(--text-muted);
  }

  .device-detail__section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .device-detail__section-header h4 {
    margin: 0;
  }

  .queue-layout {
    display: grid;
    gap: 1rem;
    grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.25fr);
  }

  .queue-layout__list {
    display: grid;
    gap: 0.8rem;
  }

  .queue-card {
    padding: 1rem;
    border: 1px solid var(--border);
    border-radius: 1rem;
    background: var(--surface-alt);
  }

  .queue-card.selected {
    border-color: var(--brand);
    background: var(--brand-soft);
  }

  .queue-card__header,
  .queue-card__actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .queue-card__actions {
    margin-top: 0.8rem;
    flex-wrap: wrap;
  }

  .queue-layout__detail {
    min-height: 18rem;
  }

  .module-table-wrap {
    overflow: auto;
  }

  .module-table {
    width: 100%;
    border-collapse: collapse;
  }

  .module-table th,
  .module-table td {
    padding: 0.9rem 0.8rem;
    border-bottom: 1px solid var(--border);
    text-align: left;
    vertical-align: top;
  }

  .module-table th {
    color: var(--text-muted);
    font-weight: 700;
    font-size: 0.92rem;
  }

  @media (max-width: 960px) {
    .queue-layout {
      grid-template-columns: 1fr;
    }
  }
</style>
