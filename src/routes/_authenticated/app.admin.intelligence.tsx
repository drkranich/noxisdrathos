import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Activity, TrendingUp, Users, AlertTriangle, MessageSquare, LifeBuoy, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getIntelligenceOverview } from "@/lib/admin-intelligence.functions";
import { Skeleton } from "@/components/Skeleton";

export const Route = createFileRoute("/_authenticated/app/admin/intelligence")({
  head: () => ({ meta: [{ title: "Inteligência — Admin" }, { name: "robots", content: "noindex" }] }),
  component: IntelligencePage,
});

type Overview = Awaited<ReturnType<typeof getIntelligenceOverview>>;
type FeedEvent = {
  id: string;
  kind: "watch" | "bookmark" | "comment" | "ticket";
  label: string;
  detail: string;
  at: string;
};

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60_000) return `${Math.max(1, Math.floor(d / 1000))}s`;
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h`;
  return `${Math.floor(d / 86_400_000)}d`;
}

function brl(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function IntelligencePage() {
  const fetchOverview = useServerFn(getIntelligenceOverview);
  const [data, setData] = useState<Overview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [feed, setFeed] = useState<FeedEvent[]>([]);

  const load = useCallback(() => {
    fetchOverview()
      .then((r) => {
        setData(r);
        setErr(null);
      })
      .catch((e) => setErr(e.message ?? "erro"));
  }, [fetchOverview]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  // Seed feed from initial recentActivity
  useEffect(() => {
    if (!data) return;
    setFeed((prev) => {
      if (prev.length > 0) return prev;
      return data.recentActivity.slice(0, 12).map((a) => ({
        id: `seed-${a.id}`,
        kind: "watch" as const,
        label: a.completed ? "concluiu" : "consumiu",
        detail: a.title,
        at: a.at,
      }));
    });
  }, [data]);

  // Realtime subscriptions
  useEffect(() => {
    const push = (ev: FeedEvent) =>
      setFeed((prev) => [ev, ...prev].slice(0, 30));

    const ch = supabase
      .channel("admin-intel-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "watch_history" }, (p) => {
        const r = p.new as any;
        push({
          id: `w-${r.id}`,
          kind: "watch",
          label: r.completed ? "concluiu" : "iniciou",
          detail: "conteúdo em curso",
          at: r.last_seen_at ?? new Date().toISOString(),
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "watch_history" }, (p) => {
        const r = p.new as any;
        push({
          id: `w-${r.id}-${r.last_seen_at}`,
          kind: "watch",
          label: r.completed ? "concluiu" : "progrediu",
          detail: `${Math.round((r.progress_seconds ?? 0) / 60)} min`,
          at: r.last_seen_at ?? new Date().toISOString(),
        });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bookmarks" }, (p) => {
        const r = p.new as any;
        push({
          id: `b-${r.id}`,
          kind: "bookmark",
          label: r.kind === "favorite" ? "favoritou" : "salvou",
          detail: "novo bookmark",
          at: r.created_at ?? new Date().toISOString(),
        });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments" }, (p) => {
        const r = p.new as any;
        push({
          id: `c-${r.id}`,
          kind: "comment",
          label: "comentou",
          detail: (r.body ?? "").slice(0, 80),
          at: r.created_at ?? new Date().toISOString(),
        });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_tickets" }, (p) => {
        const r = p.new as any;
        push({
          id: `t-${r.id}`,
          kind: "ticket",
          label: "abriu chamado",
          detail: r.subject ?? "—",
          at: r.created_at ?? new Date().toISOString(),
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const planMixEntries = useMemo(
    () => (data ? Object.entries(data.revenue.planMix).sort((a, b) => b[1] - a[1]) : []),
    [data],
  );
  const planMixTotal = planMixEntries.reduce((s, [, n]) => s + n, 0);

  if (err) {
    return (
      <div className="px-8 lg:px-14 py-16">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-destructive">erro</p>
        <h1 className="font-display text-3xl mt-4">não foi possível carregar a inteligência</h1>
        <p className="mt-2 text-sm text-muted-foreground">{err}</p>
      </div>
    );
  }

  return (
    <div className="px-8 lg:px-14 py-10 space-y-10">
      {/* Realtime metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border">
        <MetricCard
          icon={<Activity className="w-4 h-4" />}
          label="ativos · 5min"
          value={data ? data.realtime.activeNow.toString() : null}
          accent
        />
        <MetricCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="MRR"
          value={data ? brl(data.revenue.mrrCents) : null}
        />
        <MetricCard
          icon={<Users className="w-4 h-4" />}
          label="novos · 24h"
          value={data ? data.realtime.newSignups24h.toString() : null}
        />
        <MetricCard
          icon={<Radio className="w-4 h-4" />}
          label="minutos · hoje"
          value={data ? data.realtime.watchMinutesToday.toLocaleString("pt-BR") : null}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Live feed */}
        <section className="lg:col-span-2 border border-border">
          <header className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="neon-dot animate-blink" />
              <h2 className="font-mono text-[11px] uppercase tracking-[0.3em]">atividade em tempo real</h2>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              {feed.length} eventos
            </span>
          </header>
          <ul className="divide-y divide-border max-h-[560px] overflow-y-auto">
            {feed.length === 0 ? (
              <li className="px-5 py-10 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                aguardando sinais…
              </li>
            ) : (
              feed.map((e) => (
                <li
                  key={e.id}
                  className="px-5 py-3 flex items-center gap-4 animate-fade-in hover:bg-accent/30 transition"
                >
                  <FeedIcon kind={e.kind} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">
                      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mr-2">
                        {e.label}
                      </span>
                      <span className="truncate">{e.detail}</span>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground tabular-nums">{timeAgo(e.at)}</span>
                </li>
              ))
            )}
          </ul>
        </section>

        {/* Plan mix */}
        <section className="border border-border p-5 space-y-4">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.3em]">mix de planos</h2>
          {data ? (
            data.revenue.activeSubs === 0 ? (
              <p className="text-sm text-muted-foreground">nenhuma assinatura ativa ainda.</p>
            ) : (
              <ul className="space-y-3">
                {planMixEntries.map(([id, n]) => {
                  const pct = planMixTotal > 0 ? (n / planMixTotal) * 100 : 0;
                  return (
                    <li key={id}>
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="lowercase">{id.replace("_", " · ")}</span>
                        <span className="font-mono text-muted-foreground">{n} · {pct.toFixed(0)}%</span>
                      </div>
                      <div className="mt-1.5 h-[3px] bg-accent">
                        <div className="h-full bg-foreground/80" style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )
          ) : (
            <Skeleton className="h-20 w-full" />
          )}
          <div className="pt-3 border-t border-border flex items-center gap-2 text-xs">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            <span className="text-muted-foreground">
              {data ? `${data.revenue.churnRisk} risco de churn` : "—"}
            </span>
          </div>
        </section>
      </div>

      {/* Top content + Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="border border-border">
          <header className="px-5 py-4 border-b border-border">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.3em]">conteúdo em alta · 7d</h2>
          </header>
          <ul className="divide-y divide-border">
            {!data ? (
              <li className="p-5"><Skeleton className="h-20 w-full" /></li>
            ) : data.topContent.length === 0 ? (
              <li className="p-5 text-sm text-muted-foreground">sem atividade ainda.</li>
            ) : (
              data.topContent.map((c) => (
                <li key={c.id} className="px-5 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    {c.slug ? (
                      <Link to="/explore/$slug" params={{ slug: c.slug }} className="text-sm hover:underline truncate block">
                        {c.title}
                      </Link>
                    ) : (
                      <span className="text-sm">{c.title}</span>
                    )}
                    <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                      {c.type} · {(c.completion * 100).toFixed(0)}% completam
                    </span>
                  </div>
                  <span className="font-mono text-sm tabular-nums">{c.views}</span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="border border-border">
          <header className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.3em]">saúde dos membros</h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              ordenado por risco
            </span>
          </header>
          <ul className="divide-y divide-border max-h-[420px] overflow-y-auto">
            {!data ? (
              <li className="p-5"><Skeleton className="h-20 w-full" /></li>
            ) : data.userHealth.length === 0 ? (
              <li className="p-5 text-sm text-muted-foreground">nenhum membro ainda.</li>
            ) : (
              data.userHealth.map((u) => (
                <li key={u.id} className="px-5 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{u.name}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                      {u.events} eventos · {u.completed} concluídos · {timeAgo(u.lastSeen)} atrás
                    </div>
                  </div>
                  {u.dormant ? (
                    <span className="font-mono text-[9px] uppercase tracking-[0.25em] px-2 py-0.5 bg-amber-500/15 text-amber-500">
                      dormente
                    </span>
                  ) : u.risk ? (
                    <span className="font-mono text-[9px] uppercase tracking-[0.25em] px-2 py-0.5 bg-destructive/15 text-destructive">
                      risco
                    </span>
                  ) : null}
                  <div className="w-12 text-right">
                    <div className="font-mono text-sm tabular-nums">{u.score}</div>
                    <div className="h-[2px] bg-accent mt-1">
                      <div className="h-full bg-foreground/80" style={{ width: `${u.score}%` }} />
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      {/* Moderation + support queues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <QueueCard
          icon={<MessageSquare className="w-4 h-4" />}
          title="moderação · comentários recentes"
          items={(data?.moderationQueue ?? []).map((c) => ({
            id: c.id,
            label: c.hidden ? "oculto" : "visível",
            detail: c.body.slice(0, 100),
            at: c.at,
          }))}
          link={{ to: "/app/admin/comments", label: "abrir moderação" }}
          loading={!data}
        />
        <QueueCard
          icon={<LifeBuoy className="w-4 h-4" />}
          title="fila · suporte"
          items={(data?.supportQueue ?? []).map((t) => ({
            id: t.id,
            label: t.priority,
            detail: t.subject,
            at: t.at,
          }))}
          link={{ to: "/app/admin", label: "abrir suporte" }}
          loading={!data}
        />
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  accent?: boolean;
}) {
  return (
    <div className="bg-background p-6">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <p className="font-mono text-[10px] uppercase tracking-[0.3em]">{label}</p>
      </div>
      <p className={"font-display mt-3 tabular-nums " + (accent ? "text-4xl text-foreground" : "text-3xl")}>
        {value ?? <Skeleton className="h-9 w-24" />}
      </p>
    </div>
  );
}

function FeedIcon({ kind }: { kind: FeedEvent["kind"] }) {
  const map: Record<FeedEvent["kind"], React.ReactNode> = {
    watch: <Activity className="w-3.5 h-3.5" />,
    bookmark: <TrendingUp className="w-3.5 h-3.5" />,
    comment: <MessageSquare className="w-3.5 h-3.5" />,
    ticket: <LifeBuoy className="w-3.5 h-3.5" />,
  };
  return (
    <span className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-muted-foreground shrink-0">
      {map[kind]}
    </span>
  );
}

function QueueCard({
  icon,
  title,
  items,
  link,
  loading,
}: {
  icon: React.ReactNode;
  title: string;
  items: { id: string; label: string; detail: string; at: string }[];
  link: { to: string; label: string };
  loading?: boolean;
}) {
  return (
    <section className="border border-border">
      <header className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <h2 className="font-mono text-[11px] uppercase tracking-[0.3em] text-foreground">{title}</h2>
        </div>
        <Link to={link.to} className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground">
          {link.label} →
        </Link>
      </header>
      <ul className="divide-y divide-border">
        {loading ? (
          <li className="p-5"><Skeleton className="h-20 w-full" /></li>
        ) : items.length === 0 ? (
          <li className="px-5 py-8 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            fila silenciosa
          </li>
        ) : (
          items.map((it) => (
            <li key={it.id} className="px-5 py-3 flex items-center gap-3">
              <span className="font-mono text-[9px] uppercase tracking-[0.25em] px-2 py-0.5 bg-accent shrink-0">
                {it.label}
              </span>
              <span className="text-sm truncate flex-1">{it.detail}</span>
              <span className="font-mono text-[10px] text-muted-foreground tabular-nums">{timeAgo(it.at)}</span>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
