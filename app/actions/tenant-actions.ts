"use server";

import { getBackendUrl } from "@/lib/utils";
import { requireActionAuth } from "@/lib/supabase/action-auth";
import { recordAuditLog } from "@/lib/services/audit-service";
import { revalidatePath } from "next/cache";

const INTERNAL_SECRET = process.env.INTERNAL_AUTH_SECRET;

function internalHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (INTERNAL_SECRET) {
    headers["x-internal-secret"] = INTERNAL_SECRET;
  }
  return headers;
}

/**
 * Fetches school settings from the tenant's isolated database via the backend.
 * Uses the service role key server-side to bypass RLS.
 */
export async function getSchoolData(subdomain: string) {
  try {
    const res = await fetch(`${getBackendUrl()}/tenant/school-data?subdomain=${encodeURIComponent(subdomain)}`, {
      headers: internalHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(err.message || `Backend error: ${res.status}`);
    }

    const json = await res.json();
    return json.data;
  } catch (error: any) {
    console.error("[tenant-actions] getSchoolData error:", error.message);
    throw error;
  }
}

/**
 * Updates school settings in the tenant's isolated database via the backend.
 */
export async function updateSchoolData(
  subdomain: string,
  schoolId: string,
  updates: Record<string, any>
) {
  try {
    const res = await fetch(`${getBackendUrl()}/tenant/school-data`, {
      method: "POST",
      headers: internalHeaders(),
      body: JSON.stringify({ subdomain, schoolId, updates }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(err.message || `Backend error: ${res.status}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error("[tenant-actions] updateSchoolData error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Completes the school setup wizard via the backend.
 * Synchronizes institutional data to the tenant DB and marks setup as complete.
 */
export async function completeSchoolSetup(
  subdomain: string,
  schoolId: string,
  formData: Record<string, any>
) {
  try {
    const res = await fetch(`${getBackendUrl()}/tenant/setup-complete`, {
      method: "POST",
      headers: internalHeaders(),
      body: JSON.stringify({ subdomain, schoolId, formData }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(err.message || `Backend error: ${res.status}`);
    }

    const data = await res.json();
    return { success: data.success };
  } catch (error: any) {
    console.error("[tenant-actions] completeSchoolSetup error:", error.message);
    return { success: false, error: error.message };
  }
}

export interface SecuritySettingsPayload {
  require_password_change?: boolean;
  enhanced_password_policy?: boolean;
  session_timeout_minutes?: number;
  parent_contact_privacy?: boolean;
  student_portal_access?: boolean;
  lock_past_term_results?: boolean;
}

/**
 * Updates the school's security and access policies, records an audit log,
 * and revalidates the security settings view.
 */
export async function updateSecuritySettings(
  subdomain: string,
  schoolId: string,
  settings: SecuritySettingsPayload
) {
  if (!subdomain) return { error: "Subdomain is required." };
  if (!schoolId) return { error: "School ID is required." };

  try {
    const { tenantSupabase, user: caller } = await requireActionAuth(
      subdomain,
      ["admin"],
      "settings"
    );

    const res = await updateSchoolData(subdomain, schoolId, {
      security_settings: settings,
    });

    if (!res.success) {
      throw new Error(res.error || "Failed to update security settings in database.");
    }

    // Record institutional audit event
    await recordAuditLog(tenantSupabase, {
      schoolId,
      actorId: caller.id,
      actorName: caller.user_metadata?.full_name || "School Administrator",
      actorRole: caller.user_metadata?.role || "admin",
      action: "UPDATE_SECURITY_SETTINGS",
      module: "settings",
      targetId: schoolId,
      targetName: "Security Policies",
      details: settings,
    });

    revalidatePath("/dashboard/admin/settings/security");
    return { success: true };
  } catch (error: any) {
    console.error("[tenant-actions] updateSecuritySettings error:", error.message);
    return { error: error.message || "Failed to update security settings." };
  }
}

