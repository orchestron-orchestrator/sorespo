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
</style>
