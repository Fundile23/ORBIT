export function describeError(err: unknown, fallback = 'Something went wrong.'): string {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'You appear to be offline.';
  const e = err as { status?: number; data?: { error?: string }; message?: string } | null;
  if (e?.status === 401) return 'Your session has ended. Please sign in again.';
  if (e?.data && typeof e.data.error === 'string') return e.data.error;
  if (e?.status && e.status >= 500) return 'ORBIT’s server is having trouble right now.';
  return e?.message || fallback;
}
