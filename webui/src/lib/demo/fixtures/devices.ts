import type { DeviceModuleInfo } from '$lib/core/orchestron/client';

export interface DemoDeviceStaticInfo {
  name: string;
  type: string;
  username: string;
  addresses: { name: string; address: string; port: number }[];
  feature_flags: Record<string, boolean>;
  modules: DeviceModuleInfo[];
}

const SRL_MODULES: DeviceModuleInfo[] = [
  { name: 'srl_nokia-interfaces', namespace: 'urn:nokia.com:srlinux:chassis:interfaces', revision: '2025-03-31' },
  { name: 'srl_nokia-network-instance', namespace: 'urn:nokia.com:srlinux:net-inst:network-instance', revision: '2025-03-31' },
  { name: 'srl_nokia-bgp', namespace: 'urn:nokia.com:srlinux:bgp:bgp', revision: '2025-03-31' },
  { name: 'srl_nokia-routing-policy', namespace: 'urn:nokia.com:srlinux:pol:routing-policy', revision: '2025-03-31' },
  { name: 'srl_nokia-system', namespace: 'urn:nokia.com:srlinux:general:system', revision: '2025-03-31' },
  {
    name: 'ietf-netconf',
    namespace: 'urn:ietf:params:xml:ns:netconf:base:1.0',
    revision: '2011-06-01',
    features: ['candidate', 'validate', 'startup']
  },
  {
    name: 'ietf-netconf-monitoring',
    namespace: 'urn:ietf:params:xml:ns:yang:ietf-netconf-monitoring',
    revision: '2010-10-04'
  }
];

/**
 * Static (non-mutating) device facts for a managed router. Routers created
 * through the demo's service modules get the same treatment with their own id.
 */
export function makeDeviceStaticInfo(name: string, id: number): DemoDeviceStaticInfo {
  return {
    name,
    type: 'NokiaSRLinux_25_3_2',
    username: 'admin',
    addresses: [{ name: 'mgmt', address: `172.20.20.${10 + id}`, port: 830 }],
    feature_flags: { confirmed_commit: true, validate: true, startup: false },
    modules: SRL_MODULES
  };
}
