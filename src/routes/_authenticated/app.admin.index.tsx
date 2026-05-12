import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [stats, setStats] = useState({ members: 0, content: 0, leads: 0, comments: 0 });

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
      <div className="border border-dashed border-border p-12 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">próxima fase</p>
        <p className="mt-3 text-sm text-muted-foreground">
          MRR, churn, retenção e analytics serão ativados após o checkout Stripe.
        </p>
      </div>
    </div>
  );
}
