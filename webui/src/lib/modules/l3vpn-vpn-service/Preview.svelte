<script lang="ts">
  import { formatL3VpnVpnServiceTopology } from '$lib/modules/l3vpn-vpn-service/model';

  import type { L3VpnVpnServiceDraft } from '$lib/modules/l3vpn-vpn-service/model';

  let { draft, payload }: { draft: L3VpnVpnServiceDraft; payload: unknown } = $props();
</script>

<div class="preview">
  <dl class="preview__meta">
    <div class="preview__meta-item">
      <dt>RESTCONF path</dt>
      <dd><code>/restconf/data/ietf-l3vpn-svc:l3vpn-svc/vpn-services/vpn-service={draft.vpnId || '&lt;vpn-id&gt;'}</code></dd>
    </div>
    <div class="preview__meta-item">
      <dt>Topology</dt>
      <dd>{formatL3VpnVpnServiceTopology(draft.topology)}</dd>
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
