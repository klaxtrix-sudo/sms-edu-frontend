"use server";

import { getBackendUrl } from "@/lib/utils";

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
