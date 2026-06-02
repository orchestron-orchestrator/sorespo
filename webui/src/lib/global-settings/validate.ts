import type { ValidationResult } from '$lib/core/validation/types';
import type { GlobalSettingsDraft } from '$lib/global-settings/model';

export function validateGlobalSettingsDraft(draft: GlobalSettingsDraft): ValidationResult {
  const errors: Record<string, string> = {};

  if (!draft.ibgpAuthenticationKey.trim()) {
    errors.ibgpAuthenticationKey = 'iBGP authentication key is required.';
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors
  };
}
