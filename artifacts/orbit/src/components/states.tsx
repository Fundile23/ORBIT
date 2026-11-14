import type { ReactNode } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ErrorState({ message, onRetry, className }: { message: string; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn('glass flex flex-col items-start gap-3 rounded-3xl p-6', className)} data-testid="status-error">
      <div className="flex items-center gap-2 text-sm font-medium text-destructive">
        <WifiOff className="h-4 w-4" aria-hidden /> Couldn’t load this
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="rounded-full" onClick={onRetry} data-testid="button-retry">
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-border px-6 py-12 text-center" data-testid="status-empty">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-accent/60 text-accent-foreground">{icon}</div>
      <h3 className="text-base font-medium">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <header className="rise mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary/80">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-light sm:text-4xl">{title}</h1>
      </div>
      {children}
    </header>
  );
}
