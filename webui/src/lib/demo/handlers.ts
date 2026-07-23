import type { NetinfraBackboneLinkApi } from '$lib/core/topology/model';

import {
  deviceConfigAdata,
  deviceConfigObject,
  deviceConfigXml,
  pendingTargetExtraObject,
  pendingTargetExtraXml
} from '$lib/demo/fixtures/device-configs';
import {
  backboneInterfaceDiff,
  baseRouterDiff,
  bgpAuthKeyDiff,
  genericApplyDiff,
  subinterfaceRemoveDiff,
  vrfAddDiff,
  vrfRemoveDiff
} from '$lib/demo/fixtures/diffs';
import { layerConfigText } from '$lib/demo/fixtures/layer-configs';
import {
  addDevice,
  appendLog,
  enqueue,
  getState,
  removeDevice,
  type DemoState
} from '$lib/demo/state';

// A fetch-compatible request handler that answers every /api/* call the UI
// makes from the in-memory demo state. Anything unrecognized gets a 404 so
// new call sites fail loudly instead of silently rendering nothing.

const RESPONSE_DELAY_MS = 90;

function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, RESPONSE_DELAY_MS + Math.random() * 60));
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/yang-data+json' }
  });
}

function text(data: string, contentType = 'text/plain'): Response {
  return new Response(data, { status: 200, headers: { 'content-type': contentType } });
}

function empty(status = 204): Response {
  return new Response(null, { status });
}

function restconfNotFound(message: string): Response {
  return json(
    {
      'ietf-restconf:errors': {
        error: [{ 'error-type': 'application', 'error-tag': 'invalid-value', 'error-message': message }]
      }
    },
    404
  );
}

function notFound(message: string): Response {
  return json({ message }, 404);
}

// ── shared payload shapes ──

function netinfraTree(state: DemoState, jitterPps: boolean): Record<string, unknown> {
  const links = jitterPps
    ? state.backboneLinks.map((link) => jitterLink(link))
    : state.backboneLinks;
  return {
    'global-settings': state.globalSettings,
    router: state.routers,
    'backbone-link': links
  };
}

function jitterLink(link: NetinfraBackboneLinkApi): NetinfraBackboneLinkApi {
  if (!link['monitor-traffic'] || !link.state || link.state['link-status'] !== 'up') {
    return link;
  }
  const wiggle = (pps: number | string | undefined) => {
    const base = Number(pps ?? 0);
    return Math.max(0, Math.round(base * (0.9 + Math.random() * 0.2)));
  };
  return {
    ...link,
    state: {
      ...link.state,
      'left-pps': wiggle(link.state['left-pps']),
      'right-pps': wiggle(link.state['right-pps'])
    }
  };
}

function l3vpnTree(state: DemoState): Record<string, unknown> {
  return {
    'vpn-services': { 'vpn-service': state.vpnServices },
    sites: { site: state.sites }
  };
}

function routerId(state: DemoState, name: string): number {
  const entry = state.routers.find((router) => router.name === name);
  return entry?.id ?? 9;
}

function managedRouters(state: DemoState): { name: string; id: number }[] {
  return Object.keys(state.devices).map((name) => ({ name, id: routerId(state, name) }));
}

// ── site helpers (derive queue diffs from an ietf-l3vpn-svc site entry) ──

interface SiteFacts {
  router: string;
  iface: string;
  vpnId: string;
  providerAddress: string;
  prefixLength: number;
  asn: number;
}

function siteFacts(site: Record<string, any> | undefined): SiteFacts | null {
  const access = site?.['site-network-accesses']?.['site-network-access']?.[0];
  const bearer = String(access?.bearer?.['bearer-reference'] ?? '');
  if (!bearer) return null;
  const [router = '', iface = ''] = bearer.split(',').map((part: string) => part.trim());
  const addresses = access?.['ip-connection']?.ipv4?.addresses;
  const bgp = access?.['routing-protocols']?.['routing-protocol']?.[0]?.bgp;
  return {
    router,
    iface: iface || 'ethernet-1/9.100',
    vpnId: String(access?.['vpn-attachment']?.['vpn-id'] ?? 'l3vpn'),
    providerAddress: String(addresses?.['provider-address'] ?? '10.209.1.1'),
    prefixLength: Number(addresses?.['prefix-length'] ?? 30),
    asn: Number(bgp?.['autonomous-system'] ?? 65500)
  };
}

