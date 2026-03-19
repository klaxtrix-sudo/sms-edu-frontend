import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

export function createClient(supabaseUrl?: string, supabaseAnonKey?: string) {
  return createSupabaseBrowserClient<Database>(
    supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Export as createBrowserClient too for compatibility with existing imports
export { createClient as createBrowserClient };
