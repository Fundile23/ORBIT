import { useEffect, useRef, type ReactNode } from 'react';
import { ClerkProvider, SignIn, SignUp, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { dark } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppShell } from '@/components/app-shell';
import { OrbitAvatar } from '@/components/orbit-avatar';
import { AvatarExpressionProvider } from '@/components/avatar-expression-context';
import { clearAllDrafts } from '@/lib/drafts';
import { usePageMeta } from '@/hooks/use-page-meta';
import NotFound from '@/pages/not-found';
import HomePage from '@/pages/home';
import ChatPage from '@/pages/chat';
import CheckInPage from '@/pages/check-in';
import InsightsPage from '@/pages/insights';
import ExercisesPage from '@/pages/exercises';
import JournalPage from '@/pages/journal';
import SettingsPage from '@/pages/settings';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

// REQUIRED — copy verbatim.
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// REQUIRED — copy verbatim. Empty in dev, auto-set in prod.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: dark,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#86b8f6',
    colorForeground: '#e6ebf8',
    colorMutedForeground: '#a3abc6',
    colorDanger: '#ec6f86',
    colorBackground: '#121735',
    colorInput: '#1a2045',
    colorInputForeground: '#e6ebf8',
    colorNeutral: '#e6ebf8',
    fontFamily: "'DM Sans', ui-sans-serif, sans-serif",
    borderRadius: '0.875rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#121735] border border-[#262c55] rounded-3xl w-[440px] max-w-full overflow-hidden shadow-[0_30px_80px_-30px_rgba(134,184,246,0.35)]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#eef2fc] font-[Outfit] font-normal text-2xl',
    headerSubtitle: 'text-[#a3abc6]',
    socialButtonsBlockButtonText: 'text-[#e6ebf8]',
    formFieldLabel: 'text-[#cdd4ea]',
    footerActionLink: 'text-[#9cc6ff] hover:text-[#c3dcff]',
    footerActionText: 'text-[#a3abc6]',
    dividerText: 'text-[#8f98b8]',
    identityPreviewEditButton: 'text-[#9cc6ff]',
    formFieldSuccessText: 'text-[#8fe0c9]',
    alertText: 'text-[#f3d6dc]',
    logoBox: 'justify-center',
    logoImage: 'h-12 w-12',
    socialButtonsBlockButton: 'border border-[#2c3360] bg-[#171d40] hover:bg-[#1f2650] rounded-full',
    formButtonPrimary: 'bg-[#86b8f6] text-[#0d1230] hover:bg-[#9cc6ff] rounded-full font-medium',
    formFieldInput: 'bg-[#1a2045] border-[#2c3360] text-[#e6ebf8] rounded-xl',
    footerAction: 'justify-center',
    dividerLine: 'bg-[#262c55]',
    alert: 'bg-[#2a1830] border border-[#5a2a45]',
    otpCodeFieldInput: 'bg-[#1a2045] border-[#2c3360] text-[#e6ebf8]',
    formFieldRow: 'gap-2',
    main: 'gap-5',
  },
};

function AuthFrame({ children, kind }: { children: ReactNode; kind: 'in' | 'up' }) {
  usePageMeta(kind === 'in' ? 'Sign in' : 'Create account', 'Sign in to your private ORBIT space.');
  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="starfield" aria-hidden />
      <Link href="/" className="relative z-10 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" data-testid="link-auth-home">
        <OrbitAvatar size={22} /> Back to ORBIT
      </Link>
      <div className="relative z-10 w-full">{children}</div>
      <p className="relative z-10 max-w-sm text-center text-xs text-muted-foreground">
        Your conversations, check-ins, and journal stay in your private account. ORBIT is not a medical service.
      </p>
    </div>
  );
}

function SignInPage() {
  return (
    <AuthFrame kind="in">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </AuthFrame>
  );
}

function SignUpPage() {
  return (
    <AuthFrame kind="up">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </AuthFrame>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
        clearAllDrafts();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route>
        <AvatarExpressionProvider>
        <AppShell>
          <RoutedErrorBoundary>
            <Switch>
              <Route path="/" component={HomePage} />
              <Route path="/chat/:id" component={ChatPage} />
              <Route path="/check-in" component={CheckInPage} />
              <Route path="/insights" component={InsightsPage} />
              <Route path="/exercises" component={ExercisesPage} />
              <Route path="/journal" component={JournalPage} />
              <Route path="/settings" component={SettingsPage} />
              <Route component={NotFound} />
            </Switch>
          </RoutedErrorBoundary>
        </AppShell>
        </AvatarExpressionProvider>
      </Route>
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: 'Welcome back', subtitle: 'Your space is right where you left it' } },
        signUp: { start: { title: 'Make a private space', subtitle: 'Your personal account, private by default' } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <AppRoutes />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
