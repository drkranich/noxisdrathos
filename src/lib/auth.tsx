import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { ensureSuperAdminRole } from "@/lib/admin-auth.functions";
import type { SuperAdminBootstrapResult } from "@/lib/admin-auth.functions";

type Role = "admin" | "super_admin" | "member";

type RoleQueryState = {
  data: Array<{ role: string }> | null;
  error: string | null;
  source: string;
};

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  rolesLoading: boolean;
  roles: Role[];
  primaryRole: Role | "none";
  roleQuery: RoleQueryState | null;
  bootstrapResult: SuperAdminBootstrapResult | null;
  isAdmin: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [roleQuery, setRoleQuery] = useState<RoleQueryState | null>(null);
  const [bootstrapResult, setBootstrapResult] = useState<SuperAdminBootstrapResult | null>(null);
  const bootstrapSuperAdmin = useServerFn(ensureSuperAdminRole);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s?.user) {
        setRoles([]);
        setRoleQuery(null);
        setBootstrapResult(null);
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
    const userId = uid;
    let cancelled = false;
    const email = session.user.email ?? "";
    setRolesLoading(true);
    const startedAt = performance.now();

    async function hydrateRoles() {
      const bootstrap = await bootstrapSuperAdmin({ data: { observedEmail: email } }).catch((error): SuperAdminBootstrapResult => ({
        ok: false,
        matched: false,
        userId,
        authEmail: email,
        superAdminEmail: "unavailable",
        source: "app fallback",
        roleAssigned: null,
        error: error instanceof Error ? error.message : String(error),
      }));
      if (!cancelled) setBootstrapResult(bootstrap);

      const response = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
      if (cancelled) return;

      const resolvedRoles = (response.data ?? []).map((r) => r.role as Role);
      setRoleQuery({ data: response.data ?? [], error: response.error?.message ?? null, source: "user_roles" });
      setRoles(resolvedRoles);
      setRolesLoading(false);

      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log("[auth] role hydration", {
          currentEmail: email,
          currentRole: resolvedRoles.includes("super_admin") ? "super_admin" : resolvedRoles.includes("admin") ? "admin" : resolvedRoles[0] ?? "none",
          roleQueryResult: response,
          bootstrap,
          guardDecision: resolvedRoles.includes("admin") || resolvedRoles.includes("super_admin") ? "admin_allowed" : "member_or_denied",
          hydrationTimingMs: Math.round(performance.now() - startedAt),
        });
      }
    }

    hydrateRoles();
    return () => {
      cancelled = true;
    };
  }, [bootstrapSuperAdmin, session?.user?.email, session?.user?.id]);

  const primaryRole = roles.includes("super_admin") ? "super_admin" : roles.includes("admin") ? "admin" : roles.includes("member") ? "member" : "none";

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      rolesLoading,
      roles,
      primaryRole,
      roleQuery,
      bootstrapResult,
      isAdmin: roles.includes("admin") || roles.includes("super_admin"),
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, loading, rolesLoading, roles, primaryRole, roleQuery, bootstrapResult],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

const FALLBACK_AUTH: AuthContextValue = {
  session: null,
  user: null,
  loading: false,
  rolesLoading: false,
  roles: [],
  primaryRole: "none",
  roleQuery: null,
  bootstrapResult: null,
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
