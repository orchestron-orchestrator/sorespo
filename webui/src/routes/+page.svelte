<script lang="ts">
  import { onMount } from 'svelte';

  import { listServiceModuleMeta } from '$lib/core/registry/service-modules';
  import { fetchDevices, type DeviceSummary } from '$lib/core/orchestron/client';
  import OtnTopologyMap from '$lib/core/topology/OtnTopologyMap.svelte';
  import TopologyMap from '$lib/core/topology/TopologyMap.svelte';
  import { buildTopologyGraph } from '$lib/core/topology/model';
  import { buildOtnGraph } from '$lib/core/topology/otn-model';
  import { restconfGetJson } from '$lib/core/restconf/client';
  import { onGlobalRefresh } from '$lib/core/util/global-refresh';
  import { appHref } from '$lib/core/util/nav';

  import type { L3VpnSitesPayload, NetinfraPayload, TopologyGraph } from '$lib/core/topology/model';
  import type { OtnGraph } from '$lib/core/topology/otn-model';

  const modules = listServiceModuleMeta();
  const topologyViews = ['l3vpn', 'otn'] as const;
  type TopologyView = (typeof topologyViews)[number];

  let devices: DeviceSummary[] = $state([]);
  let loadingDevices = $state(true);
  let loadError = $state('');
  let topologyGraph: TopologyGraph | null = $state(null);
  let otnGraph: OtnGraph | null = $state(null);
  let loadingTopology = $state(true);
  let topologyError = $state('');
  let topologyNote = $state('');
  let topologyView: TopologyView = $state('l3vpn');

  function selectTopologyView(view: TopologyView, focus = false): void {
    topologyView = view;
    if (focus) {
      queueMicrotask(() => document.getElementById(`topology-tab-${view}`)?.focus());
    }
  }

  function handleTopologyTabKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }
    event.preventDefault();
    const currentIndex = topologyViews.indexOf(topologyView);
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (currentIndex + direction + topologyViews.length) % topologyViews.length;
    selectTopologyView(topologyViews[nextIndex], true);
  }

  function configDotColor(device: DeviceSummary): string {
    return device.hasRunningConfig === false ? 'var(--sw-danger)' : 'var(--sw-success)';
  }

  function configStatusLabel(device: DeviceSummary): string {
    return device.hasRunningConfig === false ? 'No config' : 'Configured';
  }

  async function loadDevices(): Promise<void> {
    try {
      loadingDevices = true;
      loadError = '';
      devices = await fetchDevices();
    } catch (error) {
      loadError = error instanceof Error ? error.message : 'Failed to load devices.';
      devices = [];
    } finally {
      loadingDevices = false;
    }
  }

  async function loadTopology(): Promise<void> {
    const isInitialLoad = topologyGraph === null;
    try {
      if (isInitialLoad) {
        loadingTopology = true;
      }
      topologyNote = '';

      const [netinfraResult, sitesResult] = await Promise.allSettled([
        restconfGetJson<NetinfraPayload>('data/netinfra:netinfra'),
        restconfGetJson<L3VpnSitesPayload>('data/ietf-l3vpn-svc:l3vpn-svc/sites')
      ]);

      if (netinfraResult.status !== 'fulfilled') {
        const message = netinfraResult.reason instanceof Error
          ? netinfraResult.reason.message
          : 'Failed to load netinfra topology.';
        if (isInitialLoad) {
          topologyGraph = null;
          topologyError = message;
        } else {
          topologyNote = `Refresh failed: ${message}`;
        }
        return;
      }

      topologyError = '';
      topologyGraph = buildTopologyGraph(
        netinfraResult.value,
        sitesResult.status === 'fulfilled' ? sitesResult.value : null
      );
      otnGraph = buildOtnGraph(netinfraResult.value);

      if (sitesResult.status !== 'fulfilled') {
        topologyNote = sitesResult.reason instanceof Error
          ? `L3VPN overlay unavailable: ${sitesResult.reason.message}`
          : 'L3VPN overlay unavailable.';
      }
    } finally {
      loadingTopology = false;
    }
  }

  const TOPOLOGY_REFRESH_MS = 2000;

  onMount(() => {
    loadDevices();
    loadTopology();

    const offRefresh = onGlobalRefresh(() => {
      loadDevices();
      loadTopology();
    });

    let refreshTimer: ReturnType<typeof setInterval> | null = null;
    const startTopologyRefresh = () => {
      if (refreshTimer !== null) {
        return;
      }
      refreshTimer = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
          return;
        }
        loadTopology();
      }, TOPOLOGY_REFRESH_MS);
    };
    const stopTopologyRefresh = () => {
      if (refreshTimer !== null) {
        clearInterval(refreshTimer);
        refreshTimer = null;
      }
    };
    startTopologyRefresh();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadTopology();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      offRefresh();
      document.removeEventListener('visibilitychange', handleVisibility);
      stopTopologyRefresh();
    };
  });
</script>

