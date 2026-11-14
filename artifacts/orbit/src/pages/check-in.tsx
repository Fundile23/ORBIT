import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Moon, Pencil, Sun, Trash2 } from 'lucide-react';
import {
  getGetOverviewQueryKey,
  getListCheckInsQueryKey,
  useCreateCheckIn,
  useDeleteCheckIn,
  useListCheckIns,
  useUpdateCheckIn,
  type CheckIn,
} from '@workspace/api-client-react';
import { RequireAuth } from '@/components/require-auth';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState, ErrorState, PageHeader } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { usePageMeta } from '@/hooks/use-page-meta';
import { useToast } from '@/hooks/use-toast';
import { describeError } from '@/lib/errors';
import { cn } from '@/lib/utils';

export const MOODS = ['Very low', 'Low', 'Steady', 'Good', 'Bright'];

type FormState = { mood: number; stress: number; wellbeing: number; sleep: string; note: string };
const blank: FormState = { mood: 3, stress: 5, wellbeing: 5, sleep: '', note: '' };

function MoodGlyph({ level, active }: { level: number; active: boolean }) {
  const curve = [-4, -2, 0, 2, 4][level - 1];
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
      <circle cx="16" cy="16" r="13" fill={active ? 'hsl(210 92% 74%)' : 'hsl(234 28% 22%)'} />
      <circle cx="12" cy="14" r="1.5" fill={active ? '#141a3a' : 'hsl(226 20% 68%)'} />
      <circle cx="20" cy="14" r="1.5" fill={active ? '#141a3a' : 'hsl(226 20% 68%)'} />
      <path d={`M11 20 Q16 ${20 + curve} 21 20`} fill="none" stroke={active ? '#141a3a' : 'hsl(226 20% 68%)'} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CheckInInner() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const list = useListCheckIns({ query: { queryKey: getListCheckInsQueryKey() } });
  const create = useCreateCheckIn();
  const update = useUpdateCheckIn();
  const remove = useDeleteCheckIn();
  const [form, setForm] = useState<FormState>(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<CheckIn | null>(null);
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListCheckInsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetOverviewQueryKey() });
  };

  const submit = () => {
    setError(null);
    let sleepHours: number | null = null;
    if (form.sleep.trim() !== '') {
      const n = Number(form.sleep);
      if (Number.isNaN(n) || n < 0 || n > 24) { setError('Sleep must be between 0 and 24 hours.'); return; }
      sleepHours = n;
    }
    const data = { mood: form.mood, stress: form.stress, wellbeing: form.wellbeing, sleepHours, note: form.note.trim() };
    const opts = {
      onSuccess: () => {
        invalidate();
        toast({ title: editing ? 'Check-in updated' : 'Check-in saved', description: 'Thanks for taking a moment.' });
        setForm(blank);
        setEditing(null);
      },
      onError: (e: unknown) => setError(describeError(e)),
    };
    if (editing) update.mutate({ id: editing, data }, opts);
    else create.mutate({ data }, opts);
  };

  const startEdit = (c: CheckIn) => {
    setEditing(c.id);
    setForm({ mood: c.mood, stress: c.stress, wellbeing: c.wellbeing, sleep: c.sleepHours == null ? '' : String(c.sleepHours), note: c.note });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const busy = create.isPending || update.isPending;
  const items = list.data ?? [];

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <PageHeader eyebrow="Daily check-in" title="How are you, really?" />
      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <form className="glass rise space-y-7 rounded-3xl p-6 sm:p-8" onSubmit={(e) => { e.preventDefault(); submit(); }} aria-label={editing ? 'Edit check-in' : 'New check-in'}>
          {editing && <p className="rounded-xl bg-secondary/60 px-3 py-2 text-xs text-secondary-foreground">Editing an earlier check-in.</p>}
          <fieldset>
            <legend className="mb-3 text-sm font-medium">Mood</legend>
            <div role="radiogroup" className="flex flex-wrap gap-2">
              {MOODS.map((m, i) => {
                const val = i + 1;
                const active = form.mood === val;
                return (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setForm({ ...form, mood: val })}
                    className={cn('flex flex-col items-center gap-1 rounded-2xl border px-3 py-2 text-xs transition-colors', active ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:border-primary/40')}
                    data-testid={`button-mood-${val}`}
                  >
                    <MoodGlyph level={val} active={active} />
                    {m}
                  </button>
                );
              })}
            </div>
          </fieldset>
          {(['stress', 'wellbeing'] as const).map((k) => (
            <div key={k}>
              <div className="mb-3 flex items-center justify-between text-sm">
                <label id={`label-${k}`} className="font-medium capitalize">{k}</label>
                <span className="font-mono text-primary" data-testid={`text-${k}-value`}>{form[k]}/10</span>
              </div>
              <Slider aria-labelledby={`label-${k}`} min={1} max={10} step={1} value={[form[k]]} onValueChange={([v]) => setForm({ ...form, [k]: v })} data-testid={`slider-${k}`} />
              <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                <span>{k === 'stress' ? 'Calm' : 'Depleted'}</span><span>{k === 'stress' ? 'Overloaded' : 'Thriving'}</span>
              </div>
            </div>
          ))}
          <div>
            <label htmlFor="sleep" className="mb-2 flex items-center gap-2 text-sm font-medium"><Moon className="h-3.5 w-3.5 text-chart-2" aria-hidden /> Sleep last cycle (hours, optional)</label>
            <Input id="sleep" inputMode="decimal" type="number" min={0} max={24} step={0.25} value={form.sleep} onChange={(e) => setForm({ ...form, sleep: e.target.value })} className="max-w-[140px] rounded-xl" data-testid="input-sleep" />
          </div>
          <div>
            <label htmlFor="note" className="mb-2 block text-sm font-medium">A note for yourself</label>
            <Textarea id="note" rows={4} maxLength={4000} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Anything worth remembering about today…" className="rounded-2xl" data-testid="input-note" />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" className="rounded-full px-6" disabled={busy} data-testid="button-save-checkin">{busy ? 'Saving…' : editing ? 'Update check-in' : 'Save check-in'}</Button>
            {editing && <Button type="button" variant="ghost" className="rounded-full" onClick={() => { setEditing(null); setForm(blank); setError(null); }} data-testid="button-cancel-edit">Cancel</Button>}
          </div>
        </form>

        <section aria-labelledby="history-h">
          <h2 id="history-h" className="mb-4 text-lg font-normal">Recent check-ins</h2>
          {list.isLoading ? (
            <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted/50" />)}</div>
          ) : list.isError ? (
            <ErrorState message={describeError(list.error)} onRetry={() => list.refetch()} />
          ) : items.length === 0 ? (
            <EmptyState icon={<Sun className="h-6 w-6" />} title="No check-ins yet" body="Your first one will appear here. There are no right answers." />
          ) : (
            <ul className="space-y-3">
              {items.map((c) => (
                <li key={c.id} className="rounded-2xl border border-border bg-card/50 p-4" data-testid={`card-checkin-${c.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[11px] text-muted-foreground">{format(new Date(c.createdAt), 'EEE MMM d · HH:mm')}</p>
                      <p className="mt-1 text-sm">{MOODS[c.mood - 1]} · stress {c.stress} · wellbeing {c.wellbeing}{c.sleepHours != null ? ` · ${c.sleepHours}h sleep` : ''}</p>
                      {c.note && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{c.note}</p>}
                    </div>
                    <div className="flex shrink-0">
                      <Button variant="ghost" size="icon" className="rounded-full" aria-label="Edit check-in" onClick={() => startEdit(c)} data-testid={`button-edit-checkin-${c.id}`}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-destructive" aria-label="Delete check-in" onClick={() => setToDelete(c)} data-testid={`button-delete-checkin-${c.id}`}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this check-in?"
        description="It will be removed from your history and insights."
        pending={remove.isPending}
        onConfirm={() => toDelete && remove.mutate({ id: toDelete.id }, {
          onSuccess: () => { invalidate(); if (editing === toDelete.id) { setEditing(null); setForm(blank); } setToDelete(null); },
          onError: (e) => toast({ title: 'Couldn’t delete', description: describeError(e), variant: 'destructive' }),
        })}
      />
    </div>
  );
}

export default function CheckInPage() {
  usePageMeta('Check-in', 'Record your mood, stress, wellbeing, and sleep privately.');
  return (
    <RequireAuth title="Check-ins are private" body="Sign in to record how you’re doing. Only you can see your entries.">
      <CheckInInner />
    </RequireAuth>
  );
}
