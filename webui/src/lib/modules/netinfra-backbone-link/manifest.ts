import Editor from '$lib/modules/netinfra-backbone-link/Editor.svelte';
import Preview from '$lib/modules/netinfra-backbone-link/Preview.svelte';
import Summary from '$lib/modules/netinfra-backbone-link/Summary.svelte';
import { createNetinfraBackboneLinkDraft } from '$lib/modules/netinfra-backbone-link/defaults';
import {
  formatNetinfraBackboneLinkRouteId,
  getNetinfraBackboneLinkPathKey,
  getNetinfraBackboneLinkRouteId,
  parseNetinfraBackboneLinkRouteId
} from '$lib/modules/netinfra-backbone-link/model';
import {
  listNetinfraBackboneLinks,
  parseNetinfraBackboneLink
} from '$lib/modules/netinfra-backbone-link/parse';
import { serializeNetinfraBackboneLinkDraft } from '$lib/modules/netinfra-backbone-link/serialize';
import { validateNetinfraBackboneLinkDraft } from '$lib/modules/netinfra-backbone-link/validate';

import type { ServiceModule } from '$lib/core/registry/types';
import type { NetinfraBackboneLinkDraft } from '$lib/modules/netinfra-backbone-link/model';

export const module: ServiceModule<NetinfraBackboneLinkDraft> = {
  id: 'netinfra-backbone-link',
  title: 'Netinfra Backbone Link',
  collectionLabel: 'Backbone links',
  description: 'Create and edit `netinfra:backbone-link` entries through the shared service workspace.',
  deletable: true,
  collectionRestconfRoot: 'data/netinfra:netinfra',
  restconfRoot: 'data/netinfra:netinfra/backbone-link',
  keyParam: 'leftRouter',
  keyLabel: 'left-router, left-interface, right-router, and right-interface',
  createDraft: createNetinfraBackboneLinkDraft,
  parse: parseNetinfraBackboneLink,
  cloneDraft: (draft) => ({
    ...draft,
    leftRouter: '',
    leftInterface: '',
    rightRouter: '',
    rightInterface: '',
    leftPps: null,
    rightPps: null,
    linkStatus: 'unknown'
  }),
  list: listNetinfraBackboneLinks,
  validate: validateNetinfraBackboneLinkDraft,
  serialize: serializeNetinfraBackboneLinkDraft,
  getKey: getNetinfraBackboneLinkRouteId,
  getPathKey: getNetinfraBackboneLinkPathKey,
  parseRouteId: parseNetinfraBackboneLinkRouteId,
  formatRouteId: formatNetinfraBackboneLinkRouteId,
  Editor,
  Summary,
  Preview
};
