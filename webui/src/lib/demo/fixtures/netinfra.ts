import type {
  NetinfraBackboneLinkApi,
  NetinfraOpticalLinkApi,
  NetinfraRoadmApi,
  NetinfraRouterApi
} from '$lib/core/topology/model';

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

export const NETINFRA_ROADMS: NetinfraRoadmApi[] = [
  { name: 'AMS-ROADM-1', id: 1, latitude: 52.3676, longitude: 4.9041 },
  { name: 'FRA-ROADM-1', id: 2, latitude: 50.1109, longitude: 8.6821 },
  { name: 'STO-ROADM-1', id: 3, latitude: 59.3293, longitude: 18.0686 },
  { name: 'LJU-ROADM-1', id: 4, latitude: 46.0569, longitude: 14.5058 }
];

export const NETINFRA_OPTICAL_LINKS: NetinfraOpticalLinkApi[] = [
  { 'left-roadm': 'AMS-ROADM-1', 'left-port': 'ethernet-1/1', 'right-roadm': 'FRA-ROADM-1', 'right-port': 'ethernet-1/1', latency: 1815 },
  { 'left-roadm': 'AMS-ROADM-1', 'left-port': 'ethernet-1/2', 'right-roadm': 'STO-ROADM-1', 'right-port': 'ethernet-1/1', latency: 5625 },
  { 'left-roadm': 'AMS-ROADM-1', 'left-port': 'ethernet-1/3', 'right-roadm': 'LJU-ROADM-1', 'right-port': 'ethernet-1/1', latency: 4940 },
  { 'left-roadm': 'FRA-ROADM-1', 'left-port': 'ethernet-1/2', 'right-roadm': 'STO-ROADM-1', 'right-port': 'ethernet-1/2', latency: 5935 },
  { 'left-roadm': 'FRA-ROADM-1', 'left-port': 'ethernet-1/3', 'right-roadm': 'LJU-ROADM-1', 'right-port': 'ethernet-1/2', latency: 3120 },
  { 'left-roadm': 'STO-ROADM-1', 'left-port': 'ethernet-1/3', 'right-roadm': 'LJU-ROADM-1', 'right-port': 'ethernet-1/3', latency: 7475 }
];

export const NETINFRA_BACKBONE_LINKS: NetinfraBackboneLinkApi[] = [
  {
    'left-router': 'AMS-CORE-1',
    'left-interface': 'ethernet-1/1',
    'right-router': 'FRA-CORE-1',
    'right-interface': 'ethernet-1/1',
    optical: {
      vlan: 100,
      'left-roadm': 'AMS-ROADM-1',
      'left-port': 'ethernet-1/4',
      'right-roadm': 'FRA-ROADM-1',
      'right-port': 'ethernet-1/4',
      'otn-path': ['LJU-ROADM-1']
    },
    state: { 'link-status': 'up' }
  },
  {
    'left-router': 'AMS-CORE-1',
    'left-interface': 'ethernet-1/2',
    'right-router': 'STO-CORE-1',
    'right-interface': 'ethernet-1/1',
    optical: {
      vlan: 101,
      'left-roadm': 'AMS-ROADM-1',
      'left-port': 'ethernet-1/5',
      'right-roadm': 'STO-ROADM-1',
      'right-port': 'ethernet-1/4',
      'otn-path': ['FRA-ROADM-1']
    },
    state: { 'link-status': 'up' }
  },
  {
    'left-router': 'FRA-CORE-1',
    'left-interface': 'ethernet-1/2',
    'right-router': 'STO-CORE-1',
    'right-interface': 'ethernet-1/2',
    optical: {
      vlan: 102,
      'left-roadm': 'FRA-ROADM-1',
      'left-port': 'ethernet-1/5',
      'right-roadm': 'STO-ROADM-1',
      'right-port': 'ethernet-1/5',
      'otn-path': ['LJU-ROADM-1']
    }
  },
  {
    'left-router': 'FRA-CORE-1',
    'left-interface': 'ethernet-1/3',
    'right-router': 'LJU-CORE-1',
    'right-interface': 'ethernet-1/1',
    optical: {
      vlan: 103,
      'left-roadm': 'FRA-ROADM-1',
      'left-port': 'ethernet-1/6',
      'right-roadm': 'LJU-ROADM-1',
      'right-port': 'ethernet-1/4',
      'otn-path': ['AMS-ROADM-1']
    }
  },
  {
    'left-router': 'STO-CORE-1',
    'left-interface': 'ethernet-1/3',
    'right-router': 'LJU-CORE-1',
    'right-interface': 'ethernet-1/2',
    optical: {
      vlan: 104,
      'left-roadm': 'STO-ROADM-1',
      'left-port': 'ethernet-1/6',
      'right-roadm': 'LJU-ROADM-1',
      'right-port': 'ethernet-1/5',
      'otn-path': ['AMS-ROADM-1']
    },
    state: { 'link-status': 'down' }
  }
];
