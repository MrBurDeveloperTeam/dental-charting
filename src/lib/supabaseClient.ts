import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const publishableKey = (
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY
  )?.trim();

  console.log("Supabase URL:", url);
  console.log("Supabase Publishable Key:", publishableKey);
  console.log(import.meta.env)

  if (!url || !publishableKey) {
    throw new Error(
      "Dental cloud access is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY."
    );
  }

  client = createClient(url, publishableKey, {
    auth: {
      persistSession: true,
      // The SSO exchange currently returns a short-lived app JWT rather than
      // a GoTrue refresh token. Re-run the exchange before expiry instead of
      // asking Supabase Auth to refresh it.
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return client;
}
