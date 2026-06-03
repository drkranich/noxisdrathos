import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CinematicHero } from "@/components/CinematicHero";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonRow } from "@/components/Skeleton";
import { Send } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/community")({
  head: () => ({ meta: [{ title: "Comunidade — Observatório" }, { name: "robots", content: "noindex" }] }),
  component: CommunityPage,
});

type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  content_id: string | null;
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function fetchComments(cancelled: { v: boolean }) {
    const { data: cm } = await supabase
      .from("comments")
      .select("id,body,created_at,user_id,content_id,is_hidden")
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .limit(50);
    if (cancelled.v) return;
    const list = (cm ?? []) as CommentRow[];
    setComments(list);

    const uids = [...new Set(list.map((c) => c.user_id))];
    const cids = [...new Set(list.map((c) => c.content_id).filter(Boolean))] as string[];
    if (uids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,display_name,avatar_url")
        .in("id", uids);
      if (!cancelled.v)
        setProfiles(Object.fromEntries(((profs ?? []) as ProfileRow[]).map((p) => [p.id, p])));
    }
    if (cids.length) {
      const { data: ct } = await supabase
        .from("content")
        .select("id,title,slug")
        .in("id", cids);
      if (!cancelled.v)
        setContents(Object.fromEntries(((ct ?? []) as ContentLite[]).map((c) => [c.id, c])));
    }
  }

  useEffect(() => {
    const cancelled = { v: false };
    fetchComments(cancelled);

    const ch = supabase
      .channel("community-comments")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments" }, () => {
        fetchComments(cancelled);
      })
      .subscribe();

    return () => {
      cancelled.v = true;
      supabase.removeChannel(ch);
    };
  }, [user?.id]);

  async function handleSend() {
    if (!user || !body.trim()) return;
    setSending(true);
    setSendError(null);
    const { error } = await supabase.from("comments").insert({
      user_id: user.id,
      body: body.trim(),
      content_id: null, // comentário geral da comunidade
      is_hidden: false,
    });
    setSending(false);
    if (error) {
      setSendError(error.message);
    } else {
      setBody("");
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="pb-24">
      <CinematicHero
        eyebrow="rede privada · comunidade"
        title="Comunidade."
        lead="Conversas curtas, leituras compartilhadas. Sem palco, sem performance — apenas sinal."
        height="sm"
      />
      <div className="px-8 lg:px-14 pt-10 max-w-3xl space-y-8">
        {/* Formulário de envio */}
        <div className="border border-border bg-card/30 p-5 space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">deixar um sinal</p>
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="O que você está pensando agora?"
            rows={3}
            maxLength={1000}
            className="w-full bg-transparent border border-border focus:border-foreground outline-none p-3 text-sm resize-none placeholder:text-muted-foreground/40"
          />
          <div className="flex items-center justify-between gap-4">
            <span className="font-mono text-[9px] text-muted-foreground">⌘+enter para enviar · {body.length}/1000</span>
            <div className="flex items-center gap-3">
              {sendError ? <span className="font-mono text-[10px] text-destructive">{sendError}</span> : null}
              <button
                onClick={handleSend}
                disabled={sending || !body.trim()}
                className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] bg-foreground text-background px-4 py-2 disabled:opacity-40 hover:opacity-80 transition"
              >
                <Send className="w-3.5 h-3.5" />
                {sending ? "enviando…" : "enviar"}
              </button>
            </div>
          </div>
        </div>

        {/* Feed de comentários */}
        {comments === null ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : comments.length === 0 ? (
          <EmptyState
            eyebrow="silêncio na rede"
            title="A conversa ainda não começou."
            description="Seja o primeiro a deixar um sinal."
            icon="signal"
          />
        ) : (
          <ul className="divide-y divide-border">
            {comments.map((c) => {
              const p = profiles[c.user_id];
              const ct = c.content_id ? contents[c.content_id] : null;
              const isOwn = c.user_id === user?.id;
              return (
                <li key={c.id} className={`py-5 flex gap-4 ${isOwn ? "opacity-90" : ""}`}>
                  <div className="h-10 w-10 rounded-full bg-muted shrink-0 overflow-hidden">
                    {p?.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="text-sm">{isOwn ? "você" : (p?.display_name ?? "membro")}</span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                        {new Date(c.created_at).toLocaleString("pt-BR")}
                      </span>
                      {ct ? (
                        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                          · sobre {ct.title}
                        </span>
                      ) : null}
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
