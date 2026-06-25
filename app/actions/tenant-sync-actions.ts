"use server";

import { getBackendUrl } from "@/lib/utils";

/**
 * Acts as a secure Server-to-Server bridge to synchronize local tenant configurations
 * back up to the Master Orchestration Registry (which powers global features like the Avatar).
 */
export async function syncSchoolSettingsToMaster(subdomain: string, payload: { name?: string; logoUrl?: string }) {
  try {
    const res = await fetch(`${getBackendUrl()}/tenant/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.INTERNAL_AUTH_SECRET || "",
      },
      body: JSON.stringify({
        subdomain,
        payload,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[Sync Engine] Master registry sync failed: ${errorText}`);
      return { success: false, error: "Failed to synchronize to master node" };
    }

    const data = await res.json();
    return { success: data.success };
  } catch (error: any) {
    console.error(`[Sync Engine] Exception during master sync:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Uploads a base64-encoded logo to the master Supabase Storage bucket
 * and returns a publicly accessible HTTPS URL.
 * This replaces the previous approach of storing raw base64 data URIs,
 * which are blocked by email clients.
 */
export async function uploadSchoolLogo(schoolId: string, base64DataUri: string): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
  try {
    const res = await fetch(`${getBackendUrl()}/tenant/upload-logo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.INTERNAL_AUTH_SECRET || "",
      },
      body: JSON.stringify({ schoolId, base64DataUri }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[Sync Engine] Logo upload failed: ${errorText}`);
      return { success: false, error: "Failed to upload logo" };
    }

    const data = await res.json();
    return { success: true, publicUrl: data.publicUrl };
  } catch (error: any) {
    console.error(`[Sync Engine] Logo upload exception:`, error);
    return { success: false, error: error.message };
  }
}
