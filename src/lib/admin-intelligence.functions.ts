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
  userId: string
) {

  const { data, error } =
    await supabase.rpc(
      "is_admin",
      {
        _user_id: userId,
      }
    );

  if (error) {

    console.error(
      "ADMIN CHECK ERROR:",
      error
    );

    throw new Error(
      "admin verification failed"
    );

  }

  if (!data) {

    throw new Error(
      "forbidden"
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
async ({
  context,
}) => {

const {
  supabase,
  userId,
} = context;

await assertAdmin(
  supabase,
  userId,
);

const now =
Date.now();

const since5m =
new Date(
now - 5 * 60 * 1000
).toISOString();

const since24h =
new Date(
now - 24 * 3600 * 1000
).toISOString();

const since7d =
new Date(
now - 7 * 86400 * 1000
).toISOString();

const since30d =
new Date(
now - 30 * 86400 * 1000
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

] =

await Promise.all([

supabase
.from("watch_history")
.select("user_id")
.gte(
"last_seen_at",
since5m
)
.limit(500),

supabase
.from("profiles")
.select(
"id",
{
count:"exact",
head:true,
}
)
.gte(
"created_at",
since24h
),

supabase
.from("watch_history")
.select(
"progress_seconds,last_seen_at"
)
.gte(
"last_seen_at",
since24h
)
.limit(2000),

supabase
.from("subscriptions")
.select(
"status,price_id,product_id,current_period_end,cancel_at_period_end,created_at"
),

supabase
.from("watch_history")
.select(
"content_id,user_id,completed,last_seen_at"
)
.gte(
"last_seen_at",
since7d
)
.limit(5000),

supabase
.from("content")
.select(
"id,slug,title,type,thumbnail_url"
)
.eq(
"status",
"published"
)
.limit(500),

supabase
.from("watch_history")
.select(
"id,user_id,content_id,progress_seconds,completed,last_seen_at"
)
.order(
"last_seen_at",
{
ascending:false,
}
)
.limit(20),

supabase
.from("support_tickets")
.select(
"id,subject,status,priority,user_id,created_at"
)
.in(
"status",
[
"open",
"pending",
]
)
.order(
"created_at",
{
ascending:false,
}
)
.limit(10),

supabase
.from("comments")
.select(
"id,user_id,content_id,body,is_hidden,created_at"
)
.order(
"created_at",
{
ascending:false,
}
)
.limit(10),

]);

const activeNow =
new Set(
(activeRes.data ?? [])
.map(
(r:any)=>
r.user_id
)
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

return {

generatedAt:

new Date()

.toISOString(),

realtime:{

activeNow,

newSignups24h,

watchMinutesToday:

Math.round(

watchSecondsToday
/
60

),

},

};

});
