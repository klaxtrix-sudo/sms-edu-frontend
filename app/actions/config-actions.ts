"use server";

import { createTenantServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ResendConfig = {
  apiKey: string;
  fromEmail: string;
  fromName: string;
};

// Tenant credentials are ALWAYS required for these actions.
// institutional_configs only exists in tenant DBs, never the master.
export type TenantCredentials = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export async function saveResendConfig(
  schoolId: string,
  config: ResendConfig,
  tenantCreds: TenantCredentials
) {
  // CRITICAL: Must use the tenant DB client — user authenticates against the tenant.
  // Using the master client causes RLS to reject the insert since the session token
  // belongs to the tenant project, not the master project.
  const supabase = createTenantServerClient(tenantCreds.supabaseUrl, tenantCreds.supabaseAnonKey);

  try {
    const { error } = await supabase
      .from('institutional_configs')
      .upsert([
        {
          school_id: schoolId,
          config_key: 'resend_settings',
          config_value: JSON.stringify(config),
          updated_at: new Date().toISOString()
        }
      ], { onConflict: 'school_id,config_key' });

    if (error) throw error;

    revalidatePath("/dashboard/admin/settings/integrations");
    return { success: true };
  } catch (error: any) {
    console.error("Error saving Resend config:", error);
    return { error: error.message || "Failed to save configuration" };
  }
}

export async function getResendConfig(
  schoolId: string,
  tenantCreds: TenantCredentials
) {
  const supabase = createTenantServerClient(tenantCreds.supabaseUrl, tenantCreds.supabaseAnonKey);

  try {
    const { data, error } = await supabase
      .from('institutional_configs')
      .select('config_value')
      .eq('school_id', schoolId)
      .eq('config_key', 'resend_settings')
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is 'no rows found'

    if (!data) return { config: null };

    const config = JSON.parse(data.config_value) as ResendConfig;

    // Mask the API key for security before sending to client
    const maskedKey = config.apiKey
      ? config.apiKey.replace(/^(.{4})(.*)(.{4})$/, "$1" + "*".repeat(12) + "$3")
      : '';

    return {
      config: {
        ...config,
        apiKey: maskedKey
      }
    };
  } catch (error: any) {
    console.error("Error fetching Resend config:", error);
    return { error: error.message || "Failed to fetch configuration" };
  }
}
