import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client, used for AUTH ONLY. All data access goes through the
 * ASP.NET Core API (Axios client) with this session's JWT attached; the
 * frontend never reads tables through Supabase directly.
 */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.local.example " +
      "to .env.local and fill in the anon key from the Supabase dashboard.",
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
