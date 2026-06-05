import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CinematicHero } from "@/components/CinematicHero";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonRow } from "@/components/Skeleton";
import { Send, Trash2, Clock, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/community")({
  head: () => ({ meta: [{ title: "Comunidade — Observatório" }, { name: "robots", content: "noindex" }] }),
  component: CommunityPage,
});

const DAILY_LIMIT = 5;

type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  content_id: string | null;
  scheduled_at?: string | null;
  is_hidden: boolean;
};
type ProfileRow = { id: string; display_name: string | null; avatar_url: string | null };
type ContentLite = { id: string; title: string; slug: string };

function CommunityPage() {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentRow[] | null>(null);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [contents, setContents] = useState<Record<string, ContentLite>>({});
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [todayCount, setTodayCount] = useState(0);
  // Agendamento
  const [scheduling, setScheduling] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function fetchComments(cancelled: { v: boolean }) {
    const { data: cm } = await (supabase as any)
      .from("comments")
      .select("id,body,created_at,user_id,content_id,hidden,is_hidden,scheduled_at")
      .eq("is_hidden", false)
      .or("scheduled_at.is.null,scheduled_at.lte." + new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(60);
    if (cancelled.v) return;
    const list = (cm ?? []) as CommentRow[];
    setComments(list);

    const uids = [...new Set(list.map((c) => c.user_id))];
    const cids = [...new Set(list.map((c) => c.content_id).filter(Boolean))] as string[];
    if (uids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,display_name,avatar_url").in("id", uids);
      if (!cancelled.v) setProfiles(Object.fromEntries(((profs ?? []) as ProfileRow[]).map((p) => [p.id, p])));
    }
    if (cids.length) {
      const { data: ct } = await supabase.from("content").select("id,title,slug").in("id", cids);
      if (!cancelled.v) setContents(Object.fromEntries(((ct ?? []) as ContentLite[]).map((c) => [c.id, c])));
    }

    // Conta posts de hoje do usuário atual
    if (user?.id) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("comments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", today.toISOString());
      if (!cancelled.v) setTodayCount(count ?? 0);
    }
  }

  useEffect(() => {
    const cancelled = { v: false };
    fetchComments(cancelled);
    const ch = supabase.channel("community-comments")
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => fetchComments(cancelled))
      .subscribe();
    return () => { cancelled.v = true; supabase.removeChannel(ch); };
  }, [user?.id]);

  async function handleSend() {
    if (!user || !body.trim()) return;
    if (todayCount >= DAILY_LIMIT && !scheduledAt) {
      setSendError(`Limite de ${DAILY_LIMIT} posts por dia atingido. Agende para amanhã.`);
      return;
    }
    setSending(true);
    setSendError(null);
    const payload: Record<string, unknown> = {
      user_id: user.id,
      body: body.trim(),
      content_id: null,
      hidden: false,
      is_hidden: false,
    };
    if (scheduledAt) payload.scheduled_at = new Date(scheduledAt).toISOString();

    const { error } = await (supabase as any).from("comments").insert(payload);
    setSending(false);
    if (error) {
      setSendError(error.message);
    } else {
      setBody("");
      setScheduledAt("");
      setScheduling(false);
      textareaRef.current?.focus();
      if (scheduledAt) toast.success("Sinal agendado com sucesso.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este sinal permanentemente?")) return;
    const { error } = await supabase.from("comments").delete().eq("id", id).eq("user_id", user?.id!);
    if (error) toast.error("Não foi possível remover.");
    else {
      setComments((prev) => prev?.filter((c) => c.id !== id) ?? null);
      toast.success("Sinal removido.");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSend(); }
  }

  const remaining = Math.max(0, DAILY_LIMIT - todayCount);
  const limitReached = todayCount >= DAILY_LIMIT;

  return (
    <div className="pb-24">
      <CinematicHero
        eyebrow="rede privada · comunidade"
        title="Comunidade."
        lead="Conversas curtas, leituras compartilhadas. Sem palco, sem performance — apenas sinal."
        height="sm"
      />
      <div className="px-8 lg:px-14 pt-10 max-w-3xl space-y-8">

        {/* Formulário */}
        <div className="border border-border bg-card/30 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">deixar um sinal</p>
            <span className={`font-mono text-[10px] uppercase tracking-[0.2em] ${limitReached ? "text-amber-500" : "text-muted-foreground"}`}>
              {remaining}/{DAILY_LIMIT} hoje
            </span>
          </div>

          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={limitReached ? "Limite diário atingido. Agende para outro horário." : "O que você está pensando agora?"}
            rows={3}
            maxLength={1000}
            className="w-full bg-transparent border border-border focus:border-foreground outline-none p-3 text-sm resize-none placeholder:text-muted-foreground/40"
          />

          {/* Agendamento */}
          {scheduling ? (
            <div className="flex items-center gap-3 border border-border/50 p-3 rounded-lg">
              <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <label className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground">publicar em</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="block w-full bg-transparent text-sm outline-none mt-1"
                />
              </div>
              <button onClick={() => { setScheduling(false); setScheduledAt(""); }}
                className="text-muted-foreground hover:text-foreground transition">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[9px] text-muted-foreground">⌘+enter para enviar · {body.length}/1000</span>
              <button
                onClick={() => setScheduling(!scheduling)}
                className={`flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] transition ${scheduling ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Clock className="w-3 h-3" />
                agendar
              </button>
            </div>
            <div className="flex items-center gap-3">
              {sendError ? <span className="font-mono text-[10px] text-destructive">{sendError}</span> : null}
              <button
                onClick={handleSend}
                disabled={sending || !body.trim()}
                className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] bg-foreground text-background px-4 py-2 disabled:opacity-40 hover:opacity-80 transition"
              >
                <Send className="w-3.5 h-3.5" />
                {sending ? "enviando…" : scheduledAt ? "agendar" : "enviar"}
              </button>
            </div>
          </div>

          {limitReached && !scheduledAt && (
            <p className="font-mono text-[10px] text-amber-500/80">
              Você atingiu o limite de {DAILY_LIMIT} posts hoje. Use o agendamento para programar um post para amanhã.
            </p>
          )}
        </div>

        {/* Feed */}
        {comments === null ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}</div>
        ) : comments.length === 0 ? (
          <EmptyState eyebrow="silêncio na rede" title="A conversa ainda não começou." description="Seja o primeiro a deixar um sinal." icon="signal" />
        ) : (
          <ul className="divide-y divide-border">
            {comments.map((c) => {
              const p = profiles[c.user_id];
              const ct = c.content_id ? contents[c.content_id] : null;
              const isOwn = c.user_id === user?.id;
              return (
                <li key={c.id} className={`py-5 flex gap-4 group ${isOwn ? "opacity-90" : ""}`}>
                  <div className="h-10 w-10 rounded-full bg-muted shrink-0 overflow-hidden">
                    {p?.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-3 flex-wrap justify-between">
                      <div className="flex items-baseline gap-3 flex-wrap">
                        <span className="text-sm">{isOwn ? "você" : (p?.display_name ?? "membro")}</span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                          {new Date(c.created_at).toLocaleString("pt-BR")}
                        </span>
                        {ct ? (
                          <Link to="/app/content/$slug" params={{ slug: ct.slug }}
                            className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground transition">
                            · {ct.title}
                          </Link>
                        ) : null}
                      </div>
                      {/* Botão de excluir — só aparece nos próprios posts */}
                      {isOwn && (
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-destructive p-1"
                          title="Remover sinal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/90">{c.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
