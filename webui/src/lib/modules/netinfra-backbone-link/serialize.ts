import type { NetinfraBackboneLinkDraft } from '$lib/modules/netinfra-backbone-link/model';

export function serializeNetinfraBackboneLinkDraft(draft: NetinfraBackboneLinkDraft): unknown {
  return {
    'left-router': draft.leftRouter.trim(),
    'left-interface': draft.leftInterface.trim(),
    'right-router': draft.rightRouter.trim(),
    'right-interface': draft.rightInterface.trim()
  };
}
