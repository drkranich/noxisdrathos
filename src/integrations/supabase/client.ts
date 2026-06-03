import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Fallback hardcoded para quando o Lovable não injeta as variáveis via build
const FALLBACK_URL = "https://bobqkaqgxridueuueizh.supabase.co";
const FALLBACK_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvYnFrYXFneHJpZHVldXVlaXpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NTk4NTYsImV4cCI6MjA5NDQzNTg1Nn0.5iclr7SJxnUvmx7az-uysbY4GekFxia9mozSC1nIUxA";

function createSupabaseClient() {
  const SUPABASE_URL =
    import.meta.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    FALLBACK_URL;

  const SUPABASE_PUBLISHABLE_KEY =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    FALLBACK_KEY;

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    }
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
