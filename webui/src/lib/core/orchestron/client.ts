const API_BASE = '/api';

export interface DeviceSummary {
  id: string;
  name: string;
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

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);

  if (!headers.has('content-type') && init.body) {
    headers.set('content-type', 'application/json');
  }

  return readJson<T>(
    await fetch(`${API_BASE}${path}`, {
      ...init,
      headers
    })
  );
}

export async function fetchDevices(): Promise<DeviceSummary[]> {
  try {
    const response = await apiRequest<{ devices?: string[] }>('/device');
    return (response.devices ?? []).map((name) => ({
      id: name,
      name
    }));
  } catch (error) {
    console.error('Failed to fetch devices:', error);
    return [];
  }
}

export async function fetchDevice(deviceId: string): Promise<DeviceInfo> {
  const upperId = deviceId.toUpperCase();

  try {
    const info = await apiRequest<any>(`/device/${upperId}/info`);
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
  } catch {
    throw new Error(`Device ${upperId} not found or offline`);
  }
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
  try {
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
  } catch (error) {
    console.error('Failed to fetch config queues:', error);
    return [];
  }
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
