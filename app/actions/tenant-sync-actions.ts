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
