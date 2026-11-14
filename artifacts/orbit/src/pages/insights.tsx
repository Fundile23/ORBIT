import { useMemo } from 'react';
import { Link } from 'wouter';
import { format } from 'date-fns';
import { LineChart as LineIcon } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart } from 'recharts';
import { getGetOverviewQueryKey, getListCheckInsQueryKey, useGetOverview, useListCheckIns } from '@workspace/api-client-react';
import { RequireAuth } from '@/components/require-auth';
import { EmptyState, ErrorState, PageHeader } from '@/components/states';
import { usePageMeta } from '@/hooks/use-page-meta';
import { describeError } from '@/lib/errors';

const tooltipStyle = { background: 'hsl(233 42% 12%)', border: '1px solid hsl(234 30% 22%)', borderRadius: 14, color: 'hsl(222 45% 93%)', fontSize: 12 };

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="glass rounded-3xl p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl font-light" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function InsightsInner() {
  const list = useListCheckIns({ query: { queryKey: getListCheckInsQueryKey() } });
  const ov = useGetOverview({ query: { queryKey: getGetOverviewQueryKey() } });
  const data = useMemo(
    () =>
      [...(list.data ?? [])]
        .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
        .map((c) => ({ date: format(new Date(c.createdAt), 'MMM d'), mood: c.mood * 2, moodRaw: c.mood, stress: c.stress, wellbeing: c.wellbeing, sleep: c.sleepHours })),
    [list.data],
  );
  const sleepData = data.filter((d) => d.sleep != null);

  if (list.isLoading || ov.isLoading) {
    return <div className="mx-auto max-w-5xl space-y-4 px-5 py-10"><div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-3xl bg-muted/50" />)}</div><div className="h-72 animate-pulse rounded-3xl bg-muted/40" /></div>;
  }
  if (list.isError) return <div className="mx-auto max-w-2xl px-5 py-16"><ErrorState message={describeError(list.error)} onRetry={() => list.refetch()} /></div>;

  const o = ov.data;
  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <PageHeader eyebrow="Insights" title="Patterns, gently" />
      {data.length === 0 ? (
        <EmptyState icon={<LineIcon className="h-6 w-6" />} title="Nothing to chart yet" body="Insights are drawn only from your own check-ins. Add a few and trends will appear here." action={<Link href="/check-in" className="rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground" data-testid="link-insights-checkin">Make a check-in</Link>} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Check-ins" value={String(o?.checkInCount ?? data.length)} hint="All time" />
            <Stat label="Average mood" value={o?.averageMood != null ? `${o.averageMood.toFixed(1)} / 5` : '—'} hint="Across your latest 30 check-ins" />
            <Stat label="Average stress" value={o?.averageStress != null ? `${o.averageStress.toFixed(1)} / 10` : '—'} hint="Across your latest 30 check-ins" />
          </div>
          <section className="glass rounded-3xl p-5 sm:p-6" aria-labelledby="trend-h">
            <h2 id="trend-h" className="text-lg font-normal">Mood, stress and wellbeing</h2>
            <p className="mb-4 text-xs text-muted-foreground">Mood is scaled to 10 so the lines share an axis. Every point is one of your check-ins.</p>
            <div className="h-72" role="img" aria-label={`Line chart of ${data.length} check-ins`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
                  <CartesianGrid stroke="hsl(234 30% 18%)" vertical={false} />
                  <XAxis dataKey="date" stroke="hsl(226 20% 60%)" fontSize={11} tickLine={false} />
                  <YAxis domain={[0, 10]} stroke="hsl(226 20% 60%)" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => (n === 'mood' ? [`${v / 2} / 5`, 'Mood'] : [`${v} / 10`, n[0].toUpperCase() + n.slice(1)])} />
                  <Line type="monotone" dataKey="mood" stroke="hsl(210 92% 74%)" strokeWidth={2.2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="wellbeing" stroke="hsl(172 55% 62%)" strokeWidth={2} dot={{ r: 2.5 }} />
                  <Line type="monotone" dataKey="stress" stroke="hsl(262 70% 76%)" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 2.5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <li className="flex items-center gap-1.5"><span className="h-2 w-4 rounded bg-chart-1" />Mood</li>
              <li className="flex items-center gap-1.5"><span className="h-2 w-4 rounded bg-chart-3" />Wellbeing</li>
              <li className="flex items-center gap-1.5"><span className="h-2 w-4 rounded bg-chart-2" />Stress (dashed)</li>
            </ul>
          </section>
          <section className="glass rounded-3xl p-5 sm:p-6" aria-labelledby="sleep-h">
            <h2 id="sleep-h" className="mb-4 text-lg font-normal">Sleep you recorded</h2>
            {sleepData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sleep hours logged yet. It’s optional on each check-in.</p>
            ) : (
              <div className="h-56" role="img" aria-label="Bar chart of recorded sleep hours">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sleepData} margin={{ left: -20, right: 8 }}>
                    <CartesianGrid stroke="hsl(234 30% 18%)" vertical={false} />
                    <XAxis dataKey="date" stroke="hsl(226 20% 60%)" fontSize={11} tickLine={false} />
                    <YAxis stroke="hsl(226 20% 60%)" fontSize={11} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} h`, 'Sleep']} cursor={{ fill: 'hsl(250 30% 19% / .5)' }} />
                    <Bar dataKey="sleep" fill="hsl(262 70% 76%)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
          <p className="text-xs text-muted-foreground">These charts reflect only what you entered. They aren’t a medical assessment.</p>
        </div>
      )}
    </div>
  );
}

export default function InsightsPage() {
  usePageMeta('Insights', 'See trends from your own check-ins over time.');
  return (
    <RequireAuth title="Insights come from your check-ins" body="Sign in to see trends drawn from your own private entries.">
      <InsightsInner />
    </RequireAuth>
  );
}
