import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { GOOGLE, googleConfigured } from "@/lib/google/config";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  if (!googleConfigured()) {
    const back = new URL("/calendario?google=notconfigured", req.url);
    return NextResponse.redirect(back);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const state = randomBytes(16).toString("hex");
  const params = new URLSearchParams({
    client_id: GOOGLE.clientId,
    redirect_uri: GOOGLE.redirectUri,
    response_type: "code",
    scope: GOOGLE.scopes.join(" "),
    access_type: "offline",
    // select_account = mostra o seletor de contas; consent = garante o refresh_token
    prompt: "select_account consent",
    state,
  });

  const res = NextResponse.redirect(`${GOOGLE.authUrl}?${params.toString()}`);
  res.cookies.set("g_oauth_state", state, {
    httpOnly: true,
    secure: GOOGLE.redirectUri.startsWith("https"),
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