function enqueueSiteAdd(site: Record<string, any>): void {
  const facts = siteFacts(site);
  if (!facts) return;
  enqueue(facts.router, vrfAddDiff(facts.vpnId, facts.iface, facts.providerAddress, facts.prefixLength, facts.asn));
}

function enqueueSiteRemove(site: Record<string, any> | undefined): void {
  const facts = siteFacts(site);
  if (!facts) return;
  enqueue(facts.router, vrfRemoveDiff(facts.vpnId, facts.iface));
}

// ── entry extraction from RESTCONF PUT bodies ──

function parseBody(init: RequestInit | undefined): any {
  if (typeof init?.body !== 'string' || !init.body) return null;
  try {
    return JSON.parse(init.body);
  } catch {
    return null;
  }
}

function unwrapEntry(body: any, wrapperKey: string): Record<string, any> | null {
  if (!body || typeof body !== 'object') return null;
  const wrapped = body[wrapperKey];
  if (Array.isArray(wrapped)) return wrapped[0] ?? null;
  if (wrapped && typeof wrapped === 'object') return wrapped;
  const first = Object.values(body)[0];
  if (Array.isArray(first)) return (first[0] as Record<string, any>) ?? null;
  return typeof first === 'object' ? (first as Record<string, any>) : null;
}

function linkKeyMatches(link: NetinfraBackboneLinkApi, key: string[]): boolean {
  return (
    String(link['left-router'] ?? '') === key[0] &&
    String(link['left-interface'] ?? '') === key[1] &&
    String(link['right-router'] ?? '') === key[2] &&
    String(link['right-interface'] ?? '') === key[3]
  );
}

// ── router / backbone-link / vpn / site / global-settings mutations ──

function upsertRouter(entry: Record<string, any>): void {
  const state = getState();
  const name = String(entry.name ?? '');
  if (!name) return;
  const index = state.routers.findIndex((router) => router.name === name);
  const isNew = index === -1;
  const id = Number(entry.id) || (isNew ? Math.max(0, ...state.routers.map((r) => r.id ?? 0)) + 1 : (state.routers[index].id ?? 9));
  const normalized = { ...entry, name, id };
  if (isNew) {
    state.routers.push(normalized);
  } else {
    state.routers[index] = normalized;
  }
  const asn = Number(entry.asn) || 65001;
  if (state.devices[name]) {
    enqueue(name, baseRouterDiff(name, id, asn));
  } else {
    addDevice(name, id, baseRouterDiff(name, id, asn));
  }
}

function deleteRouter(name: string): void {
  const state = getState();
  state.routers = state.routers.filter((router) => router.name !== name);
  state.backboneLinks = state.backboneLinks.filter(
    (link) => link['left-router'] !== name && link['right-router'] !== name
  );
  removeDevice(name);
}

function upsertBackboneLink(entry: Record<string, any>, key: string[]): void {
  const state = getState();
  const index = state.backboneLinks.findIndex((link) => linkKeyMatches(link, key));
  if (index === -1) {
    state.backboneLinks.push(entry);
  } else {
    state.backboneLinks[index] = { ...state.backboneLinks[index], ...entry };
  }
  const left = String(entry['left-router'] ?? key[0]);
  const right = String(entry['right-router'] ?? key[2]);
  enqueue(left, backboneInterfaceDiff(String(entry['left-interface'] ?? key[1]), right, String(entry['right-interface'] ?? key[3])));
  enqueue(right, backboneInterfaceDiff(String(entry['right-interface'] ?? key[3]), left, String(entry['left-interface'] ?? key[1])));
}

function deleteBackboneLink(key: string[]): void {
  const state = getState();
  state.backboneLinks = state.backboneLinks.filter((link) => !linkKeyMatches(link, key));
  enqueue(key[0], subinterfaceRemoveDiff(key[1].split('.')[0], '0'));
  enqueue(key[2], subinterfaceRemoveDiff(key[3].split('.')[0], '0'));
}

function upsertListEntry(list: Record<string, any>[], keyLeaf: string, entry: Record<string, any>): void {
  const key = String(entry[keyLeaf] ?? '');
  const index = list.findIndex((item) => String(item[keyLeaf] ?? '') === key);
  if (index === -1) {
    list.push(entry);
  } else {
    list[index] = entry;
  }
}

// ── the RESTCONF branch (/api/restconf/...) ──

