import { parseLinkStatus, parsePps } from '$lib/core/topology/model';
import { createNetinfraBackboneLinkDraft } from '$lib/modules/netinfra-backbone-link/defaults';
import {
  formatNetinfraBackboneLinkEndpoints,
  getNetinfraBackboneLinkRouteId
} from '$lib/modules/netinfra-backbone-link/model';

import type { ServiceListItem } from '$lib/core/registry/types';
import type { NetinfraBackboneLinkDraft } from '$lib/modules/netinfra-backbone-link/model';

function getBackboneLinkEntry(input: any): any | null {
  if (Array.isArray(input?.['netinfra:backbone-link'])) {
    return input['netinfra:backbone-link'][0] ?? null;
  }

  if (Array.isArray(input?.['netinfra:netinfra']?.['backbone-link'])) {
    return input['netinfra:netinfra']['backbone-link'][0] ?? null;
  }

  if (input && typeof input === 'object' && 'left-router' in input) {
    return input;
  }

  return null;
}

export function parseNetinfraBackboneLink(input: unknown): NetinfraBackboneLinkDraft {
  const defaults = createNetinfraBackboneLinkDraft();
  const backboneLink = getBackboneLinkEntry(input);

  if (!backboneLink) {
    return defaults;
  }

  const state = backboneLink.state;

  return {
    leftRouter: String(backboneLink['left-router'] ?? ''),
    leftInterface: String(backboneLink['left-interface'] ?? ''),
    rightRouter: String(backboneLink['right-router'] ?? ''),
    rightInterface: String(backboneLink['right-interface'] ?? ''),
    monitorTraffic: Boolean(backboneLink['monitor-traffic'] ?? false),
    leftPps: parsePps(state?.['left-pps']),
    rightPps: parsePps(state?.['right-pps']),
    linkStatus: parseLinkStatus(state?.['link-status'])
  };
}

export function listNetinfraBackboneLinks(input: any): ServiceListItem[] {
  const backboneLinks =
    input?.['netinfra:netinfra']?.['backbone-link'] ?? input?.['netinfra:backbone-link'] ?? [];

  if (!Array.isArray(backboneLinks)) {
    return [];
  }

  return backboneLinks.map((backboneLink) => {
    const draft = parseNetinfraBackboneLink(backboneLink);
    const badges = draft.monitorTraffic
      ? [
          {
            text: `● ${draft.linkStatus}`,
            tone: draft.linkStatus,
            title: 'Combined link oper-status (AND of both endpoints)'
          }
        ]
      : undefined;

    return {
      id: getNetinfraBackboneLinkRouteId(draft),
      label: formatNetinfraBackboneLinkEndpoints(draft),
      description: draft.monitorTraffic
        ? 'Traffic monitoring enabled'
        : 'Traffic monitoring disabled',
      badges
    };
  });
}
