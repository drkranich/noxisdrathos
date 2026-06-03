import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CinematicHero } from "@/components/CinematicHero";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonRow } from "@/components/Skeleton";
import { ChevronDown, ChevronUp, Send } from "lucide-react";

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

type TicketMessage = {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  created_at: string;
};

function SupportPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, TicketMessage[]>>({});
  const [replyBody, setReplyBody] = useState<Record<string, string>>({});
  const [sendingReply, setSendingReply] = useState<Record<string, boolean>>({});

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

  async function loadMessages(ticketId: string) {
    const { data } = await supabase
      .from("ticket_messages")
      .select("id,ticket_id,sender_id,message,created_at")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    setMessages((prev) => ({ ...prev, [ticketId]: (data ?? []) as TicketMessage[] }));
  }

  function toggleTicket(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      if (!messages[id]) loadMessages(id);
    }
  }

  async function sendReply(ticketId: string) {
    const msg = replyBody[ticketId]?.trim();
    if (!user || !msg) return;
    setSendingReply((p) => ({ ...p, [ticketId]: true }));
    await supabase.from("ticket_messages").insert({
      ticket_id: ticketId,
      sender_id: user.id,
      message: msg,
    });
    setReplyBody((p) => ({ ...p, [ticketId]: "" }));
    await loadMessages(ticketId);
    setSendingReply((p) => ({ ...p, [ticketId]: false }));
  }

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
        {/* Formulário novo ticket */}
        <form onSubmit={submit} className="border border-border p-6 space-y-4 h-fit">
          <h2 className="font-display text-xl">Abrir solicitação</h2>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">assunto</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-2 w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-sm"
              required maxLength={120}
            />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">mensagem</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="mt-2 w-full bg-transparent border border-border focus:border-foreground outline-none p-3 text-sm resize-none"
              required maxLength={2000}
            />
          </div>
          <button
            type="submit" disabled={submitting}
            className="font-mono text-[11px] uppercase tracking-[0.3em] bg-foreground text-background px-5 py-3 disabled:opacity-50"
          >
            {submitting ? "enviando…" : "enviar →"}
          </button>
        </form>

        {/* Histórico de tickets com thread */}
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
              {tickets.map((t) => {
                const expanded = expandedId === t.id;
                const msgs = messages[t.id] ?? [];
                return (
                  <li key={t.id} className="border border-border">
                    {/* Cabeçalho do ticket */}
                    <button
                      onClick={() => toggleTicket(t.id)}
                      className="w-full flex items-center justify-between gap-3 p-5 text-left hover:bg-accent/30 transition"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="text-sm font-medium truncate">{t.subject}</h3>
                          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground shrink-0">
                            {t.status}
                          </span>
                        </div>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                          {new Date(t.created_at).toLocaleDateString("pt-BR")} · {t.priority}
                        </p>
                      </div>
                      {expanded
                        ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                        : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                    </button>

                    {/* Thread expandida */}
                    {expanded && (
                      <div className="border-t border-border px-5 pb-5 pt-4 space-y-4">
                        {/* Mensagem original */}
                        <div className="bg-card/40 rounded p-3">
                          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
                            você · {new Date(t.created_at).toLocaleString("pt-BR")}
                          </p>
                          <p className="text-sm text-foreground/90 whitespace-pre-wrap">{t.body}</p>
                        </div>

                        {/* Respostas */}
                        {msgs.map((m) => {
                          const isOwn = m.sender_id === user?.id;
                          return (
                            <div
                              key={m.id}
                              className={`rounded p-3 ${isOwn ? "bg-card/40 ml-4" : "bg-accent/40 border border-border"}`}
                            >
                              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
                                {isOwn ? "você" : "equipe"} · {new Date(m.created_at).toLocaleString("pt-BR")}
                              </p>
                              <p className="text-sm text-foreground/90 whitespace-pre-wrap">{m.message}</p>
                            </div>
                          );
                        })}

                        {/* Campo de resposta */}
                        {t.status !== "closed" && (
                          <div className="pt-2 space-y-2">
                            <textarea
                              value={replyBody[t.id] ?? ""}
                              onChange={(e) => setReplyBody((p) => ({ ...p, [t.id]: e.target.value }))}
                              placeholder="Responder ao ticket…"
                              rows={2}
                              maxLength={2000}
                              className="w-full bg-transparent border border-border focus:border-foreground outline-none p-3 text-sm resize-none placeholder:text-muted-foreground/40"
                            />
                            <button
                              onClick={() => sendReply(t.id)}
                              disabled={sendingReply[t.id] || !replyBody[t.id]?.trim()}
                              className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] bg-foreground text-background px-4 py-2 disabled:opacity-40"
                            >
                              <Send className="w-3.5 h-3.5" />
                              {sendingReply[t.id] ? "enviando…" : "responder"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
