import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const FALLBACK_SUPER_ADMIN_EMAIL = "genialidadefilosofica@gmail.com";

export const ensureSuperAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ observedEmail: z.string().email().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || FALLBACK_SUPER_ADMIN_EMAIL).trim();
    const { userId } = context;
    const { data: userRes, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    const authEmail = userRes.user?.email?.trim() ?? data.observedEmail?.trim() ?? "";
    const matched = authEmail.toLowerCase() === superAdminEmail.toLowerCase();

    if (userError || !matched) {
      return {
        ok: false,
        matched,
        userId,
        authEmail,
        superAdminEmail,
        source: process.env.SUPER_ADMIN_EMAIL ? "env" : "app fallback",
        error: userError?.message ?? null,
      };
    }

    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      display_name: userRes.user?.user_metadata?.display_name ?? userRes.user?.user_metadata?.full_name ?? authEmail.split("@")[0],
      avatar_url: userRes.user?.user_metadata?.avatar_url ?? null,
    }, { onConflict: "id" });

    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .neq("role", "super_admin");

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "super_admin" }, { onConflict: "user_id,role" });

    return {
      ok: !roleError,
      matched,
      userId,
      authEmail,
      superAdminEmail,
      source: process.env.SUPER_ADMIN_EMAIL ? "env" : "app fallback",
      error: roleError?.message ?? null,
    };
  });

export const getAdminDiagnostics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || FALLBACK_SUPER_ADMIN_EMAIL).trim();
    const { userId, supabase } = context;
    const [authUser, profile, adminRoles, roleQuery, adminAccess] = await Promise.all([
      supabaseAdmin.auth.admin.getUserById(userId),
      supabaseAdmin.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabaseAdmin.from("user_roles").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("user_roles").select("id,user_id,role,created_at").eq("user_id", userId).order("created_at", { ascending: false }),
      supabaseAdmin.rpc("is_admin", { _user_id: userId }),
    ]);
    const email = authUser.data.user?.email?.trim() ?? null;
    const roles = (adminRoles.data ?? []).map((row) => row.role as string);
    const resolvedRole = roles.includes("super_admin") ? "super_admin" : roles.includes("admin") ? "admin" : roles[0] ?? "none";

    return {
      currentEmail: email,
      currentAuthUid: userId,
      currentRole: resolvedRole,
      profileRow: profile.data,
      profileError: profile.error?.message ?? null,
      userRolesRows: adminRoles.data ?? [],
      userRolesError: adminRoles.error?.message ?? null,
      superAdminEmail,
      superAdminEmailSource: process.env.SUPER_ADMIN_EMAIL ? "env" : "app fallback",
      emailMatchesSuperAdmin: !!email && email.toLowerCase() === superAdminEmail.toLowerCase(),
      authEmailHasNoOuterSpaces: !!email && email === email.trim(),
      roleQueryResponse: {
        data: roleQuery.data ?? null,
        error: roleQuery.error?.message ?? null,
      },
      adminAccessResult: !!adminAccess.data,
      adminAccessError: adminAccess.error?.message ?? null,
      authUserError: authUser.error?.message ?? null,
    };
  });