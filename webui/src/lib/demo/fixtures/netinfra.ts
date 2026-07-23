import type { NetinfraBackboneLinkApi, NetinfraRouterApi } from '$lib/core/topology/model';

// The demo network mirrors the quicklab-srl test environment
// (test/quicklab-srl/netinfra.json): four Nokia SR Linux cores in a ring-ish
// mesh. AMS-CORE-1 requires manual approval so the config-queue story has a
// device that holds changes; one monitored link is down for a red path on the
// topology map.

export const NETINFRA_GLOBAL_SETTINGS: Record<string, unknown> = {
  'ibgp-authentication-key': 'ibgp-authentication-key'
};

export const NETINFRA_ROUTERS: NetinfraRouterApi[] = [
  {
    name: 'AMS-CORE-1',
    id: 1,
    type: 'NokiaSRLinux_25_3_2',
    role: 'edge',
    asn: 65001,
    'approval-required': true
  },
  { name: 'FRA-CORE-1', id: 2, type: 'NokiaSRLinux_25_3_2', role: 'edge', asn: 65001 },
  { name: 'STO-CORE-1', id: 3, type: 'NokiaSRLinux_25_3_2', role: 'edge', asn: 65001 },
  { name: 'LJU-CORE-1', id: 4, type: 'NokiaSRLinux_25_3_2', role: 'edge', asn: 65001 }
];

export const NETINFRA_BACKBONE_LINKS: NetinfraBackboneLinkApi[] = [
  {
    'left-router': 'AMS-CORE-1',
    'left-interface': 'ethernet-1/1',
    'right-router': 'FRA-CORE-1',
    'right-interface': 'ethernet-1/1',
    'monitor-traffic': true,
    state: { 'left-pps': 18420, 'right-pps': 17155, 'link-status': 'up' }
  },
  {
    'left-router': 'AMS-CORE-1',
    'left-interface': 'ethernet-1/2',
    'right-router': 'STO-CORE-1',
    'right-interface': 'ethernet-1/1',
    'monitor-traffic': true,
    state: { 'left-pps': 9640, 'right-pps': 10480, 'link-status': 'up' }
  },
  {
    'left-router': 'FRA-CORE-1',
    'left-interface': 'ethernet-1/2',
    'right-router': 'STO-CORE-1',
    'right-interface': 'ethernet-1/2'
  },
  {
    'left-router': 'FRA-CORE-1',
    'left-interface': 'ethernet-1/3',
    'right-router': 'LJU-CORE-1',
    'right-interface': 'ethernet-1/1'
  },
  {
    'left-router': 'STO-CORE-1',
    'left-interface': 'ethernet-1/3',
    'right-router': 'LJU-CORE-1',
    'right-interface': 'ethernet-1/2',
    'monitor-traffic': true,
    state: { 'left-pps': 0, 'right-pps': 0, 'link-status': 'down' }
  }
];
