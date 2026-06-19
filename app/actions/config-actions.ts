"use server";

import { createTenantServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import axios from "axios";

export type ResendConfig = {
  apiKey: string;
  fromEmail: string;
  fromName: string;
};

export type TermiiConfig = {
  apiKey: string;
  senderId: string;
};

export type PaystackConfig = {
  secretKey: string;
};

// Tenant credentials are ALWAYS required for these actions.
// institutional_configs only exists in tenant DBs, never the master.
export type TenantCredentials = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

// ──────────────────────────────────────────────────────────────────────────────
// Verification Helpers
// ──────────────────────────────────────────────────────────────────────────────

async function verifyResendKey(apiKey: string): Promise<void> {
  const resend = new Resend(apiKey);
  const { error } = await resend.domains.list();
  if (error) {
    throw new Error(`Resend verification failed: ${error.message}`);
  }
}

async function verifyTermiiKey(apiKey: string): Promise<void> {
  try {
    const res = await axios.get(`https://api.ng.termii.com/api/get-balance?api_key=${apiKey}`);
    if (res.data?.status === 'error' || res.data?.error) {
      throw new Error(res.data?.message || "Invalid Termii API Key");
    }
  } catch (err: any) {
    const msg = err.response?.data?.message || err.message || "Could not reach Termii API";
    throw new Error(`Termii verification failed: ${msg}`);
  }
}

async function verifyPaystackKey(secretKey: string): Promise<void> {
  try {
    await axios.get(`https://api.paystack.co/integration/payment_session_timeout`, {
      headers: {
        Authorization: `Bearer ${secretKey}`
      }
    });
  } catch (err: any) {
    const msg = err.response?.data?.message || err.message || "Could not reach Paystack API";
    throw new Error(`Paystack verification failed: ${msg}`);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Resend (Email)
// ──────────────────────────────────────────────────────────────────────────────

export async function saveResendConfig(
  schoolId: string,
  config: ResendConfig,
  tenantCreds: TenantCredentials
) {
  const supabase = createTenantServerClient(tenantCreds.supabaseUrl, tenantCreds.supabaseAnonKey);

  try {
    let unmaskedKey = config.apiKey;

    // If key is masked, retrieve the unmasked key from the database
    if (config.apiKey.includes('*')) {
      const { data } = await supabase
        .from('institutional_configs')
        .select('config_value')
        .eq('school_id', schoolId)
        .eq('config_key', 'resend_settings')
        .maybeSingle();

      if (data?.config_value) {
        const parsed = JSON.parse(data.config_value) as ResendConfig;
        unmaskedKey = parsed.apiKey;
      } else {
        throw new Error("API Key is required to save configuration");
      }
    }

    // Verify key before saving
    await verifyResendKey(unmaskedKey);

    const configToSave: ResendConfig = {
      ...config,
      apiKey: unmaskedKey
    };

    const { error } = await supabase
      .from('institutional_configs')
      .upsert([
        {
          school_id: schoolId,
          config_key: 'resend_settings',
          config_value: JSON.stringify(configToSave),
          is_active: true,
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
      .select('config_value, is_active')
      .eq('school_id', schoolId)
      .eq('config_key', 'resend_settings')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return { config: null, isActive: false };

    const config = JSON.parse(data.config_value) as ResendConfig;
    const maskedKey = config.apiKey
      ? config.apiKey.replace(/^(.{4})(.*)(.{4})$/, "$1" + "*".repeat(12) + "$3")
      : '';

    return {
      config: {
        ...config,
        apiKey: maskedKey
      },
      isActive: data.is_active ?? false
    };
  } catch (error: any) {
    console.error("Error fetching Resend config:", error);
    return { error: error.message || "Failed to fetch configuration" };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Termii (SMS)
// ──────────────────────────────────────────────────────────────────────────────

export async function saveTermiiConfig(
  schoolId: string,
  config: TermiiConfig,
  tenantCreds: TenantCredentials
) {
  const supabase = createTenantServerClient(tenantCreds.supabaseUrl, tenantCreds.supabaseAnonKey);

  try {
    let unmaskedKey = config.apiKey;

    if (config.apiKey.includes('*')) {
      const { data } = await supabase
        .from('institutional_configs')
        .select('config_value')
        .eq('school_id', schoolId)
        .eq('config_key', 'termii_settings')
        .maybeSingle();

      if (data?.config_value) {
        const parsed = JSON.parse(data.config_value) as TermiiConfig;
        unmaskedKey = parsed.apiKey;
      } else {
        throw new Error("API Key is required to save configuration");
      }
    }

    await verifyTermiiKey(unmaskedKey);

    const configToSave: TermiiConfig = {
      ...config,
      apiKey: unmaskedKey
    };

    const { error } = await supabase
      .from('institutional_configs')
      .upsert([
        {
          school_id: schoolId,
          config_key: 'termii_settings',
          config_value: JSON.stringify(configToSave),
          is_active: true,
          updated_at: new Date().toISOString()
        }
      ], { onConflict: 'school_id,config_key' });

    if (error) throw error;

    revalidatePath("/dashboard/admin/settings/integrations");
    return { success: true };
  } catch (error: any) {
    console.error("Error saving Termii config:", error);
    return { error: error.message || "Failed to save configuration" };
  }
}

export async function getTermiiConfig(
  schoolId: string,
  tenantCreds: TenantCredentials
) {
  const supabase = createTenantServerClient(tenantCreds.supabaseUrl, tenantCreds.supabaseAnonKey);

  try {
    const { data, error } = await supabase
      .from('institutional_configs')
      .select('config_value, is_active')
      .eq('school_id', schoolId)
      .eq('config_key', 'termii_settings')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return { config: null, isActive: false };

    const config = JSON.parse(data.config_value) as TermiiConfig;
    const maskedKey = config.apiKey
      ? config.apiKey.replace(/^(.{4})(.*)(.{4})$/, "$1" + "*".repeat(12) + "$3")
      : '';

    return {
      config: {
        ...config,
        apiKey: maskedKey
      },
      isActive: data.is_active ?? false
    };
  } catch (error: any) {
    console.error("Error fetching Termii config:", error);
    return { error: error.message || "Failed to fetch configuration" };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Paystack (Payments)
// ──────────────────────────────────────────────────────────────────────────────

export async function savePaystackConfig(
  schoolId: string,
  config: PaystackConfig,
  tenantCreds: TenantCredentials
) {
  const supabase = createTenantServerClient(tenantCreds.supabaseUrl, tenantCreds.supabaseAnonKey);

  try {
    let unmaskedKey = config.secretKey;

    if (config.secretKey.includes('*')) {
      const { data } = await supabase
        .from('institutional_configs')
        .select('config_value')
        .eq('school_id', schoolId)
        .eq('config_key', 'paystack_settings')
        .maybeSingle();

      if (data?.config_value) {
        const parsed = JSON.parse(data.config_value) as PaystackConfig;
        unmaskedKey = parsed.secretKey;
      } else {
        throw new Error("Secret Key is required to save configuration");
      }
    }

    await verifyPaystackKey(unmaskedKey);

    const configToSave: PaystackConfig = {
      secretKey: unmaskedKey
    };

    const { error } = await supabase
      .from('institutional_configs')
      .upsert([
        {
          school_id: schoolId,
          config_key: 'paystack_settings',
          config_value: JSON.stringify(configToSave),
          is_active: true,
          updated_at: new Date().toISOString()
        }
      ], { onConflict: 'school_id,config_key' });

    if (error) throw error;

    revalidatePath("/dashboard/admin/settings/integrations");
    return { success: true };
  } catch (error: any) {
    console.error("Error saving Paystack config:", error);
    return { error: error.message || "Failed to save configuration" };
  }
}

export async function getPaystackConfig(
  schoolId: string,
  tenantCreds: TenantCredentials
) {
  const supabase = createTenantServerClient(tenantCreds.supabaseUrl, tenantCreds.supabaseAnonKey);

  try {
    const { data, error } = await supabase
      .from('institutional_configs')
      .select('config_value, is_active')
      .eq('school_id', schoolId)
      .eq('config_key', 'paystack_settings')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return { config: null, isActive: false };

    const config = JSON.parse(data.config_value) as PaystackConfig;
    const maskedKey = config.secretKey
      ? config.secretKey.replace(/^(.{4})(.*)(.{4})$/, "$1" + "*".repeat(12) + "$3")
      : '';

    return {
      config: {
        secretKey: maskedKey
      },
      isActive: data.is_active ?? false
    };
  } catch (error: any) {
    console.error("Error fetching Paystack config:", error);
    return { error: error.message || "Failed to fetch configuration" };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Activation / Deactivation toggle
// ──────────────────────────────────────────────────────────────────────────────

export async function toggleIntegrationActive(
  schoolId: string,
  configKey: string,
  isActive: boolean,
  tenantCreds: TenantCredentials
) {
  const supabase = createTenantServerClient(tenantCreds.supabaseUrl, tenantCreds.supabaseAnonKey);
  try {
    const { error } = await supabase
      .from('institutional_configs')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('school_id', schoolId)
      .eq('config_key', configKey);

    if (error) throw error;
    revalidatePath("/dashboard/admin/settings/integrations");
    return { success: true };
  } catch (error: any) {
    console.error(`Error toggling active status for ${configKey}:`, error);
    return { error: error.message || "Failed to update integration state" };
  }
}
