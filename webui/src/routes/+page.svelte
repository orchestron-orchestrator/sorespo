<script lang="ts">
  import { onMount } from 'svelte';

  import { listServiceModuleMeta } from '$lib/core/registry/service-modules';
  import { fetchDevices, type DeviceSummary } from '$lib/core/orchestron/client';
  import TopologyMap from '$lib/core/topology/TopologyMap.svelte';
  import { buildTopologyGraph } from '$lib/core/topology/model';
  import { restconfGetJson } from '$lib/core/restconf/client';

  import type { L3VpnSitesPayload, NetinfraPayload, TopologyGraph } from '$lib/core/topology/model';

  const modules = listServiceModuleMeta();

  let devices: DeviceSummary[] = $state([]);
  let loadingDevices = $state(true);
  let loadError = $state('');
  let topologyGraph: TopologyGraph | null = $state(null);
  let loadingTopology = $state(true);
  let topologyError = $state('');
  let topologyNote = $state('');

  let totalServices = $derived(modules.length);
  let totalDevices = $derived(devices.length);

  function configDotColor(device: DeviceSummary): string {
    return device.hasRunningConfig === false ? 'var(--sw-danger)' : 'var(--sw-success)';
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

      if (sitesResult.status !== 'fulfilled') {
        topologyNote = sitesResult.reason instanceof Error
          ? `L3VPN overlay unavailable: ${sitesResult.reason.message}`
          : 'L3VPN overlay unavailable.';
      }
    } finally {
      loadingTopology = false;
    }
  }

  const TOPOLOGY_REFRESH_MS = 5000;

  onMount(() => {
    loadDevices();
    loadTopology();

    const handleRefresh = () => {
      loadDevices();
      loadTopology();
    };
    window.addEventListener('global-refresh', handleRefresh);

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
      window.removeEventListener('global-refresh', handleRefresh);
      document.removeEventListener('visibilitychange', handleVisibility);
      stopTopologyRefresh();
    };
  });
</script>

<div class="overview">
  <div class="page-header">
    <div>
      <h2>Overview</h2>
      <p>Landing page for current devices and service configuration entry points.</p>
    </div>
  </div>

  <section class="overview__stats">
    <article class="card stat-card">
      <div class="card-body stat-card__body">
        <span class="stat-card__label">Devices</span>
        <strong class="stat-card__value">{loadingDevices ? '...' : totalDevices}</strong>
        <a class="btn btn-secondary btn-sm" href="/devices">Open devices</a>
      </div>
    </article>

    <article class="card stat-card">
      <div class="card-body stat-card__body">
        <span class="stat-card__label">Service Modules</span>
        <strong class="stat-card__value">{totalServices}</strong>
        <a class="btn btn-secondary btn-sm" href="/services">Open services</a>
      </div>
    </article>
  </section>

  <section class="overview__section">
    <div class="section-head">
      <div>
        <h3>Network Topology</h3>
        <p>Live map derived from `netinfra` and L3VPN site bearer references exposed by the API.</p>
      </div>
    </div>

    {#if loadingTopology}
      <div class="loading-state">Loading topology...</div>
    {:else if topologyError}
      <div class="error-state">{topologyError}</div>
    {:else if topologyGraph && topologyGraph.routers.length === 0}
      <div class="empty-state">No routers were returned by the topology API.</div>
    {:else if topologyGraph}
      <TopologyMap graph={topologyGraph} note={topologyNote} />
    {/if}
  </section>

  <section class="overview__section">
    <div class="section-head">
      <div>
        <h3>Devices</h3>
        <p>Current discovered devices from otron.</p>
      </div>
      <a class="btn btn-secondary btn-sm" href="/devices">View all devices</a>
    </div>

    {#if loadingDevices}
      <div class="loading-state">Loading devices...</div>
    {:else if loadError}
      <div class="error-state">{loadError}</div>
    {:else if devices.length === 0}
      <div class="empty-state">No devices were returned by the backend.</div>
    {:else}
      <div class="device-grid">
        {#each devices as device}
          <a class="device-card card" href={`/devices/${device.id}`}>
            <div class="device-card__header">
              <h4>{device.name}</h4>
              <span class="pill">
                <span class="dot" style={`background: ${configDotColor(device)};`}></span>
                Device
              </span>
            </div>
            <p class="device-card__id">{device.id}</p>
          </a>
        {/each}
      </div>
    {/if}
  </section>

  <section class="overview__section">
    <div class="section-head">
      <div>
        <h3>Services</h3>
        <p>Direct entry points for service configuration modules.</p>
      </div>
      <a class="btn btn-secondary btn-sm" href="/services">View all services</a>
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
              <a class="btn btn-primary" href={`/services/${module.id}/new`}>Create new</a>
              <a class="btn btn-secondary" href={`/services/${module.id}`}>Browse existing</a>
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

  .overview__stats {
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stat-card__body {
    display: grid;
    gap: 10px;
  }

  .stat-card__label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--sw-text-muted);
    font-weight: 600;
  }

  .stat-card__value {
    font-size: 2rem;
    line-height: 1;
    letter-spacing: -0.04em;
    color: var(--sw-text-primary);
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

  .device-grid {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  }

  .device-card {
    display: grid;
    gap: 10px;
    padding: 20px;
    text-decoration: none;
    transition: border-color 0.2s, transform 0.2s;
  }

  .device-card:hover {
    transform: translateY(-2px);
    border-color: var(--sw-accent-dim);
  }

  .device-card__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .device-card__header h4 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
  }

  .device-card__id {
    margin: 0;
    font-family: var(--sw-font-mono);
    font-size: 12px;
    color: var(--sw-accent);
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
    .overview__stats {
      grid-template-columns: 1fr;
    }

    .section-head {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
