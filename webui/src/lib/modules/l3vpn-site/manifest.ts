import Editor from '$lib/modules/l3vpn-site/Editor.svelte';
import Preview from '$lib/modules/l3vpn-site/Preview.svelte';
import StatePanel from '$lib/modules/l3vpn-site/StatePanel.svelte';
import Summary from '$lib/modules/l3vpn-site/Summary.svelte';
import { createL3VpnSiteDraft } from '$lib/modules/l3vpn-site/defaults';
import { listL3VpnSites, parseL3VpnSite } from '$lib/modules/l3vpn-site/parse';
import { serializeL3VpnSiteDraft } from '$lib/modules/l3vpn-site/serialize';
import { validateL3VpnSiteDraft } from '$lib/modules/l3vpn-site/validate';

import type { ServiceModule } from '$lib/core/registry/types';
import type { L3VpnSiteDraft } from '$lib/modules/l3vpn-site/model';

export const module: ServiceModule<L3VpnSiteDraft> = {
  id: 'l3vpn-site',
  title: 'L3VPN Site',
  collectionLabel: 'Sites',
  description: 'Create and edit `ietf-l3vpn-svc:site` entries, including locations, devices, accesses, and routing details.',
  deletable: true,
  collectionRestconfRoot: 'data/ietf-l3vpn-svc:l3vpn-svc/sites',
  restconfRoot: 'data/ietf-l3vpn-svc:l3vpn-svc/sites/site',
  keyParam: 'siteId',
  createDraft: createL3VpnSiteDraft,
  parse: parseL3VpnSite,
  list: listL3VpnSites,
  validate: validateL3VpnSiteDraft,
  serialize: serializeL3VpnSiteDraft,
  Editor,
  Summary,
  Preview,
  StatePanel
};
