import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CinematicHero } from "@/components/CinematicHero";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonRow } from "@/components/Skeleton";

export const Route = createFileRoute("/_authenticated/app/community")({
  head: () => ({ meta: [{ title: "Comunidade — Observatório" }, { name: "robots", content: "noindex" }] }),
  component: CommunityPage,
});

type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  content_id: string;
  is_hidden: boolean;
};
type ProfileRow = { id: string; display_name: string | null; avatar_url: string | null };
type ContentLite = { id: string; title: string; slug: string };

function CommunityPage() {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentRow[] | null>(null);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [contents, setContents] = useState<Record<string, ContentLite>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: cm } = await supabase
        .from("comments")
        .select("id,body,created_at,user_id,content_id,is_hidden")
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(30);
      if (cancelled) return;
      const list = (cm ?? []) as CommentRow[];
      setComments(list);
      const uids = [...new Set(list.map((c) => c.user_id))];
      const cids = [...new Set(list.map((c) => c.content_id))];
      if (uids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id,display_name,avatar_url")
          .in("id", uids);
        if (!cancelled)
          setProfiles(Object.fromEntries(((profs ?? []) as ProfileRow[]).map((p) => [p.id, p])));
      }
      if (cids.length) {
        const { data: ct } = await supabase
          .from("content")
          .select("id,title,slug")
          .in("id", cids);
        if (!cancelled)
          setContents(Object.fromEntries(((ct ?? []) as ContentLite[]).map((c) => [c.id, c])));
      }
    })();

    const ch = supabase
      .channel("community-comments")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments" }, () => {
        // refetch on new
        supabase
          .from("comments")
          .select("id,body,created_at,user_id,content_id,is_hidden")
          .eq("is_hidden", false)
          .order("created_at", { ascending: false })
          .limit(30)
          .then(({ data }) => {
            if (!cancelled) setComments((data ?? []) as CommentRow[]);
          });
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [user?.id]);

  return (
    <div className="pb-24">
      <CinematicHero
        eyebrow="rede privada · comunidade"
        title="Comunidade."
        lead="Conversas curtas, leituras compartilhadas. Sem palco, sem performance — apenas sinal."
        height="sm"
      />
      <div className="px-8 lg:px-14 pt-10 max-w-3xl">
        {comments === null ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : comments.length === 0 ? (
          <EmptyState
            eyebrow="silêncio na rede"
            title="A conversa ainda não começou."
            description="Quando alguém deixar um sinal aqui, ele aparece nesta corrente."
            icon="signal"
          />
        ) : (
          <ul className="divide-y divide-border">
            {comments.map((c) => {
              const p = profiles[c.user_id];
              const ct = contents[c.content_id];
              return (
                <li key={c.id} className="py-5 flex gap-4">
                  <div className="h-10 w-10 rounded-full bg-muted shrink-0 overflow-hidden">
                    {p?.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="text-sm">{p?.display_name ?? "membro"}</span>
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
