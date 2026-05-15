import type { L3VpnVpnServiceDraft } from '$lib/modules/l3vpn-vpn-service/model';

export function serializeL3VpnVpnServiceDraft(draft: L3VpnVpnServiceDraft): unknown {
  const vpnService: Record<string, unknown> = {
    'vpn-id': draft.vpnId.trim()
  };

  if (draft.customerName.trim()) {
    vpnService['customer-name'] = draft.customerName.trim();
  }

  if (draft.topology !== 'any-to-any') {
    vpnService['vpn-service-topology'] = draft.topology;
  }

  return vpnService;
}
