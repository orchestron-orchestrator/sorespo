export const L3VPN_SITE_MANAGEMENT_TYPES = ['customer-managed', 'provider-managed', 'co-managed'] as const;
export const L3VPN_SITE_ACCESS_TYPES = ['point-to-point', 'multipoint'] as const;
export const L3VPN_SITE_ADDRESS_FAMILIES = ['ipv4', 'ipv6'] as const;
export const L3VPN_SITE_ROUTING_PROTOCOL_TYPES = ['bgp', 'ospf', 'static', 'rip', 'vrrp', 'direct'] as const;

export type L3VpnSiteManagementType = (typeof L3VPN_SITE_MANAGEMENT_TYPES)[number];
export type L3VpnSiteAccessType = (typeof L3VPN_SITE_ACCESS_TYPES)[number];
export type L3VpnSiteAddressFamily = (typeof L3VPN_SITE_ADDRESS_FAMILIES)[number];
export type L3VpnSiteRoutingProtocolType = (typeof L3VPN_SITE_ROUTING_PROTOCOL_TYPES)[number];

export interface L3VpnSiteLocationDraft {
  locationId: string;
  address: string;
  postalCode: string;
  state: string;
  city: string;
  countryCode: string;
}

export interface L3VpnSiteDeviceDraft {
  deviceId: string;
  location: string;
  managementAddressFamily: L3VpnSiteAddressFamily | '';
  managementAddress: string;
}

export interface L3VpnSiteLanPrefixDraft {
  lan: string;
  lanTag: string;
  nextHop: string;
}

export interface L3VpnSiteRoutingProtocolDraft {
  type: L3VpnSiteRoutingProtocolType;
  addressFamilies: L3VpnSiteAddressFamily[];
  bgpAutonomousSystem: number | null;
  bgpAuthenticationKey: string;
  ospfAreaAddress: string;
  ospfMetric: number | null;
  staticIpv4LanPrefixes: L3VpnSiteLanPrefixDraft[];
  staticIpv6LanPrefixes: L3VpnSiteLanPrefixDraft[];
}

export interface L3VpnSiteAccessDraft {
  siteNetworkAccessId: string;
  siteNetworkAccessType: L3VpnSiteAccessType;
  locationReference: string;
  deviceReference: string;
  inputBandwidth: string;
  outputBandwidth: string;
  mtu: number | null;
  vpnId: string;
  providerAddress: string;
  customerAddress: string;
  prefixLength: number | null;
  bearerReference: string;
  routingProtocols: L3VpnSiteRoutingProtocolDraft[];
  /** Read-only eBGP session telemetry, lifted from the RFS ebgp-customer state. Not serialized. */
  bgpSessionState: string | null;
  /** True while the per-neighbor telemetry has escalated (session down or flapping). Not serialized. */
  bgpDebugActive: boolean | null;
  bgpEstablishedTransitions: number | null;
  bgpLastEvent: string | null;
  /** Escalated detail, only populated while debug-active. Not serialized. */
  bgpNegotiatedHoldTime: number | null;
  bgpLastNotification: string | null;
}

export interface L3VpnSiteDraft {
  siteId: string;
  managementType: L3VpnSiteManagementType;
  locations: L3VpnSiteLocationDraft[];
  devices: L3VpnSiteDeviceDraft[];
  accesses: L3VpnSiteAccessDraft[];
}

export function formatL3VpnSiteManagementType(value: string): string {
  switch (value) {
    case 'provider-managed':
      return 'Provider managed';
    case 'co-managed':
      return 'Co-managed';
    case 'customer-managed':
    default:
      return 'Customer managed';
  }
}

export function formatL3VpnSiteAccessType(value: string): string {
  switch (value) {
    case 'multipoint':
      return 'Multipoint';
    case 'point-to-point':
    default:
      return 'Point to point';
  }
}

export function formatL3VpnSiteRoutingProtocolType(value: string): string {
  switch (value) {
    case 'ospf':
      return 'OSPF';
    case 'static':
      return 'Static';
    case 'rip':
      return 'RIP';
    case 'vrrp':
      return 'VRRP';
    case 'direct':
      return 'Direct';
    case 'bgp':
    default:
      return 'BGP';
  }
}

export function formatL3VpnSiteAddressFamily(value: string): string {
  return value === 'ipv6' ? 'IPv6' : 'IPv4';
}

export const L3VPN_SITE_MANAGEMENT_OPTIONS = L3VPN_SITE_MANAGEMENT_TYPES.map((value) => ({
  value,
  label: formatL3VpnSiteManagementType(value)
}));

export const L3VPN_SITE_ACCESS_TYPE_OPTIONS = L3VPN_SITE_ACCESS_TYPES.map((value) => ({
  value,
  label: formatL3VpnSiteAccessType(value)
}));

export const L3VPN_SITE_ROUTING_PROTOCOL_OPTIONS = L3VPN_SITE_ROUTING_PROTOCOL_TYPES.map(
  (value) => ({
    value,
    label: formatL3VpnSiteRoutingProtocolType(value)
  })
);

export const L3VPN_SITE_ADDRESS_FAMILY_OPTIONS = L3VPN_SITE_ADDRESS_FAMILIES.map((value) => ({
  value,
  label: formatL3VpnSiteAddressFamily(value)
}));
