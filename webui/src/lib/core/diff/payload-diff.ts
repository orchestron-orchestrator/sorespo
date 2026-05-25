export type DiffKind = 'added' | 'removed' | 'changed';

export interface DiffEntry {
  path: string;
  kind: DiffKind;
  before?: unknown;
  after?: unknown;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object' || a === null || b === null) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

function appendPath(path: string, segment: string): string {
  if (!path) return segment;
  if (segment.startsWith('[')) return `${path}${segment}`;
  return `${path}.${segment}`;
}

export function diffPayloads(before: unknown, after: unknown, basePath = ''): DiffEntry[] {
  if (isEqual(before, after)) return [];

  const beforeMissing = before === undefined;
  const afterMissing = after === undefined;

  if (beforeMissing && !afterMissing) {
    return [{ path: basePath || '(root)', kind: 'added', after }];
  }
  if (!beforeMissing && afterMissing) {
    return [{ path: basePath || '(root)', kind: 'removed', before }];
  }

  if (Array.isArray(before) && Array.isArray(after)) {
    const entries: DiffEntry[] = [];
    const max = Math.max(before.length, after.length);
    for (let i = 0; i < max; i++) {
      const subPath = appendPath(basePath, `[${i}]`);
      if (i >= before.length) {
        entries.push({ path: subPath, kind: 'added', after: after[i] });
      } else if (i >= after.length) {
        entries.push({ path: subPath, kind: 'removed', before: before[i] });
      } else {
        entries.push(...diffPayloads(before[i], after[i], subPath));
      }
    }
    return entries;
  }

  if (isPlainObject(before) && isPlainObject(after)) {
    const entries: DiffEntry[] = [];
    const keys = new Set<string>([...Object.keys(before), ...Object.keys(after)]);
    for (const key of keys) {
      const subPath = appendPath(basePath, key);
      const hasBefore = key in before;
      const hasAfter = key in after;
      if (hasBefore && !hasAfter) {
        entries.push({ path: subPath, kind: 'removed', before: before[key] });
      } else if (!hasBefore && hasAfter) {
        entries.push({ path: subPath, kind: 'added', after: after[key] });
      } else {
        entries.push(...diffPayloads(before[key], after[key], subPath));
      }
    }
    return entries;
  }

  return [{ path: basePath || '(root)', kind: 'changed', before, after }];
}

export function formatDiffValue(value: unknown): string {
  if (value === undefined) return '—';
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
