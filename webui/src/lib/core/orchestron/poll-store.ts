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
let inFlight: Promise<void> | null = null;

function fetchOnce(): Promise<void> {
  if (!inFlight) {
    inFlight = (async () => {
      try {
        const queues = await fetchAllDeviceQueues();
        current = { queues, error: null, loaded: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load queue data.';
        current = { ...current, error: message };
      } finally {
        inFlight = null;
      }
      internal.set(current);
    })();
  }
  return inFlight;
}

function tick(): void {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
  void fetchOnce();
}

function handleVisibilityChange(): void {
  if (document.visibilityState === 'visible') {
    void fetchOnce();
  }
}

export const queuesPoll: Readable<QueuesPollValue> = {
  subscribe(run, invalidate) {
    if (subscriberCount === 0) {
      tick();
      timer = setInterval(tick, POLL_INTERVAL_MS);
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', handleVisibilityChange);
      }
    }
    subscriberCount++;

    const unsub = internal.subscribe(run, invalidate);

    return () => {
      subscriberCount--;
      if (subscriberCount === 0) {
        if (timer !== null) {
          clearInterval(timer);
          timer = null;
        }
        if (typeof document !== 'undefined') {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        }
      }
      unsub();
    };
  }
};

/**
 * Fetch the queues again, guaranteeing the result reflects server state at or
 * after this call — an in-flight poll response (requested earlier) is awaited
 * and then a fresh fetch is issued.
 */
export async function refreshQueues(): Promise<void> {
  if (inFlight) {
    await inFlight;
  }
  await fetchOnce();
}
