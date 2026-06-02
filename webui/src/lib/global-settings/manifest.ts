import Editor from '$lib/global-settings/Editor.svelte';
import Preview from '$lib/global-settings/Preview.svelte';
import Summary from '$lib/global-settings/Summary.svelte';
import { createGlobalSettingsDraft } from '$lib/global-settings/defaults';
import { parseGlobalSettings } from '$lib/global-settings/parse';
import { serializeGlobalSettingsDraft } from '$lib/global-settings/serialize';
import { validateGlobalSettingsDraft } from '$lib/global-settings/validate';

import type { ServiceModule } from '$lib/core/registry/types';
import type { GlobalSettingsDraft } from '$lib/global-settings/model';

/**
 * Synthetic singleton "module" used to drive `ServiceWorkspace` for the
 * `/global-settings` route. Not registered in `service-modules` because
 * the framework's list-based `[module]/[id]` routes don't apply — a
 * singleton has no key, no list, and no delete. The route reads/writes
 * data/netinfra:netinfra/global-settings directly; this manifest only
 * supplies the workspace shape (Editor/Summary/Preview + validation +
 * serialize). keyParam is unused for the singleton but the type requires it.
 */
export const module: ServiceModule<GlobalSettingsDraft> = {
  id: 'global-settings',
  title: 'Global Settings',
  collectionLabel: 'Singleton',
  description:
    'Network-wide settings applied to every router (netinfra:netinfra/global-settings).',
  deletable: false,
  restconfRoot: 'data/netinfra:netinfra/global-settings',
  keyParam: '__singleton__',
  createDraft: createGlobalSettingsDraft,
  parse: parseGlobalSettings,
  validate: validateGlobalSettingsDraft,
  serialize: serializeGlobalSettingsDraft,
  Editor,
  Summary,
  Preview
};
