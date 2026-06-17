import type { NetinfraBackboneLinkDraft } from '$lib/modules/netinfra-backbone-link/model';

export function createNetinfraBackboneLinkDraft(): NetinfraBackboneLinkDraft {
  return {
    leftRouter: '',
    leftInterface: '',
    rightRouter: '',
    rightInterface: '',
    linkStatus: 'unknown'
  };
}
