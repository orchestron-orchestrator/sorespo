<script lang="ts">
  import type { GlobalSettingsDraft } from '$lib/global-settings/model';

  let { draft }: { draft: GlobalSettingsDraft } = $props();
</script>

<div class="summary">
  {#if draft.ibgpAuthenticationKey.trim()}
    <span class="summary__pill accent">iBGP key set</span>
  {:else}
    <span class="summary__pill">iBGP key unset</span>
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
