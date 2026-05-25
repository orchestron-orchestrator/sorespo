<script lang="ts">
  import type { Component } from 'svelte';

  import { diffPayloads } from '$lib/core/diff/payload-diff';
  import DiffView from '$lib/core/workspace/DiffView.svelte';

  interface Props {
    draft: unknown;
    payload: unknown;
    originalPayload?: unknown;
    Preview?: Component<{ draft: unknown; payload: unknown }> | null;
  }

  let { draft, payload, originalPayload = undefined, Preview = null }: Props = $props();

  let diffEntries = $derived(
    originalPayload === undefined ? [] : diffPayloads(originalPayload, payload)
  );
</script>

<section class="preview-panel card">
  <div class="card-header">
    <h4 style="margin:0; font-size:14px; font-weight:600;">Preview</h4>
    <span class="card-badge" style="margin-left:auto;">RESTCONF payload</span>
  </div>

  <div class="card-body">
    {#if diffEntries.length > 0}
      <div class="preview-panel__section">
        <div class="preview-panel__section-header">
          <h5>Changes</h5>
          <span class="preview-panel__count">{diffEntries.length}</span>
        </div>
        <DiffView entries={diffEntries} />
      </div>
    {/if}

    {#if Preview}
      <Preview {draft} {payload} />
    {:else}
      <pre>{JSON.stringify(payload, null, 2)}</pre>
    {/if}
  </div>
</section>

<style>
  .preview-panel__section {
    display: grid;
    gap: 8px;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--sw-border-subtle);
  }

  .preview-panel__section-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .preview-panel__section-header h5 {
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--sw-text-muted);
  }

  .preview-panel__count {
    font-family: var(--sw-font-mono);
    font-size: 11px;
    color: var(--sw-text-muted);
    background: var(--sw-bg-deep);
    padding: 1px 8px;
    border-radius: 999px;
  }
</style>
