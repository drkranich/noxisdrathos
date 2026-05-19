import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "super_admin" | "member";

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  rolesLoading: boolean;
  roles: Role[];
  isAdmin: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s?.user) {
        setRoles([]);
        setRolesLoading(false);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (!data.session?.user) {
        setRolesLoading(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) return;
    let cancelled = false;
    setRolesLoading(true);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.log("[auth] roles loaded", { uid, data, error });
        }
        setRoles((data ?? []).map((r) => r.role as Role));
        setRolesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      rolesLoading,
      roles,
      isAdmin: roles.includes("admin") || roles.includes("super_admin"),
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, loading, rolesLoading, roles],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

const FALLBACK_AUTH: AuthContextValue = {
  session: null,
  user: null,
  loading: false,
  rolesLoading: false,
  roles: [],
  isAdmin: false,
  signOut: async () => {},
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("[auth] useAuth() called outside <AuthProvider> — returning anonymous fallback.");
    }
    return FALLBACK_AUTH;
  }
  return ctx;
}
