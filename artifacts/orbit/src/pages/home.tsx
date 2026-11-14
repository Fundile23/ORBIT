import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowUp, BookOpen, LifeBuoy, MessageCircle, Sun, Wind } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  getGetOverviewQueryKey,
  getGetSettingsQueryKey,
  getListConversationsQueryKey,
  useCreateConversation,
  useGetOverview,
  useGetSettings,
  useListConversations,
} from '@workspace/api-client-react';
import { OrbitAvatar } from '@/components/orbit-avatar';
import { ConsentDialog } from '@/components/consent-dialog';
import { SignInGate } from '@/components/sign-in-gate';
import { ErrorState } from '@/components/states';
import { usePageMeta } from '@/hooks/use-page-meta';
import { useOnline } from '@/hooks/use-online';
import { useToast } from '@/hooks/use-toast';
import { usePersonal } from '@/lib/session';
import { clearDraft, loadDraft, pendingFirstMessage, saveDraft } from '@/lib/drafts';
import { describeError } from '@/lib/errors';

const STARTERS = [
  'I’m finding it hard to switch off tonight',
  'Help me untangle a frustrating day',
  'I miss home more than usual',
  'Can we just talk about something ordinary?',
];

const MOODS = ['Very low', 'Low', 'Steady', 'Good', 'Bright'];

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Still awake';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomePage() {
  usePageMeta('ORBIT', 'A private space for astronauts far from home: talk things through, check in with yourself, and breathe.');
  const { signedIn, isLoaded, userId } = usePersonal();
  const [, setLocation] = useLocation();
  const online = useOnline();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [restored, setRestored] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const restoredFor = useRef<string | null>(null);

  const settings = useGetSettings({ query: { enabled: signedIn, queryKey: getGetSettingsQueryKey() } });
  const overview = useGetOverview({ query: { enabled: signedIn, queryKey: getGetOverviewQueryKey() } });
  const convs = useListConversations({ query: { enabled: signedIn, queryKey: getListConversationsQueryKey() } });
  const create = useCreateConversation();

  useEffect(() => {
    if (!signedIn || !userId) { setText(''); setRestored(false); restoredFor.current = null; return; }
    if (restoredFor.current === userId) return;
    restoredFor.current = userId;
    const d = loadDraft(userId, 'new');
    if (d) { setText(d); setRestored(true); }
  }, [signedIn, userId]);

  const update = (v: string) => {
    setText(v);
    saveDraft(userId, 'new', v);
  };

  const begin = (consented = false) => {
    const content = text.trim();
    if (!content) return;
    if (!signedIn) { setGateOpen(true); return; }
    if (!online) {
      toast({ title: 'You’re offline', description: 'Your draft is kept in this tab. Send it once you’re reconnected.' });
      return;
    }
    if (!consented && !settings.data?.aiConsent) { setConsentOpen(true); return; }
    const title = content.length > 60 ? `${content.slice(0, 57).trim()}…` : content;
    create.mutate(
      { data: { title } },
      {
        onSuccess: (conv) => {
          pendingFirstMessage.set(conv.id, content);
          clearDraft(userId, 'new');
          setText('');
          qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
          qc.invalidateQueries({ queryKey: getGetOverviewQueryKey() });
          setLocation(`/chat/${conv.id}`);
        },
        onError: (e) => toast({ title: 'Couldn’t start a conversation', description: describeError(e), variant: 'destructive' }),
      },
    );
  };

  const name = settings.data?.displayName?.trim();
  const recent = (convs.data ?? []).slice(0, 5);
  const ov = overview.data;
  const latest = ov?.latestCheckIn;

  return (
    <div className="mx-auto w-full max-w-5xl px-5 pb-16 pt-10 sm:px-8 sm:pt-16">
      <section className="flex flex-col items-center text-center">
        <div className="rise relative mb-8">
          <div className="absolute inset-0 -z-10 scale-[2.2] rounded-full bg-[radial-gradient(circle,hsl(210_92%_74%/.22),transparent_65%)]" aria-hidden />
          <OrbitAvatar size={176} className="anim-float oa-hero" decorative={false} />
        </div>
        <p className="rise font-mono text-[11px] uppercase tracking-[0.3em] text-primary/80" style={{ animationDelay: '80ms' }}>
          your private space
        </p>
        <h1 className="rise mt-3 text-4xl font-extralight leading-tight sm:text-6xl" style={{ animationDelay: '140ms' }} data-testid="text-greeting">
          {greeting()}{name ? `, ${name}` : ''}.
        </h1>
        <p className="rise mt-4 max-w-xl text-base text-muted-foreground sm:text-lg" style={{ animationDelay: '200ms' }}>
          A long way from home, a quiet place to think out loud. Talk, reflect, or just breathe for a minute.
        </p>

        <form
          className="rise glass glow-ring mt-10 w-full max-w-2xl rounded-[28px] p-2 text-left"
          style={{ animationDelay: '260ms' }}
          onSubmit={(e) => { e.preventDefault(); begin(); }}
        >
          <label htmlFor="home-composer" className="sr-only">Start a conversation</label>
          <div className="flex items-end gap-2">
            <textarea
              id="home-composer"
              ref={inputRef}
              rows={2}
              value={text}
              maxLength={8000}
              onChange={(e) => update(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); begin(); } }}
              placeholder="What’s on your mind?"
              className="max-h-48 min-h-[56px] flex-1 resize-none bg-transparent px-4 py-3 text-base outline-none placeholder:text-muted-foreground/70"
              data-testid="input-home-message"
            />
            <button
              type="submit"
              disabled={!text.trim() || create.isPending}
              className="mb-1 mr-1 grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-40"
              aria-label="Start conversation"
              data-testid="button-home-send"
            >
              <ArrowUp className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </form>
        {restored && text && (
          <p className="mt-3 text-xs text-muted-foreground" role="status">
            We restored an unsent draft. It lives only in this browser tab and won’t send until you press send.
          </p>
        )}
        {signedIn && ov && !ov.aiAvailable && (
          <p className="mt-3 text-xs text-chart-4" role="status" data-testid="status-ai-unavailable">
            The AI companion is unavailable right now. Your messages will still be saved, and you can retry replies later.
          </p>
        )}

        <ul className="rise mt-6 flex max-w-2xl flex-wrap justify-center gap-2" style={{ animationDelay: '320ms' }} aria-label="Conversation starters">
          {STARTERS.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => { update(s); inputRef.current?.focus(); }}
                className="rounded-full border border-border bg-card/40 px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                data-testid={`button-starter-${i}`}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>

        {gateOpen && !signedIn && isLoaded && (
          <SignInGate
            className="rise mt-8 w-full max-w-2xl text-left"
            title="Sign in to keep this conversation private"
            body="Conversations are saved to your own account so only you can return to them. Your draft above stays put while you sign in."
          />
        )}
      </section>

      <section className="mt-16 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="glass rounded-3xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-normal"><MessageCircle className="h-4 w-4 text-primary" aria-hidden /> Recent conversations</h2>
          </div>
          {!isLoaded || (signedIn && convs.isLoading) ? (
            <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-2xl bg-muted/60" />)}</div>
          ) : !signedIn ? (
            <p className="text-sm text-muted-foreground">Sign in and your conversations will gather here, visible only to you.</p>
          ) : convs.isError ? (
            <ErrorState message={describeError(convs.error)} onRetry={() => convs.refetch()} />
          ) : recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No conversations yet. Whatever you start with is fine.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {recent.map((c) => (
                <li key={c.id}>
                  <Link href={`/chat/${c.id}`} className="flex items-center justify-between gap-4 rounded-xl px-2 py-3 hover:bg-muted/40" data-testid={`link-recent-${c.id}`}>
                    <span className="min-w-0">
                      <span className="block truncate text-sm">{c.title}</span>
                      {c.summary && <span className="block truncate text-xs text-muted-foreground">{c.summary}</span>}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(c.updatedAt), { addSuffix: true })}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <div className="glass rounded-3xl p-6">
            <h2 className="flex items-center gap-2 text-lg font-normal"><Sun className="h-4 w-4 text-chart-4" aria-hidden /> Today</h2>
            {!signedIn ? (
              <p className="mt-3 text-sm text-muted-foreground">A daily check-in takes under a minute. Sign in to start keeping one.</p>
            ) : overview.isLoading ? (
              <div className="mt-4 h-16 animate-pulse rounded-2xl bg-muted/60" />
            ) : overview.isError ? (
              <p className="mt-3 text-sm text-muted-foreground">Couldn’t load your overview. {describeError(overview.error)}</p>
            ) : latest ? (
              <div className="mt-3 text-sm" data-testid="text-latest-checkin">
                <p className="text-muted-foreground">Last check-in {formatDistanceToNow(new Date(latest.createdAt), { addSuffix: true })}</p>
                <p className="mt-1">Mood: {MOODS[latest.mood - 1]} · Stress {latest.stress}/10 · Wellbeing {latest.wellbeing}/10</p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No check-ins yet.</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/check-in" className="rounded-full bg-secondary px-4 py-2 text-xs text-secondary-foreground hover:bg-accent" data-testid="link-home-checkin">Check in</Link>
              <Link href="/exercises" className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs hover:bg-muted" data-testid="link-home-exercises"><Wind className="h-3 w-3" aria-hidden /> Breathe</Link>
              <Link href="/journal" className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs hover:bg-muted" data-testid="link-home-journal"><BookOpen className="h-3 w-3" aria-hidden /> Journal</Link>
            </div>
          </div>

          <div className="rounded-3xl border border-chart-5/30 bg-[hsl(330_40%_14%/.45)] p-6">
            <h2 className="flex items-center gap-2 text-lg font-normal"><LifeBuoy className="h-4 w-4 text-chart-5" aria-hidden /> If things feel heavy</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              ORBIT can’t reach anyone for you and isn’t a clinician. If you need help now, use your mission’s established support channels.
            </p>
            {signedIn && ov && (ov.emergencyContact || ov.emergencyProtocol) ? (
              <div className="mt-3 space-y-1 text-sm" data-testid="text-emergency">
                {ov.emergencyContact && <p><span className="text-muted-foreground">Your contact: </span>{ov.emergencyContact}</p>}
                {ov.emergencyProtocol && <p className="whitespace-pre-line text-muted-foreground">{ov.emergencyProtocol}</p>}
              </div>
            ) : signedIn ? (
              <Link href="/settings" className="mt-3 inline-block text-sm text-primary underline-offset-4 hover:underline" data-testid="link-set-emergency">Add your own emergency guidance</Link>
            ) : null}
          </div>
        </div>
      </section>

      <ConsentDialog open={consentOpen} onOpenChange={setConsentOpen} onConsented={() => begin(true)} />
    </div>
  );
}
