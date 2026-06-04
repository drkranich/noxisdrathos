import { createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const SUPABASE_URL = "https://bobqkaqgxridueuueizh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvYnFrYXFneHJpZHVldXVlaXpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NTk4NTYsImV4cCI6MjA5NDQzNTg1Nn0.5iclr7SJxnUvmx7az-uysbY4GekFxia9mozSC1nIUxA";

export const requireSupabaseAuth = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const request = getRequest();
    if (!request?.headers) {
      throw new Response('Unauthorized: No request headers available', { status: 401 });
    }
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      throw new Response('Unauthorized: No authorization header provided', { status: 401 });
    }
    if (!authHeader.startsWith('Bearer ')) {
      throw new Response('Unauthorized: Only Bearer tokens are supported', { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      throw new Response('Unauthorized: No token provided', { status: 401 });
    }

    const supabase = createClient<Database>(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
        auth: {
          storage: undefined,
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims) {
      throw new Response('Unauthorized: Invalid token', { status: 401 });
    }
    if (!data.claims.sub) {
      throw new Response('Unauthorized: No user ID found in token', { status: 401 });
    }

    return next({
      context: {
        supabase,
        userId: data.claims.sub,
        claims: data.claims,
      },
    });
  }
);
