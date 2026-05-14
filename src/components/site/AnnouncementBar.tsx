import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type A = { id: string; title: string; level: string };

export function AnnouncementBar() {
  const [a, setA] = useState<A | null>(null);
  useEffect(() => {
    supabase
      .from("announcements")
      .select("id,title,level")
      .eq("is_active", true)
      .eq("audience", "public")
      .order("publish_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setA((data as A | null) ?? null));
  }, []);
  if (!a) return null;
  return (
    <div className="w-full bg-foreground text-background">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-2 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em]">
        <span className="neon-dot" />
        <span>{a.title}</span>
      </div>
    </div>
  );
}
