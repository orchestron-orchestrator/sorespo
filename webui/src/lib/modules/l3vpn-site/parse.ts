import { normalizeIdentity } from '$lib/core/restconf/identity';
import {
  createL3VpnSiteAccessDraft,
  createL3VpnSiteDeviceDraft,
  createL3VpnSiteDraft,
  createL3VpnSiteLanPrefixDraft,
  createL3VpnSiteLocationDraft,
  createL3VpnSiteRoutingProtocolDraft
} from '$lib/modules/l3vpn-site/defaults';
import {
  L3VPN_SITE_ACCESS_TYPES,
  L3VPN_SITE_ADDRESS_FAMILIES,
  L3VPN_SITE_MANAGEMENT_TYPES,
  L3VPN_SITE_ROUTING_PROTOCOL_TYPES,
  formatL3VpnSiteManagementType
} from '$lib/modules/l3vpn-site/model';

import type { ServiceListItem } from '$lib/core/registry/types';
import type {
  L3VpnSiteAccessDraft,
  L3VpnSiteAddressFamily,
  L3VpnSiteDeviceDraft,
  L3VpnSiteDraft,
  L3VpnSiteLanPrefixDraft,
  L3VpnSiteLocationDraft,
  L3VpnSiteManagementType,
  L3VpnSiteRoutingProtocolDraft,
  L3VpnSiteRoutingProtocolType
} from '$lib/modules/l3vpn-site/model';

function normalizeManagementType(value: unknown): L3VpnSiteManagementType {
  const normalized = normalizeIdentity(value);

  if (L3VPN_SITE_MANAGEMENT_TYPES.includes(normalized as L3VpnSiteManagementType)) {
    return normalized as L3VpnSiteManagementType;
  }

  return 'customer-managed';
}

function normalizeAccessType(value: unknown): L3VpnSiteAccessDraft['siteNetworkAccessType'] {
  const normalized = normalizeIdentity(value);

  if (L3VPN_SITE_ACCESS_TYPES.includes(normalized as L3VpnSiteAccessDraft['siteNetworkAccessType'])) {
    return normalized as L3VpnSiteAccessDraft['siteNetworkAccessType'];
  }

  return 'point-to-point';
}

function normalizeRoutingProtocolType(value: unknown): L3VpnSiteRoutingProtocolType {
  const normalized = normalizeIdentity(value);

  if (L3VPN_SITE_ROUTING_PROTOCOL_TYPES.includes(normalized as L3VpnSiteRoutingProtocolType)) {
    return normalized as L3VpnSiteRoutingProtocolType;
  }

  return 'direct';
}

function normalizeAddressFamilies(value: unknown): L3VpnSiteAddressFamily[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeIdentity(item))
    .filter((item, index, items): item is L3VpnSiteAddressFamily => {
      return L3VPN_SITE_ADDRESS_FAMILIES.includes(item as L3VpnSiteAddressFamily) && items.indexOf(item) === index;
    });
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isNaN(value) ? null : value;
  }

  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numeric = Number(value);
  return Number.isNaN(numeric) ? null : numeric;
}

function parseLanPrefix(input: any): L3VpnSiteLanPrefixDraft {
  const defaults = createL3VpnSiteLanPrefixDraft();

  return {
    ...defaults,
    lan: String(input?.lan ?? ''),
    lanTag: String(input?.['lan-tag'] ?? ''),
    nextHop: String(input?.['next-hop'] ?? '')
  };
}

function parseRoutingProtocol(input: any): L3VpnSiteRoutingProtocolDraft {
  const defaults = createL3VpnSiteRoutingProtocolDraft();
  const type = normalizeRoutingProtocolType(input?.type);

  if (type === 'bgp') {
    return {
      ...defaults,
      type,
      bgpAutonomousSystem: toNumber(input?.bgp?.['autonomous-system']),
      // Augmented leaf — RESTCONF serves it module-prefixed.
      bgpAuthenticationKey: String(
        input?.bgp?.['sorespo-ietf-l3vpn-svc:authentication-key'] ??
          input?.bgp?.['authentication-key'] ??
          ''
      ),
      addressFamilies: normalizeAddressFamilies(input?.bgp?.['address-family'])
    };
  }

  if (type === 'ospf') {
    return {
      ...defaults,
      type,
      ospfAreaAddress: String(input?.ospf?.['area-address'] ?? ''),
      ospfMetric: toNumber(input?.ospf?.metric),
      addressFamilies: normalizeAddressFamilies(input?.ospf?.['address-family'])
    };
  }

  if (type === 'rip') {
    return {
      ...defaults,
      type,
      addressFamilies: normalizeAddressFamilies(input?.rip?.['address-family'])
    };
  }

  if (type === 'vrrp') {
    return {
      ...defaults,
      type,
      addressFamilies: normalizeAddressFamilies(input?.vrrp?.['address-family'])
    };
  }

  if (type === 'static') {
    return {
      ...defaults,
      type,
      staticIpv4LanPrefixes: Array.isArray(input?.static?.['cascaded-lan-prefixes']?.['ipv4-lan-prefixes'])
        ? input.static['cascaded-lan-prefixes']['ipv4-lan-prefixes'].map(parseLanPrefix)
        : [],
      staticIpv6LanPrefixes: Array.isArray(input?.static?.['cascaded-lan-prefixes']?.['ipv6-lan-prefixes'])
        ? input.static['cascaded-lan-prefixes']['ipv6-lan-prefixes'].map(parseLanPrefix)
        : []
    };
  }

  return {
    ...defaults,
    type,
    addressFamilies: []
  };
}

