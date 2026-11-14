import { useEffect, useRef, useState } from 'react';
import { useClerk } from '@clerk/react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Download, LifeBuoy, LogOut, Plus, Sparkles, Trash2 } from 'lucide-react';
import {
  getExportDataQueryKey,
  getGetOverviewQueryKey,
  getGetSettingsQueryKey,
  getListMemoriesQueryKey,
  useCreateMemory,
  useDeleteAllData,
  useDeleteMemory,
  useExportData,
  useGetOverview,
  useGetSettings,
  useListMemories,
  useUpdateSettings,
  type Memory,
} from '@workspace/api-client-react';
import { RequireAuth } from '@/components/require-auth';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { ErrorState, PageHeader } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { usePageMeta } from '@/hooks/use-page-meta';
import { useToast } from '@/hooks/use-toast';
import { clearAllDrafts } from '@/lib/drafts';
import { describeError } from '@/lib/errors';
import { basePath } from '@/lib/session';

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="glass rise rounded-3xl p-6 sm:p-8">
      <h2 className="text-xl font-light">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function SettingsInner() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { signOut } = useClerk();
  const settings = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const overview = useGetOverview({ query: { queryKey: getGetOverviewQueryKey() } });
  const memories = useListMemories({ query: { queryKey: getListMemoriesQueryKey() } });
  const exportQ = useExportData({ query: { enabled: false, queryKey: getExportDataQueryKey() } });
  const update = useUpdateSettings();
  const addMemory = useCreateMemory();
  const delMemory = useDeleteMemory();
  const wipe = useDeleteAllData();

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [protocol, setProtocol] = useState('');
  const [memText, setMemText] = useState('');
  const [memToDelete, setMemToDelete] = useState<Memory | null>(null);
  const [wipeOpen, setWipeOpen] = useState(false);
  const [wipeConfirm, setWipeConfirm] = useState('');
  const init = useRef(false);

  useEffect(() => {
    if (settings.data && !init.current) {
      init.current = true;
      setName(settings.data.displayName);
      setContact(settings.data.emergencyContact);
      setProtocol(settings.data.emergencyProtocol);
    }
  }, [settings.data]);

  const patch = (data: Parameters<typeof update.mutate>[0]['data'], msg: string) =>
    update.mutate(
      { data },
      {
        onSuccess: (s) => {
          qc.setQueryData(getGetSettingsQueryKey(), s);
          qc.invalidateQueries({ queryKey: getGetOverviewQueryKey() });
          toast({ title: msg });
        },
        onError: (e) => toast({ title: 'Couldn’t save', description: describeError(e), variant: 'destructive' }),
      },
    );

  const doExport = async () => {
    const r = await exportQ.refetch();
    if (r.error || !r.data) {
      toast({ title: 'Export failed', description: describeError(r.error), variant: 'destructive' });
      return;
    }
    const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orbit-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    qc.removeQueries({ queryKey: getExportDataQueryKey() });
  };

  if (settings.isLoading) return <div className="mx-auto max-w-3xl space-y-4 px-5 py-10">{[0, 1, 2].map((i) => <div key={i} className="h-48 animate-pulse rounded-3xl bg-muted/40" />)}</div>;
  if (settings.isError || !settings.data) return <div className="mx-auto max-w-2xl px-5 py-16"><ErrorState message={describeError(settings.error)} onRetry={() => settings.refetch()} /></div>;
  const s = settings.data;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-5 py-10 sm:px-8">
      <PageHeader eyebrow="Settings" title="Your space, your rules" />

      <Section title="Profile" desc="What ORBIT calls you.">
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(e) => { e.preventDefault(); patch({ displayName: name.trim() }, 'Name saved'); }}>
          <label htmlFor="name" className="sr-only">Display name</label>
          <Input id="name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="A name or nickname" className="rounded-xl" data-testid="input-display-name" />
          <Button type="submit" className="rounded-full" disabled={update.isPending} data-testid="button-save-name">Save</Button>
        </form>
      </Section>

      <Section title="Privacy and AI" desc="How your words are handled.">
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-6">
            <div>
              <label htmlFor="consent" className="text-sm font-medium">Send messages to the hosted AI</label>
              <p className="mt-1 text-sm text-muted-foreground">Required to chat. ORBIT’s server decrypts your conversation content to pass it to a hosted AI provider for replies. Without consent, nothing is sent to the AI.</p>
            </div>
            <Switch id="consent" checked={s.aiConsent} disabled={update.isPending} onCheckedChange={(v) => patch({ aiConsent: v }, v ? 'AI consent given' : 'AI consent withdrawn')} data-testid="switch-ai-consent" />
          </div>
          <div className="flex items-start justify-between gap-6 border-t border-border/60 pt-5">
            <div>
              <label htmlFor="memory" className="text-sm font-medium">Memory</label>
              <p className="mt-1 text-sm text-muted-foreground">Off by default. When on, only the notes you add below are shared with the AI as context. ORBIT never saves memories on its own.</p>
            </div>
            <Switch id="memory" checked={s.memoryEnabled} disabled={update.isPending} onCheckedChange={(v) => patch({ memoryEnabled: v }, v ? 'Memory turned on' : 'Memory turned off')} data-testid="switch-memory" />
          </div>
          {overview.data && (
            <p className="text-xs text-muted-foreground" data-testid="text-communication">
              App connection: {overview.data.communication === 'online' ? 'connected to ORBIT’s server' : 'server unavailable'} · AI {overview.data.aiAvailable ? 'available' : 'unavailable'}. This reflects only this app’s link, not any mission communications.
            </p>
          )}
        </div>
      </Section>

      <Section title="Memories" desc="Things you’ve explicitly asked ORBIT to keep in mind.">
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(e) => {
          e.preventDefault();
          const content = memText.trim();
          if (!content) return;
          addMemory.mutate({ data: { content } }, {
            onSuccess: () => { setMemText(''); qc.invalidateQueries({ queryKey: getListMemoriesQueryKey() }); },
            onError: (er) => toast({ title: 'Couldn’t add memory', description: describeError(er), variant: 'destructive' }),
          });
        }}>
          <label htmlFor="mem" className="sr-only">New memory</label>
          <Input id="mem" value={memText} maxLength={1000} disabled={!s.memoryEnabled} onChange={(e) => setMemText(e.target.value)} placeholder={s.memoryEnabled ? 'e.g. I prefer short replies late at night' : 'Turn on memory to add notes'} className="rounded-xl" data-testid="input-memory" />
          <Button type="submit" className="rounded-full" disabled={!s.memoryEnabled || !memText.trim() || addMemory.isPending} data-testid="button-add-memory"><Plus className="mr-1 h-4 w-4" aria-hidden />Add</Button>
        </form>
        <div className="mt-5">
          {memories.isLoading ? <div className="h-12 animate-pulse rounded-2xl bg-muted/50" /> : memories.isError ? (
            <ErrorState message={describeError(memories.error)} onRetry={() => memories.refetch()} />
          ) : (memories.data ?? []).length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Sparkles className="h-4 w-4" aria-hidden />No memories saved.</p>
          ) : (
            <ul className="space-y-2">
              {memories.data!.map((m) => (
                <li key={m.id} className="flex items-start gap-3 rounded-2xl border border-border bg-background/30 px-4 py-3" data-testid={`row-memory-${m.id}`}>
                  <span className="flex-1 text-sm">{m.content}<span className="mt-1 block font-mono text-[10px] text-muted-foreground">{format(new Date(m.createdAt), 'MMM d, yyyy')}</span></span>
                  <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-destructive" aria-label="Delete memory" onClick={() => setMemToDelete(m)} data-testid={`button-delete-memory-${m.id}`}><Trash2 className="h-4 w-4" /></Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>

      <Section title="Emergency guidance" desc="Your own contact and steps, shown on the home screen. ORBIT never contacts anyone or escalates automatically.">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); patch({ emergencyContact: contact.trim(), emergencyProtocol: protocol.trim() }, 'Emergency guidance saved'); }}>
          <div>
            <label htmlFor="contact" className="mb-2 flex items-center gap-2 text-sm font-medium"><LifeBuoy className="h-4 w-4 text-chart-5" aria-hidden />Who to reach</label>
            <Input id="contact" value={contact} maxLength={200} onChange={(e) => setContact(e.target.value)} placeholder="Name, role, or channel" className="rounded-xl" data-testid="input-emergency-contact" />
          </div>
          <div>
            <label htmlFor="protocol" className="mb-2 block text-sm font-medium">Steps to follow</label>
            <Textarea id="protocol" value={protocol} rows={4} maxLength={2000} onChange={(e) => setProtocol(e.target.value)} placeholder="Copy in your mission’s official procedure, in your own words." className="rounded-2xl" data-testid="input-emergency-protocol" />
          </div>
          <Button type="submit" className="rounded-full" disabled={update.isPending} data-testid="button-save-emergency">Save guidance</Button>
        </form>
      </Section>

      <Section title="Your data" desc="Take a copy, or remove everything.">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="rounded-full" onClick={doExport} disabled={exportQ.isFetching} data-testid="button-export"><Download className="mr-1.5 h-4 w-4" aria-hidden />{exportQ.isFetching ? 'Preparing…' : 'Export as JSON'}</Button>
          <Button variant="outline" className="rounded-full" onClick={async () => { clearAllDrafts(); qc.clear(); await signOut({ redirectUrl: basePath || '/' }); }} data-testid="button-settings-signout"><LogOut className="mr-1.5 h-4 w-4" aria-hidden />Sign out</Button>
          <Button variant="outline" className="rounded-full border-destructive/50 text-destructive" onClick={() => { setWipeConfirm(''); setWipeOpen(true); }} data-testid="button-delete-all"><Trash2 className="mr-1.5 h-4 w-4" aria-hidden />Delete all my data</Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Unsent drafts live only in this browser tab’s session storage and are cleared when you sign out or delete your data.</p>
      </Section>

      <ConfirmDialog
        open={!!memToDelete}
        onOpenChange={(o) => !o && setMemToDelete(null)}
        title="Forget this memory?"
        description="ORBIT will no longer use it as context."
        confirmLabel="Forget"
        pending={delMemory.isPending}
        onConfirm={() => memToDelete && delMemory.mutate({ id: memToDelete.id }, {
          onSuccess: () => { qc.invalidateQueries({ queryKey: getListMemoriesQueryKey() }); setMemToDelete(null); },
          onError: (e) => toast({ title: 'Couldn’t delete', description: describeError(e), variant: 'destructive' }),
        })}
      />
      <ConfirmDialog
        open={wipeOpen}
        onOpenChange={setWipeOpen}
        title="Delete everything?"
        description="All conversations, check-ins, journal entries, memories and settings will be permanently erased. Type DELETE to confirm."
        confirmLabel="Delete everything"
        pending={wipe.isPending}
        disabled={wipeConfirm !== 'DELETE'}
        onConfirm={() => wipe.mutate(undefined, {
          onSuccess: () => {
            clearAllDrafts();
            qc.clear();
            init.current = false;
            setWipeOpen(false);
            toast({ title: 'Your data has been deleted' });
          },
          onError: (e) => toast({ title: 'Couldn’t delete data', description: describeError(e), variant: 'destructive' }),
        })}
      >
        <label htmlFor="wipe" className="sr-only">Type DELETE</label>
        <Input id="wipe" value={wipeConfirm} onChange={(e) => setWipeConfirm(e.target.value)} placeholder="DELETE" className="rounded-xl" data-testid="input-confirm-delete" />
      </ConfirmDialog>
    </div>
  );
}

export default function SettingsPage() {
  usePageMeta('Settings', 'Name, privacy, memory, emergency guidance, and your data.');
  return (
    <RequireAuth title="Settings are personal" body="Sign in to manage privacy, memory, emergency guidance, and your data.">
      <SettingsInner />
    </RequireAuth>
  );
}
