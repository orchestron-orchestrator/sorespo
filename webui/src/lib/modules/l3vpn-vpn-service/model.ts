export const L3VPN_VPN_SERVICE_TOPOLOGIES = ['any-to-any', 'hub-spoke', 'hub-spoke-disjoint'] as const;

export type L3VpnVpnServiceTopology = (typeof L3VPN_VPN_SERVICE_TOPOLOGIES)[number];

export interface L3VpnVpnServiceDraft {
  vpnId: string;
  customerName: string;
  topology: L3VpnVpnServiceTopology;
}

export const L3VPN_VPN_SERVICE_TOPOLOGY_OPTIONS = [
  { value: 'any-to-any', label: 'Any to any' },
  { value: 'hub-spoke', label: 'Hub and spoke' },
  { value: 'hub-spoke-disjoint', label: 'Hub and spoke (disjoint hubs)' }
];

export function formatL3VpnVpnServiceTopology(value: string): string {
  switch (value) {
    case 'hub-spoke':
      return 'Hub and spoke';
    case 'hub-spoke-disjoint':
      return 'Hub and spoke (disjoint hubs)';
    case 'any-to-any':
    default:
      return 'Any to any';
  }
}
