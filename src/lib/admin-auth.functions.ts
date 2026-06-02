import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const FALLBACK_SUPER_ADMIN_EMAIL = "genialidadefilosofica@gmail.com";

export type SuperAdminBootstrapResult = {
  ok: boolean;
  matched: boolean;
  userId: string;
  authEmail: string;
  superAdminEmail: string;
  source: "env" | "app fallback";
  roleAssigned: string | null;
  error: string | null;
};

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
}

function superAdminEmailSource(): "env" | "app fallback" {
  return process.env.SUPER_ADMIN_EMAIL ? "env" : "app fallback";
}

function resolveRole(roleList: string[]) {
  if (roleList.includes("super_admin")) return "super_admin";
  if (roleList.includes("admin")) return "admin";
  if (roleList.includes("member")) return "member";
  return roleList[0] ?? "none";
}

export const ensureSuperAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        observedEmail: z.string().email().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context }) => {
    const { userId } = context;
    const superAdminEmail = normalizeEmail(
      process.env.SUPER_ADMIN_EMAIL ?? FALLBACK_SUPER_ADMIN_EMAIL,
    );

    const { data: userRes, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    const authEmail = normalizeEmail(userRes.user?.email);
    const matched = authEmail === superAdminEmail;
    const source = superAdminEmailSource();

    if (userError) {
      return {
        ok: false,
        matched,
        userId,
        authEmail,
        superAdminEmail: "",
        source,
        roleAssigned: null,
        error: userError.message,
      };
    }

    if (!matched) {
      return {
        ok: true,
        matched: false,
        userId,
        authEmail,
        superAdminEmail: "",
        source,
        roleAssigned: null,
        error: null,
      };
    }

    const displayName =
      userRes.user?.user_metadata?.display_name ??
      userRes.user?.user_metadata?.full_name ??
      authEmail.split("@")[0];

    await supabaseAdmin.from("profiles").upsert(
      {
        id: userId,
        display_name: displayName,
        avatar_url: userRes.user?.user_metadata?.avatar_url ?? null,
      },
      { onConflict: "id" },
    );

    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);

    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      role: "super_admin",
    });

    if (roleError) {
      return {
        ok: false,
        matched,
        userId,
        authEmail,
        superAdminEmail: "",
        source,
        roleAssigned: null,
        error: roleError.message,
      };
    }

    return {
      ok: true,
      matched: true,
      userId,
      authEmail,
      superAdminEmail: "",
      source,
      roleAssigned: "super_admin",
      error: null,
    };
  });

export const getAdminDiagnostics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context;
    const { data: isAdminRpc } = await supabaseAdmin.rpc("is_admin", { _user_id: userId });

    if (!isAdminRpc) {
      throw new Response("Forbidden", { status: 403 });
    }

    const superAdminEmail = normalizeEmail(
      process.env.SUPER_ADMIN_EMAIL ?? FALLBACK_SUPER_ADMIN_EMAIL,
    );

    const [authUser, profile, roles, adminAccess] = await Promise.all([
      supabaseAdmin.auth.admin.getUserById(userId),
      supabaseAdmin.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("*").eq("user_id", userId),
      supabaseAdmin.rpc("is_admin", { _user_id: userId }),
    ]);

    const rawAuthEmail = authUser.data.user?.email ?? "";
    const email = normalizeEmail(rawAuthEmail);
    const roleList = roles.data?.map((row) => row.role) ?? [];
    const resolvedRole = resolveRole(roleList);

    return {
      currentEmail: email,
      currentAuthUid: userId,
      currentRole: resolvedRole,
      superAdminEmail,
      superAdminEmailSource: superAdminEmailSource(),
      emailMatchesSuperAdmin: email === superAdminEmail,
      authEmailHasNoOuterSpaces: rawAuthEmail === rawAuthEmail.trim(),
      profile: profile.data,
      profileRow: profile.data,
      profileError: profile.error?.message ?? null,
      roles: roles.data ?? [],
      userRolesRows: roles.data ?? [],
      roleQueryResponse: {
        data: roles.data ?? [],
        error: roles.error?.message ?? null,
        source: "server:user_roles",
      },
      rolesError: roles.error?.message ?? null,
      userRolesError: roles.error?.message ?? null,
      adminAccess: !!adminAccess.data,
      adminAccessError: adminAccess.error?.message ?? null,
      authError: authUser.error?.message ?? null,
    };
  });


export const setMemberAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        targetUserId: z.string().uuid(),
        grant: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { userId } = context;

    // Caller must be super_admin
    const { data: callerIsSuperAdmin } = await supabaseAdmin.rpc("is_admin", { _user_id: userId });
    if (!callerIsSuperAdmin) {
      throw new Response("Forbidden", { status: 403 });
    }

    // Do not allow downgrading a super_admin via this fn
    const { data: targetRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.targetUserId);

    const isSuperAdmin = (targetRoles ?? []).some((r) => r.role === "super_admin");
    if (isSuperAdmin) {
      throw new Response("Cannot modify a super_admin via this endpoint", { status: 403 });
    }

    if (data.grant) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.targetUserId, role: "admin" });
      if (error && error.code !== "23505") {
        // 23505 = unique violation (already admin) — safe to ignore
        throw new Response(error.message, { status: 500 });
      }
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.targetUserId)
        .eq("role", "admin");
      if (error) {
        throw new Response(error.message, { status: 500 });
      }
    }

    return { ok: true, targetUserId: data.targetUserId, grant: data.grant };
  });
