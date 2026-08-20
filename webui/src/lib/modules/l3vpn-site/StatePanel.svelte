<script lang="ts">
  import type { L3VpnSiteDraft } from '$lib/modules/l3vpn-site/model';

  let { draft }: { draft: L3VpnSiteDraft } = $props();

  // eBGP session detail: a separate box above the editor, rendered only while the
  // per-neighbor telemetry has escalated (debug-active), surfacing every BGP field
  // the CFS layer lifts up for the affected site-network-access.
  const escalated = $derived(draft.accesses.filter((access) => access.bgpDebugActive));
</script>

{#each escalated as access}
  <section class="bgp-state" data-tour="site-monitoring">
    <header class="bgp-state__header">
      <span class="bgp-state__title">eBGP session · {access.siteNetworkAccessId}</span>
      <span class="bgp-state__badge">⚠ debug escalated</span>
    </header>
    <dl class="bgp-state__grid">
      <div class="bgp-state__item">
        <dt>Session state</dt>
        <dd>
          <span class="session" class:session--up={access.bgpSessionState === 'established'} class:session--down={access.bgpSessionState !== 'established'}>
            ● {access.bgpSessionState ?? '—'}
          </span>
        </dd>
      </div>
      <div class="bgp-state__item">
        <dt>Established transitions</dt>
        <dd>{access.bgpEstablishedTransitions ?? '—'}</dd>
      </div>
      <div class="bgp-state__item">
        <dt>Last event</dt>
        <dd>{access.bgpLastEvent ?? '—'}</dd>
      </div>
      <div class="bgp-state__item">
        <dt>Negotiated hold time</dt>
        <dd>{access.bgpNegotiatedHoldTime !== null ? `${access.bgpNegotiatedHoldTime} s` : '—'}</dd>
      </div>
      <div class="bgp-state__item">
        <dt>Last notification</dt>
        <dd>{access.bgpLastNotification ?? '—'}</dd>
      </div>
    </dl>
  </section>
{/each}

<style>
  .bgp-state {
    display: grid;
    gap: 12px;
    padding: 14px 16px;
    border: 1px solid rgba(245, 158, 11, 0.35);
    border-radius: 10px;
    background: rgba(245, 158, 11, 0.07);
  }

  .bgp-state__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .bgp-state__title {
    font-size: 13px;
    font-weight: 600;
    color: var(--sw-text-primary);
  }

  .bgp-state__badge {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    color: rgba(245, 158, 11, 0.95);
    background: rgba(245, 158, 11, 0.14);
  }

  .bgp-state__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
    margin: 0;
  }

  .bgp-state__item {
    display: grid;
    gap: 2px;
  }

  .bgp-state__item dt {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--sw-text-muted);
  }

  .bgp-state__item dd {
    margin: 0;
    font-size: 13px;
    color: var(--sw-text-secondary);
  }

  .session {
    font-family: var(--sw-font-mono);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: rgba(34, 197, 94, 0.95);
  }

  .session--up {
    color: rgba(34, 197, 94, 0.95);
  }

  .session--down {
    color: rgba(239, 68, 68, 0.95);
  }
</style>
