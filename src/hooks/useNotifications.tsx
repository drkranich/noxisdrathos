import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type NotificationRow = {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export function useNotifications(limit = 30) {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  // Ref para o canal ativo — evita race condition entre cleanup e novo subscribe
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Carregamento inicial
  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit)
      .then(({ data }) => {
        if (cancelled) return;
        setItems((data ?? []) as NotificationRow[]);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [user?.id, limit]);

  // Realtime — constrói o canal inteiro ANTES de chamar subscribe()
  // e usa ref para garantir cleanup correto mesmo com StrictMode duplo-invoke
  useEffect(() => {
    if (!user?.id) return;

    // Remove canal anterior se existir
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // ID único para evitar colisão entre mounts
    const uid = user.id;
    const channelName = `notif-${uid}-${Math.random().toString(36).slice(2, 8)}`;

    // Constrói TODAS as subscrições antes de chamar subscribe()
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` },
        (payload) => {
          setItems((prev) => [payload.new as NotificationRow, ...prev].slice(0, limit));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` },
        (payload) => {
          setItems((prev) =>
            prev.map((n) =>
              n.id === (payload.new as NotificationRow).id
                ? (payload.new as NotificationRow)
                : n,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` },
        (payload) => {
          const old = payload.old as { id: string };
          setItems((prev) => prev.filter((n) => n.id !== old.id));
        },
      );

    // Só chama subscribe() depois de registrar todos os handlers
    channel.subscribe();
    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, limit]);

  const unread = useMemo(() => items.filter((n) => !n.read_at).length, [items]);

  const markRead = useCallback(async (id: string) => {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: now } : n)));
    await supabase.from("notifications").update({ read_at: now }).eq("id", id);
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user?.id) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    await supabase.from("notifications").update({ read_at: now }).eq("user_id", user.id).is("read_at", null);
  }, [user?.id]);

  return { items, unread, loading, markRead, markAllRead };
}
