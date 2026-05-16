import { useCallback, useEffect, useMemo, useState } from "react";
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

  // initial load
  useEffect(() => {
    let cancelled = false;
    if (!user) {
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
    return () => {
      cancelled = true;
    };
  }, [user?.id, limit]);

  // realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setItems((prev) => [payload.new as NotificationRow, ...prev].slice(0, limit));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setItems((prev) => prev.map((n) => (n.id === (payload.new as NotificationRow).id ? (payload.new as NotificationRow) : n)));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const old = payload.old as { id: string };
          setItems((prev) => prev.filter((n) => n.id !== old.id));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, limit]);

  const unread = useMemo(() => items.filter((n) => !n.read_at).length, [items]);

  const markRead = useCallback(async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    await supabase.from("notifications").update({ read_at: now }).eq("user_id", user.id).is("read_at", null);
  }, [user?.id]);

  return { items, unread, loading, markRead, markAllRead };
}
