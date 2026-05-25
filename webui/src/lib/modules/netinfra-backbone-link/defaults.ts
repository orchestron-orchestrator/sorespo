import type { NetinfraBackboneLinkDraft } from '$lib/modules/netinfra-backbone-link/model';

export function createNetinfraBackboneLinkDraft(): NetinfraBackboneLinkDraft {
  return {
    leftRouter: '',
    leftInterface: '',
    rightRouter: '',
    rightInterface: '',
    monitorTraffic: false,
    leftPps: null,
    rightPps: null,
    linkStatus: 'unknown'
  };
}
