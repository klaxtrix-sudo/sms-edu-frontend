import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

/**
 * WARNING: This client uses the SERVICE_ROLE_KEY and bypasses RLS.
 * It MUST only be used in Server Components, Server Actions, or API Routes.
 * Never import this in a client-side file.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase admin environment variables");
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
