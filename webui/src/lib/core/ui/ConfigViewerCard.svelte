<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    title,
    controls,
    loading,
    content
  }: {
    title?: string;
    controls: Snippet;
    loading: boolean;
    content: string;
  } = $props();
</script>

<div class="card config-page">
  <div class="config-page__header">
    {#if title}
      <h3>{title}</h3>
    {/if}
    <div class="config-page__controls">
      {@render controls()}
    </div>
  </div>

  <div class="config-page__content">
    {#if loading}
      <div class="loading-state">Loading configuration...</div>
    {:else}
      <pre>{content}</pre>
    {/if}
  </div>
</div>

<style>
  .config-page {
    display: grid;
    gap: 1.25rem;
    padding: 1.5rem;
  }

  .config-page__header {
    display: grid;
    gap: 1rem;
  }

  .config-page__header h3 {
    margin: 0;
  }

  .config-page__controls {
    display: flex;
    gap: 1.25rem;
    flex-wrap: wrap;
  }

  .config-page__content pre {
    margin: 0;
    padding: 1rem;
    min-height: 26rem;
    overflow: auto;
    border-radius: var(--sw-radius-md);
    background: var(--sw-bg-deep);
    border: 1px solid var(--sw-border-subtle);
    color: var(--sw-text-secondary);
  }
</style>
