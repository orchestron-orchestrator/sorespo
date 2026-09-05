import { normalizeIdentity } from '$lib/core/restconf/identity';
import { getSites as getL3VpnSites } from '$lib/modules/l3vpn-site/parse';
import { parseNetinfraRouter } from '$lib/modules/netinfra-router/parse';

export interface NetinfraRouterApi {
  name?: string;
  id?: number;
  type?: string;
  role?: string;
  asn?: number;
  'approval-required'?: boolean;
}

export interface NetinfraBackboneLinkApi {
  'left-router'?: string;
  'left-interface'?: string;
  'right-router'?: string;
  'right-interface'?: string;
  optical?: {
    vlan?: number;
    'left-roadm'?: string;
    'left-port'?: string;
    'right-roadm'?: string;
    'right-port'?: string;
    'otn-path'?: string[];
  };
  state?: {
    'link-status'?: string;
  };
}

export interface NetinfraRoadmApi {
  name?: string;
  id?: number;
  latitude?: number | string;
  longitude?: number | string;
}

export interface NetinfraOpticalLinkApi {
  'left-roadm'?: string;
  'left-port'?: string;
  'right-roadm'?: string;
  'right-port'?: string;
  latency?: number;
}

export type LinkStatus = 'up' | 'down' | 'unknown';

export interface NetinfraPayload {
  'netinfra:netinfra'?: {
    router?: NetinfraRouterApi[];
    roadm?: NetinfraRoadmApi[];
    'backbone-link'?: NetinfraBackboneLinkApi[];
    'optical-link'?: NetinfraOpticalLinkApi[];
  };
}

export interface L3VpnSiteAccessApi {
  'site-network-access-id'?: string;
  bearer?: {
    'bearer-reference'?: string;
  };
  'vpn-attachment'?: {
    'vpn-id'?: string;
  };
}

export interface L3VpnBgpSessionApi {
  'site-network-access'?: string;
  'session-state'?: string;
  'debug-active'?: boolean;
  'last-event'?: string;
  'established-transitions'?: number;
  'negotiated-hold-time'?: number;
  'last-notification'?: string;
}

export interface L3VpnSiteApi {
  'site-id'?: string;
  management?: {
    type?: string;
  };
  'site-network-accesses'?: {
    'site-network-access'?: L3VpnSiteAccessApi[];
  };
  'sorespo-ietf-l3vpn-svc:bgp-sessions'?: {
    'bgp-session'?: L3VpnBgpSessionApi[];
  };
}

export interface L3VpnSitesPayload {
  'ietf-l3vpn-svc:sites'?: {
    site?: L3VpnSiteApi[];
  };
  'ietf-l3vpn-svc:l3vpn-svc'?: {
    sites?: {
      site?: L3VpnSiteApi[];
    };
  };
}

export interface TopologyLinkLabel {
  x: number;
  y: number;
  width: number;
  interfaceLine: string;
}

export interface TopologyLinkGeometry {
  leftX: number;
  leftY: number;
  rightX: number;
  rightY: number;
  label: TopologyLinkLabel | null;
}

export interface TopologyLink {
  id: string;
  leftRouter: string;
  leftInterface: string;
  rightRouter: string;
  rightInterface: string;
  linkStatus: LinkStatus;
  /** Render coordinates; null when either endpoint router is unknown. */
  geometry: TopologyLinkGeometry | null;
}

export type BgpSessionStatus = 'established' | 'down' | 'unknown';

export interface TopologySiteAttachment {
  key: string;
  siteId: string;
  routerName: string;
  routerHint: string;
  vpnIds: string[];
  accessIds: string[];
  managementType: string;
  /** Combined eBGP session status across this attachment's accesses. */
  bgpStatus: BgpSessionStatus;
  /** True if any of this attachment's eBGP sessions is in escalated debug mode. */
  bgpDebugActive: boolean;
  /** Representative raw session-state for display (e.g. "connect"); null if no session. */
  bgpSessionState: string | null;
  x: number;
  y: number;
}

export interface TopologyRouter {
  name: string;
  id: number | null;
  type: string;
  role: string;
  asn: number | null;
  approvalRequired: boolean;
  x: number;
  y: number;
  angle: number;
  attachments: TopologySiteAttachment[];
}

export interface TopologyGraph {
  width: number;
  height: number;
  routers: TopologyRouter[];
  links: TopologyLink[];
  orphanSiteAttachments: TopologySiteAttachment[];
}

