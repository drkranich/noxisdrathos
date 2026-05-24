import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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
      const bootstrap = await bootstrapSuperAdmin({ data: { observedEmail: email } }).catch(
        (error): SuperAdminBootstrapResult => ({
          ok: false,
          matched: false,
          userId,
          authEmail: email,
          superAdminEmail: "unavailable",
          source: "app fallback",
          roleAssigned: null,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      if (!cancelled) setBootstrapResult(bootstrap);

      const response = await supabase
        .from("user_roles")
        .select("id,user_id,role,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (cancelled) return;

      const rawRows = response.data ?? [];
      const resolvedRoles = normalizeRoles(rawRows);
      setRoleQuery({
        data: response.data ?? [],
        error: response.error?.message ?? null,
        source: "user_roles",
      });
      setRoles(resolvedRoles);
      setRolesLoading(false);

      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log("[auth] role hydration", {
          currentEmail: email,
          hydratedRole: resolvePrimaryRole(resolvedRoles),
          rawUserRolesRows: rawRows,
          roleQueryResult: response,
          bootstrap,
          guardDecision:
            resolvedRoles.includes("admin") || resolvedRoles.includes("super_admin")
              ? "admin_allowed"
              : "member_or_denied",
          hydrationTimingMs: Math.round(performance.now() - startedAt),
        });
      }
    }

    hydrateRoles();
    return () => {
      cancelled = true;
    };
  }, [bootstrapSuperAdmin, roleRefreshNonce, session?.user?.email, session?.user?.id]);

  const primaryRole = resolvePrimaryRole(roles);
  const isAdmin = primaryRole === "super_admin" || primaryRole === "admin";
  const roleDiagnostics = useMemo<RolePipelineDiagnostics>(() => {
    const rawUserRolesRows = roleQuery?.data ?? [];
    const cacheRole = resolvePrimaryRole(normalizeRoles(rawUserRolesRows));
    return {
      authEmail: session?.user?.email ?? null,
      authUid: session?.user?.id ?? null,
      hydratedRole: rolesLoading ? "pending" : primaryRole,
      rawUserRolesRows,
      cacheRole,
      effectiveRole: primaryRole,
      guardRole:
        loading || rolesLoading
          ? "pending"
          : !session?.user
            ? "anonymous"
            : isAdmin
              ? "admin_allowed"
              : "member_or_denied",
      roleQuery,
    };
  }, [isAdmin, loading, primaryRole, roleQuery, rolesLoading, session?.user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      rolesLoading,
      roles,
      primaryRole,
      roleQuery,
      roleDiagnostics,
      bootstrapResult,
      isAdmin,
      refreshRoles,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [
      session,
      loading,
      rolesLoading,
      roles,
      primaryRole,
      roleQuery,
      roleDiagnostics,
      bootstrapResult,
      isAdmin,
      refreshRoles,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

const FALLBACK_ROLE_DIAGNOSTICS: RolePipelineDiagnostics = {
  authEmail: null,
  authUid: null,
  hydratedRole: "none",
  rawUserRolesRows: [],
  cacheRole: "none",
  effectiveRole: "none",
  guardRole: "anonymous",
  roleQuery: null,
};

const FALLBACK_AUTH: AuthContextValue = {
  session: null,
  user: null,
  loading: false,
  rolesLoading: false,
  roles: [],
  primaryRole: "none",
  roleQuery: null,
  roleDiagnostics: FALLBACK_ROLE_DIAGNOSTICS,
  bootstrapResult: null,
  isAdmin: false,
  refreshRoles: () => {},
  signOut: async () => {},
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn(
        "[auth] useAuth() called outside <AuthProvider> — returning anonymous fallback.",
      );
    }
    return FALLBACK_AUTH;
  }
  return ctx;
}
