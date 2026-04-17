import Editor from '$lib/modules/netinfra-router/Editor.svelte';
import Preview from '$lib/modules/netinfra-router/Preview.svelte';
import Summary from '$lib/modules/netinfra-router/Summary.svelte';
import { createNetinfraRouterDraft } from '$lib/modules/netinfra-router/defaults';
import { listNetinfraRouters, parseNetinfraRouter } from '$lib/modules/netinfra-router/parse';
import { serializeNetinfraRouterDraft } from '$lib/modules/netinfra-router/serialize';
import { validateNetinfraRouterDraft } from '$lib/modules/netinfra-router/validate';

import type { ServiceModule } from '$lib/core/registry/types';
import type { NetinfraRouterDraft } from '$lib/modules/netinfra-router/model';

export const module: ServiceModule<NetinfraRouterDraft> = {
  id: 'netinfra-router',
  title: 'Netinfra Router',
  collectionLabel: 'Router services',
  description: 'Create and edit `netinfra:router` list entries through a shared workspace shell.',
  restconfRoot: 'data/netinfra:netinfra/router',
  keyParam: 'name',
  createDraft: createNetinfraRouterDraft,
  parse: parseNetinfraRouter,
  list: listNetinfraRouters,
  validate: validateNetinfraRouterDraft,
  serialize: serializeNetinfraRouterDraft,
  Editor,
  Summary,
  Preview
};