interface SiteAttachmentGroup {
  siteId: string;
  routerHint: string;
  accessIds: Set<string>;
  vpnIds: Set<string>;
  managementType: string;
  bgpStatus: BgpSessionStatus;
  bgpDebugActive: boolean;
  bgpSessionState: string | null;
}

export const TOPOLOGY_ROUTER_RADIUS = 42;
export const TOPOLOGY_SITE_CARD_WIDTH = 154;
export const TOPOLOGY_SITE_CARD_HEIGHT = 58;
export const TOPOLOGY_SITE_CARD_GAP = 28;
export const TOPOLOGY_LINK_LABEL_HEIGHT = 56;
export const TOPOLOGY_LINK_LABEL_MIN_WIDTH = 140;
export const TOPOLOGY_LINK_LABEL_MAX_WIDTH = 260;
export const TOPOLOGY_VIEW_PADDING = 48;

export function parseLinkStatus(value: unknown): LinkStatus {
  if (value === 'up') return 'up';
  if (value === 'down') return 'down';
  return 'unknown';
}

/** Map a BGP neighbor session-state to a simple up/down/unknown status. */
export function bgpSessionStatus(state: string | undefined | null): BgpSessionStatus {
  if (!state) return 'unknown';
  return state === 'established' ? 'established' : 'down';
}

function mergeBgpStatus(cur: BgpSessionStatus, next: BgpSessionStatus): BgpSessionStatus {
  if (cur === 'down' || next === 'down') return 'down';
  if (cur === 'established' || next === 'established') return 'established';
  return 'unknown';
}

function getRouters(payload: NetinfraPayload | null | undefined): NetinfraRouterApi[] {
  return Array.isArray(payload?.['netinfra:netinfra']?.router) ? payload['netinfra:netinfra']!.router! : [];
}

function getLinks(payload: NetinfraPayload | null | undefined): NetinfraBackboneLinkApi[] {
  return Array.isArray(payload?.['netinfra:netinfra']?.['backbone-link'])
    ? payload['netinfra:netinfra']!['backbone-link']!
    : [];
}

function getRouterHint(access: L3VpnSiteAccessApi): string {
  const reference = String(access?.bearer?.['bearer-reference'] ?? '').trim();

  if (!reference) {
    return '';
  }

  const [routerHint] = reference.split(',');
  return routerHint?.trim() ?? '';
}

function buildSiteAttachmentGroups(sites: L3VpnSiteApi[]): SiteAttachmentGroup[] {
  const groups = new Map<string, SiteAttachmentGroup>();

  for (const site of sites) {
    const siteId = String(site?.['site-id'] ?? '').trim();
    if (!siteId) {
      continue;
    }

    const managementType = normalizeIdentity(site?.management?.type) || 'unknown';
    const accesses = Array.isArray(site?.['site-network-accesses']?.['site-network-access'])
      ? site['site-network-accesses']!['site-network-access']!
      : [];

    // Lifted eBGP session telemetry, keyed by site-network-access id.
    const sessions = new Map<string, L3VpnBgpSessionApi>();
    const sessionList = Array.isArray(site?.['sorespo-ietf-l3vpn-svc:bgp-sessions']?.['bgp-session'])
      ? site['sorespo-ietf-l3vpn-svc:bgp-sessions']!['bgp-session']!
      : [];
    for (const session of sessionList) {
      const sna = String(session?.['site-network-access'] ?? '').trim();
      if (sna) {
        sessions.set(sna, session);
      }
    }

    const ensureGroup = (routerHint: string): SiteAttachmentGroup => {
      const key = `${siteId}::${routerHint}`;
      if (!groups.has(key)) {
        groups.set(key, {
          siteId,
          routerHint,
          accessIds: new Set<string>(),
          vpnIds: new Set<string>(),
          managementType,
          bgpStatus: 'unknown',
          bgpDebugActive: false,
          bgpSessionState: null
        });
      }
      return groups.get(key)!;
    };

    if (accesses.length === 0) {
      ensureGroup('');
      continue;
    }

    for (const access of accesses) {
      const group = ensureGroup(getRouterHint(access));
      const accessId = String(access?.['site-network-access-id'] ?? '').trim();
      const vpnId = String(access?.['vpn-attachment']?.['vpn-id'] ?? '').trim();

      if (accessId) {
        group.accessIds.add(accessId);
      }

      if (vpnId) {
        group.vpnIds.add(vpnId);
      }

      const session = accessId ? sessions.get(accessId) : undefined;
      if (session) {
        const status = bgpSessionStatus(session['session-state']);
        group.bgpStatus = mergeBgpStatus(group.bgpStatus, status);
        if (session['debug-active']) {
          group.bgpDebugActive = true;
        }
        // Prefer a non-established raw state for the tooltip; otherwise keep the first seen.
        if (status === 'down' || group.bgpSessionState === null) {
          group.bgpSessionState = String(session['session-state'] ?? '') || group.bgpSessionState;
        }
      }
    }
  }

  return Array.from(groups.values());
}

