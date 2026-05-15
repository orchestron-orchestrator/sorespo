<script lang="ts">
  import { encodeListKey } from '$lib/core/restconf/client';
  import { formatPps } from '$lib/core/topology/model';
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
    <div class="preview__meta-item">
      <dt>Monitoring</dt>
      <dd>{draft.monitorTraffic ? 'Enabled' : 'Disabled'}</dd>
    </div>
    {#if draft.monitorTraffic}
      <div class="preview__meta-item">
        <dt>Link status</dt>
        <dd
          class="status"
          class:status--up={draft.linkStatus === 'up'}
          class:status--down={draft.linkStatus === 'down'}
        >● {draft.linkStatus}</dd>
      </div>
      <div class="preview__meta-item">
        <dt>Left PPS (rx on left iface)</dt>
        <dd class="mono">{formatPps(draft.leftPps)}{draft.leftPps !== null ? ' pps' : ''}</dd>
      </div>
      <div class="preview__meta-item">
        <dt>Right PPS (rx on right iface)</dt>
        <dd class="mono">{formatPps(draft.rightPps)}{draft.rightPps !== null ? ' pps' : ''}</dd>
      </div>
    {/if}
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

  .preview__meta dd.mono {
    font-family: var(--sw-font-mono);
    color: var(--sw-text-primary);
  }

  .preview__meta dd.status {
    font-family: var(--sw-font-mono);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .preview__meta dd.status--up {
    color: rgba(34, 197, 94, 0.95);
  }

  .preview__meta dd.status--down {
    color: rgba(239, 68, 68, 0.95);
  }
</style>
