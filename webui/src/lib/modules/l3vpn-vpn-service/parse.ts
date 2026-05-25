import { createL3VpnVpnServiceDraft } from '$lib/modules/l3vpn-vpn-service/defaults';
import { L3VPN_VPN_SERVICE_TOPOLOGIES, formatL3VpnVpnServiceTopology } from '$lib/modules/l3vpn-vpn-service/model';

import type { ServiceListItem } from '$lib/core/registry/types';
import type { L3VpnVpnServiceDraft, L3VpnVpnServiceTopology } from '$lib/modules/l3vpn-vpn-service/model';

function normalizeTopology(value: unknown): L3VpnVpnServiceTopology {
  const raw = String(value ?? '').trim();
  const normalized = raw.includes(':') ? raw.split(':').pop() ?? '' : raw;

  if (L3VPN_VPN_SERVICE_TOPOLOGIES.includes(normalized as L3VpnVpnServiceTopology)) {
    return normalized as L3VpnVpnServiceTopology;
  }

  return 'any-to-any';
}

function getVpnServiceEntry(input: any): any | null {
  if (Array.isArray(input?.['ietf-l3vpn-svc:vpn-service'])) {
    return input['ietf-l3vpn-svc:vpn-service'][0] ?? null;
  }

  if (Array.isArray(input?.['ietf-l3vpn-svc:vpn-services']?.['vpn-service'])) {
    return input['ietf-l3vpn-svc:vpn-services']['vpn-service'][0] ?? null;
  }

  if (Array.isArray(input?.['ietf-l3vpn-svc:l3vpn-svc']?.['vpn-services']?.['vpn-service'])) {
    return input['ietf-l3vpn-svc:l3vpn-svc']['vpn-services']['vpn-service'][0] ?? null;
  }

  if (Array.isArray(input?.['vpn-services']?.['vpn-service'])) {
    return input['vpn-services']['vpn-service'][0] ?? null;
  }

  if (input && typeof input === 'object' && 'vpn-id' in input) {
    return input;
  }

  return null;
}

function getVpnServices(input: any): any[] {
  const vpnServices =
    input?.['ietf-l3vpn-svc:l3vpn-svc']?.['vpn-services']?.['vpn-service'] ??
    input?.['ietf-l3vpn-svc:vpn-services']?.['vpn-service'] ??
    input?.['vpn-services']?.['vpn-service'] ??
    input?.['ietf-l3vpn-svc:vpn-service'] ??
    [];

  return Array.isArray(vpnServices) ? vpnServices : [];
}

export function parseL3VpnVpnService(input: unknown): L3VpnVpnServiceDraft {
  const defaults = createL3VpnVpnServiceDraft();
  const vpnService = getVpnServiceEntry(input);

  if (!vpnService) {
    return defaults;
  }

  return {
    vpnId: String(vpnService['vpn-id'] ?? ''),
    customerName: String(vpnService['customer-name'] ?? ''),
    topology: normalizeTopology(vpnService['vpn-service-topology'])
  };
}

export function listL3VpnVpnServices(input: unknown): ServiceListItem[] {
  return getVpnServices(input).map((vpnService) => {
    const vpnId = String(vpnService['vpn-id'] ?? '');
    const customerName = String(vpnService['customer-name'] ?? '').trim();
    const topology = formatL3VpnVpnServiceTopology(normalizeTopology(vpnService['vpn-service-topology']));

    return {
      id: vpnId,
      label: vpnId,
      description: [customerName || null, topology].filter(Boolean).join(' · ')
    };
  });
}
