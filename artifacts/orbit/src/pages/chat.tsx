import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowUp, FileText, MoreHorizontal, Pencil, RotateCcw, Square, Trash2 } from 'lucide-react';
import {
  getGetConversationQueryKey,
  getGetOverviewQueryKey,
  getGetSettingsQueryKey,
  getListConversationsQueryKey,
  useDeleteConversation,
  useGetConversation,
  useGetSettings,
  useSummarizeConversation,
  useUpdateConversation,
  type Message,
} from '@workspace/api-client-react';
import { OrbitAvatar } from '@/components/orbit-avatar';
import { useAvatarExpression } from '@/components/avatar-expression-context';
import { inferAvatarTone } from '@/lib/avatar-tone';
import { AVATAR_ACTIVITY_LABELS, getAvatarActivity } from '@/lib/avatar-presence';
import { ConsentDialog } from '@/components/consent-dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { RequireAuth } from '@/components/require-auth';
import { ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { usePageMeta } from '@/hooks/use-page-meta';
import { useOnline } from '@/hooks/use-online';
import { useToast } from '@/hooks/use-toast';
import { usePersonal } from '@/lib/session';
import { clearDraft, loadDraft, pendingFirstMessage, saveDraft, uuid } from '@/lib/drafts';
import { describeError } from '@/lib/errors';
import { StreamError, streamMessage } from '@/lib/stream';
import { cn } from '@/lib/utils';

type Pending = {
  clientMessageId: string;
  content: string;
  reply: string;
  status: 'streaming' | 'failed';
  error?: string;
  sentAt: string;
};

function Bubble({ role, content, time, streaming }: { role: 'user' | 'assistant'; content: string; time?: string; streaming?: boolean }) {
  const mine = role === 'user';
  return (
    <div className={cn('rise flex gap-3', mine ? 'justify-end' : 'justify-start')}>
      {!mine && <OrbitAvatar size={34} thinking={Boolean(streaming)} className="mt-1" />}
      <div className={cn('flex max-w-[82%] flex-col', mine ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'whitespace-pre-wrap break-words px-4 py-3 text-[15px] leading-relaxed',
            mine
              ? 'rounded-[22px] rounded-br-md bg-primary/90 text-primary-foreground'
              : 'rounded-[22px] rounded-bl-md border border-card-border bg-card/80 text-card-foreground',
          )}
        >
          {content || (streaming && (
            <span className="inline-flex gap-1 py-1" aria-label="ORBIT is typing">
              {[0, 1, 2].map((i) => <span key={i} className="typing-dot h-1.5 w-1.5 rounded-full bg-primary" style={{ animationDelay: `${i * 0.15}s` }} />)}
            </span>
          ))}
        </div>
        {time && <span className="mt-1 px-2 font-mono text-[10px] text-muted-foreground">{time}</span>}
      </div>
    </div>
  );
}

function ChatInner({ id }: { id: string }) {
  const { userId } = usePersonal();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const online = useOnline();
  const conv = useGetConversation(id, { query: { enabled: !!id, queryKey: getGetConversationQueryKey(id) } });
  const settings = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const rename = useUpdateConversation();
  const remove = useDeleteConversation();
  const summarize = useSummarizeConversation();

  usePageMeta(conv.data?.title ?? 'Conversation', 'A private conversation in ORBIT.');

  const [text, setText] = useState('');
  const [draftRestored, setDraftRestored] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [composerFocused, setComposerFocused] = useState(false);
  const { setExpression } = useAvatarExpression();
  const avatarTone = useMemo(
    () => conv.isError ? 'neutral' : inferAvatarTone(conv.data?.messages ?? [], pending?.content),
    [conv.data?.messages, conv.isError, pending?.content],
  );
  const avatarActivity = getAvatarActivity({
    writing: composerFocused,
    generating: pending?.status === 'streaming',
    hasReply: Boolean(pending?.reply),
  });
  useEffect(() => {
    setExpression({ tone: avatarTone, activity: avatarActivity });
  }, [avatarTone, avatarActivity, setExpression]);
  const [consentFor, setConsentFor] = useState<{ content: string; cmid?: string } | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameVal, setRenameVal] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const firstSentRef = useRef(false);

  useEffect(() => {
    const d = loadDraft(userId, id);
    setText(d);
    setDraftRestored(Boolean(d));
    setPending(null);
    firstSentRef.current = false;
    return () => abortRef.current?.abort();
  }, [id, userId]);

  useEffect(() => {
    if (!online) setWasOffline(true);
  }, [online]);

  const refreshAll = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: getGetConversationQueryKey(id) });
    qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetOverviewQueryKey() });
  }, [qc, id]);

  const send = useCallback(
    async (content: string, cmid?: string, consented = false) => {
      if (!content.trim()) return;
      if (!navigator.onLine) {
        toast({ title: 'You’re offline', description: 'Your draft stays in this tab. Send it when you reconnect.' });
        return;
      }
      if (!consented && !qc.getQueryData<{ aiConsent: boolean }>(getGetSettingsQueryKey())?.aiConsent) {
        setConsentFor({ content, cmid });
        return;
      }
      const clientMessageId = cmid ?? uuid();
      const ctrl = new AbortController();
      abortRef.current?.abort();
      abortRef.current = ctrl;
      setPending({ clientMessageId, content, reply: '', status: 'streaming', sentAt: new Date().toISOString() });
      if (!cmid) {
        setText('');
        clearDraft(userId, id);
        setDraftRestored(false);
        setWasOffline(false);
      }
      try {
        await streamMessage(
          id,
          { content, clientMessageId },
          (delta) => setPending((p) => (p && p.clientMessageId === clientMessageId ? { ...p, reply: p.reply + delta } : p)),
          ctrl.signal,
        );
        await refreshAll();
        setPending((p) => (p?.clientMessageId === clientMessageId ? null : p));
      } catch (err) {
        const aborted = (err as Error)?.name === 'AbortError';
        if (aborted && abortRef.current !== ctrl) return;
        const msg = aborted ? 'You stopped this reply.' : err instanceof StreamError ? err.message : describeError(err);
        setPending((p) => (p?.clientMessageId === clientMessageId ? { ...p, status: 'failed', error: msg } : p));
        qc.invalidateQueries({ queryKey: getGetConversationQueryKey(id) });
      }
    },
    [id, qc, refreshAll, toast, userId],
  );

  useEffect(() => {
    if (firstSentRef.current || !conv.data || !settings.data) return;
    const first = pendingFirstMessage.get(id);
    if (first) {
      firstSentRef.current = true;
      pendingFirstMessage.delete(id);
      send(first);
    }
  }, [conv.data, settings.data, id, send]);

  const messages: Message[] = conv.data?.messages ?? [];
  const userAlreadySaved = pending ? messages.some((m) => m.clientMessageId === pending.clientMessageId) : false;

  // A reload must not strand a saved user message whose reply was interrupted.
  useEffect(() => {
    const last = conv.data?.messages.at(-1);
    if (!pending && last?.role === 'user' && last.clientMessageId) {
      setPending({
        clientMessageId: last.clientMessageId, content: last.content, reply: '',
        status: 'failed', error: 'This reply did not finish. Retry when you are ready.',
        sentAt: last.createdAt,
      });
    }
  }, [conv.data?.messages, pending]);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    bottomRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'end' });
  }, [messages.length, pending?.reply, pending?.status]);

  const onText = (v: string) => {
    setText(v);
    saveDraft(userId, id, v);
  };

  if (conv.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-5 px-5 py-10" aria-busy="true">
        <div className="h-7 w-64 animate-pulse rounded-xl bg-muted/60" />
        {[0, 1, 2].map((i) => <div key={i} className={cn('h-16 animate-pulse rounded-3xl bg-muted/40', i % 2 ? 'ml-auto w-2/3' : 'w-3/4')} />)}
      </div>
    );
  }
  if (conv.isError || !conv.data) {
    const notFound = (conv.error as { status?: number } | null)?.status === 404;
    return (
      <div className="mx-auto max-w-2xl px-5 py-16">
        <ErrorState
          message={notFound ? 'This conversation doesn’t exist or was deleted.' : describeError(conv.error)}
          onRetry={notFound ? () => setLocation('/') : () => conv.refetch()}
        />
      </div>
    );
  }

  const c = conv.data;
  const streaming = pending?.status === 'streaming';

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-3xl flex-col px-4 sm:px-6 md:min-h-[100dvh]">
      <header className="sticky top-16 z-20 -mx-4 flex items-center gap-2 border-b border-border/50 bg-background/80 px-3 py-3 backdrop-blur-xl sm:-mx-6 sm:gap-4 sm:px-6 md:top-0">
        <span
          title="A tentative expression from recent conversation cues, not a mood assessment. Listening uses text only."
          className="shrink-0"
          data-testid="avatar-conversation"
        >
          <OrbitAvatar size={104} tone={avatarTone} activity={avatarActivity} decorative={false} className="sm:hidden" />
          <OrbitAvatar size={136} tone={avatarTone} activity={avatarActivity} decorative={false} className="hidden sm:inline-flex" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-normal" data-testid="text-conversation-title">{c.title}</h1>
          <p className="mt-1 font-mono text-[10px] text-primary/80" role="status" data-testid="status-avatar-activity">
            {AVATAR_ACTIVITY_LABELS[avatarActivity]}
          </p>
          <p className="mt-1 hidden font-mono text-[10px] text-muted-foreground sm:block">Started {format(new Date(c.createdAt), 'MMM d, yyyy · HH:mm')}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          disabled={summarize.isPending || messages.length === 0 || !online}
          onClick={() =>
            summarize.mutate(
              { id },
              {
                onSuccess: (updated) => {
                  qc.setQueryData(getGetConversationQueryKey(id), (old: typeof c | undefined) => (old ? { ...old, summary: updated.summary } : old));
                  qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
                },
                onError: (e) => toast({ title: 'Couldn’t summarize', description: describeError(e), variant: 'destructive' }),
              },
            )
          }
          data-testid="button-summarize"
          aria-label={summarize.isPending ? 'Summarizing conversation' : 'Summarize conversation'}
        >
          <FileText className="h-3.5 w-3.5 sm:mr-1.5" aria-hidden />
          <span className="hidden sm:inline">{summarize.isPending ? 'Summarizing…' : 'Summarize'}</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="Conversation options" data-testid="button-conversation-menu">
              <MoreHorizontal className="h-4 w-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-2xl">
            <DropdownMenuItem onSelect={() => { setRenameVal(c.title); setRenameOpen(true); }} data-testid="menu-rename">
              <Pencil className="mr-2 h-4 w-4" aria-hidden /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onSelect={() => setDeleteOpen(true)} data-testid="menu-delete">
              <Trash2 className="mr-2 h-4 w-4" aria-hidden /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {c.summary && (
        <aside className="mt-5 rounded-2xl border border-secondary bg-secondary/40 p-4 text-sm" aria-label="Conversation summary" data-testid="text-summary">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-secondary-foreground/80">Summary</p>
          <p className="leading-relaxed text-secondary-foreground">{c.summary}</p>
        </aside>
      )}

      <div role="log" aria-live="polite" aria-label="Messages" className="flex-1 space-y-5 py-6">
        {messages.length === 0 && !pending && (
          <div className="flex flex-col items-center py-16 text-center">
            <OrbitAvatar size={104} tone={avatarTone} activity={avatarActivity} />
            <p className="mt-4 text-muted-foreground">Whenever you’re ready. There’s no wrong place to start.</p>
          </div>
        )}
        {messages.map((m) => (
          <Bubble key={m.id} role={m.role} content={m.content} time={format(new Date(m.createdAt), 'HH:mm')} />
        ))}
        {pending && (
          <>
            {!userAlreadySaved && <Bubble role="user" content={pending.content} time={format(new Date(pending.sentAt), 'HH:mm')} />}
            {(pending.status === 'streaming' || pending.reply) && <Bubble role="assistant" content={pending.reply} streaming={streaming} />}
            {pending.status === 'failed' && (
              <div role="alert" className="ml-12 flex flex-wrap items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm" data-testid="status-send-failed">
                <span className="text-foreground/90">{pending.error ?? 'The reply was interrupted.'}{userAlreadySaved ? ' Your message was saved.' : ''}</span>
                <Button size="sm" variant="outline" className="rounded-full" disabled={!online} onClick={() => send(pending.content, pending.clientMessageId)} data-testid="button-retry-send">
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Retry
                </Button>
                <button type="button" className="text-xs text-muted-foreground underline-offset-4 hover:underline" onClick={() => setPending(null)} data-testid="button-dismiss-failed">Dismiss</button>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-20 pb-4 md:bottom-0 md:pb-6">
        {!online && text.trim() && (
          <p role="status" className="mb-2 rounded-2xl bg-accent/70 px-4 py-2 text-xs text-accent-foreground">
            You’re offline. This draft is stored only in this browser tab (session storage) and is cleared when you sign out.
          </p>
        )}
        {online && wasOffline && text.trim() && !pending && (
          <p role="status" className="mb-2 rounded-2xl bg-secondary/70 px-4 py-2 text-xs text-secondary-foreground">
            You’re back online. Review your draft and press send when you’re ready. Nothing is sent automatically.
          </p>
        )}
        {draftRestored && online && !wasOffline && text.trim() && (
          <p role="status" className="mb-2 px-2 text-xs text-muted-foreground">Restored your unsent draft from this tab. It won’t send until you choose to.</p>
        )}
        <form
          className="glass glow-ring flex items-end gap-2 rounded-[26px] p-2"
          onSubmit={(e) => { e.preventDefault(); if (!streaming) send(text.trim()); }}
        >
          <label htmlFor="chat-composer" className="sr-only">Message ORBIT</label>
          <textarea
            id="chat-composer"
            rows={1}
            value={text}
            maxLength={8000}
            onFocus={() => setComposerFocused(true)}
            onBlur={() => setComposerFocused(false)}
            onChange={(e) => onText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (!streaming) send(text.trim()); } }}
            placeholder={online ? 'Write to ORBIT…' : 'Offline. Your draft will wait here.'}
            className="max-h-40 min-h-[48px] flex-1 resize-none bg-transparent px-4 py-3 outline-none placeholder:text-muted-foreground/70"
            data-testid="input-chat-message"
          />
          {streaming ? (
            <button type="button" onClick={() => abortRef.current?.abort()} className="mb-0.5 mr-0.5 grid h-11 w-11 place-items-center rounded-full bg-muted text-foreground" aria-label="Stop reply" data-testid="button-stop">
              <Square className="h-4 w-4" aria-hidden />
            </button>
          ) : (
            <button type="submit" disabled={!text.trim() || !online} className="mb-0.5 mr-0.5 grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-40" aria-label="Send message" data-testid="button-send">
              <ArrowUp className="h-5 w-5" aria-hidden />
            </button>
          )}
        </form>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">ORBIT is an AI companion, not a clinician. It can be wrong and can’t contact anyone for you.</p>
      </div>

      <ConsentDialog
        open={!!consentFor}
        onOpenChange={(o) => { if (!o) setConsentFor(null); }}
        onConsented={() => { const p = consentFor; setConsentFor(null); if (p) send(p.content, p.cmid, true); }}
      />

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="rounded-3xl bg-popover">
          <DialogHeader><DialogTitle className="font-display">Rename conversation</DialogTitle></DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const title = renameVal.trim();
              if (!title) return;
              rename.mutate(
                { id, data: { title } },
                {
                  onSuccess: (u) => {
                    qc.setQueryData(getGetConversationQueryKey(id), (old: typeof c | undefined) => (old ? { ...old, title: u.title } : old));
                    qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
                    setRenameOpen(false);
                  },
                  onError: (er) => toast({ title: 'Couldn’t rename', description: describeError(er), variant: 'destructive' }),
                },
              );
            }}
          >
            <label htmlFor="rename" className="sr-only">Title</label>
            <Input id="rename" value={renameVal} maxLength={120} onChange={(e) => setRenameVal(e.target.value)} autoFocus data-testid="input-rename" />
            <DialogFooter className="mt-4">
              <Button type="button" variant="ghost" className="rounded-full" onClick={() => setRenameOpen(false)}>Cancel</Button>
              <Button type="submit" className="rounded-full" disabled={!renameVal.trim() || rename.isPending} data-testid="button-rename-save">{rename.isPending ? 'Saving…' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this conversation?"
        description="All messages and its summary will be permanently removed. This can’t be undone."
        pending={remove.isPending}
        onConfirm={() =>
          remove.mutate(
            { id },
            {
              onSuccess: () => {
                clearDraft(userId, id);
                qc.removeQueries({ queryKey: getGetConversationQueryKey(id) });
                qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
                qc.invalidateQueries({ queryKey: getGetOverviewQueryKey() });
                setDeleteOpen(false);
                setLocation('/');
              },
              onError: (e) => toast({ title: 'Couldn’t delete', description: describeError(e), variant: 'destructive' }),
            },
          )
        }
      />
    </div>
  );
}

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  return (
    <RequireAuth title="This conversation is private" body="Sign in to the account that owns it to continue.">
      <ChatInner key={params.id} id={params.id ?? ''} />
    </RequireAuth>
  );
}
