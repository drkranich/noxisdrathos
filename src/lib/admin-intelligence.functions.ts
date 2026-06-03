import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PLAN_AMOUNT_CENTS: Record<string, number> = {
  circle_monthly: 9700,
  vault_monthly: 29700,
  council_yearly: 124167,
};

function monthlyFromPriceId(priceId: string | null): number {
  if (!priceId) return 0;
  return PLAN_AMOUNT_CENTS[priceId] ?? 0;
}

async function assertAdmin(
  supabase: any,
  userId: string,
) {

  const {
    data,
    error,
  } = await supabase.rpc(
    "is_admin",
    {
      _user_id: userId,
    },
  );

  if (error) {

    console.error(
      "ADMIN CHECK ERROR:",
      error,
    );

    throw error;

  }

  if (!data) {

    throw new Error(
      "forbidden",
    );

  }

}

export const getIntelligenceOverview =
createServerFn({
  method: "GET",
})
.middleware([
  requireSupabaseAuth,
])
.handler(
async ({ context }) => {

const {
  supabase,
  userId,
} = context;

await assertAdmin(
  supabase,
  userId,
);

const now = Date.now();

const since5m =
new Date(
now - 5 * 60 * 1000,
).toISOString();

const since24h =
new Date(
now - 24 * 3600 * 1000,
).toISOString();

const since7d =
new Date(
now - 7 * 86400 * 1000,
).toISOString();

const since30d =
new Date(
now - 30 * 86400 * 1000,
).toISOString();

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

supabase
.from("watch_history")
.select("user_id")
.gte(
"last_seen_at",
since5m,
)
.limit(500),

supabase
.from("profiles")
.select(
"id",
{
count:"exact",
head:true,
},
)
.gte(
"created_at",
since24h,
),

supabase
.from("watch_history")
.select(
"progress_seconds,last_seen_at",
)
.gte(
"last_seen_at",
since24h,
)
.limit(2000),

supabase
.from("subscriptions")
.select(
"status,price_id,product_id,current_period_end,cancel_at_period_end,created_at",
),

supabase
.from("watch_history")
.select(
"content_id,user_id,completed,last_seen_at",
)
.gte(
"last_seen_at",
since7d,
)
.limit(5000),

supabase
.from("content")
.select(
"id,slug,title,type,thumbnail_url",
)
.eq(
"status",
"published",
)
.limit(500),

supabase
.from("watch_history")
.select(
"id,user_id,content_id,progress_seconds,completed,last_seen_at",
)
.order(
"last_seen_at",
{
ascending:false,
},
)
.limit(20),

supabase
.from("support_tickets")
.select(
"id,subject,status,priority,user_id,created_at",
)
.in(
"status",
[
"open",
"pending",
],
)
.order(
"created_at",
{
ascending:false,
},
)
.limit(10),

supabase
.from("comments")
.select(
"id,user_id,content_id,body,is_hidden,created_at",
)
.order(
"created_at",
{
ascending:false,
},
)
.limit(10),

]);

const activeNow =
new Set(
(activeRes.data ?? [])
.map(
(r:any)=>
r.user_id,
),
).size;

const newSignups24h =
newSignupsRes.count
??
0;

const watchSecondsToday =
(
watchTodayRes.data
??
[]
)
.reduce(

(
sum:number,
r:any,

)=>

sum
+
(
r.progress_seconds
??
0
),

0,

);

const subs =
subsRes.data
??
[];

const activeSubs =
subs.filter(

(s:any)=>

s.status==="active"

||

s.status==="trialing",

);

const mrrCents =
activeSubs.reduce(

(
sum:number,
s:any,

)=>

sum
+
monthlyFromPriceId(
s.price_id,
),

0,

);

const planMix:
Record<
string,
number
>={};

activeSubs.forEach(

(s:any)=>{

const key=

s.price_id

??

"unknown";

planMix[key]=

(
planMix[key]

??

0

)

+

1;

},

);

const churnRisk=

subs.filter(

(s:any)=>

s.cancel_at_period_end,

).length;

const contentById = new Map<string, any>(
  (contentRes.data ?? []).map((c: any) => [c.id, c]),
);

const watchByContent = new Map<string, { views: Set<string>; completed: number }>();
for (const w of (watch7dRes.data ?? []) as any[]) {
  const entry = watchByContent.get(w.content_id) ?? { views: new Set<string>(), completed: 0 };
  entry.views.add(w.user_id);
  if (w.completed) entry.completed += 1;
  watchByContent.set(w.content_id, entry);
}

const topContent = Array.from(watchByContent.entries())
  .map(([content_id, agg]) => {
    const c = contentById.get(content_id);
    const views = agg.views.size;
    return {
      id: content_id,
      slug: (c?.slug as string | null) ?? null,
      title: (c?.title as string | null) ?? "conteúdo removido",
      type: (c?.type as string | null) ?? "—",
      completion: views > 0 ? agg.completed / views : 0,
      views,
    };
  })
  .sort((a, b) => b.views - a.views)
  .slice(0, 10);

type UserHealth = {
  id: string;
  name: string;
  events: number;
  completed: number;
  lastSeen: string | null;
  dormant: boolean;
  risk: boolean;
  score: number;
};
const userHealth: UserHealth[] = [];

const recentActivity = ((historyRecentRes.data ?? []) as any[]).map((r) => ({
  id: r.id as string,
  title: (contentById.get(r.content_id)?.title as string | null) ?? "conteúdo",
  at: (r.last_seen_at as string | null) ?? new Date().toISOString(),
  completed: Boolean(r.completed),
}));

const moderationQueue = ((commentsRes.data ?? []) as any[]).map((c) => ({
  id: c.id as string,
  body: (c.body as string | null) ?? "",
  hidden: Boolean(c.is_hidden),
  at: (c.created_at as string | null) ?? new Date().toISOString(),
}));

const supportQueue = ((ticketsRes.data ?? []) as any[]).map((t) => ({
  id: t.id as string,
  subject: (t.subject as string | null) ?? "—",
  priority: (t.priority as string | null) ?? "—",
  at: (t.created_at as string | null) ?? new Date().toISOString(),
}));

return {
  generatedAt: new Date().toISOString(),
  realtime: { activeNow, newSignups24h, watchMinutesToday: Math.round(watchSecondsToday / 60) },
  revenue: { mrrCents, activeSubs: activeSubs.length, churnRisk, planMix },
  topContent,
  userHealth,
  recentActivity,
  moderationQueue,
  supportQueue,
};

},
);
