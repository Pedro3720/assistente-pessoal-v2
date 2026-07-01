import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para uso no navegador (Client Components).
 * Só usa a PUBLISHABLE key — nunca a secret.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
