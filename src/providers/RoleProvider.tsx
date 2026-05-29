import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

import { useRole } from "@/hooks/useRole";

type Role =
  | "super_admin"
  | "admin"
  | "member"
  | null;

type RoleContextType = {

  data: Role;

  isLoading: boolean;

  error: unknown;

};

const RoleContext =
  createContext<RoleContextType | null>(
    null,
  );

export function RoleProvider({

  children,

}: {

  children: ReactNode;

}) {

  const role =
    useRole();

  return (

    <RoleContext.Provider
      value={role}
    >

      {children}

    </RoleContext.Provider>

  );

}

export function useResolvedRole() {

  const context =
    useContext(
      RoleContext,
    );

  if (!context) {

    throw new Error(
      "useResolvedRole must be used inside RoleProvider",
    );

  }

  return context;

}
