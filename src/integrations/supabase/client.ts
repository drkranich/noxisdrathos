// Este arquivo pode ser regenerado pelo Lovable — a lógica de override abaixo
// garante que o projeto correto (bobqkaqgxridueuueizh) seja sempre usado.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Projeto correto — sempre usa este independente do que o Lovable injeta
const CORRECT_URL = "https://bobqkaqgxridueuueizh.supabase.co";
const CORRECT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvYnFrYXFneHJpZHVldXVlaXpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NTk4NTYsImV4cCI6MjA5NDQzNTg1Nn0.5iclr7SJxnUvmx7az-uysbY4GekFxia9mozSC1nIUxA";

function createSupabaseClient() {
  // Ignora variáveis de ambiente — o Lovable injeta o projeto errado via env
  return createClient<Database>(CORRECT_URL, CORRECT_KEY, {
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    }
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
