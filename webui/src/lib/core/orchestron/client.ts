const API_BASE = '/api';

export interface DeviceSummary {
  id: string;
  name: string;
  type?: string;
  address?: string;
  username?: string;
  queueLength?: number;
  pendingApprovals?: number;
  hasRunningConfig?: boolean;
  hasTargetConfig?: boolean;
  approvalRequired?: boolean;
}

export interface DeviceAddress {
  name: string;
  address: string;
  port: number;
}

export interface DeviceModuleInfo {
  name: string;
  namespace: string;
  revision?: string;
  features?: string[];
}

export interface DeviceInfo {
  id: string;
  name: string;
  type?: string;
  approvalRequired: boolean;
  addresses: DeviceAddress[];
  username?: string;
  hasRunningConfig?: boolean;
  hasTargetConfig?: boolean;
  queueLength?: number;
  pendingApprovals?: number;
  featureFlags?: Record<string, boolean>;
  modules?: DeviceModuleInfo[];
}

export interface QueueItemDetail {
  tid?: string;
  device_txid?: string;
  config_diff?: string;
  format?: string;
  approved?: boolean | null;
}

export interface QueueItemSummary {
  deviceId: string;
  queueId: string;
  tid?: string;
  deviceTxid?: string;
  configDiff?: string;
  approved?: boolean | null;
}

export interface ConfigLogEntry {
  event: string;
  timestamp: string;
  conf_diff?: string;
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
  }

  const text = await response.text();
  return text ? (JSON.parse(text) as T) : (null as T);
}

type Fetch = typeof fetch;

async function apiRequest<T>(path: string, init: RequestInit = {}, fetchFn: Fetch = fetch): Promise<T> {
  const headers = new Headers(init.headers);

  if (!headers.has('content-type') && init.body) {
    headers.set('content-type', 'application/json');
  }

  return readJson<T>(
    await fetchFn(`${API_BASE}${path}`, {
      ...init,
      headers
    })
  );
}

export async function fetchDevices(fetchFn: Fetch = fetch): Promise<DeviceSummary[]> {
  const response = await apiRequest<{ devices?: string[] }>('/device', {}, fetchFn);
  const deviceNames = response.devices ?? [];

  const summaries = await Promise.allSettled(
    deviceNames.map(async (name) => {
      const upperId = name.toUpperCase();
      const info = await apiRequest<any>(`/device/${upperId}/info`, {}, fetchFn);
      const firstAddr = Array.isArray(info.addresses) && info.addresses.length > 0 ? info.addresses[0] : null;
      const address = firstAddr
        ? `${firstAddr.address}${firstAddr.port ? `:${firstAddr.port}` : ''}`
        : undefined;

      return {
        id: upperId,
        name: info.name || upperId,
        type: info.type,
        address,
        username: info.username,
        queueLength: info.queue_length,
        pendingApprovals: info.pending_approvals,
        hasRunningConfig: info.has_running_config,
        hasTargetConfig: info.has_target_config,
        approvalRequired: Boolean(info.approval_required)
      } satisfies DeviceSummary;
    })
  );

  return summaries.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }

    const name = deviceNames[index] ?? '';
    return {
      id: name.toUpperCase(),
      name
    } satisfies DeviceSummary;
  });
}

export async function fetchDevice(deviceId: string, fetchFn: Fetch = fetch): Promise<DeviceInfo> {
  const upperId = deviceId.toUpperCase();
  const info = await apiRequest<any>(`/device/${upperId}/info`, {}, fetchFn);
  return {
    id: upperId,
    name: info.name || upperId,
    type: info.type,
    approvalRequired: Boolean(info.approval_required),
    addresses: info.addresses || [],
    username: info.username,
    hasRunningConfig: info.has_running_config,
    hasTargetConfig: info.has_target_config,
    queueLength: info.queue_length,
    pendingApprovals: info.pending_approvals,
    featureFlags: info.feature_flags,
    modules: info.modules
  };
}

export async function resyncDevice(deviceId: string): Promise<unknown> {
  return apiRequest(`/device/${deviceId.toUpperCase()}/resync`);
}

export async function fetchDeviceConfigQueue(deviceId: string): Promise<Record<string, { approved?: boolean }>> {
  return apiRequest(`/device/${deviceId.toUpperCase()}/q`);
}

export async function fetchConfigQueueItem(
  deviceId: string,
  queueId: string,
  format = 'xml'
): Promise<QueueItemDetail> {
  return apiRequest(`/device/${deviceId.toUpperCase()}/q/${queueId}?format=${format}`);
}

export async function approveConfigQueueItem(
  deviceId: string,
  queueId: string,
  deviceTxid: string | undefined,
  approved = true
): Promise<unknown> {
  return apiRequest(`/device/${deviceId.toUpperCase()}/q/${queueId}/set_approval`, {
    method: 'POST',
    body: JSON.stringify({
      device_txid: deviceTxid,
      approved
    })
  });
}

export async function fetchAllDeviceQueues(): Promise<QueueItemSummary[]> {
  const response = await apiRequest<any>('/config-queue');
  const items: QueueItemSummary[] = [];

  for (const device of response.devices ?? []) {
    for (const item of device.items ?? []) {
      items.push({
        deviceId: device.device_id,
        queueId: String(item.queue_id),
        tid: item.tid,
        deviceTxid: item.device_txid,
        configDiff: item.config_diff,
        approved: item.approved
      });
    }
  }

  return items;
}

export async function fetchDeviceRunningConfig(deviceId: string, format = 'json'): Promise<string> {
  const response = await fetch(`${API_BASE}/device/${deviceId.toUpperCase()}/running?format=${format}`);
  if (!response.ok) {
    throw new Error('Failed to fetch running config');
  }
  return response.text();
}

export async function fetchDeviceTargetConfig(deviceId: string, format = 'json'): Promise<string> {
  const response = await fetch(`${API_BASE}/device/${deviceId.toUpperCase()}/target?format=${format}`);
  if (!response.ok) {
    throw new Error('Failed to fetch target config');
  }
  return response.text();
}

export async function fetchDeviceConfigDiff(deviceId: string, format = 'json'): Promise<string> {
  const response = await fetch(`${API_BASE}/device/${deviceId.toUpperCase()}/diff?format=${format}`);
  if (!response.ok) {
    throw new Error('Failed to fetch config diff');
  }
  return response.text();
}

export async function fetchDeviceConfigLog(
  deviceId: string,
  format = 'json'
): Promise<{ log?: ConfigLogEntry[] }> {
  return apiRequest(`/device/${deviceId.toUpperCase()}/log?format=${format}`);
}

// The /layer/<index> endpoint selects its serialization via the Accept header
// (unlike the /device config endpoints, which use a ?format= query param).
const LAYER_ACCEPT: Record<string, string> = {
  xml: 'application/yang-data+xml',
  json: 'application/yang-data+json',
  adata: 'application/yang-data+acton-adata'
};

export async function fetchLayerConfig(index: number, format = 'xml'): Promise<string> {
  const accept = LAYER_ACCEPT[format] ?? LAYER_ACCEPT.xml;
  const suffix = format === 'adata' ? '?loose=true' : '';
  const response = await fetch(`${API_BASE}/layer/${index}${suffix}`, { headers: { accept } });
  if (!response.ok) {
    throw new Error(`Failed to fetch layer ${index} config (HTTP ${response.status})`);
  }
  return response.text();
}
