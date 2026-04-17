import { module as netinfraRouter } from '$lib/modules/netinfra-router/manifest';

import type { AnyServiceModule, ServiceModuleMeta } from '$lib/core/registry/types';

export const serviceModules = {
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
