import type { NetinfraRouterDraft } from '$lib/modules/netinfra-router/model';

export function serializeNetinfraRouterDraft(draft: NetinfraRouterDraft): unknown {
  const router: Record<string, unknown> = {
    name: draft.name.trim(),
    type: draft.type.trim()
  };

  if (draft.id !== null) {
    router.id = draft.id;
  }

  if (draft.role.trim()) {
    router.role = draft.role.trim();
  }

  if (draft.asn !== null) {
    router.asn = draft.asn;
  }

  if (draft.mock) {
    router.mock = true;
  }

  if (draft.approvalRequired) {
    router['approval-required'] = true;
  }

  if (draft.featureFlags.runtimeSchemaFetch) {
    router['feature-flags'] = {
      'runtime-schema-fetch': true
    };
  }

  return {
    'netinfra:router': [router]
  };
}