<div class="overview">
  <div class="page-header">
    <div>
      <h2>Overview</h2>
    </div>
  </div>

  <section class="overview__section" data-tour="topology">
    <div class="section-head">
      <div>
        <h3>Topology</h3>
      </div>
      <div class="topology-tabs" role="tablist" aria-label="Topology view">
        <button
          id="topology-tab-l3vpn"
          type="button"
          role="tab"
          aria-selected={topologyView === 'l3vpn'}
          aria-controls="topology-panel-l3vpn"
          tabindex={topologyView === 'l3vpn' ? 0 : -1}
          class:active={topologyView === 'l3vpn'}
          onclick={() => selectTopologyView('l3vpn')}
          onkeydown={handleTopologyTabKeydown}
        >L3VPN</button>
        <button
          id="topology-tab-otn"
          type="button"
          role="tab"
          aria-selected={topologyView === 'otn'}
          aria-controls="topology-panel-otn"
          tabindex={topologyView === 'otn' ? 0 : -1}
          class:active={topologyView === 'otn'}
          onclick={() => selectTopologyView('otn')}
          onkeydown={handleTopologyTabKeydown}
        >OTN</button>
      </div>
    </div>

    {#if loadingTopology}
      <div class="loading-state">Loading topology...</div>
    {:else if topologyError}
      <div class="error-state">{topologyError}</div>
    {:else if topologyView === 'l3vpn'}
      <div id="topology-panel-l3vpn" role="tabpanel" aria-labelledby="topology-tab-l3vpn">
        {#if topologyGraph && topologyGraph.routers.length === 0}
          <div class="empty-state">No routers were returned by the topology API.</div>
        {:else if topologyGraph}
          <TopologyMap graph={topologyGraph} note={topologyNote} />
        {/if}
      </div>
    {:else}
      <div id="topology-panel-otn" role="tabpanel" aria-labelledby="topology-tab-otn">
        {#if otnGraph && otnGraph.roadms.length === 0}
          <div class="empty-state">No ROADMs were returned by the topology API.</div>
        {:else if otnGraph}
          <OtnTopologyMap graph={otnGraph} />
        {/if}
      </div>
    {/if}
  </section>

  <section class="overview__section" data-tour="devices-table">
    <div class="section-head">
      <div>
        <h3>Devices</h3>
        <p>Current managed devices</p>
      </div>
      <a class="btn btn-secondary btn-sm" href={appHref('/devices')}>View all devices</a>
    </div>

    {#if loadingDevices}
      <div class="loading-state">Loading devices...</div>
    {:else if loadError}
      <div class="error-state">{loadError}</div>
    {:else if devices.length === 0}
      <div class="empty-state">No devices were returned by the backend.</div>
    {:else}
      <div class="card device-table">
        <div class="card-body no-pad">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Address</th>
                <th>User</th>
                <th>Queue</th>
                <th>Pending</th>
                <th>Approval</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {#each devices as device}
                <tr>
                  <td><a class="device-table__name" href={appHref(`/devices/${encodeURIComponent(device.id)}`)}>{device.name}</a></td>
                  <td>{device.type ?? '—'}</td>
                  <td class="monospace">{device.address ?? '—'}</td>
                  <td>{device.username ?? '—'}</td>
                  <td>{device.queueLength ?? 0}</td>
                  <td>{device.pendingApprovals ?? 0}</td>
                  <td>
                    {#if device.approvalRequired}
                      <span class="pill warning"><span class="dot"></span>Required</span>
                    {:else}
                      <span class="device-table__muted">Auto</span>
                    {/if}
                  </td>
                  <td>
                    <span class="pill">
                      <span class="dot" style={`background: ${configDotColor(device)};`}></span>
                      {configStatusLabel(device)}
                    </span>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
  </section>

  <section class="overview__section" data-tour="service-cards">
    <div class="section-head">
      <div>
        <h3>Services</h3>
        <p>Direct entry points for service configuration modules.</p>
      </div>
      <a class="btn btn-secondary btn-sm" href={appHref('/services')}>View all services</a>
    </div>

    <div class="service-grid">
      {#each modules as module}
        <article class="service-card card">
          <div class="card-header">
            <h4>{module.title}</h4>
            <span class="card-badge" style="margin-left:auto;">{module.collectionLabel}</span>
          </div>

          <div class="card-body">
            <p class="service-card__desc">{module.description}</p>

            <div class="service-card__actions">
              <a class="btn btn-primary" href={appHref(`/services/${module.id}/new`)}>Create new</a>
              <a class="btn btn-secondary" href={appHref(`/services/${module.id}`)}>Browse existing</a>
            </div>
          </div>
        </article>
      {/each}
    </div>
  </section>
</div>

<style>
  .overview {
    display: grid;
    gap: 20px;
  }

  .overview :global(.page-header) {
    margin-bottom: 0;
  }

  .overview__section {
    display: grid;
    gap: 16px;
  }

  .section-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  .section-head h3 {
    margin: 0;
    font-size: 1rem;
  }

  .section-head p {
    margin: 0.25rem 0 0;
    color: var(--sw-text-secondary);
    font-size: 13px;
  }

  .topology-tabs {
    display: flex;
    gap: 2px;
    padding: 3px;
    border-radius: var(--sw-radius-md);
    background: var(--sw-bg-deep);
  }

  .topology-tabs button {
    min-width: 78px;
    padding: 7px 14px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--sw-text-secondary);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .topology-tabs button:hover {
    color: var(--sw-text-primary);
  }

  .topology-tabs button:focus-visible {
    outline: 2px solid var(--sw-border-focus);
    outline-offset: 1px;
  }

  .topology-tabs button.active {
    background: var(--sw-bg-elevated);
    color: var(--sw-accent);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  }

  .device-table {
    overflow: hidden;
  }

  .device-table__name {
    color: var(--sw-text-primary);
    font-weight: 600;
    text-decoration: none;
  }

  .device-table__name:hover {
    color: var(--sw-accent);
  }

  .device-table__muted {
    color: var(--sw-text-muted);
    font-size: 12px;
  }

  .service-grid {
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  }

  .service-card__desc {
    margin: 0 0 16px;
    font-size: 13px;
    color: var(--sw-text-secondary);
    line-height: 1.5;
  }

  .service-card__actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  @media (max-width: 720px) {
    .section-head {
      flex-direction: column;
      align-items: stretch;
    }

    .device-table .card-body {
      overflow-x: auto;
    }
  }
</style>
