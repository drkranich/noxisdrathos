import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  useQueryClient,
} from "@tanstack/react-query";

import type {
  Session,
  User,
} from "@supabase/supabase-js";

import {
  supabase,
} from "@/integrations/supabase/client";

type Role =
  | "super_admin"
  | "admin"
  | "member";

type RoleRow = {
  role: string;
};

export type AuthContextValue = {

  session: Session | null;

  user: User | null;

  loading: boolean;

  rolesLoading: boolean;

  roles: Role[];

  primaryRole:
    Role
    | "none";

  isAdmin: boolean;

  isSuperAdmin: boolean;

  roleDiagnostics: {

    userId: string | null;

    email: string | null;

    roles: string[];

    primaryRole: string;

    isAdmin: boolean;

    isSuperAdmin: boolean;

    loading: boolean;

    rolesLoading: boolean;

  };

  refreshRoles: () => void;

  signOut: () => Promise<void>;

};

const AuthContext =
  createContext<
    AuthContextValue
    | null
  >(null);

function normalizeRoles(
  rows: RoleRow[],
): Role[] {

  const unique =
    new Set<Role>();

  for (const row of rows) {

    if (
      row.role === "super_admin"
      ||
      row.role === "admin"
      ||
      row.role === "member"
    ) {

      unique.add(
        row.role,
      );

    }

  }

  return Array
    .from(
      unique,
    )
    .sort(
      (a, b) => {

        const priority = {

          super_admin: 3,

          admin: 2,

          member: 1,

        };

        return (
          priority[b]
          -
          priority[a]
        );

      },
    );

}

export function AuthProvider({

  children,

}: {

  children: ReactNode;

}) {

  const queryClient =
    useQueryClient();

  const [

    session,

    setSession,

  ] =
    useState<
      Session
      | null
    >(
      null,
    );

  const [

    loading,

    setLoading,

  ] =
    useState(
      true,
    );

  const [

    rolesLoading,

    setRolesLoading,

  ] =
    useState(
      false,
    );

  const [

    roles,

    setRoles,

  ] =
    useState<
      Role[]
    >(
      [],
    );

  const [

    refreshNonce,

    setRefreshNonce,

  ] =
    useState(
      0,
    );

  const refreshRoles =
    useCallback(

      () => {

        setRefreshNonce(
          v => v + 1,
        );

      },

      [],

    );

  useEffect(() => {

    async function boot() {

      try {

        const {
          data,
        } =
          await supabase
            .auth
            .getSession();

        if (import.meta.env.DEV) console.log("BOOT SESSION:", data.session);

        setSession(
          data.session,
        );

      } catch (
        error
      ) {

        console.error(
          "SESSION ERROR:",
          error,
        );

      } finally {

        setLoading(
          false,
        );

      }

    }

    boot();

    const {
      data,
    } =
      supabase
        .auth
        .onAuthStateChange(

          (
            event,
            next,
          ) => {

            if (import.meta.env.DEV) { console.log("AUTH EVENT:", event); console.log("NEXT SESSION:", next); }

            setSession(
              next,
            );

            queryClient.invalidateQueries();

          },

        );

    return () => {

      data.subscription.unsubscribe();

    };

  }, [
    queryClient,
  ]);

  useEffect(() => {

    const uid =
      session?.user?.id;

    if (import.meta.env.DEV) { console.log("SESSION USER:", session?.user); console.log("AUTH UID:", uid); }

    if (!uid) {

      if (import.meta.env.DEV) console.log("NO UID FOUND");

      setRoles([]);

      setRolesLoading(
        false,
      );

      return;

    }

    let mounted =
      true;

    async function hydrate() {

      setRolesLoading(
        true,
      );

      try {

        const {

          data,

          error,

        } =
          await supabase

            .from(
              "user_roles",
            )

            .select("*")

            .eq(
              "user_id",
              uid,
            );

        if (import.meta.env.DEV) { console.log("ROLE RESPONSE:", data); console.log("ROLE ERROR:", error); }

        if (
          error
        ) {

          throw error;

        }

        if (
          !mounted
        ) {

          return;

        }

        const normalized =
          normalizeRoles(
            data ?? [],
          );

        if (import.meta.env.DEV) console.log("NORMALIZED ROLE:", normalized);

        setRoles(
          normalized,
        );

      } catch (
        e
      ) {

        console.error(
          "ROLE PIPELINE ERROR:",
          e,
        );

        if (
          mounted
        ) {

          setRoles([]);

        }

      } finally {

        if (
          mounted
        ) {

          setRolesLoading(
            false,
          );

        }

      }

    }

    hydrate();

    return () => {

      mounted =
        false;

    };

  }, [
    session?.user?.id,
    refreshNonce,
  ]);

  const primaryRole =
    roles[0]
    ??
    "none";

  if (import.meta.env.DEV) console.log("PRIMARY ROLE:", primaryRole);

  const value =
    useMemo(
      () => ({

        session,

        user:
          session?.user
          ?? null,

        loading,

        rolesLoading,

        roles,

        primaryRole,

        isAdmin:
          primaryRole === "admin" || primaryRole === "super_admin",

        isSuperAdmin:
          primaryRole === "super_admin",

        roleDiagnostics: {

          userId:
            session?.user?.id
            ?? null,

          email:
            session?.user?.email
            ?? null,

          roles,

          primaryRole,

          isAdmin:
            primaryRole === "admin" || primaryRole === "super_admin",

          isSuperAdmin:
            primaryRole === "super_admin",

          loading,

          rolesLoading,

        },

        refreshRoles,

        signOut:
          async () => {

            await supabase
              .auth
              .signOut();

          },

      }),
      [
        session,
        loading,
        rolesLoading,
        roles,
        primaryRole,
        refreshRoles,
      ],
    );

  return (

    <AuthContext.Provider
      value={value}
    >

      {children}

    </AuthContext.Provider>

  );

}

export function useAuth() {

  const ctx =
    useContext(
      AuthContext,
    );

  if (!ctx) {

    throw new Error(
      "useAuth requires AuthProvider",
    );

  }

  return ctx;

}
```
