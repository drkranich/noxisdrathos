import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

/**
 * useWatchProgress — registra progresso de leitura/reprodução em watch_history.
 *
 * Uso em vídeo:  const { tick } = useWatchProgress(contentId, "video");
 *                // chame tick(currentTime) a cada ontimeupdate do <video>
 *
 * Uso em PDF/artigo: apenas monte o hook — ele registra abertura automaticamente.
 */
export function useWatchProgress(
  contentId: string | null | undefined,
  type: "video" | "audio" | "pdf" | "article" = "article",
) {
  const { user } = useAuth();
  const lastUpsertAt = useRef(0);
  const completedRef = useRef(false);
  const THROTTLE_MS = 15_000; // upsert no máximo a cada 15s

  const upsert = useCallback(
    async (progressSeconds: number, completed = false) => {
      if (!user?.id || !contentId) return;
      const now = Date.now();
      if (!completed && now - lastUpsertAt.current < THROTTLE_MS) return;
      lastUpsertAt.current = now;
      await supabase.from("watch_history").upsert(
        {
          user_id: user.id,
          content_id: contentId,
          progress_seconds: Math.floor(progressSeconds),
          completed: completed || completedRef.current,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "user_id,content_id" },
      );
      if (completed) completedRef.current = true;
    },
    [user?.id, contentId],
  );

  // Registra abertura imediatamente (progress=0)
  useEffect(() => {
    if (!user?.id || !contentId) return;
    // PDF e artigo: registra abertura e marca como completo após 30s de leitura
    if (type === "pdf" || type === "article") {
      upsert(0);
      const timer = setTimeout(() => upsert(30, true), 30_000);
      return () => clearTimeout(timer);
    }
    // Vídeo/áudio: apenas registra abertura; progresso vem via tick()
    upsert(0);
  }, [user?.id, contentId, type, upsert]);

  // Função para vídeo/áudio — chame em ontimeupdate
  const tick = useCallback(
    (currentSeconds: number, duration?: number) => {
      const completed = duration ? currentSeconds / duration >= 0.9 : false;
      upsert(currentSeconds, completed);
    },
    [upsert],
  );

  return { tick } as const;
}