function parseAccess(input: any): L3VpnSiteAccessDraft {
  const defaults = createL3VpnSiteAccessDraft();

  return {
    ...defaults,
    siteNetworkAccessId: String(input?.['site-network-access-id'] ?? ''),
    siteNetworkAccessType: normalizeAccessType(input?.['site-network-access-type']),
    locationReference: String(input?.['location-reference'] ?? ''),
    deviceReference: String(input?.['device-reference'] ?? ''),
    inputBandwidth: String(input?.service?.['svc-input-bandwidth'] ?? ''),
    outputBandwidth: String(input?.service?.['svc-output-bandwidth'] ?? ''),
    mtu: toNumber(input?.service?.['svc-mtu']),
    vpnId: String(input?.['vpn-attachment']?.['vpn-id'] ?? ''),
    providerAddress: String(input?.['ip-connection']?.ipv4?.addresses?.['provider-address'] ?? ''),
    customerAddress: String(input?.['ip-connection']?.ipv4?.addresses?.['customer-address'] ?? ''),
    prefixLength: toNumber(input?.['ip-connection']?.ipv4?.addresses?.['prefix-length']),
    bearerReference: String(input?.bearer?.['bearer-reference'] ?? ''),
    routingProtocols: Array.isArray(input?.['routing-protocols']?.['routing-protocol'])
      ? input['routing-protocols']['routing-protocol'].map(parseRoutingProtocol)
      : []
  };
}

function parseLocation(input: any): L3VpnSiteLocationDraft {
  const defaults = createL3VpnSiteLocationDraft();

  return {
    ...defaults,
    locationId: String(input?.['location-id'] ?? ''),
    address: String(input?.address ?? ''),
    postalCode: String(input?.['postal-code'] ?? ''),
    state: String(input?.state ?? ''),
    city: String(input?.city ?? ''),
    countryCode: String(input?.['country-code'] ?? '')
  };
}

function parseDevice(input: any): L3VpnSiteDeviceDraft {
  const defaults = createL3VpnSiteDeviceDraft();
  const addressFamily = normalizeIdentity(input?.management?.['address-family']);

  return {
    ...defaults,
    deviceId: String(input?.['device-id'] ?? ''),
    location: String(input?.location ?? ''),
    managementAddressFamily: L3VPN_SITE_ADDRESS_FAMILIES.includes(addressFamily as L3VpnSiteAddressFamily)
      ? (addressFamily as L3VpnSiteAddressFamily)
      : '',
    managementAddress: String(input?.management?.address ?? '')
  };
}

function getSiteEntry(input: any): any | null {
  if (Array.isArray(input?.['ietf-l3vpn-svc:site'])) {
    return input['ietf-l3vpn-svc:site'][0] ?? null;
  }

  if (Array.isArray(input?.['ietf-l3vpn-svc:sites']?.site)) {
    return input['ietf-l3vpn-svc:sites'].site[0] ?? null;
  }

  if (Array.isArray(input?.['ietf-l3vpn-svc:l3vpn-svc']?.sites?.site)) {
    return input['ietf-l3vpn-svc:l3vpn-svc'].sites.site[0] ?? null;
  }

  if (Array.isArray(input?.sites?.site)) {
    return input.sites.site[0] ?? null;
  }

  if (input && typeof input === 'object' && 'site-id' in input) {
    return input;
  }

  return null;
}

export function getSites(input: any): any[] {
  const sites =
    input?.['ietf-l3vpn-svc:l3vpn-svc']?.sites?.site ??
    input?.['ietf-l3vpn-svc:sites']?.site ??
    input?.sites?.site ??
    input?.['ietf-l3vpn-svc:site'] ??
    [];

  return Array.isArray(sites) ? sites : [];
}

export function parseL3VpnSite(input: unknown): L3VpnSiteDraft {
  const defaults = createL3VpnSiteDraft();
  const site = getSiteEntry(input);

  if (!site) {
    return defaults;
  }

  return {
    siteId: String(site['site-id'] ?? ''),
    managementType: normalizeManagementType(site?.management?.type),
    locations: Array.isArray(site?.locations?.location) ? site.locations.location.map(parseLocation) : [],
    devices: Array.isArray(site?.devices?.device) ? site.devices.device.map(parseDevice) : [],
    accesses: Array.isArray(site?.['site-network-accesses']?.['site-network-access'])
      ? site['site-network-accesses']['site-network-access'].map(parseAccess)
      : []
  };
}

export function listL3VpnSites(input: unknown): ServiceListItem[] {
  return getSites(input).map((site) => {
    const siteId = String(site['site-id'] ?? '');
    const managementType = normalizeManagementType(site?.management?.type);
    const locations = Array.isArray(site?.locations?.location) ? site.locations.location.length : 0;
    const accesses = Array.isArray(site?.['site-network-accesses']?.['site-network-access'])
      ? site['site-network-accesses']['site-network-access'].length
      : 0;

    return {
      id: siteId,
      label: siteId,
      description: [
        formatL3VpnSiteManagementType(managementType),
        `${locations} location${locations === 1 ? '' : 's'}`,
        `${accesses} access${accesses === 1 ? '' : 'es'}`
      ].join(' · ')
    };
  });
}
