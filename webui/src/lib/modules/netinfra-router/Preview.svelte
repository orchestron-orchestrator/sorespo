<script lang="ts">
  import type { NetinfraRouterDraft } from '$lib/modules/netinfra-router/model';

  export let draft: NetinfraRouterDraft;
  export let payload: unknown;
</script>

<div class="preview">
  <div class="preview__meta">
    <div>
      <strong>RESTCONF path</strong>
      <span class="monospace">/restconf/data/netinfra:netinfra/router={draft.name || '<name>'}</span>
    </div>
    <div>
      <strong>Collection</strong>
      <span>{draft.type || 'Unassigned platform'}</span>
    </div>
  </div>
  <pre>{JSON.stringify(payload, null, 2)}</pre>
</div>

<style>
  .preview {
    display: grid;
    gap: 1rem;
  }

  .preview__meta {
    display: grid;
    gap: 0.75rem;
  }

  .preview__meta div {
    display: grid;
    gap: 0.2rem;
  }

  .preview__meta span {
    color: var(--text-muted);
  }

  pre {
    margin: 0;
    padding: 1rem;
    overflow: auto;
    border-radius: 1rem;
    background: #0f2335;
    color: #dcecf9;
    font-size: 0.88rem;
    line-height: 1.55;
  }
</style>
