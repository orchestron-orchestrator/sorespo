import type {
  L3VpnSiteAccessDraft,
  L3VpnSiteDeviceDraft,
  L3VpnSiteDraft,
  L3VpnSiteLanPrefixDraft,
  L3VpnSiteLocationDraft,
  L3VpnSiteRoutingProtocolDraft
} from '$lib/modules/l3vpn-site/model';

export function createL3VpnSiteLocationDraft(): L3VpnSiteLocationDraft {
  return {
    locationId: '',
    address: '',
    postalCode: '',
    state: '',
    city: '',
    countryCode: ''
  };
}

export function createL3VpnSiteDeviceDraft(): L3VpnSiteDeviceDraft {
  return {
    deviceId: '',
    location: '',
    managementAddressFamily: '',
    managementAddress: ''
  };
}

export function createL3VpnSiteLanPrefixDraft(): L3VpnSiteLanPrefixDraft {
  return {
    lan: '',
    lanTag: '',
    nextHop: ''
  };
}

export function createL3VpnSiteRoutingProtocolDraft(): L3VpnSiteRoutingProtocolDraft {
  return {
    type: 'bgp',
    addressFamilies: ['ipv4'],
    bgpAutonomousSystem: null,
    ospfAreaAddress: '',
    ospfMetric: 1,
    staticIpv4LanPrefixes: [],
    staticIpv6LanPrefixes: []
  };
}

export function createL3VpnSiteAccessDraft(): L3VpnSiteAccessDraft {
  return {
    siteNetworkAccessId: '',
    siteNetworkAccessType: 'point-to-point',
    locationReference: '',
    deviceReference: '',
    inputBandwidth: '',
    outputBandwidth: '',
    mtu: null,
    vpnId: '',
    providerAddress: '',
    customerAddress: '',
    prefixLength: null,
    bearerReference: '',
    routingProtocols: [createL3VpnSiteRoutingProtocolDraft()]
  };
}

export function createL3VpnSiteDraft(): L3VpnSiteDraft {
  return {
    siteId: '',
    managementType: 'customer-managed',
    locations: [createL3VpnSiteLocationDraft()],
    devices: [],
    accesses: [createL3VpnSiteAccessDraft()]
  };
}
