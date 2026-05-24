import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { ensureSuperAdminRole } from "@/lib/admin-auth.functions";
import type { SuperAdminBootstrapResult } from "@/lib/admin-auth.functions";

type Role = "admin" | "super_admin" | "member";

type RoleRow = {
  id?: string;
  user_id?: string;
  role: string;
  created_at?: string;
};

type RoleQueryState = {
  data: RoleRow[] | null;
  error: string | null;
  source: string;
};

type RolePipelineDiagnostics = {
  authEmail: string | null;
  authUid: string | null;
  hydratedRole: Role | "none" | "pending";
  rawUserRolesRows: RoleRow[];
  cacheRole: Role | "none";
  effectiveRole: Role | "none";
  guardRole: "pending" | "admin_allowed" | "member_or_denied" | "anonymous";
  roleQuery: RoleQueryState | null;
};

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  rolesLoading: boolean;
  roles: Role[];
  primaryRole: Role | "none";
  roleQuery: RoleQueryState | null;
  roleDiagnostics: RolePipelineDiagnostics;
  bootstrapResult: SuperAdminBootstrapResult | null;
  isAdmin: boolean;
  refreshRoles: () => void;
  signOut: () => Promise<void>;
};

const ROLE_PRIORITY: Record<Role, number> = {
  super_admin: 3,
  admin: 2,
  member: 1,
};

function isRole(value: string): value is Role {
  return value === "super_admin" || value === "admin" || value === "member";
}

function normalizeRoles(rows: RoleRow[]): Role[] {
  return Array.from(new Set(rows.map((row) => row.role).filter(isRole))).sort(
    (a, b) => ROLE_PRIORITY[b] - ROLE_PRIORITY[a],
  );
}

function resolvePrimaryRole(roles: Role[]): Role | "none" {
  return roles[0] ?? "none";
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [roleQuery, setRoleQuery] = useState<RoleQueryState | null>(null);
  const [bootstrapResult, setBootstrapResult] = useState<SuperAdminBootstrapResult | null>(null);
  const [roleRefreshNonce, setRoleRefreshNonce] = useState(0);
  const bootstrapSuperAdmin = useServerFn(ensureSuperAdminRole);
  const refreshRoles = useCallback(() => setRoleRefreshNonce((value) => value + 1), []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      queryClient.removeQueries({ queryKey: ["auth", "roles"] });
      queryClient.invalidateQueries();
      setSession(s);
      if (s?.user) {
        setRoles([]);
        setRoleQuery({ data: null, error: null, source: "auth_state_pending_user_roles" });
        setBootstrapResult(null);
        setRolesLoading(true);
      } else {
        setRoles([]);
        setRoleQuery(null);
        setBootstrapResult(null);
        setRolesLoading(false);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (data.session?.user) {
        setRolesLoading(true);
      } else {
        setRolesLoading(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

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
