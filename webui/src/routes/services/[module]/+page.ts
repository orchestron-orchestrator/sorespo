import { error } from '@sveltejs/kit';

import { getServiceModule } from '$lib/core/registry/service-modules';

import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
  const serviceModule = getServiceModule(params.module);

  if (!serviceModule) {
    error(404, `Unknown service module: ${params.module}`);
  }

  return {
    moduleId: serviceModule.id,
    title: serviceModule.title,
    description: serviceModule.description
  };
};
