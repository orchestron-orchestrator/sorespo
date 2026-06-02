import { createGlobalSettingsDraft } from '$lib/global-settings/defaults';
import { parseGlobalSettings } from '$lib/global-settings/parse';
import { restconfGetJson } from '$lib/core/restconf/client';

import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, depends }) => {
  depends('data:global-settings');

  try {
    const response = await restconfGetJson('data/netinfra:netinfra/global-settings', fetch);
    return {
      draft: parseGlobalSettings(response),
      loadError: ''
    };
  } catch (loadError) {
    const message =
      loadError instanceof Error ? loadError.message : 'Failed to load global settings.';
    return {
      draft: createGlobalSettingsDraft(),
      loadError: message
    };
  }
};
