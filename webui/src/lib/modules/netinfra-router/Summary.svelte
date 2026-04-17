<script lang="ts">
  import type { NetinfraRouterDraft } from '$lib/modules/netinfra-router/model';

  export let draft: NetinfraRouterDraft;
</script>

<div class="summary">
  {#if draft.name}
    <span class="pill">{draft.name}</span>
  {/if}
  {#if draft.type}
    <span class="pill">{draft.type}</span>
  {/if}
  {#if draft.asn !== null}
    <span class="pill">AS{draft.asn}</span>
  {/if}
</div>

<style>
  .summary {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
</style>
