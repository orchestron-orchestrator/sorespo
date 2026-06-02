import { createGlobalSettingsDraft } from '$lib/global-settings/defaults';

import type { GlobalSettingsDraft } from '$lib/global-settings/model';

function getSettingsEntry(input: any): any | null {
  if (input?.['netinfra:global-settings'] && typeof input['netinfra:global-settings'] === 'object') {
    return input['netinfra:global-settings'];
  }

  if (input?.['global-settings'] && typeof input['global-settings'] === 'object') {
    return input['global-settings'];
  }

  if (input?.['netinfra:netinfra']?.['global-settings']) {
    return input['netinfra:netinfra']['global-settings'];
  }

  if (input && typeof input === 'object' && 'ibgp-authentication-key' in input) {
    return input;
  }

  return null;
}

export function parseGlobalSettings(input: unknown): GlobalSettingsDraft {
  const defaults = createGlobalSettingsDraft();
  const entry = getSettingsEntry(input);

  if (!entry) {
    return defaults;
  }

  return {
    ibgpAuthenticationKey: String(entry['ibgp-authentication-key'] ?? '')
  };
}
