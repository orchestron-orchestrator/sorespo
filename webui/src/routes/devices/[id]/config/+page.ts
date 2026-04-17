import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
  return {
    deviceId: params.id.toUpperCase()
  };
};
