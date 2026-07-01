import { NextResponse, type NextRequest } from "next/server";
import { GOOGLE } from "@/lib/google/config";
import { createClient } from "@/lib/supabase/server";
import { saveTokens, type GoogleTokenResponse } from "@/lib/google/tokens";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get("g_oauth_state")?.value;
  const back = new URL("/calendario", req.url);

  if (!code || !state || state !== cookieState) {
    back.searchParams.set("google", "error");
    return NextResponse.redirect(back);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  // 1) troca o code por tokens
  const tokenRes = await fetch(GOOGLE.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE.clientId,
      client_secret: GOOGLE.clientSecret,
      redirect_uri: GOOGLE.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) {
    back.searchParams.set("google", "error");
    return NextResponse.redirect(back);
  }
  const tok = (await tokenRes.json()) as GoogleTokenResponse;

  // 2) descobre o e-mail da conta conectada
  let email: string | null = null;
  try {
    const ui = await fetch(GOOGLE.userinfoUrl, {
      headers: { Authorization: `Bearer ${tok.access_token}` },
    });
    if (ui.ok) email = ((await ui.json()) as { email?: string }).email ?? null;
  } catch {
    // ignora — o e-mail é só informativo
  }

  // 3) salva (criptografado)
  try {
    await saveTokens(user.id, tok, email);
  } catch {
    back.searchParams.set("google", "error");
    return NextResponse.redirect(back);
  }

  back.searchParams.set("google", "connected");
  const res = NextResponse.redirect(back);
  res.cookies.delete("g_oauth_state");
  return res;
}
