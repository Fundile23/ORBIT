import { Link } from 'wouter';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SignInGate({ title, body, className }: { title: string; body: string; className?: string }) {
  return (
    <div className={cn('glass rounded-3xl p-6 sm:p-8', className)} data-testid="gate-signin">
      <div className="flex items-start gap-4">
        <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent text-accent-foreground">
          <Lock className="h-4 w-4" aria-hidden />
        </span>
        <div className="space-y-3">
          <h2 className="text-lg font-medium">{title}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href="/sign-in" className="inline-flex min-h-10 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5" data-testid="link-gate-signin">
              Sign in
            </Link>
            <Link href="/sign-up" className="inline-flex min-h-10 items-center rounded-full border border-border px-5 text-sm text-foreground hover:bg-muted" data-testid="link-gate-signup">
              Create a private account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
