import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/redefinir-senha";
  const fail = new URL(`/login?error=${encodeURIComponent("Link inválido ou expirado")}`, req.url);

  if (!code) return NextResponse.redirect(fail);

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(fail);

  return NextResponse.redirect(new URL(next, req.url));
}
