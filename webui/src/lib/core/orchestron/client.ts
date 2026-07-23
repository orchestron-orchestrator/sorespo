import { demoFetch } from '$lib/demo/gate';

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
  deviceTxid?: string;
  approved?: boolean | null;
}

// The backend serializes `approved` with Python str(): "True", "False" or "null".
function parseApproved(value: unknown): boolean | null {
  if (value === true || value === 'True') return true;
  if (value === false || value === 'False') return false;
  return null;
}

export function isPendingQueueItem(item: Pick<QueueItemSummary, 'approved'>): boolean {
  return item.approved !== true && item.approved !== false;
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
    await (demoFetch ?? fetchFn)(`${API_BASE}${path}`, {
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
      const info = await apiRequest<any>(`/device/${encodeURIComponent(name)}/info`, {}, fetchFn);
      const firstAddr = Array.isArray(info.addresses) && info.addresses.length > 0 ? info.addresses[0] : null;
      const address = firstAddr
        ? `${firstAddr.address}${firstAddr.port ? `:${firstAddr.port}` : ''}`
        : undefined;

      return {
        id: name,
        name: info.name || name,
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
      id: name,
      name
    } satisfies DeviceSummary;
  });
}

export async function fetchDevice(deviceId: string, fetchFn: Fetch = fetch): Promise<DeviceInfo> {
  const info = await apiRequest<any>(`/device/${encodeURIComponent(deviceId)}/info`, {}, fetchFn);
  return {
    id: deviceId,
    name: info.name || deviceId,
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
  return apiRequest(`/device/${encodeURIComponent(deviceId)}/resync`);
}

export async function fetchDeviceConfigQueue(
  deviceId: string
): Promise<Record<string, { tid?: string }>> {
  return apiRequest(`/device/${encodeURIComponent(deviceId)}/q`);
}

export async function fetchConfigQueueItem(
  deviceId: string,
  queueId: string,
  format = 'xml'
): Promise<QueueItemDetail> {
  const detail = await apiRequest<any>(
    `/device/${encodeURIComponent(deviceId)}/q/${encodeURIComponent(queueId)}?format=${format}`
  );
  return { ...(detail ?? {}), approved: parseApproved(detail?.approved) };
}

export async function approveConfigQueueItem(
  deviceId: string,
  queueId: string,
  deviceTxid: string | undefined,
  approved = true
): Promise<unknown> {
  return apiRequest(
    `/device/${encodeURIComponent(deviceId)}/q/${encodeURIComponent(queueId)}/set_approval`,
    {
      method: 'POST',
      body: JSON.stringify({
        device_txid: deviceTxid,
        approved
      })
    }
  );
}

export async function fetchAllDeviceQueues(): Promise<QueueItemSummary[]> {
  const response = await apiRequest<any>('/config-queue');
  const items: QueueItemSummary[] = [];

  for (const device of response.devices ?? []) {
    for (const item of device.items ?? []) {
      items.push({
        deviceId: device.device_id,
        queueId: String(item.queue_id),
        deviceTxid: item.device_txid,
        approved: parseApproved(item.approved)
      });
    }
  }

  return items;
}

export async function fetchDeviceRunningConfig(deviceId: string, format = 'json'): Promise<string> {
  const response = await (demoFetch ?? fetch)(
    `${API_BASE}/device/${encodeURIComponent(deviceId)}/running?format=${format}`
  );
  if (!response.ok) {
    throw new Error('Failed to fetch running config');
  }
  return response.text();
}

export async function fetchDeviceTargetConfig(deviceId: string, format = 'json'): Promise<string> {
  const response = await (demoFetch ?? fetch)(
    `${API_BASE}/device/${encodeURIComponent(deviceId)}/target?format=${format}`
  );
  if (!response.ok) {
    throw new Error('Failed to fetch target config');
  }
  return response.text();
}

export async function fetchDeviceConfigDiff(deviceId: string, format = 'json'): Promise<string> {
  const response = await (demoFetch ?? fetch)(
    `${API_BASE}/device/${encodeURIComponent(deviceId)}/diff?format=${format}`
  );
  if (!response.ok) {
    throw new Error('Failed to fetch config diff');
  }
  return response.text();
}

export async function fetchDeviceConfigLog(
  deviceId: string,
  format = 'json'
): Promise<{ log?: ConfigLogEntry[] }> {
  return apiRequest(`/device/${encodeURIComponent(deviceId)}/log?format=${format}`);
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
  const response = await (demoFetch ?? fetch)(`${API_BASE}/layer/${index}${suffix}`, {
    headers: { accept }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch layer ${index} config (HTTP ${response.status})`);
  }
  return response.text();
}
