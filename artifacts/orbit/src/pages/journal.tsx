import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { BookOpen, Plus, Trash2 } from 'lucide-react';
import {
  getGetOverviewQueryKey,
  getListJournalEntriesQueryKey,
  useCreateJournalEntry,
  useDeleteJournalEntry,
  useListJournalEntries,
  useUpdateJournalEntry,
  type JournalEntry,
} from '@workspace/api-client-react';
import { RequireAuth } from '@/components/require-auth';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState, ErrorState, PageHeader } from '@/components/states';
import { Button } from '@/components/ui/button';
import { usePageMeta } from '@/hooks/use-page-meta';
import { useToast } from '@/hooks/use-toast';
import { describeError } from '@/lib/errors';
import { cn } from '@/lib/utils';

const PROMPTS = ['Something small that went right today', 'A sound or smell from home I keep thinking about', 'What I’d tell myself from a week ago'];

function JournalInner() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const list = useListJournalEntries({ query: { queryKey: getListJournalEntriesQueryKey() } });
  const create = useCreateJournalEntry();
  const update = useUpdateJournalEntry();
  const remove = useDeleteJournalEntry();
  const [selected, setSelected] = useState<string | 'new' | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  const open = (e: JournalEntry | null) => {
    setError(null);
    setSelected(e ? e.id : 'new');
    setTitle(e?.title ?? '');
    setContent(e?.content ?? '');
  };

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListJournalEntriesQueryKey() });
    qc.invalidateQueries({ queryKey: getGetOverviewQueryKey() });
  };

  const save = () => {
    if (!title.trim()) { setError('Give this entry a title.'); return; }
    setError(null);
    const data = { title: title.trim(), content };
    if (selected === 'new') {
      create.mutate({ data }, { onSuccess: (e) => { invalidate(); setSelected(e.id); toast({ title: 'Entry saved' }); }, onError: (e) => setError(describeError(e)) });
    } else if (selected) {
      update.mutate({ id: selected, data }, { onSuccess: () => { invalidate(); toast({ title: 'Changes saved' }); }, onError: (e) => setError(describeError(e)) });
    }
  };

  const entries = list.data ?? [];
  const busy = create.isPending || update.isPending;
  const current = entries.find((e) => e.id === selected);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <PageHeader eyebrow="Journal" title="Only for you">
        <Button className="rounded-full" onClick={() => open(null)} data-testid="button-new-entry"><Plus className="mr-1.5 h-4 w-4" aria-hidden />New entry</Button>
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside aria-label="Entries">
          {list.isLoading ? (
            <div className="space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted/50" />)}</div>
          ) : list.isError ? (
            <ErrorState message={describeError(list.error)} onRetry={() => list.refetch()} />
          ) : entries.length === 0 ? (
            <EmptyState icon={<BookOpen className="h-6 w-6" />} title="A blank page" body="Write as much or as little as you like. Nothing here is shared." />
          ) : (
            <ul className="space-y-2">
              {entries.map((e) => (
                <li key={e.id}>
                  <button type="button" onClick={() => open(e)} aria-current={selected === e.id ? 'true' : undefined} className={cn('w-full rounded-2xl px-4 py-3 text-left transition-colors', selected === e.id ? 'bg-secondary text-secondary-foreground' : 'hover:bg-muted/40')} data-testid={`button-entry-${e.id}`}>
                    <span className="block truncate text-sm">{e.title}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{format(new Date(e.updatedAt), 'MMM d, yyyy · HH:mm')}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="glass min-h-[420px] rounded-3xl p-6 sm:p-8">
          {selected ? (
            <form onSubmit={(e) => { e.preventDefault(); save(); }} className="flex h-full flex-col gap-4">
              <label htmlFor="j-title" className="sr-only">Title</label>
              <input id="j-title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="bg-transparent font-display text-2xl font-light outline-none placeholder:text-muted-foreground/60" data-testid="input-journal-title" />
              {current && <p className="font-mono text-[10px] text-muted-foreground">Written {format(new Date(current.createdAt), 'MMM d, yyyy')} · edited {format(new Date(current.updatedAt), 'MMM d, HH:mm')}</p>}
              {selected === 'new' && !content && (
                <div className="flex flex-wrap gap-2">
                  {PROMPTS.map((p) => <button key={p} type="button" onClick={() => { setTitle((t) => t || p); }} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground" data-testid="button-journal-prompt">{p}</button>)}
                </div>
              )}
              <label htmlFor="j-body" className="sr-only">Entry</label>
              <textarea id="j-body" value={content} maxLength={20000} onChange={(e) => setContent(e.target.value)} placeholder="Start writing…" className="min-h-[280px] flex-1 resize-none bg-transparent text-[15px] leading-7 outline-none placeholder:text-muted-foreground/60" data-testid="input-journal-content" />
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <div className="flex items-center gap-2">
                <Button type="submit" className="rounded-full px-6" disabled={busy} data-testid="button-save-entry">{busy ? 'Saving…' : 'Save'}</Button>
                <Button type="button" variant="ghost" className="rounded-full" onClick={() => setSelected(null)} data-testid="button-close-entry">Close</Button>
                {selected !== 'new' && (
                  <Button type="button" variant="ghost" className="ml-auto rounded-full text-muted-foreground hover:text-destructive" onClick={() => setConfirm(true)} data-testid="button-delete-entry"><Trash2 className="mr-1.5 h-4 w-4" aria-hidden />Delete</Button>
                )}
              </div>
            </form>
          ) : (
            <div className="flex h-full flex-col items-center justify-center py-16 text-center">
              <BookOpen className="h-8 w-8 text-chart-2" aria-hidden />
              <p className="mt-4 max-w-sm text-muted-foreground">Pick an entry to reread or edit, or start a new one.</p>
            </div>
          )}
        </section>
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete this entry?"
        description="It will be permanently removed."
        pending={remove.isPending}
        onConfirm={() => selected && selected !== 'new' && remove.mutate({ id: selected }, {
          onSuccess: () => { invalidate(); setConfirm(false); setSelected(null); },
          onError: (e) => toast({ title: 'Couldn’t delete', description: describeError(e), variant: 'destructive' }),
        })}
      />
    </div>
  );
}

export default function JournalPage() {
  usePageMeta('Journal', 'Private, editable reflections that only you can see.');
  return (
    <RequireAuth title="Your journal is private" body="Sign in to write and revisit reflections. Nothing here is shared.">
      <JournalInner />
    </RequireAuth>
  );
}
