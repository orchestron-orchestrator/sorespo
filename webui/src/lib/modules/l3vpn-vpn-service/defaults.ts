import type { L3VpnVpnServiceDraft } from '$lib/modules/l3vpn-vpn-service/model';

export function createL3VpnVpnServiceDraft(): L3VpnVpnServiceDraft {
  return {
    vpnId: '',
    customerName: '',
    topology: 'any-to-any'
  };
}
