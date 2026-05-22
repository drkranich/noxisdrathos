import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const FALLBACK_SUPER_ADMIN_EMAIL = "";

export type SuperAdminBootstrapResult = {
  ok: boolean;
  matched: boolean;
  userId: string;
  authEmail: string;
  superAdminEmail: string;
  source: "env" | "app fallback" | "client catch";
  error: string | null;
};

export const ensureSuperAdminRole = createServerFn({
  method: "POST",
})
.middleware([requireSupabaseAuth])
.inputValidator((input) =>
  z.object({
    observedEmail: z.string().email().optional(),
  }).parse(input)
)
.handler(async ({ data, context }) => {

  const { userId } = context;

  const {
    data: userRes,
    error: userError,
  } = await supabaseAdmin.auth.admin.getUserById(userId);

  const authEmail =
    userRes.user?.email?.trim()
    ??
    data.observedEmail?.trim()
    ??
    "";

  if (userError) {

    return {
      ok: false,
      matched: false,
      userId,
      authEmail: "[REDACTED]",
      superAdminEmail: "[REDACTED]",
      source:
        process.env.SUPER_ADMIN_EMAIL
          ? "env"
          : "app fallback",
      error: userError.message,
    } satisfies SuperAdminBootstrapResult;

  }

  await supabaseAdmin
    .from("profiles")
    .upsert(
      {
        id: userId,

        display_name:
          userRes.user?.user_metadata?.display_name
          ??
          userRes.user?.user_metadata?.full_name
          ??
          authEmail.split("@")[0],

        avatar_url:
          userRes.user?.user_metadata?.avatar_url
          ??
          null,
      },
      {
        onConflict: "id",
      }
    );

  const {
    data: existingRoles,
  } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  const alreadyAdmin =
    existingRoles?.some(
      r =>
        r.role === "super_admin"
        ||
        r.role === "admin"
    ) ?? false;

  if (!alreadyAdmin) {

    await supabaseAdmin
      .from("user_roles")
      .upsert(
        {
          user_id: userId,
          role: "member",
        },
        {
          onConflict: "user_id,role",
        }
      );

  }

  return {

    ok: true,

    matched: true,

    userId,

    authEmail,

    superAdminEmail:
      process.env.SUPER_ADMIN_EMAIL
      ??
      "",

    source:
      process.env.SUPER_ADMIN_EMAIL
        ? "env"
        : "app fallback",

    error: null,

  } satisfies SuperAdminBootstrapResult;

});

export const getAdminDiagnostics =
createServerFn({
  method: "GET",
})
.middleware([
  requireSupabaseAuth,
])
.handler(
async ({ context }) => {

  const {
    userId,
    supabase,
  } = context;

  const [

    authUser,

    profile,

    adminRoles,

    roleQuery,

    adminAccess,

  ] = await Promise.all([

    supabaseAdmin
      .auth
      .admin
      .getUserById(userId),

    supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle(),

    supabaseAdmin
      .from("user_roles")
      .select("*")
      .eq("user_id", userId),

    supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", userId),

    supabaseAdmin
      .rpc(
        "is_admin",
        {
          _user_id: userId,
        }
      ),

  ]);

  const email =
    authUser
    .data
    .user
    ?.email
    ?.trim()
    ??
    null;

  const roles =
    (adminRoles.data ?? [])
    .map(
      r => r.role
    );

  const resolvedRole =

    roles.includes("super_admin")

    ?

    "super_admin"

    :

    roles.includes("admin")

    ?

    "admin"

    :

    roles.includes("member")

    ?

    "member"

    :

    "none";

  return {

    currentEmail: email,

    currentAuthUid: userId,

    currentRole: resolvedRole,

    roles,

    profileRow:
      profile.data,

    userRolesRows:
      adminRoles.data,

    roleQueryResponse: {

      data:
        roleQuery.data,

      error:
        roleQuery.error?.message
        ??
        null,

    },

    adminAccessResult:
      !!adminAccess.data,

    adminAccessError:
      adminAccess.error?.message
      ??
      null,

  };

});