async function handleRestconf(
  segments: string[],
  method: string,
  init: RequestInit | undefined,
  search: URLSearchParams
): Promise<Response> {
  void search;
  const state = getState();

  // PATCH /restconf/data — the Apply CFS Config page.
  if (segments.length === 1 && segments[0] === 'data') {
    if (method !== 'PATCH') return restconfNotFound(`unsupported ${method} on /data`);
    applyCfsPayload(init);
    return empty(200);
  }

  const [root, top, ...rest] = segments;
  if (root !== 'data') return restconfNotFound(`unknown path /${segments.join('/')}`);

  if (top === 'netinfra:netinfra') {
    if (rest.length === 0) {
      if (method === 'GET') return json({ 'netinfra:netinfra': netinfraTree(state, true) });
      return restconfNotFound(`unsupported ${method} on netinfra:netinfra`);
    }

    const [leaf] = rest;

    if (leaf === 'global-settings') {
      if (method === 'GET') return json({ 'netinfra:global-settings': state.globalSettings });
      if (method === 'PUT') {
        const entry = unwrapEntry(parseBody(init), 'netinfra:global-settings');
        state.globalSettings = entry ?? {};
        for (const name of Object.keys(state.devices)) {
          enqueue(name, bgpAuthKeyDiff());
        }
        return empty();
      }
      return restconfNotFound(`unsupported ${method} on global-settings`);
    }

    if (leaf.startsWith('router=')) {
      const name = decodeURIComponent(leaf.slice('router='.length));
      const entry = state.routers.find((router) => router.name === name);
      if (method === 'GET') {
        return entry ? json({ 'netinfra:router': [entry] }) : restconfNotFound(`no router ${name}`);
      }
      if (method === 'PUT') {
        const body = unwrapEntry(parseBody(init), 'netinfra:router');
        if (body) upsertRouter({ ...body, name: body.name ?? name });
        return empty();
      }
      if (method === 'DELETE') {
        if (!entry) return restconfNotFound(`no router ${name}`);
        deleteRouter(name);
        return empty();
      }
    }

    if (leaf.startsWith('backbone-link=')) {
      const key = leaf
        .slice('backbone-link='.length)
        .split(',')
        .map((part) => decodeURIComponent(part).trim());
      const entry = state.backboneLinks.find((link) => linkKeyMatches(link, key));
      if (method === 'GET') {
        return entry
          ? json({ 'netinfra:backbone-link': [entry] })
          : restconfNotFound(`no backbone-link ${key.join(',')}`);
      }
      if (method === 'PUT') {
        const body = unwrapEntry(parseBody(init), 'netinfra:backbone-link');
        if (body) upsertBackboneLink(body, key);
        return empty();
      }
      if (method === 'DELETE') {
        if (!entry) return restconfNotFound(`no backbone-link ${key.join(',')}`);
        deleteBackboneLink(key);
        return empty();
      }
    }

    return restconfNotFound(`unknown netinfra path /${segments.join('/')}`);
  }

  if (top === 'ietf-l3vpn-svc:l3vpn-svc') {
    const [collection, entrySegment] = rest;

    if (collection === 'sites') {
      if (!entrySegment) {
        if (method === 'GET') return json({ 'ietf-l3vpn-svc:sites': { site: state.sites } });
        return restconfNotFound(`unsupported ${method} on sites`);
      }
      if (entrySegment.startsWith('site=')) {
        const siteId = decodeURIComponent(entrySegment.slice('site='.length));
        const index = state.sites.findIndex((site) => String(site['site-id']) === siteId);
        if (method === 'GET') {
          return index === -1
            ? restconfNotFound(`no site ${siteId}`)
            : json({ 'ietf-l3vpn-svc:site': [state.sites[index]] });
        }
        if (method === 'PUT') {
          const body = unwrapEntry(parseBody(init), 'ietf-l3vpn-svc:site');
          if (body) {
            upsertListEntry(state.sites, 'site-id', { ...body, 'site-id': body['site-id'] ?? siteId });
            enqueueSiteAdd(body);
          }
          return empty();
        }
        if (method === 'DELETE') {
          if (index === -1) return restconfNotFound(`no site ${siteId}`);
          enqueueSiteRemove(state.sites[index]);
          state.sites.splice(index, 1);
          return empty();
        }
      }
    }

    if (collection === 'vpn-services') {
      if (!entrySegment) {
        if (method === 'GET') {
          return json({ 'ietf-l3vpn-svc:vpn-services': { 'vpn-service': state.vpnServices } });
        }
        return restconfNotFound(`unsupported ${method} on vpn-services`);
      }
      if (entrySegment.startsWith('vpn-service=')) {
        const vpnId = decodeURIComponent(entrySegment.slice('vpn-service='.length));
        const index = state.vpnServices.findIndex((vpn) => String(vpn['vpn-id']) === vpnId);
        if (method === 'GET') {
          return index === -1
            ? restconfNotFound(`no vpn-service ${vpnId}`)
            : json({ 'ietf-l3vpn-svc:vpn-service': [state.vpnServices[index]] });
        }
        if (method === 'PUT') {
          const body = unwrapEntry(parseBody(init), 'ietf-l3vpn-svc:vpn-service');
          if (body) {
            upsertListEntry(state.vpnServices, 'vpn-id', { ...body, 'vpn-id': body['vpn-id'] ?? vpnId });
          }
          return empty();
        }
        if (method === 'DELETE') {
          if (index === -1) return restconfNotFound(`no vpn-service ${vpnId}`);
          state.vpnServices.splice(index, 1);
          return empty();
        }
      }
    }

    return restconfNotFound(`unknown l3vpn path /${segments.join('/')}`);
  }

  return restconfNotFound(`unknown path /${segments.join('/')}`);
}

