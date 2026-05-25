import type { ValidationResult } from '$lib/core/validation/types';
import type { NetinfraBackboneLinkDraft } from '$lib/modules/netinfra-backbone-link/model';

export function validateNetinfraBackboneLinkDraft(
  draft: NetinfraBackboneLinkDraft
): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];

  if (!draft.leftRouter.trim()) {
    errors.leftRouter = 'Left router is required.';
  }

  if (!draft.leftInterface.trim()) {
    errors.leftInterface = 'Left interface is required.';
  }

  if (!draft.rightRouter.trim()) {
    errors.rightRouter = 'Right router is required.';
  }

  if (!draft.rightInterface.trim()) {
    errors.rightInterface = 'Right interface is required.';
  }

  if (
    draft.leftRouter.trim() &&
    draft.leftInterface.trim() &&
    draft.rightRouter.trim() &&
    draft.rightInterface.trim() &&
    draft.leftRouter.trim() === draft.rightRouter.trim() &&
    draft.leftInterface.trim() === draft.rightInterface.trim()
  ) {
    errors.rightInterface = 'Backbone link endpoints must not be identical.';
  } else if (
    draft.leftRouter.trim() &&
    draft.rightRouter.trim() &&
    draft.leftRouter.trim() === draft.rightRouter.trim()
  ) {
    warnings.push('Both endpoints use the same router. Confirm this is intentional.');
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    warnings
  };
}
