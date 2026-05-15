<script lang="ts">
  import { formatL3VpnSiteManagementType } from '$lib/modules/l3vpn-site/model';

  import type { L3VpnSiteDraft } from '$lib/modules/l3vpn-site/model';

  let { draft, payload }: { draft: L3VpnSiteDraft; payload: unknown } = $props();
</script>

<div class="preview">
  <dl class="preview__meta">
    <div class="preview__meta-item">
      <dt>RESTCONF path</dt>
      <dd><code>/restconf/data/ietf-l3vpn-svc:l3vpn-svc/sites/site={draft.siteId || '&lt;site-id&gt;'}</code></dd>
    </div>
    <div class="preview__meta-item">
      <dt>Management</dt>
      <dd>{formatL3VpnSiteManagementType(draft.managementType)}</dd>
    </div>
    <div class="preview__meta-item">
      <dt>Nested lists</dt>
      <dd>{draft.locations.length} locations · {draft.devices.length} devices · {draft.accesses.length} accesses</dd>
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
