export type NetinfraBackboneLinkStatus = 'up' | 'down' | 'unknown';

export interface NetinfraBackboneLinkDraft {
  leftRouter: string;
  leftInterface: string;
  rightRouter: string;
  rightInterface: string;
  monitorTraffic: boolean;
  /** Read-only operational state lifted from the lower layers. Not serialized. */
  leftPps: number | null;
  /** Read-only operational state lifted from the lower layers. Not serialized. */
  rightPps: number | null;
  /** Combined link status (AND of both endpoints' oper-state). Not serialized. */
  linkStatus: NetinfraBackboneLinkStatus;
}

export function getNetinfraBackboneLinkRouteId(
  draft: Pick<
    NetinfraBackboneLinkDraft,
    'leftRouter' | 'leftInterface' | 'rightRouter' | 'rightInterface'
  >
): string {
  return [
    draft.leftRouter.trim(),
    draft.leftInterface.trim(),
    draft.rightRouter.trim(),
    draft.rightInterface.trim()
  ].join(',');
}

export function getNetinfraBackboneLinkPathKey(
  draft: Pick<
    NetinfraBackboneLinkDraft,
    'leftRouter' | 'leftInterface' | 'rightRouter' | 'rightInterface'
  >
): string[] {
  return [
    draft.leftRouter.trim(),
    draft.leftInterface.trim(),
    draft.rightRouter.trim(),
    draft.rightInterface.trim()
  ];
}

function decodeRoutePart(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function parseNetinfraBackboneLinkRouteId(id: string): string[] {
  const parts = id.split(',').map((part) => decodeRoutePart(part).trim());

  while (parts.length < 4) {
    parts.push('');
  }

  return parts.slice(0, 4);
}

export function formatNetinfraBackboneLinkRouteId(id: string): string {
  const [leftRouter, leftInterface, rightRouter, rightInterface] =
    parseNetinfraBackboneLinkRouteId(id);

  return formatNetinfraBackboneLinkEndpoints({
    leftRouter,
    leftInterface,
    rightRouter,
    rightInterface
  });
}

export function formatNetinfraBackboneLinkEndpoints(
  draft: Pick<
    NetinfraBackboneLinkDraft,
    'leftRouter' | 'leftInterface' | 'rightRouter' | 'rightInterface'
  >
): string {
  const left = [draft.leftRouter.trim(), draft.leftInterface.trim()].filter(Boolean).join(' ');
  const right = [draft.rightRouter.trim(), draft.rightInterface.trim()].filter(Boolean).join(' ');

  if (left && right) {
    return `${left} ↔ ${right}`;
  }

  return left || right || 'Unassigned endpoints';
}
