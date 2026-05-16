import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CinematicHero } from "@/components/CinematicHero";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonRow } from "@/components/Skeleton";

export const Route = createFileRoute("/_authenticated/app/support")({
  head: () => ({ meta: [{ title: "Suporte — Observatório" }, { name: "robots", content: "noindex" }] }),
  component: SupportPage,
});

type Ticket = {
  id: string;
  subject: string;
  body: string;
  status: string;
  priority: string;
  created_at: string;
};

function SupportPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = () => {
    if (!user) return;
    supabase
      .from("support_tickets")
      .select("id,subject,body,status,priority,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setTickets((data ?? []) as Ticket[]));
  };
  useEffect(refresh, [user?.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !subject.trim() || !body.trim()) return;
    setSubmitting(true);
    await supabase.from("support_tickets").insert({
      user_id: user.id,
      subject: subject.trim(),
      body: body.trim(),
    });
    setSubject("");
    setBody("");
    setSubmitting(false);
    refresh();
  };

  return (
    <div className="pb-24">
      <CinematicHero
        eyebrow="canal privado · suporte"
        title="Suporte."
        lead="Para questões discretas sobre seu acesso, biblioteca ou assinatura."
        height="sm"
      />

      <div className="px-8 lg:px-14 pt-10 grid lg:grid-cols-[1fr_1.2fr] gap-10 max-w-6xl">
        <form onSubmit={submit} className="border border-border p-6 space-y-4 h-fit">
          <h2 className="font-display text-xl">Abrir solicitação</h2>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">assunto</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-2 w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-sm"
              required
              maxLength={120}
            />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">mensagem</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="mt-2 w-full bg-transparent border border-border focus:border-foreground outline-none p-3 text-sm resize-none"
              required
              maxLength={2000}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="font-mono text-[11px] uppercase tracking-[0.3em] bg-foreground text-background px-5 py-3 disabled:opacity-50"
          >
            {submitting ? "enviando…" : "enviar →"}
          </button>
        </form>

        <section>
          <h2 className="font-display text-xl mb-5">Histórico</h2>
          {tickets === null ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}</div>
          ) : tickets.length === 0 ? (
            <EmptyState
              eyebrow="canal silencioso"
              title="Nenhuma solicitação ainda."
              description="Use o formulário ao lado quando precisar de atenção privada."
              icon="signal"
            />
          ) : (
            <ul className="space-y-3">
              {tickets.map((t) => (
                <li key={t.id} className="border border-border p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-sm">{t.subject}</h3>
                    <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                      {t.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{t.body}</p>
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                    {new Date(t.created_at).toLocaleString("pt-BR")} · {t.priority}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
