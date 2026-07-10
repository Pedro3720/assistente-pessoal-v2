import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next");
  let next = "/redefinir-senha";
  if (nextParam) {
    try {
      const dest = new URL(nextParam, url.origin);
      if (dest.origin === url.origin) next = dest.pathname + dest.search;
    } catch {
      // nextParam malformado → mantém o default
    }
  }
  const fail = new URL(`/login?error=${encodeURIComponent("Link inválido ou expirado")}`, req.url);

  if (!code) return NextResponse.redirect(fail);

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(fail);

  return NextResponse.redirect(new URL(next, req.url));
}
