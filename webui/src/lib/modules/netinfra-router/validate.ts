import type { ValidationResult } from '$lib/core/validation/types';
import type { NetinfraRouterDraft } from '$lib/modules/netinfra-router/model';

export function validateNetinfraRouterDraft(draft: NetinfraRouterDraft): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];

  if (!draft.name.trim()) {
    errors.name = 'Router name is required.';
  }

  if (draft.id === null || Number.isNaN(draft.id)) {
    errors.id = 'Router ID is required.';
  } else if (draft.id <= 0) {
    errors.id = 'Router ID must be greater than zero.';
  }

  if (!draft.type.trim()) {
    errors.type = 'Platform type is required.';
  }

  if (draft.asn === null || Number.isNaN(draft.asn)) {
    errors.asn = 'ASN is required.';
  } else if (draft.asn <= 0) {
    errors.asn = 'ASN must be greater than zero.';
  }

  if (draft.mock && draft.approvalRequired) {
    warnings.push('Mock routers typically do not need approval workflows.');
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    warnings
  };
}
