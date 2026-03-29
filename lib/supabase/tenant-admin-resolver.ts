import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

/**
 * --- NODE.JS ONLY MODULE ---
 * This module uses "node:crypto" and secret environment variables.
 * Do NOT import this in Middleware (Edge Runtime) or Client Components.
 */

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const keyHex = process.env.MASTER_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error("MASTER_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
  }
  return Buffer.from(keyHex, "hex");
}

function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(":");

  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error("Invalid ciphertext format");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Resolves full administrative credentials (SRK) for a tenant.
 * ONLY for use in secure server-side Node.js contexts.
 */
export async function resolveTenantAdminKeys(subdomain: string): Promise<{ supabaseUrl: string; supabaseServiceRoleKey: string; id: string } | null> {
  const masterUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const masterSrk = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!masterUrl || !masterSrk) {
    throw new Error("Missing Master Supabase credentials");
  }

  const masterSupabase = createClient(masterUrl, masterSrk);

  try {
    const { data: school, error } = await masterSupabase
      .from("schools")
      .select("id, enc_supabase_url, enc_supabase_srk")
      .eq("subdomain", subdomain)
      .single();

    if (error || !school) return null;

    return {
      id: school.id,
      supabaseUrl: decrypt(school.enc_supabase_url),
      supabaseServiceRoleKey: decrypt(school.enc_supabase_srk),
    };
  } catch (error) {
    console.error(`[Tenant Admin Resolver] Critical Error resolving admin keys for "${subdomain}":`, error);
    return null;
  }
}
