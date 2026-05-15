import type { NetinfraRouterDraft } from '$lib/modules/netinfra-router/model';

export function createNetinfraRouterDraft(): NetinfraRouterDraft {
  return {
    name: '',
    id: null,
    type: '',
    role: '',
    asn: null,
    mock: false,
    approvalRequired: false,
    featureFlags: {
      runtimeSchemaFetch: false
    }
  };
}
