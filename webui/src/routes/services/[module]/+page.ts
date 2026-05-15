import { error } from '@sveltejs/kit';

import { getServiceModule } from '$lib/core/registry/service-modules';
import { restconfGetJson } from '$lib/core/restconf/client';

import type { ServiceListItem } from '$lib/core/registry/types';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch, depends }) => {
  const serviceModule = getServiceModule(params.module);

  if (!serviceModule) {
    error(404, `Unknown service module: ${params.module}`);
  }

  depends(`data:services:${params.module}`);

  const base = {
    moduleId: serviceModule.id,
    title: serviceModule.title,
    description: serviceModule.description
  };

  if (!serviceModule.list) {
    return { ...base, items: [] as ServiceListItem[], loadError: '' };
  }

  try {
    const response = await restconfGetJson(
      serviceModule.collectionRestconfRoot ?? serviceModule.restconfRoot,
      fetch
    );
    return { ...base, items: serviceModule.list(response), loadError: '' };
  } catch (loadError) {
    const message = loadError instanceof Error ? loadError.message : 'Failed to load existing services.';
    return { ...base, items: [] as ServiceListItem[], loadError: message };
  }
};