const LINK_LABEL_CHAR_WIDTH = 7;
const LINK_LABEL_PADDING = 28;
const LINK_LABEL_SEPARATOR = ' ↔ ';

/**
 * Shorten `name` to fit `maxChars`: abbreviate the leading type word to two
 * letters and keep the numeric port suffix ("GigabitEthernet0/0/0/0" → "Gi0/0/0/0"),
 * ellipsis-truncating the tail as a fallback.
 */
export function shortenInterfaceName(name: string, maxChars: number): string {
  const trimmed = name.trim();
  if (trimmed.length <= maxChars) {
    return trimmed;
  }
  const [, type = '', port = ''] = trimmed.match(/^(\D*)(\d.*)$/) ?? [];
  const candidate = type ? type.replace(/\W/g, '').slice(0, 2) + port : trimmed;
  if (candidate.length <= maxChars) {
    return candidate;
  }
  return maxChars <= 1 ? candidate.slice(0, Math.max(0, maxChars)) : `…${candidate.slice(1 - maxChars)}`;
}

// Per-interface character budget so that "<left> ↔ <right>" fits the widest
// allowed link-label box.
function getInterfaceLabelCharBudget(): number {
  const maxLineChars = Math.floor(
    (TOPOLOGY_LINK_LABEL_MAX_WIDTH - LINK_LABEL_PADDING) / LINK_LABEL_CHAR_WIDTH
  );
  return Math.max(4, Math.floor((maxLineChars - LINK_LABEL_SEPARATOR.length) / 2));
}

/**
 * Build the "<left> ↔ <right>" interface line shown on a backbone link,
 * shortening either side that would otherwise overflow the label box.
 */
function getLinkInterfaceLabel(leftInterface: string, rightInterface: string): string {
  const budget = getInterfaceLabelCharBudget();
  const left = shortenInterfaceName(leftInterface.trim() || 'left interface', budget);
  const right = shortenInterfaceName(rightInterface.trim() || 'right interface', budget);
  return `${left}${LINK_LABEL_SEPARATOR}${right}`;
}

function getLinkLabelWidth(
  leftInterface: string,
  rightInterface: string
): number {
  const interfaceLine = getLinkInterfaceLabel(leftInterface, rightInterface);
  const longest = interfaceLine.length;
  return Math.max(
    TOPOLOGY_LINK_LABEL_MIN_WIDTH,
    Math.min(TOPOLOGY_LINK_LABEL_MAX_WIDTH, LINK_LABEL_PADDING + longest * LINK_LABEL_CHAR_WIDTH)
  );
}

// Pushes the label away from the layout origin (the ring center), so it must
// be called with pre-shift coordinates — the sign of mid·normal is not
// translation-invariant.
function getLinkLabelPosition(
  leftX: number,
  leftY: number,
  rightX: number,
  rightY: number
): { x: number; y: number } {
  const midX = (leftX + rightX) / 2;
  const midY = (leftY + rightY) / 2;
  const deltaX = rightX - leftX;
  const deltaY = rightY - leftY;
  const length = Math.hypot(deltaX, deltaY) || 1;
  const normalX = -deltaY / length;
  const normalY = deltaX / length;
  const direction = midX * normalX + midY * normalY >= 0 ? 1 : -1;
  const offset = TOPOLOGY_LINK_LABEL_HEIGHT / 2 + 10;

  return {
    x: midX + normalX * offset * direction,
    y: midY + normalY * offset * direction
  };
}

function computeCanvasSize(routerCount: number): { width: number; height: number } {
  const width = Math.max(980, 760 + Math.max(routerCount - 1, 0) * 180);
  const height = Math.max(660, 520 + Math.ceil(Math.max(routerCount - 2, 0) / 2) * 120);
  return { width, height };
}

