import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Pause, Play, RotateCcw, Wind, WifiOff } from 'lucide-react';
import { getListExercisesQueryKey, useListExercises, type Exercise } from '@workspace/api-client-react';
import { EmptyState, ErrorState, PageHeader } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePageMeta } from '@/hooks/use-page-meta';
import { describeError } from '@/lib/errors';
import { cn } from '@/lib/utils';

const CACHE_KEY = 'orbit:exercises:v1';
const CATS = ['all', 'breathing', 'grounding', 'relaxation', 'reflection'] as const;
const CAT_TONE: Record<string, string> = {
  breathing: 'bg-primary/15 text-primary',
  grounding: 'bg-chart-3/15 text-chart-3',
  relaxation: 'bg-chart-2/15 text-chart-2',
  reflection: 'bg-chart-4/15 text-chart-4',
};

function readCache(): Exercise[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Exercise[]) : null;
  } catch {
    return null;
  }
}

const PHASES = [
  { label: 'Breathe in', secs: 4, scale: 1 },
  { label: 'Breathe out', secs: 6, scale: 0.55 },
];

function BreathPacer() {
  const [running, setRunning] = useState(false);
  const [st, setSt] = useState({ phase: 0, left: PHASES[0].secs, cycles: 0 });
  const { phase, left, cycles } = st;

  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => {
      setSt((s) => {
        if (s.left > 1) return { ...s, left: s.left - 1 };
        const next = (s.phase + 1) % PHASES.length;
        return { phase: next, left: PHASES[next].secs, cycles: next === 0 ? s.cycles + 1 : s.cycles };
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [running]);

  const reset = () => { setRunning(false); setSt({ phase: 0, left: PHASES[0].secs, cycles: 0 }); };
  const p = PHASES[phase];
  const scale = running ? p.scale : 0.55;

  return (
    <div className="flex flex-col items-center rounded-3xl border border-border bg-background/40 p-6">
      <div className="relative grid h-48 w-48 place-items-center">
        <div className="absolute inset-0 rounded-full border border-primary/20" aria-hidden />
        <div
          className="absolute inset-3 rounded-full bg-[radial-gradient(circle_at_40%_35%,hsl(210_92%_80%),hsl(258_55%_55%))] opacity-80"
          style={{ transform: `scale(${scale})`, transition: `transform ${running ? p.secs : 0.4}s ease-in-out` }}
          aria-hidden
        />
        <div className="relative text-center">
          <p className="font-display text-lg text-foreground" aria-live="assertive" data-testid="text-breath-phase">{running ? p.label : 'Ready'}</p>
          <p className="font-mono text-sm text-foreground/80" aria-hidden>{running ? left : '4 in · 6 out'}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">Cycles completed: {cycles}. Follow only if comfortable; stop if dizzy.</p>
      <div className="mt-4 flex gap-2">
        <Button className="rounded-full" onClick={() => setRunning((r) => !r)} data-testid="button-breath-toggle">
          {running ? <><Pause className="mr-1.5 h-4 w-4" aria-hidden />Pause</> : <><Play className="mr-1.5 h-4 w-4" aria-hidden />{cycles || phase ? 'Resume' : 'Start'}</>}
        </Button>
        <Button variant="outline" className="rounded-full" onClick={reset} data-testid="button-breath-reset"><RotateCcw className="mr-1.5 h-4 w-4" aria-hidden />Reset</Button>
      </div>
    </div>
  );
}

function SessionTimer({ minutes }: { minutes: number }) {
  const total = Math.max(1, Math.round(minutes * 60));
  const [left, setLeft] = useState(total);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setLeft((l) => { if (l <= 1) { setRunning(false); return 0; } return l - 1; }), 1000);
    return () => window.clearInterval(t);
  }, [running]);
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-background/40 px-4 py-3">
      <span className="font-mono text-xl" role="timer" aria-live="off" data-testid="text-session-timer">{mm}:{ss}</span>
      {left === 0 && <span className="text-xs text-chart-3" role="status">Time’s up. Take your time coming back.</span>}
      <div className="ml-auto flex gap-2">
        <Button size="sm" className="rounded-full" disabled={left === 0} onClick={() => setRunning((r) => !r)} data-testid="button-timer-toggle">
          {running ? <><Pause className="mr-1 h-3.5 w-3.5" aria-hidden />Pause</> : <><Play className="mr-1 h-3.5 w-3.5" aria-hidden />Start</>}
        </Button>
        <Button size="sm" variant="outline" className="rounded-full" onClick={() => { setRunning(false); setLeft(total); }} data-testid="button-timer-reset"><RotateCcw className="mr-1 h-3.5 w-3.5" aria-hidden />Reset</Button>
      </div>
    </div>
  );
}

