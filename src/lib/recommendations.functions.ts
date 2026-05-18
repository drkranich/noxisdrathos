import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type RecContent = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  type: string;
  thumbnail_url: string | null;
  thumbnail_bucket?: string | null;
  duration_seconds: number | null;
  reading_minutes: number | null;
  tags: string[];
  is_featured: boolean;
  created_at: string;
  category_id: string | null;
  progress_seconds?: number | null;
  progress_ratio?: number | null;
};

const SELECT_COLS =
  "id,slug,title,subtitle,type,thumbnail_url,thumbnail_bucket,duration_seconds,reading_minutes,tags,is_featured,created_at,category_id";

export const getPersonalizedRails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [historyRes, bookmarksRes, contentRes] = await Promise.all([
      supabase
        .from("watch_history")
        .select("content_id,progress_seconds,completed,last_seen_at")
        .eq("user_id", userId)
        .order("last_seen_at", { ascending: false })
        .limit(120),
      supabase
        .from("bookmarks")
        .select("content_id,kind,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(60),
      supabase
        .from("content")
        .select(SELECT_COLS)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const history = historyRes.data ?? [];
    const bookmarks = bookmarksRes.data ?? [];
    const all = (contentRes.data ?? []) as RecContent[];
    const byId = new Map(all.map((c) => [c.id, c]));

    // Continue watching — incomplete, most recent
    const continueWatching: RecContent[] = history
      .filter((h) => !h.completed && byId.has(h.content_id))
      .slice(0, 12)
      .map((h) => {
        const c = byId.get(h.content_id)!;
        const ratio =
          c.duration_seconds && c.duration_seconds > 0
            ? Math.min(1, (h.progress_seconds ?? 0) / c.duration_seconds)
            : null;
        return { ...c, progress_seconds: h.progress_seconds, progress_ratio: ratio };
      });

    // Affinity signal: category weights from history + bookmarks
    const categoryScore = new Map<string, number>();
    const tagScore = new Map<string, number>();
    const seenIds = new Set<string>(history.map((h) => h.content_id));
    bookmarks.forEach((b) => seenIds.add(b.content_id));

    const bumpFrom = (cid: string, weight: number) => {
      const c = byId.get(cid);
      if (!c) return;
      if (c.category_id) categoryScore.set(c.category_id, (categoryScore.get(c.category_id) ?? 0) + weight);
      c.tags?.forEach((t) => tagScore.set(t, (tagScore.get(t) ?? 0) + weight * 0.5));
    };
    history.slice(0, 30).forEach((h) => bumpFrom(h.content_id, h.completed ? 2 : 1));
    bookmarks.forEach((b) => bumpFrom(b.content_id, 1.5));

    // Because you watched — anchor = most recent completed
    const anchor = history.find((h) => h.completed && byId.has(h.content_id));
    const anchorContent = anchor ? byId.get(anchor.content_id) ?? null : null;
    const becauseYouWatched = anchorContent
      ? all
          .filter(
            (c) =>
              c.id !== anchorContent.id &&
              !seenIds.has(c.id) &&
              (c.category_id === anchorContent.category_id ||
                c.tags?.some((t) => anchorContent.tags?.includes(t))),
          )
          .slice(0, 10)
      : [];

    // Recommended for you — score everything unseen
    const scored = all
      .filter((c) => !seenIds.has(c.id))
      .map((c) => {
        let s = 0;
        if (c.category_id) s += categoryScore.get(c.category_id) ?? 0;
        c.tags?.forEach((t) => (s += tagScore.get(t) ?? 0));
        if (c.is_featured) s += 0.75;
        // recency boost
        const ageDays = (Date.now() - new Date(c.created_at).getTime()) / 86400000;
        s += Math.max(0, 2 - ageDays / 14);
        return { c, s };
      })
      .sort((a, b) => b.s - a.s);
    const recommended = scored.slice(0, 12).map((x) => x.c);

    // Trending — most watch_history activity in last 7d (platform-wide)
    const sinceTrend = new Date(Date.now() - 7 * 86400000).toISOString();
    const trendCounts = new Map<string, number>();
    const { data: trendRows } = await supabase
      .from("watch_history")
      .select("content_id")
      .gte("last_seen_at", sinceTrend)
      .limit(2000);
    (trendRows ?? []).forEach((r) => trendCounts.set(r.content_id, (trendCounts.get(r.content_id) ?? 0) + 1));
    const trending = all
      .map((c) => ({ c, n: trendCounts.get(c.id) ?? 0 }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n)
      .slice(0, 10)
      .map((x) => x.c);

    // Hidden discoveries — older, low activity, not yet seen by user
    const hidden = all
      .filter((c) => !seenIds.has(c.id))
      .map((c) => ({ c, age: Date.now() - new Date(c.created_at).getTime(), n: trendCounts.get(c.id) ?? 0 }))
      .filter((x) => x.age > 30 * 86400000 && x.n < 3)
      .sort(() => Math.random() - 0.5)
      .slice(0, 8)
      .map((x) => x.c);

    // Recently explored — unique content from history + bookmarks
    const exploredIds: string[] = [];
    const pushUniq = (id: string) => {
      if (!exploredIds.includes(id) && byId.has(id)) exploredIds.push(id);
    };
    history.forEach((h) => pushUniq(h.content_id));
    bookmarks.forEach((b) => pushUniq(b.content_id));
    const recentlyExplored = exploredIds.slice(0, 10).map((id) => byId.get(id)!);

    return {
      anchorTitle: anchorContent?.title ?? null,
      continueWatching,
      recommended,
      becauseYouWatched,
      trending,
      hidden,
      recentlyExplored,
    };
  });