function computeRouterPositions(
  routers: NetinfraRouterApi[]
): { x: number; y: number; angle: number }[] {
  const count = routers.length;
  const { width, height } = computeCanvasSize(count);
  const radiusX = Math.max(220, width * 0.26);
  const radiusY = Math.max(170, height * 0.22);

  if (count <= 1) {
    return [
      {
        x: 0,
        y: 0,
        angle: -Math.PI / 2
      }
    ];
  }

  return routers.map((_router, index) => {
    const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;
    return {
      x: Math.cos(angle) * radiusX,
      y: Math.sin(angle) * radiusY,
      angle
    };
  });
}

function getRouterHalfWidth(router: TopologyRouter): number {
  return Math.max(TOPOLOGY_ROUTER_RADIUS + 12, router.name.length * 4.4);
}

function getGraphBounds(routers: TopologyRouter[], links: TopologyLink[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  const includeBox = (x: number, y: number, halfWidth: number, halfHeight: number) => {
    minX = Math.min(minX, x - halfWidth);
    minY = Math.min(minY, y - halfHeight);
    maxX = Math.max(maxX, x + halfWidth);
    maxY = Math.max(maxY, y + halfHeight);
  };

  for (const router of routers) {
    includeBox(router.x, router.y, getRouterHalfWidth(router), TOPOLOGY_ROUTER_RADIUS + 18);

    for (const attachment of router.attachments) {
      includeBox(
        attachment.x,
        attachment.y,
        TOPOLOGY_SITE_CARD_WIDTH / 2,
        TOPOLOGY_SITE_CARD_HEIGHT / 2
      );
    }
  }

  for (const link of links) {
    const label = link.geometry?.label;
    if (!label) {
      continue;
    }

    includeBox(label.x, label.y, label.width / 2, TOPOLOGY_LINK_LABEL_HEIGHT / 2);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return {
      minX: -240,
      minY: -180,
      maxX: 240,
      maxY: 180
    };
  }

  return { minX, minY, maxX, maxY };
}

function buildLinkGeometry(
  link: Omit<TopologyLink, 'geometry'>,
  routerMap: Map<string, TopologyRouter>
): TopologyLinkGeometry | null {
  const leftRouter = routerMap.get(link.leftRouter);
  const rightRouter = routerMap.get(link.rightRouter);

  if (!leftRouter || !rightRouter) {
    return null;
  }

  let label: TopologyLinkLabel | null = null;

  if (link.leftInterface || link.rightInterface) {
    const position = getLinkLabelPosition(leftRouter.x, leftRouter.y, rightRouter.x, rightRouter.y);
    label = {
      x: position.x,
      y: position.y,
      width: getLinkLabelWidth(link.leftInterface, link.rightInterface),
      interfaceLine: getLinkInterfaceLabel(link.leftInterface, link.rightInterface)
    };
  }

  return {
    leftX: leftRouter.x,
    leftY: leftRouter.y,
    rightX: rightRouter.x,
    rightY: rightRouter.y,
    label
  };
}

function shiftLinkGeometry(
  geometry: TopologyLinkGeometry | null,
  shiftX: number,
  shiftY: number
): TopologyLinkGeometry | null {
  if (!geometry) {
    return null;
  }

  return {
    leftX: geometry.leftX + shiftX,
    leftY: geometry.leftY + shiftY,
    rightX: geometry.rightX + shiftX,
    rightY: geometry.rightY + shiftY,
    label: geometry.label
      ? { ...geometry.label, x: geometry.label.x + shiftX, y: geometry.label.y + shiftY }
      : null
  };
}

export function buildTopologyGraph(
  netinfraPayload: NetinfraPayload,
  l3vpnSitesPayload: L3VpnSitesPayload | null = null
): TopologyGraph {
  const routerApis = getRouters(netinfraPayload).filter((router) => String(router?.name ?? '').trim());
  const bareLinks = getLinks(netinfraPayload)
    .filter((link) => String(link?.['left-router'] ?? '').trim() && String(link?.['right-router'] ?? '').trim())
    .map((link, index) => ({
      id: `${String(link['left-router'])}-${String(link['right-router'])}-${index}`,
      leftRouter: String(link['left-router']),
      leftInterface: String(link['left-interface'] ?? ''),
      rightRouter: String(link['right-router']),
      rightInterface: String(link['right-interface'] ?? ''),
      linkStatus: parseLinkStatus(link.state?.['link-status'])
    }));

  const positions = computeRouterPositions(routerApis);

  const routers: TopologyRouter[] = routerApis.map((routerApi, index) => {
    const draft = parseNetinfraRouter(routerApi);
    return {
      name: draft.name,
      id: draft.id,
      type: draft.type,
      role: draft.role,
      asn: draft.asn,
      approvalRequired: draft.approvalRequired,
      x: positions[index]?.x ?? 0,
      y: positions[index]?.y ?? 0,
      angle: positions[index]?.angle ?? -Math.PI / 2,
      attachments: []
    };
  });

  const routerMap = new Map(routers.map((router) => [router.name, router]));
  const orphanSiteAttachments: TopologySiteAttachment[] = [];

  const attachmentGroups = buildSiteAttachmentGroups(getL3VpnSites(l3vpnSitesPayload));

  for (const group of attachmentGroups) {
    const attachment: TopologySiteAttachment = {
      key: `${group.siteId}::${group.routerHint}`,
      siteId: group.siteId,
      routerName: group.routerHint,
      routerHint: group.routerHint,
      vpnIds: Array.from(group.vpnIds).sort(),
      accessIds: Array.from(group.accessIds).sort(),
      managementType: group.managementType,
      bgpStatus: group.bgpStatus,
      bgpDebugActive: group.bgpDebugActive,
      bgpSessionState: group.bgpSessionState,
      x: 0,
      y: 0
    };

    const router = group.routerHint ? routerMap.get(group.routerHint) : null;

    if (!router) {
      orphanSiteAttachments.push(attachment);
      continue;
    }

    router.attachments = [...router.attachments, attachment];
  }

  for (const router of routers) {
    router.attachments.sort((left, right) => left.siteId.localeCompare(right.siteId));

    const radialX = Math.cos(router.angle);
    const radialY = Math.sin(router.angle);
    const tangentX = -Math.sin(router.angle);
    const tangentY = Math.cos(router.angle);
    const radialExtent =
      Math.abs(radialX) * (TOPOLOGY_SITE_CARD_WIDTH / 2) +
      Math.abs(radialY) * (TOPOLOGY_SITE_CARD_HEIGHT / 2);
    const tangentExtent =
      Math.abs(tangentX) * (TOPOLOGY_SITE_CARD_WIDTH / 2) +
      Math.abs(tangentY) * (TOPOLOGY_SITE_CARD_HEIGHT / 2);
    const baseDistance = TOPOLOGY_ROUTER_RADIUS + radialExtent + TOPOLOGY_SITE_CARD_GAP;
    const spacing = Math.max(TOPOLOGY_SITE_CARD_HEIGHT + 14, tangentExtent * 2 + 12);
    const baseX = router.x + radialX * baseDistance;
    const baseY = router.y + radialY * baseDistance;

    router.attachments = router.attachments.map((attachment, index, items) => {
      const offset = (index - (items.length - 1) / 2) * spacing;
      return {
        ...attachment,
        x: baseX + tangentX * offset,
        y: baseY + tangentY * offset
      };
    });
  }

  orphanSiteAttachments.sort((left, right) => left.siteId.localeCompare(right.siteId));

  // Label placement depends on pre-shift coordinates (see getLinkLabelPosition),
  // so geometry is computed once here and shifted together with the routers.
  const links: TopologyLink[] = bareLinks.map((link) => ({
    ...link,
    geometry: buildLinkGeometry(link, routerMap)
  }));

  const bounds = getGraphBounds(routers, links);
  const shiftX = TOPOLOGY_VIEW_PADDING - bounds.minX;
  const shiftY = TOPOLOGY_VIEW_PADDING - bounds.minY;
  const shiftedRouters = routers.map((router) => ({
    ...router,
    x: router.x + shiftX,
    y: router.y + shiftY,
    attachments: router.attachments.map((attachment) => ({
      ...attachment,
      x: attachment.x + shiftX,
      y: attachment.y + shiftY
    }))
  }));
  const shiftedLinks = links.map((link) => ({
    ...link,
    geometry: shiftLinkGeometry(link.geometry, shiftX, shiftY)
  }));
  const width = Math.ceil(bounds.maxX - bounds.minX + TOPOLOGY_VIEW_PADDING * 2);
  const height = Math.ceil(bounds.maxY - bounds.minY + TOPOLOGY_VIEW_PADDING * 2);

  return {
    width,
    height,
    routers: shiftedRouters,
    links: shiftedLinks,
    orphanSiteAttachments
  };
}
