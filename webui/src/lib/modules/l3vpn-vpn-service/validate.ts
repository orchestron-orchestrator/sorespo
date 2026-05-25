import { L3VPN_VPN_SERVICE_TOPOLOGIES } from '$lib/modules/l3vpn-vpn-service/model';

import type { ValidationResult } from '$lib/core/validation/types';
import type { L3VpnVpnServiceDraft } from '$lib/modules/l3vpn-vpn-service/model';

export function validateL3VpnVpnServiceDraft(draft: L3VpnVpnServiceDraft): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];

  if (!draft.vpnId.trim()) {
    errors.vpnId = 'VPN ID is required.';
  }

  if (!L3VPN_VPN_SERVICE_TOPOLOGIES.includes(draft.topology)) {
    errors.topology = 'Select a valid VPN topology.';
  }

  if (!draft.customerName.trim()) {
    warnings.push('Customer name is optional in the YANG model, but leaving it empty makes the service harder to identify.');
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    warnings
  };
}
