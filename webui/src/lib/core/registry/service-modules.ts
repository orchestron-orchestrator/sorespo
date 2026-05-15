import { module as l3vpnSite } from '$lib/modules/l3vpn-site/manifest';
import { module as l3vpnVpnService } from '$lib/modules/l3vpn-vpn-service/manifest';
import { module as netinfraBackboneLink } from '$lib/modules/netinfra-backbone-link/manifest';
import { module as netinfraRouter } from '$lib/modules/netinfra-router/manifest';

import type { AnyServiceModule, ServiceModuleMeta } from '$lib/core/registry/types';

export const serviceModules = {
  'l3vpn-site': l3vpnSite,
  'l3vpn-vpn-service': l3vpnVpnService,
  'netinfra-backbone-link': netinfraBackboneLink,
  'netinfra-router': netinfraRouter
} satisfies Record<string, AnyServiceModule>;

export function listServiceModules(): AnyServiceModule[] {
  return Object.values(serviceModules);
}

export function listServiceModuleMeta(): ServiceModuleMeta[] {
  return listServiceModules().map(({ id, title, collectionLabel, description }) => ({
    id,
    title,
    collectionLabel,
    description
  }));
}

export function getServiceModule(moduleId: string): AnyServiceModule | null {
  return serviceModules[moduleId as keyof typeof serviceModules] ?? null;
}
