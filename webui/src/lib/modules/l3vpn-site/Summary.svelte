<script lang="ts">
  import { formatL3VpnSiteManagementType } from '$lib/modules/l3vpn-site/model';

  import type { L3VpnSiteDraft } from '$lib/modules/l3vpn-site/model';

  let { draft }: { draft: L3VpnSiteDraft } = $props();
</script>

<div class="summary">
  {#if draft.siteId}
    <span class="summary__pill accent">{draft.siteId}</span>
  {/if}
  <span class="summary__pill">{formatL3VpnSiteManagementType(draft.managementType)}</span>
  <span class="summary__pill">{draft.locations.length} location{draft.locations.length === 1 ? '' : 's'}</span>
  <span class="summary__pill">{draft.accesses.length} access{draft.accesses.length === 1 ? '' : 'es'}</span>
  {#each draft.accesses as access}
    {#if access.bgpSessionState !== null}
      <span
        class="summary__pill session"
        class:session--up={access.bgpSessionState === 'established'}
        class:session--down={access.bgpSessionState !== 'established'}
        title="eBGP session for {access.siteNetworkAccessId}"
      >● BGP {access.bgpSessionState}</span>
    {/if}
    {#if access.bgpDebugActive}
      <span class="summary__pill diag" title="Telemetry escalated — session down or flapping">⚠ debug</span>
    {/if}
  {/each}
</div>

<style>
  .summary {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .summary__pill {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: 20px;
    background: var(--sw-bg-elevated);
    color: var(--sw-text-secondary);
    font-size: 11px;
    font-weight: 500;
  }

  .summary__pill.accent {
    background: var(--sw-accent-glow);
    color: var(--sw-accent);
    font-family: var(--sw-font-mono);
  }

  .summary__pill.session {
    font-family: var(--sw-font-mono);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .summary__pill.session--up {
    color: rgba(34, 197, 94, 0.95);
    background: rgba(34, 197, 94, 0.12);
  }

  .summary__pill.session--down {
    color: rgba(239, 68, 68, 0.95);
    background: rgba(239, 68, 68, 0.12);
  }

  .summary__pill.diag {
    color: rgba(245, 158, 11, 0.95);
    background: rgba(245, 158, 11, 0.12);
  }
</style>