function applyCfsPayload(init: RequestInit | undefined): void {
  const state = getState();
  const body = parseBody(init);
  const affected = new Set<string>();

  if (body && typeof body === 'object') {
    const l3vpn = body['ietf-l3vpn-svc:l3vpn-svc'];
    for (const vpn of l3vpn?.['vpn-services']?.['vpn-service'] ?? []) {
      upsertListEntry(state.vpnServices, 'vpn-id', vpn);
    }
    for (const site of l3vpn?.sites?.site ?? []) {
      upsertListEntry(state.sites, 'site-id', site);
      const facts = siteFacts(site);
      if (facts && state.devices[facts.router]) {
        enqueueSiteAdd(site);
        affected.add(facts.router);
      }
    }

    const netinfra = body['netinfra:netinfra'];
    for (const router of netinfra?.router ?? []) {
      upsertRouter(router);
      affected.add(String(router.name ?? ''));
    }
    for (const link of netinfra?.['backbone-link'] ?? []) {
      const key = [
        String(link['left-router'] ?? ''),
        String(link['left-interface'] ?? ''),
        String(link['right-router'] ?? ''),
        String(link['right-interface'] ?? '')
      ];
      upsertBackboneLink(link, key);
      affected.add(key[0]);
      affected.add(key[2]);
    }
    if (netinfra?.['global-settings']) {
      state.globalSettings = netinfra['global-settings'];
      for (const name of Object.keys(state.devices)) {
        enqueue(name, bgpAuthKeyDiff());
        affected.add(name);
      }
    }
  }

  // XML or otherwise unparseable payloads (and JSON that touched nothing we
  // model) still visibly ripple through the system.
  if (affected.size === 0) {
    for (const name of Object.keys(state.devices)) {
      enqueue(name, genericApplyDiff());
    }
  }
}

// ── the orchestrator branch (/api/...) ──

function deviceInfo(state: DemoState, name: string): Record<string, unknown> | null {
  const device = state.devices[name];
  if (!device) return null;
  const routerEntry = state.routers.find((router) => router.name === name);
  return {
    ...device.staticInfo,
    approval_required: Boolean(routerEntry?.['approval-required'] ?? false),
    has_running_config: device.hasRunningConfig,
    has_target_config: device.hasTargetConfig,
    queue_length: device.queue.length,
    pending_approvals: device.queue.length
  };
}

function deviceConfigText(state: DemoState, name: string, format: string, mode: 'running' | 'target'): string {
  const device = state.devices[name];
  if (!device) return '';
  const id = routerId(state, name);
  const pending = mode === 'target' && device.queue.length > 0;

  if (mode === 'running' && !device.hasRunningConfig) {
    return format === 'json' ? '{}' : '<!-- no running configuration: device has not been synchronized yet -->';
  }

  if (format === 'json') {
    const config = deviceConfigObject(name, id);
    if (pending) {
      (config['srl_nokia-interfaces:interface'] as Record<string, unknown>[]).push(pendingTargetExtraObject());
    }
    return JSON.stringify(config, null, 2);
  }

  if (format === 'adata') {
    return deviceConfigAdata(name, id) + (pending ? '\ninterface ethernet-1/6 { description: "pending change awaiting approval" }' : '');
  }

  // xml and gdata
  const xml = deviceConfigXml(name, id);
  return pending ? xml.replace('</config>', `${pendingTargetExtraXml()}\n</config>`) : xml;
}

