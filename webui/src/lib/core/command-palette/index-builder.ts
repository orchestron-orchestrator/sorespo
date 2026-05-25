import { fetchDevices, type QueueItemSummary } from '$lib/core/orchestron/client';
import { listServiceModules, listServiceModuleMeta } from '$lib/core/registry/service-modules';
import { formatServiceRouteId } from '$lib/core/registry/types';
import { restconfGetJson } from '$lib/core/restconf/client';

import type { PaletteEntry } from './types';

export function buildStaticEntries(): PaletteEntry[] {
  const entries: PaletteEntry[] = [
    { id: 'nav:dashboard', category: 'Navigation', label: 'Dashboard', href: '/' },
    { id: 'nav:devices', category: 'Navigation', label: 'Devices', href: '/devices' },
    {
      id: 'nav:config-queue',
      category: 'Navigation',
      label: 'Config Queue',
      href: '/operations/config-queue'
    },
    { id: 'nav:services', category: 'Navigation', label: 'Service Modules', href: '/services' }
  ];

  for (const meta of listServiceModuleMeta()) {
    entries.push({
      id: `nav:services:${meta.id}`,
      category: 'Navigation',
      label: meta.title,
      description: `Browse ${meta.collectionLabel.toLowerCase()}`,
      href: `/services/${meta.id}`,
      keywords: meta.id
    });
    entries.push({
      id: `nav:services:${meta.id}:new`,
      category: 'Navigation',
      label: `New ${meta.title}`,
      description: 'Create a new entry',
      href: `/services/${meta.id}/new`,
      keywords: `${meta.id} create new`
    });
  }

  return entries;
}

export async function fetchDynamicEntries(
  queues: QueueItemSummary[]
): Promise<PaletteEntry[]> {
  const entries: PaletteEntry[] = [];

  const deviceEntriesPromise = (async () => {
    try {
      const devices = await fetchDevices();
      for (const device of devices) {
        entries.push({
          id: `device:${device.id}`,
          category: 'Devices',
          label: device.name,
          description: device.id === device.name ? undefined : device.id,
          href: `/devices/${device.id}`,
          keywords: device.id
        });
      }
    } catch {
      // ignore — palette still shows other entries
    }
  })();

  const modules = listServiceModules();
  const servicePromises = modules.map(async (module) => {
    if (!module.list) return;

    try {
      const response = await restconfGetJson(
        module.collectionRestconfRoot ?? module.restconfRoot
      );
      const items = module.list(response);
      for (const item of items) {
        const displayId = formatServiceRouteId(module, item.id);
        entries.push({
          id: `service:${module.id}:${item.id}`,
          category: module.title,
          label: item.label && item.label !== item.id ? item.label : displayId,
          description: item.description,
          href: `/services/${module.id}/${encodeURIComponent(item.id)}`,
          keywords: `${module.id} ${item.id} ${displayId}`
        });
      }
    } catch {
      // ignore — other modules still populate
    }
  });

  await Promise.all([deviceEntriesPromise, ...servicePromises]);

  for (const item of queues) {
    const status =
      item.approved === true ? 'Approved' : item.approved === false ? 'Rejected' : 'Pending';
    entries.push({
      id: `queue:${item.deviceId}:${item.queueId}`,
      category: 'Config Queue',
      label: `${item.deviceId} queue #${item.queueId}`,
      description: status,
      href: '/operations/config-queue',
      keywords: `${item.deviceId} ${item.queueId} ${status}`
    });
  }

  return entries;
}

export function filterEntries(entries: PaletteEntry[], query: string): PaletteEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;

  return entries.filter((entry) => {
    const haystacks = [
      entry.label,
      entry.description ?? '',
      entry.keywords ?? '',
      entry.category
    ];

    return haystacks.some((text) => text.toLowerCase().includes(q));
  });
}
