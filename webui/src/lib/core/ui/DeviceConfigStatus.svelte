<script lang="ts">
  let { hasRunningConfig }: { hasRunningConfig?: boolean } = $props();

  let label = $derived(
    hasRunningConfig === true ? 'Configured' : hasRunningConfig === false ? 'No config' : 'Unknown'
  );
</script>

<span class="config-status">
  <span
    class="config-status__dot"
    class:configured={hasRunningConfig === true}
    class:missing={hasRunningConfig === false}
    aria-hidden="true"
  ></span>
  {label}
</span>

<style>
  .config-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--sw-text-secondary);
    font-size: 12px;
    white-space: nowrap;
  }

  .config-status__dot {
    width: 6px;
    height: 6px;
    flex-shrink: 0;
    border-radius: 50%;
    background: var(--sw-text-muted);
  }

  .config-status__dot.configured {
    background: var(--sw-success);
  }

  .config-status__dot.missing {
    background: var(--sw-danger);
  }
</style>
