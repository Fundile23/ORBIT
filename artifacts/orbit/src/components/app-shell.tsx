import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useClerk, useUser } from '@clerk/react';
import { useQueryClient } from '@tanstack/react-query';
import { BookOpen, LineChart, LogIn, LogOut, MessageCircle, Settings2, Sun, Wind } from 'lucide-react';
import { getListConversationsQueryKey, useListConversations } from '@workspace/api-client-react';
import { OrbitAvatar } from '@/components/orbit-avatar';
import { OfflineBanner } from '@/components/offline-banner';
import { usePersonal, basePath } from '@/lib/session';
import { clearAllDrafts } from '@/lib/drafts';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Talk', icon: MessageCircle },
  { href: '/check-in', label: 'Check-in', icon: Sun },
  { href: '/insights', label: 'Insights', icon: LineChart },
  { href: '/exercises', label: 'Exercises', icon: Wind },
  { href: '/journal', label: 'Journal', icon: BookOpen },
  { href: '/settings', label: 'Settings', icon: Settings2 },
];

function isActive(loc: string, href: string) {
  if (href === '/') return loc === '/' || loc.startsWith('/chat');
  return loc.startsWith(href);
}

function RecentList() {
  const { signedIn } = usePersonal();
  const [loc] = useLocation();
  const q = useListConversations({ query: { enabled: signedIn, queryKey: getListConversationsQueryKey() } });
  if (!signedIn) return null;
  const items = (q.data ?? []).slice(0, 8);
  return (
    <div className="mt-8 min-h-0 flex-1 overflow-y-auto pr-1">
      <p className="px-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">Recent</p>
      {q.isLoading && (
        <div className="mt-3 space-y-2 px-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-4 animate-pulse rounded bg-muted" />)}
        </div>
      )}
      {q.isError && <p className="mt-3 px-3 text-xs text-muted-foreground">Couldn’t load conversations.</p>}
      {q.data && items.length === 0 && <p className="mt-3 px-3 text-xs text-muted-foreground">Nothing yet. Say hello.</p>}
      <ul className="mt-2 space-y-0.5">
        {items.map((c) => {
          const active = loc === `/chat/${c.id}`;
          return (
            <li key={c.id}>
              <Link
                href={`/chat/${c.id}`}
                className={cn('block truncate rounded-xl px-3 py-2 text-sm transition-colors', active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground')}
                aria-current={active ? 'page' : undefined}
                data-testid={`link-sidebar-conversation-${c.id}`}
              >
                {c.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AccountBlock() {
  const { signedIn, isLoaded } = usePersonal();
  const { user } = useUser();
  const { signOut } = useClerk();
  const qc = useQueryClient();
  if (!isLoaded) return <div className="h-12 animate-pulse rounded-2xl bg-muted/60" />;
  if (!signedIn) {
    return (
      <Link href="/sign-in" className="flex items-center gap-2 rounded-2xl border border-border px-3 py-2.5 text-sm hover:bg-sidebar-accent/50" data-testid="link-signin">
        <LogIn className="h-4 w-4 text-primary" aria-hidden /> Sign in
      </Link>
    );
  }
  const name = user?.firstName || user?.primaryEmailAddress?.emailAddress || 'Signed in';
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-sidebar-accent/40 px-3 py-2">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent font-display text-sm text-accent-foreground">
        {name.slice(0, 1).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm" data-testid="text-account-name">{name}</span>
      <button
        type="button"
        onClick={async () => {
          clearAllDrafts();
          qc.clear();
          await signOut({ redirectUrl: basePath || '/' });
        }}
        className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
        aria-label="Sign out"
        data-testid="button-signout"
      >
        <LogOut className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  return (
    <div className="relative min-h-[100dvh]">
      <div className="starfield" aria-hidden />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">
        Skip to content
      </a>
      <OfflineBanner />
      <div className="relative z-10 flex">
        <aside className="sticky top-0 hidden h-[100dvh] w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/70 px-3 py-5 backdrop-blur-xl md:flex">
          <Link href="/" className="mb-8 flex items-center gap-2.5 px-3" data-testid="link-logo">
            <OrbitAvatar size={30} />
            <span className="font-display text-lg font-medium tracking-[0.18em]">ORBIT</span>
          </Link>
          <nav aria-label="Main">
            <ul className="space-y-1">
              {NAV.map(({ href, label, icon: Icon }) => {
                const active = isActive(loc, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      className={cn('group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors', active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground')}
                      data-testid={`link-nav-${label.toLowerCase()}`}
                    >
                      <Icon className={cn('h-4 w-4', active ? 'text-primary' : 'text-muted-foreground group-hover:text-primary')} aria-hidden />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <RecentList />
          <div className="mt-4">
            <AccountBlock />
          </div>
        </aside>

        <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/60 bg-background/70 px-4 py-3 backdrop-blur-xl md:hidden">
            <Link href="/" className="flex items-center gap-2" data-testid="link-logo-mobile">
              <OrbitAvatar size={26} />
              <span className="font-display tracking-[0.18em]">ORBIT</span>
            </Link>
            <div className="w-40"><AccountBlock /></div>
          </header>
          <main id="main" className="flex-1 pb-24 md:pb-0">{children}</main>
        </div>
      </div>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/85 backdrop-blur-xl md:hidden">
        <ul className="grid grid-cols-6">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(loc, href);
            return (
              <li key={href}>
                <Link href={href} aria-current={active ? 'page' : undefined} className={cn('flex flex-col items-center gap-1 py-2.5 text-[10px]', active ? 'text-primary' : 'text-muted-foreground')} data-testid={`link-mobile-nav-${label.toLowerCase()}`}>
                  <Icon className="h-5 w-5" aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
