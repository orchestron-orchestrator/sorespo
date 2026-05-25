<script lang="ts">
  import { formatPps } from '$lib/core/topology/model';
  import { formatNetinfraBackboneLinkEndpoints } from '$lib/modules/netinfra-backbone-link/model';

  import type { NetinfraBackboneLinkDraft } from '$lib/modules/netinfra-backbone-link/model';

  let { draft }: { draft: NetinfraBackboneLinkDraft } = $props();
</script>

<div class="summary">
  <span class="summary__pill">{formatNetinfraBackboneLinkEndpoints(draft)}</span>
  {#if draft.monitorTraffic}
    <span class="summary__pill accent">Monitoring on</span>
    <span
      class="summary__pill status"
      class:status--up={draft.linkStatus === 'up'}
      class:status--down={draft.linkStatus === 'down'}
      title="Combined link oper-status (AND of both endpoints)"
    >● {draft.linkStatus}</span>
    <span class="summary__pill mono" title="Receive PPS on left interface">→ {formatPps(draft.leftPps)} pps</span>
    <span class="summary__pill mono" title="Receive PPS on right interface">← {formatPps(draft.rightPps)} pps</span>
  {/if}
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

  .summary__pill.mono {
    font-family: var(--sw-font-mono);
    color: var(--sw-text-primary);
  }

  .summary__pill.status {
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--sw-text-muted);
  }

  .summary__pill.status--up {
    color: rgba(34, 197, 94, 0.95);
    background: rgba(34, 197, 94, 0.12);
  }

  .summary__pill.status--down {
    color: rgba(239, 68, 68, 0.95);
    background: rgba(239, 68, 68, 0.12);
  }
</style>
