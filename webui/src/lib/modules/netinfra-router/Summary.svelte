<script lang="ts">
  import type { NetinfraRouterDraft } from '$lib/modules/netinfra-router/model';

  let { draft }: { draft: NetinfraRouterDraft } = $props();
</script>

<div class="summary">
  {#if draft.name}
    <span class="summary__pill">{draft.name}</span>
  {/if}
  {#if draft.type}
    <span class="summary__pill">{draft.type}</span>
  {/if}
  {#if draft.asn !== null}
    <span class="summary__pill accent">AS{draft.asn}</span>
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
</style>
