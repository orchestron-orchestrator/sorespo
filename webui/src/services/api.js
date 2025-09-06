const API_BASE = '/api';

async function fetchJSON(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export async function fetchDevices() {
  try {
    const response = await fetchJSON(`${API_BASE}/device`);
    // API returns {"devices": ["AMS-CORE-1", "AMS-CORE-2", ...]}
    const deviceNames = response.devices || [];
    
    return deviceNames.map(name => ({
      id: name,
      name: name
    }));
  } catch (err) {
    console.error('Failed to fetch devices:', err);
    // Fallback to empty list
    return [];
  }
}

export async function fetchDevice(deviceId) {
  // Ensure device ID is uppercase
  const upperId = deviceId.toUpperCase();
  
  // Get device info from the new endpoint
  try {
    const info = await fetchJSON(`${API_BASE}/device/${upperId}/info`);
    return {
      id: upperId,
      name: info.name || upperId,
      type: info.type,
      approvalRequired: info.approval_required,
      addresses: info.addresses || [],
      username: info.username,
      hasRunningConfig: info.has_running_config,
      hasTargetConfig: info.has_target_config,
      queueLength: info.queue_length,
      pendingApprovals: info.pending_approvals
    };
  } catch (err) {
    throw new Error(`Device ${upperId} not found or offline`);
  }
}

export async function fetchDeviceConfig(deviceId) {
  // Get the running configuration from the device
  const upperId = deviceId.toUpperCase();
  try {
    const response = await fetch(`${API_BASE}/device/${upperId}/running`, {
      headers: {
        'Accept': 'application/yang-data+json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch device config');
    }
    
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  } catch (err) {
    console.error('Failed to fetch device config:', err);
    return {};
  }
}

export async function resyncDevice(deviceId) {
  // Trigger resync via GET request
  const upperId = deviceId.toUpperCase();
  return fetchJSON(`${API_BASE}/device/${upperId}/resync`);
}

export async function fetchDeviceConfigQueue(deviceId) {
  const upperId = deviceId.toUpperCase();
  return fetchJSON(`${API_BASE}/device/${upperId}/q`);
}

export async function fetchConfigQueueItem(deviceId, queueId, format = 'xml') {
  const upperId = deviceId.toUpperCase();
  // Backend returns: {tid, config_diff, device_txid, format}
  return fetchJSON(`${API_BASE}/device/${upperId}/q/${queueId}?format=${format}`);
}

export async function approveConfigQueueItem(deviceId, queueId, deviceTxid, approved = true) {
  const upperId = deviceId.toUpperCase();
  return fetchJSON(`${API_BASE}/device/${upperId}/q/${queueId}/set_approval`, {
    method: 'POST',
    body: JSON.stringify({
      device_txid: deviceTxid,
      approved: approved
    })
  });
}

export async function fetchAllDeviceQueues() {
  try {
    // Use the new /config-queue endpoint that only returns devices with pending approvals
    const response = await fetchJSON(`${API_BASE}/config-queue`);
    
    // Transform the response into flat list of queue items for the dashboard
    const allQueues = [];
    
    if (response.devices) {
      response.devices.forEach(device => {
        device.items.forEach(item => {
          allQueues.push({
            deviceId: device.device_id,
            queueId: item.queue_id,
            tid: item.tid,
            deviceTxid: item.device_txid,
            configDiff: item.config_diff,
            approved: item.approved
          });
        });
      });
    }
    
    // Don't sort - maintain the order from the backend which is the actual queue order
    return allQueues;
  } catch (err) {
    console.error('Failed to fetch config queues:', err);
    return [];
  }
}

export async function fetchDeviceRunningConfig(deviceId, format = 'json') {
  const upperId = deviceId.toUpperCase();
  const response = await fetch(`${API_BASE}/device/${upperId}/running?format=${format}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch running config');
  }
  
  return response.text();
}

export async function fetchDeviceTargetConfig(deviceId, format = 'json') {
  const upperId = deviceId.toUpperCase();
  const response = await fetch(`${API_BASE}/device/${upperId}/target?format=${format}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch target config');
  }
  
  return response.text();
}

export async function fetchDeviceConfigDiff(deviceId, format = 'json') {
  const upperId = deviceId.toUpperCase();
  const response = await fetch(`${API_BASE}/device/${upperId}/diff?format=${format}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch config diff');
  }
  
  return response.text();
}

export async function fetchDeviceConfigLog(deviceId, format = 'json') {
  const upperId = deviceId.toUpperCase();
  return fetchJSON(`${API_BASE}/device/${upperId}/log?format=${format}`);
}