import { useAuth } from "@/lib/auth";

type Role =
  | "super_admin"
  | "admin"
  | "member"
  | null;

export function useRole() {

  const {
    primaryRole,
    rolesLoading,
  } = useAuth();

  return {

    data:
      primaryRole === "none"
        ? null
        : (primaryRole as Role),

    isLoading:
      rolesLoading,

    error:
      null,

  };

}
