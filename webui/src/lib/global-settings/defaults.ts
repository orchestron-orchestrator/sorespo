import type { GlobalSettingsDraft } from '$lib/global-settings/model';

export function createGlobalSettingsDraft(): GlobalSettingsDraft {
  return {
    ibgpAuthenticationKey: ''
  };
}
