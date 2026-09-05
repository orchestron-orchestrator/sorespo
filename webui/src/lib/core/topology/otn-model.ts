import type {
  LinkStatus,
  NetinfraBackboneLinkApi,
  NetinfraOpticalLinkApi,
  NetinfraPayload,
  NetinfraRoadmApi,
  NetinfraRouterApi
} from '$lib/core/topology/model';
import { parseLinkStatus } from '$lib/core/topology/model';

export interface OtnPoint {
  x: number;
  y: number;
}

export interface OtnRoadm extends OtnPoint {
  name: string;
  id: number | null;
}

export interface OtnRouter extends OtnPoint {
  name: string;
  id: number | null;
}

export interface OtnPhysicalLink {
  id: string;
  leftRoadm: string;
  leftPort: string;
  rightRoadm: string;
  rightPort: string;
  latency: number | null;
  left: OtnPoint;
  right: OtnPoint;
}

export interface OtnRouterAttachment {
  id: string;
  router: string;
  routerInterface: string;
  roadm: string;
  roadmPort: string;
  routerPoint: OtnPoint;
  roadmPoint: OtnPoint;
}

export interface OtnPathSegment {
  id: string;
  from: string;
  to: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface OtnBackbonePath {
  id: string;
  label: string;
  color: string;
  vlan: number | null;
  linkStatus: LinkStatus;
  nodes: string[];
  segments: OtnPathSegment[];
}

export interface OtnGraph {
  width: number;
  height: number;
  roadms: OtnRoadm[];
  routers: OtnRouter[];
  physicalLinks: OtnPhysicalLink[];
  attachments: OtnRouterAttachment[];
  paths: OtnBackbonePath[];
}

const PATH_COLORS = [
  '#22d3ee',
  '#f59e0b',
  '#a78bfa',
  '#22c55e',
  '#f43f5e',
  '#60a5fa',
  '#e879f9',
  '#a3e635'
];

const ROADMS_RADIUS = 28;
const ROUTER_WIDTH = 112;
const ROUTER_HEIGHT = 46;
const VIEW_PADDING = 72;

function nonEmpty(value: unknown): string {
  return String(value ?? '').trim();
}

function getNetinfra(payload: NetinfraPayload): NonNullable<NetinfraPayload['netinfra:netinfra']> {
  return payload['netinfra:netinfra'] ?? {};
}

function sortedRoadms(roadms: NetinfraRoadmApi[]): NetinfraRoadmApi[] {
  return [...roadms]
    .filter((roadm) => nonEmpty(roadm.name))
    .sort((left, right) => {
      const idDelta = Number(left.id ?? Number.MAX_SAFE_INTEGER) - Number(right.id ?? Number.MAX_SAFE_INTEGER);
      return idDelta || nonEmpty(left.name).localeCompare(nonEmpty(right.name));
    });
}

function sortedRouters(routers: NetinfraRouterApi[]): NetinfraRouterApi[] {
  return [...routers]
    .filter((router) => nonEmpty(router.name))
    .sort((left, right) => {
      const idDelta = Number(left.id ?? Number.MAX_SAFE_INTEGER) - Number(right.id ?? Number.MAX_SAFE_INTEGER);
      return idDelta || nonEmpty(left.name).localeCompare(nonEmpty(right.name));
    });
}

function ringPoint(index: number, count: number, centerX: number, centerY: number, radiusX: number, radiusY: number): OtnPoint {
  if (count <= 1) {
    return { x: centerX, y: centerY };
  }
  const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;
  return {
    x: centerX + Math.cos(angle) * radiusX,
    y: centerY + Math.sin(angle) * radiusY
  };
}

function edgeKey(left: string, right: string): string {
  return [left, right].sort().join('::');
}

function getPathNodes(link: NetinfraBackboneLinkApi): string[] {
  const optical = link.optical;
  if (!optical) return [];
  return [
    nonEmpty(link['left-router']),
    nonEmpty(optical['left-roadm']),
    ...(Array.isArray(optical['otn-path']) ? optical['otn-path'].map(nonEmpty) : []),
    nonEmpty(optical['right-roadm']),
    nonEmpty(link['right-router'])
  ].filter(Boolean);
}

function buildOffsetSegments(
  paths: Omit<OtnBackbonePath, 'segments'>[],
  nodePoints: Map<string, OtnPoint>
): OtnBackbonePath[] {
  const edgeUsers = new Map<string, number[]>();

  paths.forEach((path, pathIndex) => {
    for (let index = 0; index < path.nodes.length - 1; index += 1) {
      const key = edgeKey(path.nodes[index], path.nodes[index + 1]);
      const users = edgeUsers.get(key) ?? [];
      users.push(pathIndex);
      edgeUsers.set(key, users);
    }
  });

  return paths.map((path, pathIndex) => {
    const segments: OtnPathSegment[] = [];
    for (let index = 0; index < path.nodes.length - 1; index += 1) {
      const from = path.nodes[index];
      const to = path.nodes[index + 1];
      const start = nodePoints.get(from);
      const end = nodePoints.get(to);
      if (!start || !end) continue;

      const users = edgeUsers.get(edgeKey(from, to)) ?? [pathIndex];
      const lane = users.indexOf(pathIndex) - (users.length - 1) / 2;
      const deltaX = end.x - start.x;
      const deltaY = end.y - start.y;
      const length = Math.hypot(deltaX, deltaY) || 1;
      const offset = lane * 7;
      const offsetX = (-deltaY / length) * offset;
      const offsetY = (deltaX / length) * offset;

      segments.push({
        id: `${path.id}-${index}`,
        from,
        to,
        x1: start.x + offsetX,
        y1: start.y + offsetY,
        x2: end.x + offsetX,
        y2: end.y + offsetY
      });
    }
    return { ...path, segments };
  });
}

export function buildOtnGraph(payload: NetinfraPayload): OtnGraph {
  const netinfra = getNetinfra(payload);
  const roadmApis = sortedRoadms(Array.isArray(netinfra.roadm) ? netinfra.roadm : []);
  const routerApis = sortedRouters(Array.isArray(netinfra.router) ? netinfra.router : []);
  const backboneLinks = Array.isArray(netinfra['backbone-link']) ? netinfra['backbone-link'] : [];
  const opticalLinks = Array.isArray(netinfra['optical-link']) ? netinfra['optical-link'] : [];

  const width = Math.max(820, 580 + Math.max(roadmApis.length, routerApis.length) * 60);
  const height = Math.max(660, 520 + Math.ceil(roadmApis.length / 4) * 36);
  const centerX = width / 2;
  const centerY = height / 2;
  const roadmRadiusX = Math.max(165, Math.min(width * 0.24, 70 + roadmApis.length * 24));
  const roadmRadiusY = Math.max(155, Math.min(height * 0.25, 95 + roadmApis.length * 18));
  const routerRadiusX = width / 2 - VIEW_PADDING - ROUTER_WIDTH / 2;
  const routerRadiusY = height / 2 - VIEW_PADDING - ROUTER_HEIGHT / 2;

  const roadms: OtnRoadm[] = roadmApis.map((roadm, index) => ({
    name: nonEmpty(roadm.name),
    id: typeof roadm.id === 'number' ? roadm.id : null,
    ...ringPoint(index, roadmApis.length, centerX, centerY, roadmRadiusX, roadmRadiusY)
  }));
  const routers: OtnRouter[] = routerApis.map((router, index) => ({
    name: nonEmpty(router.name),
    id: typeof router.id === 'number' ? router.id : null,
    ...ringPoint(index, routerApis.length, centerX, centerY, routerRadiusX, routerRadiusY)
  }));
  const roadmMap = new Map(roadms.map((roadm) => [roadm.name, roadm]));
  const routerMap = new Map(routers.map((router) => [router.name, router]));
  const nodePoints = new Map<string, OtnPoint>([
    ...roadms.map((roadm): [string, OtnPoint] => [roadm.name, roadm]),
    ...routers.map((router): [string, OtnPoint] => [router.name, router])
  ]);

  const physicalLinks: OtnPhysicalLink[] = opticalLinks.flatMap((link: NetinfraOpticalLinkApi, index) => {
    const leftRoadm = nonEmpty(link['left-roadm']);
    const rightRoadm = nonEmpty(link['right-roadm']);
    const left = roadmMap.get(leftRoadm);
    const right = roadmMap.get(rightRoadm);
    if (!left || !right) return [];
    return [{
      id: `${leftRoadm}-${rightRoadm}-${index}`,
      leftRoadm,
      leftPort: nonEmpty(link['left-port']),
      rightRoadm,
      rightPort: nonEmpty(link['right-port']),
      latency: typeof link.latency === 'number' ? link.latency : null,
      left,
      right
    }];
  });

  const attachments: OtnRouterAttachment[] = [];
  const attachmentIds = new Set<string>();
  const barePaths: Omit<OtnBackbonePath, 'segments'>[] = [];

  backboneLinks.forEach((link, index) => {
    const optical = link.optical;
    if (!optical) return;
    const leftRouter = nonEmpty(link['left-router']);
    const rightRouter = nonEmpty(link['right-router']);
    const leftRoadm = nonEmpty(optical['left-roadm']);
    const rightRoadm = nonEmpty(optical['right-roadm']);

    const addAttachment = (router: string, routerInterface: string, roadm: string, roadmPort: string) => {
      const id = `${router}::${routerInterface}::${roadm}::${roadmPort}`;
      const routerPoint = routerMap.get(router);
      const roadmPoint = roadmMap.get(roadm);
      if (attachmentIds.has(id) || !routerPoint || !roadmPoint) return;
      attachmentIds.add(id);
      attachments.push({ id, router, routerInterface, roadm, roadmPort, routerPoint, roadmPoint });
    };

    addAttachment(leftRouter, nonEmpty(link['left-interface']), leftRoadm, nonEmpty(optical['left-port']));
    addAttachment(rightRouter, nonEmpty(link['right-interface']), rightRoadm, nonEmpty(optical['right-port']));

    const nodes = getPathNodes(link);
    if (nodes.length < 4 || nodes.some((name) => !nodePoints.has(name))) return;
    barePaths.push({
      id: `${leftRouter}-${rightRouter}-${index}`,
      label: `${leftRouter} ↔ ${rightRouter}`,
      color: PATH_COLORS[barePaths.length % PATH_COLORS.length],
      vlan: typeof optical.vlan === 'number' ? optical.vlan : null,
      linkStatus: parseLinkStatus(link.state?.['link-status']),
      nodes
    });
  });

  return {
    width,
    height,
    roadms,
    routers,
    physicalLinks,
    attachments,
    paths: buildOffsetSegments(barePaths, nodePoints)
  };
}

export const OTN_ROADM_RADIUS = ROADMS_RADIUS;
export const OTN_ROUTER_WIDTH = ROUTER_WIDTH;
export const OTN_ROUTER_HEIGHT = ROUTER_HEIGHT;