function Player({ ex, onClose }: { ex: Exercise; onClose: () => void }) {
  const [step, setStep] = useState(0);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-3xl bg-popover sm:max-w-xl">
        <DialogHeader>
          <span className={cn('w-fit rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em]', CAT_TONE[ex.category])}>{ex.category}</span>
          <DialogTitle className="font-display text-2xl font-light">{ex.title}</DialogTitle>
          <DialogDescription>{ex.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {ex.category === 'breathing' ? <BreathPacer /> : <SessionTimer minutes={ex.durationMinutes} />}
          <div>
            <h3 className="mb-3 text-sm font-medium">Steps</h3>
            <ol className="space-y-2">
              {ex.steps.map((s, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => setStep(i)}
                    aria-current={i === step ? 'step' : undefined}
                    className={cn('flex w-full gap-3 rounded-2xl px-4 py-3 text-left text-sm transition-colors', i === step ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted/50')}
                    data-testid={`button-step-${i}`}
                  >
                    <span className="font-mono text-xs opacity-70">{String(i + 1).padStart(2, '0')}</span>
                    <span>{s}</span>
                  </button>
                </li>
              ))}
            </ol>
            <div className="mt-3 flex items-center justify-between">
              <Button variant="ghost" size="sm" className="rounded-full" disabled={step === 0} onClick={() => setStep((s) => s - 1)} data-testid="button-step-prev"><ChevronLeft className="mr-1 h-4 w-4" aria-hidden />Previous</Button>
              <span className="text-xs text-muted-foreground" aria-live="polite">Step {step + 1} of {ex.steps.length}</span>
              <Button variant="ghost" size="sm" className="rounded-full" disabled={step >= ex.steps.length - 1} onClick={() => setStep((s) => s + 1)} data-testid="button-step-next">Next<ChevronRight className="ml-1 h-4 w-4" aria-hidden /></Button>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">Educational guidance only. Stop if anything feels uncomfortable.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ExercisesPage() {
  usePageMeta('Exercises', 'Guided breathing, grounding, relaxation and reflection. Available offline once loaded.');
  const q = useListExercises({ query: { queryKey: getListExercisesQueryKey() } });
  const [cached] = useState<Exercise[] | null>(() => readCache());
  const [cat, setCat] = useState<(typeof CATS)[number]>('all');
  const [open, setOpen] = useState<Exercise | null>(null);

  useEffect(() => {
    if (q.data) {
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(q.data)); } catch { /* ignore */ }
    }
  }, [q.data]);

  const fromCache = !q.data && !!cached;
  const all = q.data ?? cached ?? [];
  const items = useMemo(() => (cat === 'all' ? all : all.filter((e) => e.category === cat)), [all, cat]);

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <PageHeader eyebrow="Exercises" title="A few minutes to land" />
      {fromCache && q.isError && (
        <p role="status" className="mb-5 flex items-center gap-2 rounded-2xl bg-accent/60 px-4 py-2 text-xs text-accent-foreground"><WifiOff className="h-3.5 w-3.5" aria-hidden />Showing exercises saved on this device.</p>
      )}
      <div role="tablist" aria-label="Filter by category" className="mb-6 flex flex-wrap gap-2">
        {CATS.map((c) => (
          <button key={c} role="tab" aria-selected={cat === c} onClick={() => setCat(c)} className={cn('rounded-full px-4 py-1.5 text-sm capitalize transition-colors', cat === c ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:text-foreground')} data-testid={`tab-${c}`}>{c}</button>
        ))}
      </div>
      {q.isLoading && !cached ? (
        <div className="grid gap-4 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-40 animate-pulse rounded-3xl bg-muted/50" />)}</div>
      ) : q.isError && !cached ? (
        <ErrorState message={describeError(q.error)} onRetry={() => q.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={<Wind className="h-6 w-6" />} title="Nothing in this category" body="Try another filter." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((ex, i) => (
            <li key={ex.id} className={cn('rise', i === 0 && cat === 'all' && 'sm:col-span-2')} style={{ animationDelay: `${i * 60}ms` }}>
              <button type="button" onClick={() => setOpen(ex)} className="glass group flex h-full w-full flex-col rounded-3xl p-6 text-left transition-transform hover:-translate-y-0.5" data-testid={`card-exercise-${ex.id}`}>
                <div className="flex items-center justify-between">
                  <span className={cn('rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em]', CAT_TONE[ex.category])}>{ex.category}</span>
                  <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground"><Clock className="h-3 w-3" aria-hidden />{ex.durationMinutes} min</span>
                </div>
                <h2 className="mt-4 text-xl font-light">{ex.title}</h2>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{ex.description}</p>
                <span className="mt-4 text-sm text-primary group-hover:underline">Begin</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && <Player ex={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
