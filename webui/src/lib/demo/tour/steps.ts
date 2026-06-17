import type { TourStep } from '$lib/demo/tour/types';

export const TOUR_STEPS: TourStep[] = [
  {
    route: '/',
    title: 'Welcome to the StratoWeave web UI',
    body: 'This is a fully interactive demo of the SORESPO web UI running on simulated data in your browser — nothing here touches a real network. Click Next for a quick lap around the system, or skip and explore freely.'
  },
  {
    route: '/',
    target: 'topology',
    title: 'Live network topology',
    body: 'The dashboard draws the network straight from the netinfra service model: core routers, backbone links with live link status, and the customer sites attached to them. It refreshes every few seconds to pick up state changes.'
  },
  {
    route: '/',
    target: 'devices-table',
    title: 'Managed devices',
    body: 'Every router the orchestrator manages, with queue depth, pending approvals, and config status at a glance. AMS-CORE-1 is set to require manual approval — remember that when we reach the config queue.'
  },
  {
    route: '/',
    target: 'service-cards',
    title: 'Service modules',
    body: 'Entry points for editing the service layer: routers, backbone links, VPN services, and customer sites. Each card maps to a YANG-backed RESTCONF list.'
  },
  {
    route: '/devices',
    target: 'device-grid',
    title: 'Device inventory',
    body: 'All managed devices, searchable. Each card opens a detail view with the device’s configuration, queue, and change history.'
  },
  {
    route: '/devices/AMS-CORE-1',
    target: 'device-actions',
    title: 'Device detail',
    body: 'Metadata, feature flags, and this device’s own slice of the config queue. Resync re-reads configuration from the device; the two buttons open the views we’ll visit next.'
  },
  {
    route: '/devices/AMS-CORE-1',
    target: 'device-modules',
    title: 'YANG modules',
    body: 'The YANG modules this device advertises over NETCONF — the schema surface the orchestrator can program against.'
  },
  {
    route: '/devices/AMS-CORE-1/config',
    target: 'config-viewer',
    title: 'Running vs target configuration',
    body: 'Inspect the device’s running or target configuration in JSON, XML, GData, or AData. Right now they differ, because AMS-CORE-1 has changes waiting for approval.'
  },
  {
    route: '/devices/AMS-CORE-1/log',
    target: 'log-history',
    title: 'Configuration log',
    body: 'Every configuration push to this device with its diff — sent, failed, or resynced. The list polls live every second.'
  },
  {
    route: '/operations/config-queue',
    target: 'queue-list',
    title: 'The global config queue',
    body: 'Queued changes across all devices in one place. Because AMS-CORE-1 requires approval, its changes wait here until someone reviews them.'
  },
  {
    route: '/operations/config-queue',
    target: 'queue-actions',
    title: 'Approve and apply',
    body: 'Review the diff, then try it yourself: Approve & Apply pushes the change to the device — it leaves the queue and lands in the device’s config log. Reject discards it.'
  },
  {
    route: '/configure',
    target: 'configure-editor',
    title: 'Apply CFS config',
    body: 'Bootstrap or bulk-edit the whole service layer by pasting a JSON or XML payload against /restconf/data. In the demo, applying a payload enqueues the resulting device changes.'
  },
  {
    route: '/layers',
    target: 'layer-viewer',
    title: 'The transformation layers',
    body: 'Watch intent become device config: from CFS (what you asked for) through the intermediate and RFS layers down to per-device configuration — in XML, JSON, or AData.'
  },
  {
    route: '/services/l3vpn-site',
    target: 'service-list',
    title: 'L3VPN sites',
    body: 'The customer sites of the L3VPN services, straight from RESTCONF. Open one to edit it, clone it as a starting point for a new site, or remove it.'
  },
  {
    route: '/services/l3vpn-site/new',
    target: 'workspace-editor',
    title: 'The service workspace',
    body: 'A guided editor with local validation and a live payload preview. Saving PUTs the entry to RESTCONF — and queues the rendered configuration for the site’s router.'
  },
  {
    route: '/global-settings',
    target: 'workspace-editor',
    title: 'Global settings',
    body: 'Network-wide knobs. Change the iBGP authentication key and save — a config change queues for every router at once. That’s the tour! Restart it any time from the demo bar below.'
  }
];
