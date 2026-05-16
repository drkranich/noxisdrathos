import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type BookmarkKind = "favorite" | "watchlist" | "later";

const LABELS: Record<BookmarkKind, { add: string; remove: string; addedToast: string; removedToast: string }> = {
  favorite: { add: "favoritar", remove: "remover favorito", addedToast: "Adicionado aos favoritos", removedToast: "Removido dos favoritos" },
  watchlist: { add: "watchlist", remove: "remover da watchlist", addedToast: "Salvo na watchlist", removedToast: "Removido da watchlist" },
  later: { add: "salvar", remove: "remover", addedToast: "Salvo para depois", removedToast: "Removido" },
};

export function bookmarkLabel(kind: BookmarkKind, saved: boolean) {
  return saved ? LABELS[kind].remove : LABELS[kind].add;
}

export function useBookmark(contentId: string | null | undefined, kind: BookmarkKind = "favorite") {
  const { user } = useAuth();
  const [saved, setSaved] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const pending = useRef(false);

  // Hydrate initial state
  useEffect(() => {
    let cancelled = false;
    if (!user || !contentId) {
      setSaved(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("bookmarks")
      .select("id")
      .eq("user_id", user.id)
      .eq("content_id", contentId)
      .eq("kind", kind)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setSaved(!!data);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, contentId, kind]);

  const toggle = useCallback(async () => {
    if (!user) {
      toast.error("Entre para salvar");
      return;
    }
    if (!contentId || pending.current) return;
    pending.current = true;
    const next = !saved;
    setSaved(next); // optimistic
    try {
      if (next) {
        const { error } = await supabase
          .from("bookmarks")
          .upsert(
            { user_id: user.id, content_id: contentId, kind },
            { onConflict: "user_id,content_id,kind" },
          );
        if (error) throw error;
        toast.success(LABELS[kind].addedToast);
      } else {
        const { error } = await supabase
          .from("bookmarks")
          .delete()
          .eq("user_id", user.id)
          .eq("content_id", contentId)
          .eq("kind", kind);
        if (error) throw error;
        toast(LABELS[kind].removedToast);
      }
    } catch (e: unknown) {
      setSaved(!next); // rollback
      const msg = e instanceof Error ? e.message : "Falha ao salvar";
      toast.error(msg);
    } finally {
      pending.current = false;
    }
  }, [user, contentId, kind, saved]);

  return { saved, toggle, loading } as const;
}
