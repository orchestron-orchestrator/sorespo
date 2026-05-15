<script lang="ts">
  import { formatL3VpnVpnServiceTopology } from '$lib/modules/l3vpn-vpn-service/model';

  import type { L3VpnVpnServiceDraft } from '$lib/modules/l3vpn-vpn-service/model';

  let { draft }: { draft: L3VpnVpnServiceDraft } = $props();
</script>

<div class="summary">
  {#if draft.vpnId}
    <span class="summary__pill accent">{draft.vpnId}</span>
  {/if}
  {#if draft.customerName}
    <span class="summary__pill">{draft.customerName}</span>
  {/if}
  <span class="summary__pill">{formatL3VpnVpnServiceTopology(draft.topology)}</span>
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
