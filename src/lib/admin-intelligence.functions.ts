import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PLAN_AMOUNT_CENTS: Record<string, number> = {
  circle_monthly: 9700,
  vault_monthly: 29700,
  council_yearly: 124167, // 1490 BRL / 12
};

function monthlyFromPriceId(priceId: string | null): number {
  if (!priceId) return 0;
  return PLAN_AMOUNT_CENTS[priceId] ?? 0;
}

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("forbidden");
}

export const getIntelligenceOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const now = Date.now();
    const since5m = new Date(now - 5 * 60 * 1000).toISOString();
    const since24h = new Date(now - 24 * 3600 * 1000).toISOString();
    const since7d = new Date(now - 7 * 86400 * 1000).toISOString();
    const since30d = new Date(now - 30 * 86400 * 1000).toISOString();

    const [
      activeRes,
      newSignupsRes,
      watchTodayRes,
      subsRes,
      watch7dRes,
      contentRes,
      historyRecentRes,
      ticketsRes,
      commentsRes,
    ] = await Promise.all([
      supabase.from("watch_history").select("user_id").gte("last_seen_at", since5m).limit(500),
      supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since24h),
      supabase.from("watch_history").select("progress_seconds,last_seen_at").gte("last_seen_at", since24h).limit(2000),
      supabase
        .from("subscriptions")
        .select("status,price_id,product_id,current_period_end,cancel_at_period_end,created_at"),
      supabase.from("watch_history").select("content_id,user_id,completed,last_seen_at").gte("last_seen_at", since7d).limit(5000),
      supabase.from("content").select("id,slug,title,type,thumbnail_url").eq("status", "published").limit(500),
      supabase
        .from("watch_history")
        .select("id,user_id,content_id,progress_seconds,completed,last_seen_at")
        .order("last_seen_at", { ascending: false })
        .limit(20),
      supabase
        .from("support_tickets")
        .select("id,subject,status,priority,user_id,created_at")
        .in("status", ["open", "pending"])
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("comments")
        .select("id,user_id,content_id,body,is_hidden,created_at")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const activeNow = new Set((activeRes.data ?? []).map((r: any) => r.user_id)).size;
    const newSignups24h = newSignupsRes.count ?? 0;
    const watchSecondsToday = (watchTodayRes.data ?? []).reduce(
      (sum: number, r: any) => sum + (r.progress_seconds ?? 0),
      0,
    );

    // MRR
    const subs = subsRes.data ?? [];
    const activeSubs = subs.filter(
      (s: any) => s.status === "active" || s.status === "trialing",
    );
    const mrrCents = activeSubs.reduce(
      (sum: number, s: any) => sum + monthlyFromPriceId(s.price_id),
      0,
    );
    const planMix: Record<string, number> = {};
    activeSubs.forEach((s: any) => {
      const key = s.price_id ?? "unknown";
      planMix[key] = (planMix[key] ?? 0) + 1;
    });
    const churnRisk = subs.filter((s: any) => s.cancel_at_period_end).length;

    // Engagement: top content by watch events 7d
    const contentCounts = new Map<string, { views: number; completed: number }>();
    (watch7dRes.data ?? []).forEach((r: any) => {
      const c = contentCounts.get(r.content_id) ?? { views: 0, completed: 0 };
      c.views += 1;
      if (r.completed) c.completed += 1;
      contentCounts.set(r.content_id, c);
    });
    const contentById = new Map((contentRes.data ?? []).map((c: any) => [c.id, c]));
    const topContent = Array.from(contentCounts.entries())
      .map(([id, v]) => ({
        id,
        title: (contentById.get(id) as any)?.title ?? "—",
        slug: (contentById.get(id) as any)?.slug ?? null,
        type: (contentById.get(id) as any)?.type ?? "—",
        views: v.views,
        completion: v.views > 0 ? v.completed / v.views : 0,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 8);

    // User health: per user engagement score in last 30d
    const { data: hist30 } = await supabase
      .from("watch_history")
      .select("user_id,progress_seconds,completed,last_seen_at")
      .gte("last_seen_at", since30d)
      .limit(10000);
    const userAgg = new Map<
      string,
      { events: number; completed: number; seconds: number; last: string }
    >();
    (hist30 ?? []).forEach((r: any) => {
      const a = userAgg.get(r.user_id) ?? { events: 0, completed: 0, seconds: 0, last: r.last_seen_at };
      a.events += 1;
      if (r.completed) a.completed += 1;
      a.seconds += r.progress_seconds ?? 0;
      if (r.last_seen_at > a.last) a.last = r.last_seen_at;
      userAgg.set(r.user_id, a);
    });

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,display_name,created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    const userHealth = (profiles ?? []).map((p: any) => {
      const a = userAgg.get(p.id);
      const daysSince = a ? (now - new Date(a.last).getTime()) / 86400000 : 999;
      const recency = Math.max(0, 1 - daysSince / 30);
      const frequency = Math.min(1, (a?.events ?? 0) / 20);
      const depth = Math.min(1, (a?.seconds ?? 0) / 3600);
      const score = Math.round((recency * 0.5 + frequency * 0.3 + depth * 0.2) * 100);
      const dormant = daysSince > 14;
      const risk = dormant || score < 20;
      return {
        id: p.id,
        name: p.display_name ?? "—",
        events: a?.events ?? 0,
        completed: a?.completed ?? 0,
        score,
        dormant,
        risk,
        lastSeen: a?.last ?? null,
      };
    });
    userHealth.sort((a, b) => (Number(b.risk) - Number(a.risk)) || a.score - b.score);

    return {
      generatedAt: new Date().toISOString(),
      realtime: {
        activeNow,
        newSignups24h,
        watchMinutesToday: Math.round(watchSecondsToday / 60),
      },
      revenue: {
        mrrCents,
        activeSubs: activeSubs.length,
        churnRisk,
        planMix,
      },
      topContent,
      userHealth: userHealth.slice(0, 30),
      recentActivity: (historyRecentRes.data ?? []).map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        contentId: r.content_id,
        title: (contentById.get(r.content_id) as any)?.title ?? "—",
        slug: (contentById.get(r.content_id) as any)?.slug ?? null,
        progress: r.progress_seconds ?? 0,
        completed: r.completed,
        at: r.last_seen_at,
      })),
      moderationQueue: (commentsRes.data ?? []).map((c: any) => ({
        id: c.id,
        body: c.body,
        userId: c.user_id,
        contentId: c.content_id,
        hidden: c.is_hidden,
        at: c.created_at,
      })),
      supportQueue: (ticketsRes.data ?? []).map((t: any) => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        userId: t.user_id,
        at: t.created_at,
      })),
    };
  });
