import type { GlobalSettingsDraft } from '$lib/global-settings/model';

export function serializeGlobalSettingsDraft(draft: GlobalSettingsDraft): unknown {
  const settings: Record<string, unknown> = {};

  const key = draft.ibgpAuthenticationKey.trim();
  if (key) {
    settings['ibgp-authentication-key'] = key;
  }

  return settings;
}
