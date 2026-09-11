"use server";

import { requireActionAuth } from "@/lib/supabase/action-auth";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import crypto from "crypto";
import { recordAuditLog } from "@/lib/services/audit-service";

export interface CreateSubAdminData {
  fullName: string;
  email: string;
  phone: string;
  customRoleTitle: string;
  permissions: string[];
  schoolId: string;
  subdomain: string;
}

export interface AuditLogQueryOptions {
  module?: string;
  action?: string;
  actorId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function getAdmins(schoolId: string, subdomain: string) {
  if (!subdomain) return { error: "Subdomain is required to fetch administrators." };
  try {
    const { tenantSupabase } = await requireActionAuth(subdomain, ["admin"], "admins");

    const { data, error } = await (tenantSupabase as any)
      .from("profiles")
      .select("*")
      .eq("role", "admin")
      .eq("school_id", schoolId)
      .order("is_super_admin", { ascending: false })
      .order("full_name", { ascending: true });

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error("[SubAdmin Actions] getAdmins Error:", error.message);
    return { error: error.message || "Failed to fetch administrators." };
  }
}

export async function createSubAdmin(data: CreateSubAdminData) {
  const {
    fullName,
    email,
    phone,
    customRoleTitle,
    permissions,
    schoolId,
    subdomain,
  } = data;

  try {
    const { tenantSupabase, user: caller } = await requireActionAuth(subdomain, ["admin"], "admins");

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";
    const activateUrl = process.env.NODE_ENV === "production"
      ? `https://${subdomain}.${rootDomain}/activate`
      : `http://${subdomain}.${rootDomain}/activate`;

    // 1. Create Auth User in TENANT project with cryptographically random secret
    const initialSecret = crypto.randomBytes(24).toString("hex");
    const { data: { user }, error: authError } = await tenantSupabase.auth.admin.createUser({
      email,
      password: initialSecret,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: "admin",
        school_id: schoolId,
        is_super_admin: false,
        custom_role_title: customRoleTitle || "Sub-Admin",
        permissions: permissions || [],
        must_change_password: true,
        email_onboarding_verified: false,
      },
    });

    if (authError) return { error: `Tenant Auth Error: ${authError.message}` };

    let activationLink = activateUrl;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72 hours

    if (user) {
      // 2. Upsert profile in TENANT database with invitation lifecycle
      const { error: tenantProfileError } = await (tenantSupabase as any)
        .from("profiles")
        .upsert({
          id: user.id,
          school_id: schoolId,
          full_name: fullName,
          email,
          phone,
          role: "admin",
          is_super_admin: false,
          custom_role_title: customRoleTitle || "Sub-Admin",
          permissions: permissions || [],
          is_active: true,
          invited_at: now.toISOString(),
          invitation_sent_at: now.toISOString(),
          invitation_expires_at: expiresAt.toISOString(),
        });

      if (tenantProfileError) {
        console.error("[SubAdmin Actions] Tenant Profile Error:", tenantProfileError.message);
      }

      // 3. Generate single-use cryptographically signed activation link
      try {
        const { data: linkData, error: linkError } = await tenantSupabase.auth.admin.generateLink({
          type: "magiclink",
          email,
          options: { redirectTo: activateUrl },
        });
        if (!linkError && linkData?.properties?.action_link) {
          activationLink = linkData.properties.action_link;
        }
      } catch (linkErr) {
        console.warn("[createSubAdmin] generateLink warning:", linkErr);
      }

      // 4. Record Institutional Audit Log
      await recordAuditLog(tenantSupabase, {
        schoolId,
        actorId: caller.id,
        actorName: caller.user_metadata?.full_name || "Super Admin",
        actorRole: caller.user_metadata?.role || "admin",
        action: "ADMIN_INVITE",
        module: "admins",
        targetId: user.id,
        targetName: fullName,
        details: {
          email,
          customRoleTitle,
          permissions,
          invitationExpiresAt: expiresAt.toISOString(),
        },
      });

      // 5. Look up active Resend config
      let resendApiKey: string | null = null;
      let resendFromEmail: string | null = null;
      let resendFromName = "Klaxtrix Portal";

      const { data: configData } = await tenantSupabase
        .from("institutional_configs")
        .select("config_value, is_active")
        .eq("school_id", schoolId)
        .eq("config_key", "resend_settings")
        .maybeSingle();

      if (configData && configData.is_active && configData.config_value) {
        try {
          const parsed = JSON.parse(configData.config_value);
          resendApiKey = parsed.apiKey ?? null;
          resendFromEmail = parsed.fromEmail ?? null;
          resendFromName = parsed.fromName ?? resendFromName;
        } catch (e) {
          console.error("[createSubAdmin] Failed to parse resend_settings JSON:", e);
        }
      }

      if (!resendApiKey) {
        resendApiKey = process.env.RESEND_API_KEY || null;
        resendFromEmail = process.env.RESEND_FROM_EMAIL || "noreply@klaxtrix.site";
        resendFromName = "Klaxtrix Portal";
      }

      let schoolLogoUrl = "";
      let schoolName = "the school";
      try {
        const { data: schoolData } = await tenantSupabase
          .from("schools")
          .select("logo_url, name")
          .eq("id", schoolId)
          .maybeSingle();
        if (schoolData?.logo_url) schoolLogoUrl = schoolData.logo_url;
        if (schoolData?.name) schoolName = schoolData.name;
      } catch (err) {}

      if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        const logoImgHtml = schoolLogoUrl && !schoolLogoUrl.startsWith("data:")
          ? `<div style="text-align: center; margin-bottom: 24px;"><img src="${schoolLogoUrl}" alt="${schoolName} Logo" style="max-height: 80px; max-width: 200px;" /></div>`
          : "";
        const emailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
            ${logoImgHtml}
            <h2 style="color: #4f46e5; margin-bottom: 16px; text-align: center; font-weight: 800;">Administrator Invitation — ${schoolName}</h2>
            <p style="color: #334155; font-size: 15px; line-height: 1.6;">Hello <strong>${fullName}</strong>,</p>
            <p style="color: #334155; font-size: 15px; line-height: 1.6;">You have been invited to join the administrative team at <strong>${schoolName}</strong> on Klaxtrix as <strong>${customRoleTitle || "Administrator"}</strong>.</p>
            <p style="color: #334155; font-size: 15px; line-height: 1.6;">Please click the button below to securely activate your account and configure your permanent password:</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${activationLink}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #4f46e5; color: white; padding: 14px 36px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">Activate Administrator Account</a>
            </div>
            <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
              If the button doesn't work, copy and paste this link into your browser: <br />
              <a href="${activationLink}" target="_blank" rel="noopener noreferrer" style="color: #4f46e5; word-break: break-all;">${activationLink}</a>
            </p>
            <p style="color: #ea580c; font-size: 12px; font-weight: 600; margin-top: 16px;">
              ⏱ Note: This activation invitation link will expire in 72 hours for security.
            </p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 28px 0;" />
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">This is an automated institutional invitation. Please do not reply directly to this email.</p>
          </div>
        `;

        try {
          await resend.emails.send({
            from: `${resendFromName} <${resendFromEmail}>`,
            to: email,
            subject: `Administrator Invitation: ${customRoleTitle || "Staff"} — ${schoolName}`,
            html: emailHtml,
          });
        } catch (err: any) {
          console.error("[createSubAdmin] Failed to dispatch welcome email:", err.message);
        }
      }
    }

    revalidatePath("/dashboard/admin/users/admins");
    return { success: true, activationLink };
  } catch (error: any) {
    return { error: error.message || "An unexpected error occurred during administrator provisioning" };
  }
}

export async function updateAdminPermissions(
  userId: string,
  data: { customRoleTitle: string; permissions: string[] },
  subdomain: string
) {
  if (!subdomain) return { error: "Subdomain is required." };

  try {
    const { tenantSupabase, user: caller, schoolId } = await requireActionAuth(subdomain, ["admin"], "admins");

    // 1. Verify target admin
    const { data: targetProfile, error: profileErr } = await (tenantSupabase as any)
      .from("profiles")
      .select("id, full_name, is_super_admin, custom_role_title, permissions")
      .eq("id", userId)
      .single();

    if (profileErr || !targetProfile) {
      return { error: "Target administrator profile not found." };
    }

    if (targetProfile.is_super_admin) {
      return { error: "Super Administrator permissions cannot be restricted." };
    }

    // 2. Update profiles table
    const { error: updateError } = await (tenantSupabase as any)
      .from("profiles")
      .update({
        custom_role_title: data.customRoleTitle,
        permissions: data.permissions,
        session_revoked_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateError) return { error: updateError.message };

    // 3. Update Supabase Auth user_metadata
    await tenantSupabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        custom_role_title: data.customRoleTitle,
        permissions: data.permissions,
      },
    });

    // 4. Record Audit Log
    await recordAuditLog(tenantSupabase, {
      schoolId,
      actorId: caller.id,
      actorName: caller.user_metadata?.full_name || "Super Admin",
      actorRole: caller.user_metadata?.role || "admin",
      action: "ADMIN_PERMISSION_UPDATE",
      module: "admins",
      targetId: userId,
      targetName: targetProfile.full_name,
      details: {
        previousTitle: targetProfile.custom_role_title,
        newTitle: data.customRoleTitle,
        previousPermissions: targetProfile.permissions,
        newPermissions: data.permissions,
      },
    });

    revalidatePath("/dashboard/admin/users/admins");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to update administrator permissions." };
  }
}

export async function toggleAdminStatus(userId: string, isActive: boolean, subdomain: string) {
  if (!subdomain) return { error: "Subdomain is required." };

  try {
    const { tenantSupabase, user: caller, schoolId } = await requireActionAuth(subdomain, ["admin"], "admins");

    if (userId === caller.id) {
      return { error: "You cannot change your own administrator status." };
    }

    // Check if target is super admin
    const { data: targetProfile } = await (tenantSupabase as any)
      .from("profiles")
      .select("full_name, is_super_admin")
      .eq("id", userId)
      .single();

    if (targetProfile?.is_super_admin) {
      return { error: "Super Administrators cannot be suspended." };
    }

    const { error } = await (tenantSupabase as any)
      .from("profiles")
      .update({ 
        is_active: isActive,
        session_revoked_at: !isActive ? new Date().toISOString() : null
      })
      .eq("id", userId);

    if (error) return { error: error.message };

    // Record Audit Log
    await recordAuditLog(tenantSupabase, {
      schoolId,
      actorId: caller.id,
      actorName: caller.user_metadata?.full_name || "Super Admin",
      actorRole: caller.user_metadata?.role || "admin",
      action: isActive ? "ADMIN_ACTIVATE" : "ADMIN_SUSPEND",
      module: "admins",
      targetId: userId,
      targetName: targetProfile?.full_name,
      details: { isActive },
    });

    revalidatePath("/dashboard/admin/users/admins");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to toggle administrator status." };
  }
}

export async function resendAdminCredentials(userId: string, schoolId: string, subdomain: string) {
  if (!subdomain) return { error: "Subdomain is required." };

  try {
    const { tenantSupabase, user: caller } = await requireActionAuth(subdomain, ["admin"], "admins");

    // 1. Get profile
    const { data: profile, error: profileError } = await (tenantSupabase as any)
      .from("profiles")
      .select("email, full_name, custom_role_title")
      .eq("id", userId)
      .single();

    if (profileError || !profile || !profile.email) {
      return { error: "Administrator profile not found or email is missing." };
    }

    // 2. Compute activation URL
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";
    const activateUrl = process.env.NODE_ENV === "production"
      ? `https://${subdomain}.${rootDomain}/activate`
      : `http://${subdomain}.${rootDomain}/activate`;

    // 3. Reset onboarding flags
    await tenantSupabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        must_change_password: true,
        email_onboarding_verified: false,
      },
    });

    // 4. Generate signed magic link
    const { data: linkData, error: linkError } = await tenantSupabase.auth.admin.generateLink({
      type: "magiclink",
      email: profile.email,
      options: { redirectTo: activateUrl },
    });

    if (linkError) {
      return { error: `Failed to generate activation link: ${linkError.message}` };
    }

    const setupLink = linkData?.properties?.action_link || activateUrl;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000);

    // 5. Update profile expiration & timestamps
    await (tenantSupabase as any)
      .from("profiles")
      .update({
        invitation_sent_at: now.toISOString(),
        invitation_expires_at: expiresAt.toISOString(),
      })
      .eq("id", userId);

    // 6. Record Audit Log
    await recordAuditLog(tenantSupabase, {
      schoolId,
      actorId: caller.id,
      actorName: caller.user_metadata?.full_name || "Super Admin",
      actorRole: caller.user_metadata?.role || "admin",
      action: "ADMIN_INVITATION_RESEND",
      module: "admins",
      targetId: userId,
      targetName: profile.full_name,
      details: { email: profile.email, expiresAt: expiresAt.toISOString() },
    });

    // 7. Look up Resend config
    let resendApiKey: string | null = null;
    let resendFromEmail: string | null = null;
    let resendFromName = "Klaxtrix Portal";

    const { data: configData } = await tenantSupabase
      .from("institutional_configs")
      .select("config_value, is_active")
      .eq("school_id", schoolId)
      .eq("config_key", "resend_settings")
      .maybeSingle();

    if (configData && configData.is_active && configData.config_value) {
      try {
        const parsed = JSON.parse(configData.config_value);
        resendApiKey = parsed.apiKey ?? null;
        resendFromEmail = parsed.fromEmail ?? null;
        resendFromName = parsed.fromName ?? resendFromName;
      } catch (e) {}
    }

    if (!resendApiKey) {
      resendApiKey = process.env.RESEND_API_KEY || null;
      resendFromEmail = process.env.RESEND_FROM_EMAIL || "noreply@klaxtrix.site";
      resendFromName = "Klaxtrix Portal";
    }

    let schoolLogoUrl = "";
    let schoolName = "the school";
    try {
      const { data: schoolData } = await tenantSupabase
        .from("schools")
        .select("logo_url, name")
        .eq("id", schoolId)
        .maybeSingle();
      if (schoolData?.logo_url) schoolLogoUrl = schoolData.logo_url;
      if (schoolData?.name) schoolName = schoolData.name;
    } catch (err) {}

    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      const logoImgHtml = schoolLogoUrl && !schoolLogoUrl.startsWith("data:")
        ? `<div style="text-align: center; margin-bottom: 24px;"><img src="${schoolLogoUrl}" alt="${schoolName} Logo" style="max-height: 80px; max-width: 200px;" /></div>`
        : "";
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          ${logoImgHtml}
          <h2 style="color: #4f46e5; margin-bottom: 16px; text-align: center; font-weight: 800;">Account Setup — Klaxtrix Portal</h2>
          <p style="color: #334155; font-size: 15px; line-height: 1.6;">Hello <strong>${profile.full_name}</strong>,</p>
          <p style="color: #334155; font-size: 15px; line-height: 1.6;">An administrator at <strong>${schoolName}</strong> has resent your administrator setup link (${profile.custom_role_title || "Administrator"}).</p>
          <p style="color: #334155; font-size: 15px; line-height: 1.6;">Please click the button below to securely set your password and access your portal:</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${setupLink}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #4f46e5; color: white; padding: 14px 36px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">Secure Login & Setup</a>
          </div>
          <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
            If the button doesn't work, copy and paste this link into your browser: <br />
            <a href="${setupLink}" target="_blank" rel="noopener noreferrer" style="color: #4f46e5; word-break: break-all;">${setupLink}</a>
          </p>
          <p style="color: #ea580c; font-size: 12px; font-weight: 600; margin-top: 16px;">
            ⏱ Note: This link will expire in 72 hours for your security.
          </p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 28px 0;" />
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">Please do not reply directly to this email.</p>
        </div>
      `;

      await resend.emails.send({
        from: `${resendFromName} <${resendFromEmail}>`,
        to: profile.email,
        subject: `Action Required: Administrator Setup — ${schoolName}`,
        html: emailHtml,
      });
    }

    revalidatePath("/dashboard/admin/users/admins");
    return { success: true, activationLink: setupLink };
  } catch (error: any) {
    return { error: error.message || "Failed to resend administrator credentials." };
  }
}

export async function deleteSubAdmin(userId: string, subdomain: string) {
  if (!subdomain) return { error: "Subdomain is required." };

  try {
    const { tenantSupabase, user: caller, schoolId } = await requireActionAuth(subdomain, ["admin"], "admins");

    if (userId === caller.id) {
      return { error: "You cannot delete your own account." };
    }

    const { data: targetProfile, error: profileErr } = await (tenantSupabase as any)
      .from("profiles")
      .select("full_name, is_super_admin, custom_role_title")
      .eq("id", userId)
      .single();

    if (profileErr || !targetProfile) {
      return { error: "Target administrator profile not found." };
    }

    if (targetProfile.is_super_admin) {
      return { error: "Super Administrators cannot be deleted." };
    }

    // 1. Delete profile
    const { error: delProfileErr } = await (tenantSupabase as any)
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (delProfileErr) return { error: delProfileErr.message };

    // 2. Delete Auth identity
    const { error: delAuthErr } = await tenantSupabase.auth.admin.deleteUser(userId);
    if (delAuthErr) return { error: delAuthErr.message };

    // 3. Record Audit Log
    await recordAuditLog(tenantSupabase, {
      schoolId,
      actorId: caller.id,
      actorName: caller.user_metadata?.full_name || "Super Admin",
      actorRole: caller.user_metadata?.role || "admin",
      action: "ADMIN_DELETE",
      module: "admins",
      targetId: userId,
      targetName: targetProfile.full_name,
      details: { customRoleTitle: targetProfile.custom_role_title },
    });

    revalidatePath("/dashboard/admin/users/admins");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to delete administrator." };
  }
}

export async function getAuditLogs(
  schoolId: string,
  subdomain: string,
  options: AuditLogQueryOptions = {}
) {
  if (!subdomain) return { error: "Subdomain is required." };

  try {
    const { tenantSupabase } = await requireActionAuth(subdomain, ["admin"]);

    let query = (tenantSupabase as any)
      .from("audit_logs")
      .select("*", { count: "exact" })
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });

    if (options.module && options.module !== "all") {
      query = query.eq("module", options.module);
    }
    if (options.action) {
      query = query.eq("action", options.action);
    }
    if (options.actorId) {
      query = query.eq("actor_id", options.actorId);
    }
    if (options.search) {
      query = query.or(`actor_name.ilike.%${options.search}%,target_name.ilike.%${options.search}%,action.ilike.%${options.search}%`);
    }

    const limit = options.limit || 50;
    const offset = options.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    return { success: true, data, total: count || 0 };
  } catch (error: any) {
    console.error("[AuditLogs] Error fetching audit logs:", error.message);
    return { error: error.message || "Failed to load audit logs." };
  }
}

export async function sendPendingInvitationReminders(schoolId: string, subdomain: string) {
  if (!subdomain) return { error: "Subdomain is required." };

  try {
    const { tenantSupabase, user: caller } = await requireActionAuth(subdomain, ["admin"], "admins");

    // Fetch all active pending users across all roles (admins, teachers, parents)
    const { data: pendingUsers, error: pendingErr } = await (tenantSupabase as any)
      .from("profiles")
      .select("id, email, full_name, role, custom_role_title, invitation_expires_at")
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .eq("onboarding_completed", false);

    if (pendingErr) throw pendingErr;
    if (!pendingUsers || pendingUsers.length === 0) {
      return { success: true, count: 0, message: "No pending invitations found." };
    }

    let dispatchedCount = 0;
    for (const pendingUser of pendingUsers) {
      try {
        await resendAdminCredentials(pendingUser.id, schoolId, subdomain);
        dispatchedCount++;
      } catch (e) {
        console.warn(`[sendReminders] Skipped user ${pendingUser.id}:`, e);
      }
    }

    // Record Audit Log for batch reminder
    await recordAuditLog(tenantSupabase, {
      schoolId,
      actorId: caller.id,
      actorName: caller.user_metadata?.full_name || "Super Admin",
      actorRole: caller.user_metadata?.role || "admin",
      action: "BATCH_INVITATION_REMINDERS_SENT",
      module: "admins",
      details: { dispatchedCount, totalPending: pendingUsers.length },
    });

    revalidatePath("/dashboard/admin/users/admins");
    return {
      success: true,
      count: dispatchedCount,
      message: `Successfully sent reminders to ${dispatchedCount} pending staff members.`,
    };
  } catch (error: any) {
    return { error: error.message || "Failed to send batch invitation reminders." };
  }
}
