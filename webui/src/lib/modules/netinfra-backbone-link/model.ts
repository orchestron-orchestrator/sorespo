export type NetinfraBackboneLinkStatus = 'up' | 'down' | 'unknown';

export interface NetinfraBackboneLinkDraft {
  leftRouter: string;
  leftInterface: string;
  rightRouter: string;
  rightInterface: string;
  /** Read-only operational link status lifted from the CFS backbone-link state
   * (up only when both endpoints are oper-up). Not serialized. */
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

export function parseNetinfraBackboneLinkRouteId(id: string): string[] {
  // The id arrives already percent-decoded (route params and query params are
  // decoded by the router), so the parts must not be decoded again.
  const parts = id.split(',').map((part) => part.trim());

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
