<script lang="ts">
  import { encodeListKey } from '$lib/core/restconf/client';
  import { formatNetinfraBackboneLinkEndpoints } from '$lib/modules/netinfra-backbone-link/model';

  import type { NetinfraBackboneLinkDraft } from '$lib/modules/netinfra-backbone-link/model';

  let { draft, payload }: { draft: NetinfraBackboneLinkDraft; payload: unknown } = $props();

  let pathKey = $derived(
    encodeListKey([
      draft.leftRouter || '<left-router>',
      draft.leftInterface || '<left-interface>',
      draft.rightRouter || '<right-router>',
      draft.rightInterface || '<right-interface>'
    ])
  );
</script>

<div class="preview">
  <dl class="preview__meta">
    <div class="preview__meta-item">
      <dt>RESTCONF path</dt>
      <dd><code>/restconf/data/netinfra:netinfra/backbone-link={pathKey}</code></dd>
    </div>
    <div class="preview__meta-item">
      <dt>Endpoints</dt>
      <dd>{formatNetinfraBackboneLinkEndpoints(draft)}</dd>
    </div>
  </dl>
  <pre>{JSON.stringify(payload, null, 2)}</pre>
</div>

<style>
  .preview {
    display: grid;
    gap: 16px;
  }

  .preview__meta {
    display: grid;
    gap: 12px;
    margin: 0;
  }

  .preview__meta-item {
    display: grid;
    gap: 2px;
  }

  .preview__meta dt {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--sw-text-muted);
  }

  .preview__meta dd {
    margin: 0;
    font-size: 13px;
    color: var(--sw-text-secondary);
  }
</style>
