<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';

  import {
    approveConfigQueueItem,
    fetchConfigQueueItem,
    fetchDevice,
    fetchDeviceConfigQueue,
    resyncDevice,
    type DeviceInfo,
    type QueueItemDetail
  } from '$lib/core/orchestron/client';

  export let data: { deviceId: string };

  let deviceId = data.deviceId;
  let lastLoadedId = '';

  let device: DeviceInfo | null = null;
  let configQueue: Record<string, { approved?: boolean }> = {};
  let selectedQueueItem: string | null = null;
  let queueItemDetail: QueueItemDetail | null = null;
  let loading = true;
  let error = '';
  let resyncing = false;
  let message: { type: 'success' | 'error'; text: string } | null = null;
  let loadingQueue = false;
  let approvingItem: string | null = null;

  $: deviceId = data.deviceId;
  $: if (browser && deviceId && deviceId !== lastLoadedId) {
    lastLoadedId = deviceId;
    loadDevice();
  }

  onMount(() => {
    const handleRefresh = () => loadDevice();
    window.addEventListener('global-refresh', handleRefresh);

    return () => {
      window.removeEventListener('global-refresh', handleRefresh);
    };
  });

  async function loadDevice(): Promise<void> {
    try {
      loading = true;
      error = '';
      message = null;
      device = await fetchDevice(deviceId);
      await loadConfigQueue();
    } catch (loadError) {
      error = loadError instanceof Error ? loadError.message : 'Failed to load device.';
    } finally {
      loading = false;
    }
  }

  async function loadConfigQueue(): Promise<void> {
    try {
      loadingQueue = true;
      configQueue = await fetchDeviceConfigQueue(deviceId);

      if (selectedQueueItem && !configQueue[selectedQueueItem]) {
        selectedQueueItem = null;
        queueItemDetail = null;
      }
    } catch (loadError) {
      console.error('Failed to load config queue:', loadError);
      configQueue = {};
    } finally {
      loadingQueue = false;
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
      await loadDevice();
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
      <a class="back-link" href="/devices">← Back to Devices</a>
      <h2>Device Detail</h2>
      <p>Inspect device metadata, queue state, and supported YANG modules.</p>
    </div>
  </div>

  {#if loading}
    <div class="loading-state">Loading device details...</div>
  {:else if error}
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

      <div class="device-detail__actions">
        <button class="btn btn-primary" type="button" disabled={resyncing} on:click={handleResync}>
          {resyncing ? 'Resyncing...' : 'Resync'}
        </button>
        <a class="btn btn-secondary" href={`/devices/${deviceId}/config`}>View Configuration</a>
        <a class="btn btn-secondary" href={`/devices/${deviceId}/log`}>Configuration Log</a>
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

      <section class="panel">
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
              {#each Object.entries(configQueue) as [queueId, item]}
                <div class:selected={selectedQueueItem === queueId} class="queue-card">
                  <div class="queue-card__header">
                    <strong>Queue #{queueId}</strong>
                    <span class:success={item.approved === true} class:warning={item.approved !== true} class="pill">
                      {item.approved === true ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                  <div class="queue-card__actions">
                    <button class="btn btn-secondary" type="button" on:click={() => viewQueueItem(queueId)}>
                      View details
                    </button>
                    {#if item.approved !== true}
                      <button
                        class="btn btn-success"
                        type="button"
                        disabled={approvingItem === queueId}
                        on:click={() => handleApproveItem(queueId)}
                      >
                        {approvingItem === queueId ? 'Approving...' : 'Approve'}
                      </button>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>

            <div class="queue-layout__detail panel">
              {#if selectedQueueItem && queueItemDetail}
                <h5>Queue Item {selectedQueueItem}</h5>
                <p class="device-detail__muted">
                  Status: {queueItemDetail.approved === true ? 'Approved' : 'Pending Approval'}
                </p>
                {#if queueItemDetail.config_diff}
                  <pre>{queueItemDetail.config_diff}</pre>
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

      <section class="panel">
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

  .queue-layout__detail pre {
    margin: 0;
    padding: 1rem;
    overflow: auto;
    border-radius: 1rem;
    background: #0f2335;
    color: #dcecf9;
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
