import { error } from '@sveltejs/kit';

import { getServiceModule } from '$lib/core/registry/service-modules';
import { createClonedDraft, getRoutePathKey } from '$lib/core/registry/types';
import { getListEntryPath, restconfGetJson } from '$lib/core/restconf/client';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, url, fetch, depends }) => {
  const serviceModule = getServiceModule(params.module);

  if (!serviceModule) {
    error(404, `Unknown service module: ${params.module}`);
  }

  const cloneSourceId = url.searchParams.get('clone')?.trim() ?? '';
  const base = {
    moduleId: serviceModule.id,
    cloneSourceId,
    cloneError: '',
    routeKey: `${serviceModule.id}:new:${cloneSourceId || 'empty'}`
  };

  if (!cloneSourceId) {
    return {
      ...base,
      draft: serviceModule.createDraft()
    };
  }

  depends(`data:service-clone:${params.module}:${cloneSourceId}`);

  try {
    const response = await restconfGetJson(
      getListEntryPath(serviceModule.restconfRoot, getRoutePathKey(serviceModule, cloneSourceId)),
      fetch
    );

    return {
      ...base,
      draft: createClonedDraft(serviceModule, serviceModule.parse(response))
    };
  } catch (loadError) {
    const message = loadError instanceof Error ? loadError.message : 'Failed to load clone source.';

    return {
      ...base,
      draft: serviceModule.createDraft(),
      cloneError: `Failed to clone ${cloneSourceId}: ${message}`
    };
  }
};
