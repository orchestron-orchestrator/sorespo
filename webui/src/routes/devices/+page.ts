import { fetchDevices } from '$lib/core/orchestron/client';

import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, depends }) => {
  depends('data:devices');
  try {
    return { devices: await fetchDevices(fetch), loadError: '' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load devices.';
    return { devices: [], loadError: message };
  }
};
