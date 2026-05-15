import {
  L3VPN_SITE_ACCESS_TYPES,
  L3VPN_SITE_ADDRESS_FAMILIES,
  L3VPN_SITE_MANAGEMENT_TYPES,
  L3VPN_SITE_ROUTING_PROTOCOL_TYPES
} from '$lib/modules/l3vpn-site/model';

import type { ValidationResult } from '$lib/core/validation/types';
import type { L3VpnSiteDraft, L3VpnSiteLanPrefixDraft } from '$lib/modules/l3vpn-site/model';

function isDigits(value: string): boolean {
  return /^\d+$/.test(value.trim());
}

function validateLanPrefix(
  prefix: L3VpnSiteLanPrefixDraft,
  basePath: string,
  errors: Record<string, string>
): void {
  const hasAnyValue = prefix.lan.trim() || prefix.lanTag.trim() || prefix.nextHop.trim();

  if (!hasAnyValue) {
    return;
  }

  if (!prefix.lan.trim()) {
    errors[`${basePath}.lan`] = 'LAN prefix is required when a static prefix row is used.';
  }

  if (!prefix.nextHop.trim()) {
    errors[`${basePath}.nextHop`] = 'Next hop is required when a static prefix row is used.';
  }
}

export function validateL3VpnSiteDraft(draft: L3VpnSiteDraft): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];

  if (!draft.siteId.trim()) {
    errors.siteId = 'Site ID is required.';
  }

  if (!L3VPN_SITE_MANAGEMENT_TYPES.includes(draft.managementType)) {
    errors.managementType = 'Select a valid management type.';
  }

  const locationIds = new Set<string>();
  draft.locations.forEach((location, index) => {
    const path = `locations.${index}`;
    const locationId = location.locationId.trim();

    if (!locationId) {
      errors[`${path}.locationId`] = 'Location ID is required.';
    } else if (locationIds.has(locationId)) {
      errors[`${path}.locationId`] = 'Location IDs must be unique.';
    } else {
      locationIds.add(locationId);
    }

    if (location.countryCode.trim() && !/^[A-Z]{2}$/.test(location.countryCode.trim().toUpperCase())) {
      errors[`${path}.countryCode`] = 'Country code must be a two-letter ISO code.';
    }
  });

  const deviceIds = new Set<string>();
  draft.devices.forEach((device, index) => {
    const path = `devices.${index}`;
    const deviceId = device.deviceId.trim();

    if (!deviceId) {
      errors[`${path}.deviceId`] = 'Device ID is required.';
    } else if (deviceIds.has(deviceId)) {
      errors[`${path}.deviceId`] = 'Device IDs must be unique.';
    } else {
      deviceIds.add(deviceId);
    }

    if (!device.location.trim()) {
      errors[`${path}.location`] = 'Device location reference is required.';
    } else if (!locationIds.has(device.location.trim())) {
      errors[`${path}.location`] = 'Device location must reference an existing site location.';
    }

    if (draft.managementType === 'co-managed') {
      if (device.managementAddressFamily && !L3VPN_SITE_ADDRESS_FAMILIES.includes(device.managementAddressFamily)) {
        errors[`${path}.managementAddressFamily`] = 'Select a valid management address family.';
      }

      if (device.managementAddress.trim() && !device.managementAddressFamily) {
        errors[`${path}.managementAddressFamily`] = 'Management address family is required when a management address is set.';
      }

      if (device.managementAddressFamily && !device.managementAddress.trim()) {
        errors[`${path}.managementAddress`] = 'Management address is required when a management address family is set.';
      }
    }
  });

  if (draft.managementType !== 'customer-managed' && draft.devices.length === 0 && draft.accesses.length > 0) {
    errors.devices = 'Provider-managed and co-managed sites need at least one device before accesses can reference them.';
  }

  const accessIds = new Set<string>();
  draft.accesses.forEach((access, index) => {
    const path = `accesses.${index}`;
    const accessId = access.siteNetworkAccessId.trim();

    if (!accessId) {
      errors[`${path}.siteNetworkAccessId`] = 'Access ID is required.';
    } else if (accessIds.has(accessId)) {
      errors[`${path}.siteNetworkAccessId`] = 'Access IDs must be unique.';
    } else {
      accessIds.add(accessId);
    }

    if (!L3VPN_SITE_ACCESS_TYPES.includes(access.siteNetworkAccessType)) {
      errors[`${path}.siteNetworkAccessType`] = 'Select a valid access type.';
    }

    if (draft.managementType === 'customer-managed') {
      if (!access.locationReference.trim()) {
        errors[`${path}.locationReference`] = 'Location reference is required for customer-managed sites.';
      } else if (!locationIds.has(access.locationReference.trim())) {
        errors[`${path}.locationReference`] = 'Location reference must point to an existing location.';
      }
    } else {
      if (!access.deviceReference.trim()) {
        errors[`${path}.deviceReference`] = 'Device reference is required for provider-managed or co-managed sites.';
      } else if (!deviceIds.has(access.deviceReference.trim())) {
        errors[`${path}.deviceReference`] = 'Device reference must point to an existing device.';
      }
    }

    if (!access.vpnId.trim()) {
      errors[`${path}.vpnId`] = 'VPN ID is required.';
    }

    if (access.inputBandwidth.trim() && !isDigits(access.inputBandwidth)) {
      errors[`${path}.inputBandwidth`] = 'Input bandwidth must contain only digits.';
    }

    if (access.outputBandwidth.trim() && !isDigits(access.outputBandwidth)) {
      errors[`${path}.outputBandwidth`] = 'Output bandwidth must contain only digits.';
    }

    if (access.mtu !== null && access.mtu <= 0) {
      errors[`${path}.mtu`] = 'MTU must be greater than zero.';
    }

    const hasIpv4Value = access.providerAddress.trim() || access.customerAddress.trim() || access.prefixLength !== null;
    if (hasIpv4Value && !access.providerAddress.trim()) {
      errors[`${path}.providerAddress`] = 'Provider IPv4 address is required when static addressing is configured.';
    }

    if (access.prefixLength !== null && (access.prefixLength < 0 || access.prefixLength > 32)) {
      errors[`${path}.prefixLength`] = 'IPv4 prefix length must be between 0 and 32.';
    }

    const routingTypes = new Set<string>();
    access.routingProtocols.forEach((protocol, protocolIndex) => {
      const protocolPath = `${path}.routingProtocols.${protocolIndex}`;

      if (!L3VPN_SITE_ROUTING_PROTOCOL_TYPES.includes(protocol.type)) {
        errors[`${protocolPath}.type`] = 'Select a valid routing protocol type.';
      } else if (routingTypes.has(protocol.type)) {
        errors[`${protocolPath}.type`] = 'Routing protocol types must be unique within an access.';
      } else {
        routingTypes.add(protocol.type);
      }

      if (protocol.addressFamilies.some((family) => !L3VPN_SITE_ADDRESS_FAMILIES.includes(family))) {
        errors[`${protocolPath}.addressFamilies`] = 'Select only valid address families.';
      }

      if (protocol.type === 'bgp') {
        if (protocol.bgpAutonomousSystem === null || Number.isNaN(protocol.bgpAutonomousSystem)) {
          errors[`${protocolPath}.bgpAutonomousSystem`] = 'BGP autonomous system is required.';
        } else if (protocol.bgpAutonomousSystem <= 0) {
          errors[`${protocolPath}.bgpAutonomousSystem`] = 'BGP autonomous system must be greater than zero.';
        }

        if (protocol.addressFamilies.length === 0) {
          errors[`${protocolPath}.addressFamilies`] = 'At least one address family is required for BGP.';
        }

        if (!access.customerAddress.trim()) {
          warnings.push(`Access ${accessId || index + 1}: BGP usually needs a customer IPv4 address when static addressing is used.`);
        }
      }

      if (protocol.type === 'ospf') {
        if (!protocol.ospfAreaAddress.trim()) {
          errors[`${protocolPath}.ospfAreaAddress`] = 'OSPF area address is required.';
        }

        if (protocol.ospfMetric !== null && protocol.ospfMetric < 0) {
          errors[`${protocolPath}.ospfMetric`] = 'OSPF metric cannot be negative.';
        }

        if (protocol.addressFamilies.length === 0) {
          errors[`${protocolPath}.addressFamilies`] = 'At least one address family is required for OSPF.';
        }
      }

      if (protocol.type === 'rip' || protocol.type === 'vrrp') {
        if (protocol.addressFamilies.length === 0) {
          errors[`${protocolPath}.addressFamilies`] = 'At least one address family is required for this routing protocol.';
        }
      }

      if (protocol.type === 'static') {
        protocol.staticIpv4LanPrefixes.forEach((prefix, prefixIndex) => {
          validateLanPrefix(prefix, `${protocolPath}.staticIpv4LanPrefixes.${prefixIndex}`, errors);
        });

        protocol.staticIpv6LanPrefixes.forEach((prefix, prefixIndex) => {
          validateLanPrefix(prefix, `${protocolPath}.staticIpv6LanPrefixes.${prefixIndex}`, errors);
        });
      }
    });
  });

  if (draft.locations.length === 0) {
    warnings.push('No site locations are configured.');
  }

  if (draft.accesses.length === 0) {
    warnings.push('No site network accesses are configured.');
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    warnings
  };
}
