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
      name: name,
      type: 'router',
      address: 'Via NETCONF',
      status: 'connected'
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
  
  // Try to get capabilities to verify device exists
  try {
    const response = await fetch(`${API_BASE}/device/${upperId}/capabilities`);
    if (!response.ok) {
      throw new Error('Device not found');
    }
    
    return {
      id: upperId,
      name: upperId,
      type: 'router',
      address: 'Via NETCONF',
      status: 'connected',
      connectionType: 'NETCONF',
      port: 830,
      lastSeen: new Date().toISOString()
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

export async function reconfigureDevice(deviceId) {
  // Trigger reconfiguration via GET request (as seen in sorespo.act)
  const upperId = deviceId.toUpperCase();
  return fetchJSON(`${API_BASE}/device/${upperId}/reconfigure`);
}

export async function fetchDeviceConfigQueue(deviceId) {
  const upperId = deviceId.toUpperCase();
  return fetchJSON(`${API_BASE}/device/${upperId}/q`);
}

export async function fetchConfigQueueItem(deviceId, queueId) {
  const upperId = deviceId.toUpperCase();
  return fetchJSON(`${API_BASE}/device/${upperId}/q/${queueId}`);
}

export async function approveConfigQueueItem(deviceId, queueId) {
  const upperId = deviceId.toUpperCase();
  return fetchJSON(`${API_BASE}/device/${upperId}/q/${queueId}/approve`);
}

export async function fetchAllDeviceQueues() {
  // Get all devices first
  const devices = await fetchDevices();
  
  // Fetch queue for each device in parallel
  const queuePromises = devices.map(async device => {
    try {
      const queue = await fetchDeviceConfigQueue(device.id);
      // Transform queue object into array with device context
      return Object.entries(queue).map(([queueId, item]) => ({
        deviceId: device.id,
        queueId,
        approved: item.approved
      }));
    } catch (err) {
      console.error(`Failed to fetch queue for ${device.id}:`, err);
      return [];
    }
  });
  
  const allQueues = await Promise.all(queuePromises);
  // Flatten array of arrays and sort by pending first, then by device and queue ID
  return allQueues
    .flat()
    .sort((a, b) => {
      // Pending items first
      if (a.approved !== b.approved) {
        return a.approved ? 1 : -1;
      }
      // Then by device
      if (a.deviceId !== b.deviceId) {
        return a.deviceId.localeCompare(b.deviceId);
      }
      // Then by queue ID
      return parseInt(a.queueId) - parseInt(b.queueId);
    });
}