import { createClient } from "@/lib/supabase/server";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { GOOGLE } from "./config";

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
}

/** Salva (ou atualiza) os tokens do usuário, criptografados. */
export async function saveTokens(userId: string, tok: GoogleTokenResponse, email: string | null) {
  const supabase = await createClient();
  const expiry = new Date(Date.now() + (tok.expires_in - 60) * 1000).toISOString();
  const row: Record<string, string | null> = {
    user_id: userId,
    google_email: email,
    access_token: encryptSecret(tok.access_token),
    expiry,
    scope: tok.scope ?? null,
  };
  // Só grava refresh_token quando o Google devolve um (evita apagar o existente).
  if (tok.refresh_token) row.refresh_token = encryptSecret(tok.refresh_token);

  const { error } = await supabase.from("google_accounts").upsert(row, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}

/** Access token válido (renova se expirado), ou null se não conectado. */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("google_accounts")
    .select("access_token, refresh_token, expiry")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;

  const expiry = data.expiry ? new Date(data.expiry as string).getTime() : 0;
  if (Date.now() < expiry) return decryptSecret(data.access_token as string);

  // expirado → renova com o refresh_token
  const refresh = data.refresh_token ? decryptSecret(data.refresh_token as string) : "";
  if (!refresh) return null;

  const res = await fetch(GOOGLE.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE.clientId,
      client_secret: GOOGLE.clientSecret,
      refresh_token: refresh,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;

  const tok = (await res.json()) as GoogleTokenResponse;
  const newExpiry = new Date(Date.now() + (tok.expires_in - 60) * 1000).toISOString();
  await supabase
    .from("google_accounts")
    .update({ access_token: encryptSecret(tok.access_token), expiry: newExpiry })
    .eq("user_id", userId);
  return tok.access_token;
}
