import type { ReactNode } from 'react';
import { usePersonal } from '@/lib/session';
import { SignInGate } from '@/components/sign-in-gate';

/** Route-level gate: personal content renders only once Clerk has loaded and confirmed a session. */
export function RequireAuth({ children, title, body }: { children: ReactNode; title: string; body: string }) {
  const { isLoaded, signedIn } = usePersonal();
  if (!isLoaded) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-5 py-12" aria-busy="true">
        <div className="h-8 w-48 animate-pulse rounded-xl bg-muted/60" />
        <div className="h-40 animate-pulse rounded-3xl bg-muted/40" />
      </div>
    );
  }
  if (!signedIn) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16">
        <SignInGate title={title} body={body} />
      </div>
    );
  }
  return <>{children}</>;
}
