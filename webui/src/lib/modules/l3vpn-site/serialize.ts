import type {
  L3VpnSiteAccessDraft,
  L3VpnSiteDeviceDraft,
  L3VpnSiteDraft,
  L3VpnSiteLanPrefixDraft,
  L3VpnSiteLocationDraft,
  L3VpnSiteRoutingProtocolDraft
} from '$lib/modules/l3vpn-site/model';

function serializeLocation(location: L3VpnSiteLocationDraft): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    'location-id': location.locationId.trim()
  };

  if (location.address.trim()) {
    payload.address = location.address.trim();
  }

  if (location.postalCode.trim()) {
    payload['postal-code'] = location.postalCode.trim();
  }

  if (location.state.trim()) {
    payload.state = location.state.trim();
  }

  if (location.city.trim()) {
    payload.city = location.city.trim();
  }

  if (location.countryCode.trim()) {
    payload['country-code'] = location.countryCode.trim().toUpperCase();
  }

  return payload;
}

function serializeDevice(device: L3VpnSiteDeviceDraft, managementType: L3VpnSiteDraft['managementType']): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    'device-id': device.deviceId.trim(),
    location: device.location.trim()
  };

  if (managementType === 'co-managed' && device.managementAddressFamily && device.managementAddress.trim()) {
    payload.management = {
      'address-family': device.managementAddressFamily,
      address: device.managementAddress.trim()
    };
  }

  return payload;
}

function serializeLanPrefix(prefix: L3VpnSiteLanPrefixDraft): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    lan: prefix.lan.trim(),
    'next-hop': prefix.nextHop.trim()
  };

  if (prefix.lanTag.trim()) {
    payload['lan-tag'] = prefix.lanTag.trim();
  }

  return payload;
}

function serializeRoutingProtocol(protocol: L3VpnSiteRoutingProtocolDraft): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    type: protocol.type
  };

  if (protocol.type === 'bgp') {
    payload.bgp = {
      ...(protocol.bgpAutonomousSystem !== null ? { 'autonomous-system': protocol.bgpAutonomousSystem } : {}),
      ...(protocol.addressFamilies.length > 0 ? { 'address-family': protocol.addressFamilies } : {})
    };
    return payload;
  }

  if (protocol.type === 'ospf') {
    payload.ospf = {
      ...(protocol.ospfAreaAddress.trim() ? { 'area-address': protocol.ospfAreaAddress.trim() } : {}),
      ...(protocol.ospfMetric !== null ? { metric: protocol.ospfMetric } : {}),
      ...(protocol.addressFamilies.length > 0 ? { 'address-family': protocol.addressFamilies } : {})
    };
    return payload;
  }

  if (protocol.type === 'rip') {
    payload.rip = protocol.addressFamilies.length > 0 ? { 'address-family': protocol.addressFamilies } : {};
    return payload;
  }

  if (protocol.type === 'vrrp') {
    payload.vrrp = protocol.addressFamilies.length > 0 ? { 'address-family': protocol.addressFamilies } : {};
    return payload;
  }

  if (protocol.type === 'static') {
    const cascadedLanPrefixes: Record<string, unknown> = {};

    if (protocol.staticIpv4LanPrefixes.length > 0) {
      cascadedLanPrefixes['ipv4-lan-prefixes'] = protocol.staticIpv4LanPrefixes.map(serializeLanPrefix);
    }

    if (protocol.staticIpv6LanPrefixes.length > 0) {
      cascadedLanPrefixes['ipv6-lan-prefixes'] = protocol.staticIpv6LanPrefixes.map(serializeLanPrefix);
    }

    payload.static = Object.keys(cascadedLanPrefixes).length > 0 ? { 'cascaded-lan-prefixes': cascadedLanPrefixes } : {};
    return payload;
  }

  return payload;
}

function serializeAccess(
  access: L3VpnSiteAccessDraft,
  managementType: L3VpnSiteDraft['managementType']
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    'site-network-access-id': access.siteNetworkAccessId.trim()
  };

  if (access.siteNetworkAccessType !== 'point-to-point') {
    payload['site-network-access-type'] = access.siteNetworkAccessType;
  }

  if (managementType === 'customer-managed') {
    if (access.locationReference.trim()) {
      payload['location-reference'] = access.locationReference.trim();
    }
  } else if (access.deviceReference.trim()) {
    payload['device-reference'] = access.deviceReference.trim();
  }

  if (access.inputBandwidth.trim() || access.outputBandwidth.trim() || access.mtu !== null) {
    payload.service = {
      ...(access.inputBandwidth.trim() ? { 'svc-input-bandwidth': access.inputBandwidth.trim() } : {}),
      ...(access.outputBandwidth.trim() ? { 'svc-output-bandwidth': access.outputBandwidth.trim() } : {}),
      ...(access.mtu !== null ? { 'svc-mtu': access.mtu } : {})
    };
  }

  if (access.vpnId.trim()) {
    payload['vpn-attachment'] = {
      'vpn-id': access.vpnId.trim()
    };
  }

  if (access.providerAddress.trim() || access.customerAddress.trim() || access.prefixLength !== null) {
    payload['ip-connection'] = {
      ipv4: {
        'address-allocation-type': 'static-address',
        addresses: {
          ...(access.providerAddress.trim() ? { 'provider-address': access.providerAddress.trim() } : {}),
          ...(access.customerAddress.trim() ? { 'customer-address': access.customerAddress.trim() } : {}),
          ...(access.prefixLength !== null ? { 'prefix-length': access.prefixLength } : {})
        }
      }
    };
  }

  if (access.bearerReference.trim()) {
    payload.bearer = {
      'bearer-reference': access.bearerReference.trim()
    };
  }

  if (access.routingProtocols.length > 0) {
    payload['routing-protocols'] = {
      'routing-protocol': access.routingProtocols.map(serializeRoutingProtocol)
    };
  }

  return payload;
}

export function serializeL3VpnSiteDraft(draft: L3VpnSiteDraft): unknown {
  const site: Record<string, unknown> = {
    'site-id': draft.siteId.trim(),
    management: {
      type: draft.managementType
    }
  };

  if (draft.locations.length > 0) {
    site.locations = {
      location: draft.locations.map(serializeLocation)
    };
  }

  if (draft.managementType !== 'customer-managed' && draft.devices.length > 0) {
    site.devices = {
      device: draft.devices.map((device) => serializeDevice(device, draft.managementType))
    };
  }

  if (draft.accesses.length > 0) {
    site['site-network-accesses'] = {
      'site-network-access': draft.accesses.map((access) => serializeAccess(access, draft.managementType))
    };
  }

  return site;
}
