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
  'monitor-traffic'?: boolean;
  state?: {
    'left-pps'?: number | string;
    'right-pps'?: number | string;
    'link-status'?: string;
  };
}

export type LinkStatus = 'up' | 'down' | 'unknown';

export interface NetinfraPayload {
  'netinfra:netinfra'?: {
    router?: NetinfraRouterApi[];
    'backbone-link'?: NetinfraBackboneLinkApi[];
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

export interface L3VpnSiteApi {
  'site-id'?: string;
  management?: {
    type?: string;
  };
  'site-network-accesses'?: {
    'site-network-access'?: L3VpnSiteAccessApi[];
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

export interface TopologyLink {
  id: string;
  leftRouter: string;
  leftInterface: string;
  rightRouter: string;
  rightInterface: string;
  monitorTraffic: boolean;
  leftPps: number | null;
  rightPps: number | null;
  linkStatus: LinkStatus;
}

export interface TopologySiteAttachment {
  key: string;
  siteId: string;
  routerName: string;
  routerHint: string;
  vpnIds: string[];
  accessIds: string[];
  managementType: string;
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
}

export const TOPOLOGY_ROUTER_RADIUS = 42;
export const TOPOLOGY_SITE_CARD_WIDTH = 154;
export const TOPOLOGY_SITE_CARD_HEIGHT = 58;
export const TOPOLOGY_SITE_CARD_GAP = 28;
export const TOPOLOGY_LINK_LABEL_HEIGHT = 56;
export const TOPOLOGY_VIEW_PADDING = 48;

function parsePps(value: number | string | undefined): number | null {
  if (value === undefined || value === null) {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseLinkStatus(value: string | undefined): LinkStatus {
  if (value === 'up') return 'up';
  if (value === 'down') return 'down';
  return 'unknown';
}

function normalizeIdentity(value: unknown): string {
  const raw = String(value ?? '').trim();
  return raw.includes(':') ? raw.split(':').pop() ?? '' : raw;
}

function getRouters(payload: NetinfraPayload | null | undefined): NetinfraRouterApi[] {
  return Array.isArray(payload?.['netinfra:netinfra']?.router) ? payload['netinfra:netinfra']!.router! : [];
}

function getLinks(payload: NetinfraPayload | null | undefined): NetinfraBackboneLinkApi[] {
  return Array.isArray(payload?.['netinfra:netinfra']?.['backbone-link'])
    ? payload['netinfra:netinfra']!['backbone-link']!
    : [];
}

function getSites(payload: L3VpnSitesPayload | null | undefined): L3VpnSiteApi[] {
  if (Array.isArray(payload?.['ietf-l3vpn-svc:sites']?.site)) {
    return payload['ietf-l3vpn-svc:sites']!.site!;
  }

  if (Array.isArray(payload?.['ietf-l3vpn-svc:l3vpn-svc']?.sites?.site)) {
    return payload['ietf-l3vpn-svc:l3vpn-svc']!.sites!.site!;
  }

  return [];
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

    if (accesses.length === 0) {
      const key = `${siteId}::`;
      groups.set(key, {
        siteId,
        routerHint: '',
        accessIds: new Set<string>(),
        vpnIds: new Set<string>(),
        managementType
      });
      continue;
    }

    for (const access of accesses) {
      const routerHint = getRouterHint(access);
      const key = `${siteId}::${routerHint}`;

      if (!groups.has(key)) {
        groups.set(key, {
          siteId,
          routerHint,
          accessIds: new Set<string>(),
          vpnIds: new Set<string>(),
          managementType
        });
      }

      const group = groups.get(key)!;
      const accessId = String(access?.['site-network-access-id'] ?? '').trim();
      const vpnId = String(access?.['vpn-attachment']?.['vpn-id'] ?? '').trim();

      if (accessId) {
        group.accessIds.add(accessId);
      }

      if (vpnId) {
        group.vpnIds.add(vpnId);
      }
    }
  }

  return Array.from(groups.values());
}

export function formatPps(pps: number | null): string {
  if (pps === null) {
    return '—';
  }
  if (pps >= 10_000) {
    return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(pps);
  }
  return new Intl.NumberFormat('en').format(pps);
}

export function getLinkPpsLabel(link: TopologyLink): string {
  if (!link.monitorTraffic) {
    return '';
  }
  return `→ ${formatPps(link.leftPps)} pps    ← ${formatPps(link.rightPps)}`;
}

export function getLinkLabelWidth(
  leftInterface: string,
  rightInterface: string,
  ppsLabel: string = ''
): number {
  const interfaceLineLength = leftInterface.trim().length + rightInterface.trim().length + 3;
  const longest = Math.max(interfaceLineLength, ppsLabel.length);
  return Math.max(140, Math.min(260, 28 + longest * 7));
}

export function getLinkLabelPosition(
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

  const routerMap = new Map(routers.map((router) => [router.name, router]));

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
    const leftRouter = routerMap.get(link.leftRouter);
    const rightRouter = routerMap.get(link.rightRouter);

    if (!leftRouter || !rightRouter || (!link.leftInterface && !link.rightInterface)) {
      continue;
    }

    const label = getLinkLabelPosition(leftRouter.x, leftRouter.y, rightRouter.x, rightRouter.y);
    includeBox(
      label.x,
      label.y,
      getLinkLabelWidth(link.leftInterface, link.rightInterface, getLinkPpsLabel(link)) / 2,
      TOPOLOGY_LINK_LABEL_HEIGHT / 2
    );
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

export function buildTopologyGraph(
  netinfraPayload: NetinfraPayload,
  l3vpnSitesPayload: L3VpnSitesPayload | null = null
): TopologyGraph {
  const routerApis = getRouters(netinfraPayload).filter((router) => String(router?.name ?? '').trim());
  const links = getLinks(netinfraPayload)
    .filter((link) => String(link?.['left-router'] ?? '').trim() && String(link?.['right-router'] ?? '').trim())
    .map((link, index) => ({
      id: `${String(link['left-router'])}-${String(link['right-router'])}-${index}`,
      leftRouter: String(link['left-router']),
      leftInterface: String(link['left-interface'] ?? ''),
      rightRouter: String(link['right-router']),
      rightInterface: String(link['right-interface'] ?? ''),
      monitorTraffic: Boolean(link['monitor-traffic'] ?? false),
      leftPps: parsePps(link.state?.['left-pps']),
      rightPps: parsePps(link.state?.['right-pps']),
      linkStatus: parseLinkStatus(link.state?.['link-status'])
    }));

  const positions = computeRouterPositions(routerApis);

  const routers: TopologyRouter[] = routerApis.map((router, index) => ({
    name: String(router.name),
    id: typeof router.id === 'number' ? router.id : router.id ? Number(router.id) : null,
    type: String(router.type ?? ''),
    role: String(router.role ?? ''),
    asn: typeof router.asn === 'number' ? router.asn : router.asn ? Number(router.asn) : null,
    approvalRequired: Boolean(router['approval-required'] ?? false),
    x: positions[index]?.x ?? 0,
    y: positions[index]?.y ?? 0,
    angle: positions[index]?.angle ?? -Math.PI / 2,
    attachments: []
  }));

  const routerMap = new Map(routers.map((router) => [router.name, router]));
  const orphanSiteAttachments: TopologySiteAttachment[] = [];

  const attachmentGroups = buildSiteAttachmentGroups(getSites(l3vpnSitesPayload));

  for (const group of attachmentGroups) {
    const attachment: TopologySiteAttachment = {
      key: `${group.siteId}::${group.routerHint}`,
      siteId: group.siteId,
      routerName: group.routerHint,
      routerHint: group.routerHint,
      vpnIds: Array.from(group.vpnIds).sort(),
      accessIds: Array.from(group.accessIds).sort(),
      managementType: group.managementType,
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
  const width = Math.ceil(bounds.maxX - bounds.minX + TOPOLOGY_VIEW_PADDING * 2);
  const height = Math.ceil(bounds.maxY - bounds.minY + TOPOLOGY_VIEW_PADDING * 2);

  return {
    width,
    height,
    routers: shiftedRouters,
    links,
    orphanSiteAttachments
  };
}
