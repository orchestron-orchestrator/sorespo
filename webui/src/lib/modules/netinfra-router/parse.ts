import { createNetinfraRouterDraft } from '$lib/modules/netinfra-router/defaults';

import type { ServiceListItem } from '$lib/core/registry/types';
import type { NetinfraRouterDraft } from '$lib/modules/netinfra-router/model';

function getRouterEntry(input: any): any | null {
  if (Array.isArray(input?.['netinfra:router'])) {
    return input['netinfra:router'][0] ?? null;
  }

  if (Array.isArray(input?.['netinfra:netinfra']?.router)) {
    return input['netinfra:netinfra'].router[0] ?? null;
  }

  if (input && typeof input === 'object' && 'name' in input) {
    return input;
  }

  return null;
}

export function parseNetinfraRouter(input: unknown): NetinfraRouterDraft {
  const defaults = createNetinfraRouterDraft();
  const router = getRouterEntry(input);

  if (!router) {
    return defaults;
  }

  return {
    name: String(router.name ?? ''),
    id: typeof router.id === 'number' ? router.id : router.id ? Number(router.id) : null,
    type: String(router.type ?? ''),
    role: String(router.role ?? ''),
    asn: typeof router.asn === 'number' ? router.asn : router.asn ? Number(router.asn) : null,
    mock: Boolean(router.mock ?? false),
    approvalRequired: Boolean(router['approval-required'] ?? false),
    featureFlags: {
      runtimeSchemaFetch: Boolean(router['feature-flags']?.['runtime-schema-fetch'] ?? false)
    }
  };
}

export function listNetinfraRouters(input: any): ServiceListItem[] {
  const routers = input?.['netinfra:netinfra']?.router ?? input?.['netinfra:router'] ?? [];

  if (!Array.isArray(routers)) {
    return [];
  }

  return routers.map((router) => ({
    id: String(router.name),
    label: String(router.name),
    description: [router.type, router.role || null, router.asn ? `AS${router.asn}` : null].filter(Boolean).join(' · ')
  }));
}
