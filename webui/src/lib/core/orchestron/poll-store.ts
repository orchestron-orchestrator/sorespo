import { writable, type Readable } from 'svelte/store';

import { fetchAllDeviceQueues, type QueueItemSummary } from '$lib/core/orchestron/client';

export interface QueuesPollValue {
  queues: QueueItemSummary[];
  error: string | null;
  loaded: boolean;
}

const INITIAL: QueuesPollValue = { queues: [], error: null, loaded: false };
const POLL_INTERVAL_MS = 1000;

const internal = writable<QueuesPollValue>(INITIAL);
let current = INITIAL;
let subscriberCount = 0;
let timer: ReturnType<typeof setInterval> | null = null;
let inFlight = false;

async function tick(): Promise<void> {
  if (inFlight) return;
  inFlight = true;
  try {
    const queues = await fetchAllDeviceQueues();
    current = { queues, error: null, loaded: true };
    internal.set(current);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load queue data.';
    current = { ...current, error: message };
    internal.set(current);
  } finally {
    inFlight = false;
  }
}

export const queuesPoll: Readable<QueuesPollValue> = {
  subscribe(run, invalidate) {
    if (subscriberCount === 0) {
      tick();
      timer = setInterval(tick, POLL_INTERVAL_MS);
    }
    subscriberCount++;

    const unsub = internal.subscribe(run, invalidate);

    return () => {
      subscriberCount--;
      if (subscriberCount === 0 && timer !== null) {
        clearInterval(timer);
        timer = null;
      }
      unsub();
    };
  }
};

export async function refreshQueues(): Promise<void> {
  await tick();
}
