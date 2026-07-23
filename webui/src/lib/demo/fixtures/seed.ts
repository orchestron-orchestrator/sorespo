import {
  interfaceDescriptionDiff,
  subinterfaceRemoveDiff,
  vrfAddDiff
} from '$lib/demo/fixtures/diffs';

// Initial pending queue items and per-device config log history. Queue ids and
// tids are assigned when the demo state is materialized (see ../state.ts); log
// timestamps are `now - ageSeconds` so the history always looks recent.

export interface QueueSeed {
  diffXml: string;
}

export const INITIAL_QUEUE: Record<string, QueueSeed[]> = {
  'AMS-CORE-1': [
    { diffXml: vrfAddDiff('acme-65501', 'ethernet-1/3.100', '10.201.1.1', 30, 65501) },
    { diffXml: interfaceDescriptionDiff('ethernet-1/1', 'backbone to FRA-CORE-1 ethernet-1/1') }
  ],
  'LJU-CORE-1': [{ diffXml: subinterfaceRemoveDiff('ethernet-1/4', '300') }]
};

export interface LogSeed {
  event: string;
  ageSeconds: number;
  conf_diff?: string;
}

const HOUR = 3600;
const DAY = 24 * HOUR;

export const INITIAL_LOG: Record<string, LogSeed[]> = {
  'AMS-CORE-1': [
    {
      event: 'sent',
      ageSeconds: 2 * HOUR,
      conf_diff: vrfAddDiff('globex-65502', 'ethernet-1/5.200', '10.205.1.1', 30, 65502)
    },
    {
      event: 'sent',
      ageSeconds: DAY + 2 * HOUR,
      conf_diff: interfaceDescriptionDiff('ethernet-1/2', 'backbone to STO-CORE-1 ethernet-1/1')
    },
    { event: 'sent', ageSeconds: 3 * DAY }
  ],
  'FRA-CORE-1': [
    {
      event: 'failed',
      ageSeconds: 5 * HOUR,
      conf_diff: interfaceDescriptionDiff('ethernet-1/9', 'lab port (interface does not exist)')
    },
    {
      event: 'sent',
      ageSeconds: DAY + 6 * HOUR,
      conf_diff: vrfAddDiff('acme-65501', 'ethernet-1/4.100', '10.202.1.1', 30, 65501)
    }
  ],
  'STO-CORE-1': [
    {
      event: 'sent',
      ageSeconds: 8 * HOUR,
      conf_diff: vrfAddDiff('globex-65502', 'ethernet-1/5.200', '10.206.1.1', 30, 65502)
    },
    { event: 'sent', ageSeconds: 2 * DAY }
  ],
  'LJU-CORE-1': [
    {
      event: 'sent',
      ageSeconds: 90 * 60,
      conf_diff: vrfAddDiff('acme-65501', 'ethernet-1/3.100', '10.204.1.1', 30, 65501)
    },
    { event: 'sent', ageSeconds: DAY + 16 * HOUR }
  ]
};
