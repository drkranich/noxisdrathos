import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/app/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { user, roles, isAdmin, loading, rolesLoading } = useAuth();
  const [stats, setStats] = useState({ members: 0, content: 0, leads: 0, comments: 0 });
  const [diag, setDiag] = useState<Array<{ label: string; value: string; ok: boolean }>>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("content").select("id", { count: "exact", head: true }),
      supabase.from("leads").select("id", { count: "exact", head: true }),
      supabase.from("comments").select("id", { count: "exact", head: true }),
    ]).then(([p, c, l, cm]) => {
      setStats({ members: p.count ?? 0, content: c.count ?? 0, leads: l.count ?? 0, comments: cm.count ?? 0 });
    });
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    let realtimeStatus = "CONNECTING";
    const channel = supabase.channel("admin-diagnostics-probe").subscribe((status) => {
      realtimeStatus = status;
    });
    Promise.all([
      supabase.from("content").select("id", { count: "exact", head: true }),
      supabase.from("media_assets").select("id", { count: "exact", head: true }),
      supabase.from("collections").select("id", { count: "exact", head: true }),
      supabase.storage.from("section-thumbnails").createSignedUploadUrl(`diagnostics/${user.id}/${Date.now()}.txt`, { upsert: false }),
    ]).then(([content, media, collections, storage]) => {
      setDiag([
        { label: "role", value: roles.join(" · ") || "sem papel", ok: isAdmin },
        { label: "hydration", value: loading || rolesLoading ? "resolvendo" : "resolvido", ok: !loading && !rolesLoading },
        { label: "rls · conteúdo", value: content.error?.message ?? `${content.count ?? 0} registros visíveis`, ok: !content.error },
        { label: "rls · mídia", value: media.error?.message ?? `${media.count ?? 0} assets visíveis`, ok: !media.error },
        { label: "rls · coleções", value: collections.error?.message ?? `${collections.count ?? 0} coleções visíveis`, ok: !collections.error },
        { label: "storage · upload", value: storage.error?.message ?? "signed upload disponível", ok: !storage.error },
        { label: "realtime", value: realtimeStatus, ok: realtimeStatus === "SUBSCRIBED" },
      ]);
    });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, roles.join("|"), isAdmin, loading, rolesLoading]);

  const cards = [
    { label: "membros", value: stats.members },
    { label: "conteúdos", value: stats.content },
    { label: "solicitações", value: stats.leads },
    { label: "comentários", value: stats.comments },
  ];

  return (
    <div className="px-8 lg:px-14 py-12 space-y-12">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border">
        {cards.map((c) => (
          <div key={c.label} className="bg-background p-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{c.label}</p>
            <p className="font-display text-5xl mt-4 tabular-nums">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="border border-border bg-card/30 p-6">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">cms · diagnóstico operacional</p>
            <h2 className="font-display text-2xl mt-2">Estado do painel de publicação</h2>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            {user?.email ?? "sessão anônima"}
          </span>
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
          {diag.map((item) => (
            <div key={item.label} className="border border-border bg-background/60 p-4">
              <div className="flex items-center gap-2">
                <span className={item.ok ? "neon-dot" : "h-2 w-2 rounded-full bg-destructive"} />
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{item.label}</p>
              </div>
              <p className="mt-3 text-xs text-muted-foreground break-words">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="border border-dashed border-border p-12 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">próxima fase</p>
        <p className="mt-3 text-sm text-muted-foreground">
          MRR, churn, retenção e analytics serão ativados após o checkout Stripe.
        </p>
      </div>
    </div>
  );
}
