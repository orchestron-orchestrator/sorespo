/** Strip an optional module/prefix qualifier from a YANG identityref value. */
export function normalizeIdentity(value: unknown): string {
  const raw = String(value ?? '').trim();
  return raw.includes(':') ? raw.split(':').pop() ?? '' : raw;
}
