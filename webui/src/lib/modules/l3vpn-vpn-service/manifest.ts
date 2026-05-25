import Editor from '$lib/modules/l3vpn-vpn-service/Editor.svelte';
import Preview from '$lib/modules/l3vpn-vpn-service/Preview.svelte';
import Summary from '$lib/modules/l3vpn-vpn-service/Summary.svelte';
import { createL3VpnVpnServiceDraft } from '$lib/modules/l3vpn-vpn-service/defaults';
import { listL3VpnVpnServices, parseL3VpnVpnService } from '$lib/modules/l3vpn-vpn-service/parse';
import { serializeL3VpnVpnServiceDraft } from '$lib/modules/l3vpn-vpn-service/serialize';
import { validateL3VpnVpnServiceDraft } from '$lib/modules/l3vpn-vpn-service/validate';

import type { ServiceModule } from '$lib/core/registry/types';
import type { L3VpnVpnServiceDraft } from '$lib/modules/l3vpn-vpn-service/model';

export const module: ServiceModule<L3VpnVpnServiceDraft> = {
  id: 'l3vpn-vpn-service',
  title: 'L3VPN VPN Service',
  collectionLabel: 'VPN services',
  description: 'Create and edit `ietf-l3vpn-svc:vpn-service` list entries through the shared service workspace.',
  deletable: true,
  collectionRestconfRoot: 'data/ietf-l3vpn-svc:l3vpn-svc/vpn-services',
  restconfRoot: 'data/ietf-l3vpn-svc:l3vpn-svc/vpn-services/vpn-service',
  keyParam: 'vpnId',
  createDraft: createL3VpnVpnServiceDraft,
  parse: parseL3VpnVpnService,
  list: listL3VpnVpnServices,
  validate: validateL3VpnVpnServiceDraft,
  serialize: serializeL3VpnVpnServiceDraft,
  Editor,
  Summary,
  Preview
};
