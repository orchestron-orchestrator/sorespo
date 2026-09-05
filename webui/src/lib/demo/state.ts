import type {
  NetinfraBackboneLinkApi,
  NetinfraOpticalLinkApi,
  NetinfraRoadmApi,
  NetinfraRouterApi
} from '$lib/core/topology/model';

import { makeDeviceStaticInfo, type DemoDeviceStaticInfo } from '$lib/demo/fixtures/devices';
import { L3VPN_SITES, L3VPN_VPN_SERVICES } from '$lib/demo/fixtures/l3vpn';
import {
  NETINFRA_BACKBONE_LINKS,
  NETINFRA_GLOBAL_SETTINGS,
  NETINFRA_OPTICAL_LINKS,
  NETINFRA_ROADMS,
  NETINFRA_ROUTERS
} from '$lib/demo/fixtures/netinfra';
import { INITIAL_LOG, INITIAL_QUEUE } from '$lib/demo/fixtures/seed';

export interface DemoQueueItem {
  queueId: string;
  tid: string;
  deviceTxid: string;
  diffXml: string;
}

export interface DemoLogEntry {
  event: string;
  timestamp: string;
  conf_diff?: string;
}

export interface DemoDeviceState {
  staticInfo: DemoDeviceStaticInfo;
  hasRunningConfig: boolean;
  hasTargetConfig: boolean;
  queue: DemoQueueItem[];
  log: DemoLogEntry[];
}

export interface DemoState {
  globalSettings: Record<string, unknown>;
  routers: NetinfraRouterApi[];
  roadms: NetinfraRoadmApi[];
  backboneLinks: NetinfraBackboneLinkApi[];
  opticalLinks: NetinfraOpticalLinkApi[];
  vpnServices: Record<string, any>[];
  sites: Record<string, any>[];
  devices: Record<string, DemoDeviceState>;
  counters: { queueId: number; tid: number };
}

let state: DemoState | null = null;

function materialize(): DemoState {
  const next: DemoState = {
    globalSettings: structuredClone(NETINFRA_GLOBAL_SETTINGS),
    routers: structuredClone(NETINFRA_ROUTERS),
    roadms: structuredClone(NETINFRA_ROADMS),
    backboneLinks: structuredClone(NETINFRA_BACKBONE_LINKS),
    opticalLinks: structuredClone(NETINFRA_OPTICAL_LINKS),
    vpnServices: structuredClone(L3VPN_VPN_SERVICES),
    sites: structuredClone(L3VPN_SITES),
    devices: {},
    counters: { queueId: 240, tid: 195 }
  };

  const nowSeconds = Math.floor(Date.now() / 1000);

  for (const router of NETINFRA_ROUTERS) {
    const name = String(router.name);
    next.devices[name] = {
      staticInfo: makeDeviceStaticInfo(name, router.id ?? 0),
      hasRunningConfig: true,
      hasTargetConfig: true,
      queue: [],
      log: (INITIAL_LOG[name] ?? []).map((seed) => ({
        event: seed.event,
        timestamp: String(nowSeconds - seed.ageSeconds),
        ...(seed.conf_diff ? { conf_diff: seed.conf_diff } : {})
      }))
    };
  }

  for (const roadm of NETINFRA_ROADMS) {
    const name = String(roadm.name);
    next.devices[name] = {
      staticInfo: makeDeviceStaticInfo(name, roadm.id ?? 0),
      hasRunningConfig: true,
      hasTargetConfig: true,
      queue: [],
      log: []
    };
  }

  for (const [name, seeds] of Object.entries(INITIAL_QUEUE)) {
    const device = next.devices[name];
    if (!device) continue;
    for (const seed of seeds) {
      device.queue.push(makeQueueItem(next, seed.diffXml));
    }
  }

  return next;
}

export function getState(): DemoState {
  if (!state) {
    state = materialize();
  }
  return state;
}

/** Drop all runtime edits and re-materialize the fixtures. */
export function resetDemoState(): void {
  state = null;
}

function makeQueueItem(target: DemoState, diffXml: string): DemoQueueItem {
  const queueId = String(++target.counters.queueId);
  const tid = String(++target.counters.tid);
  return { queueId, tid, deviceTxid: `d-${tid}`, diffXml };
}

/** Append a pending config change to a managed device's queue. */
export function enqueue(deviceId: string, diffXml: string): void {
  const device = getState().devices[deviceId];
  if (!device) return;
  device.queue.push(makeQueueItem(getState(), diffXml));
}

/** Append a config-log entry (log is served newest-first). */
export function appendLog(deviceId: string, event: string, confDiff?: string): void {
  const device = getState().devices[deviceId];
  if (!device) return;
  device.log.unshift({
    event,
    timestamp: String(Math.floor(Date.now() / 1000)),
    ...(confDiff ? { conf_diff: confDiff } : {})
  });
}

/** Register a router created at runtime as a managed device. */
export function addDevice(name: string, id: number, initialDiffXml: string): void {
  const current = getState();
  if (current.devices[name]) return;
  current.devices[name] = {
    staticInfo: makeDeviceStaticInfo(name, id),
    hasRunningConfig: false,
    hasTargetConfig: true,
    queue: [makeQueueItem(current, initialDiffXml)],
    log: []
  };
}

export function removeDevice(name: string): void {
  delete getState().devices[name];
}