async function handleOrchestron(
  segments: string[],
  method: string,
  init: RequestInit | undefined,
  search: URLSearchParams,
  acceptHeader: string
): Promise<Response> {
  const state = getState();

  if (segments[0] === 'device' && segments.length === 1) {
    return json({ devices: Object.keys(state.devices) });
  }

  if (segments[0] === 'config-queue' && segments.length === 1) {
    const devices = Object.entries(state.devices)
      .filter(([, device]) => device.queue.length > 0)
      .map(([deviceId, device]) => ({
        device_id: deviceId,
        items: device.queue.map((item) => ({
          queue_id: item.queueId,
          device_txid: item.deviceTxid,
          approved: null
        }))
      }));
    return json({ devices });
  }

  if (segments[0] === 'layer' && segments.length === 2) {
    const layer = Number(segments[1]);
    const format = acceptHeader.includes('acton-adata')
      ? 'adata'
      : acceptHeader.includes('json')
        ? 'json'
        : 'xml';
    const body = layerConfigText(layer, format, {
      netinfra: { 'netinfra:netinfra': netinfraTree(state, false) },
      l3vpn: { 'ietf-l3vpn-svc:l3vpn-svc': l3vpnTree(state) },
      routers: managedRouters(state)
    });
    return text(body, acceptHeader || 'application/yang-data+xml');
  }

  if (segments[0] === 'device' && segments.length >= 3) {
    const name = decodeURIComponent(segments[1]);
    const device = state.devices[name];
    if (!device) return notFound(`unknown device ${name}`);
    const action = segments[2];
    const format = search.get('format') ?? 'json';

    if (action === 'info') {
      return json(deviceInfo(state, name));
    }

    if (action === 'resync') {
      device.hasRunningConfig = true;
      appendLog(name, 'resync');
      return json({});
    }

    if (action === 'q' && segments.length === 3) {
      return json(Object.fromEntries(device.queue.map((item) => [item.queueId, { tid: item.tid }])));
    }

    if (action === 'q' && segments.length >= 4) {
      const queueId = decodeURIComponent(segments[3]);
      const item = device.queue.find((queued) => queued.queueId === queueId);

      if (segments[4] === 'set_approval') {
        if (method !== 'POST') return notFound('set_approval expects POST');
        if (!item) return notFound(`no queue item ${queueId} on ${name}`);
        const body = parseBody(init);
        const approved = Boolean(body?.approved);
        device.queue = device.queue.filter((queued) => queued.queueId !== queueId);
        appendLog(name, approved ? 'sent' : 'rejected', item.diffXml);
        if (approved) {
          device.hasRunningConfig = true;
        }
        return json({});
      }

      if (!item) return notFound(`no queue item ${queueId} on ${name}`);
      return json({
        tid: item.tid,
        device_txid: item.deviceTxid,
        config_diff: item.diffXml,
        format: search.get('format') ?? 'xml',
        approved: null
      });
    }

    if (action === 'running' || action === 'target') {
      return text(deviceConfigText(state, name, format, action));
    }

    if (action === 'diff') {
      const diff = device.queue.map((item) => item.diffXml).join('\n');
      return text(diff || '<!-- running and target configuration are in sync -->');
    }

    if (action === 'log') {
      return json({ log: device.log });
    }
  }

  return notFound(`unknown API path /${segments.join('/')}`);
}

// ── entry point ──

export function createDemoFetch(): typeof fetch {
  const demoFetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(raw, 'http://demo.invalid');
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const acceptHeader = new Headers(init?.headers).get('accept') ?? '';

    await delay();

    if (url.pathname.startsWith('/api/restconf/')) {
      const segments = url.pathname.slice('/api/restconf/'.length).split('/').filter(Boolean);
      return handleRestconf(segments, method, init, url.searchParams);
    }

    if (url.pathname.startsWith('/api/')) {
      const segments = url.pathname.slice('/api/'.length).split('/').filter(Boolean);
      return handleOrchestron(segments, method, init, url.searchParams, acceptHeader);
    }

    return notFound(`the demo only serves /api paths, got ${url.pathname}`);
  }) as typeof fetch;

  return demoFetch;
}
