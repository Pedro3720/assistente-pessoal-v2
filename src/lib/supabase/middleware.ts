import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

const AUTH_PAGES = ["/login", "/cadastro", "/recuperar-senha"];
// /api/cron: chamado pelo pg_cron (sem cookie de sessão); protege-se com CRON_SECRET,
// então NÃO pode cair no redirect de /login do middleware.
const PUBLIC_PREFIXES = [...AUTH_PAGES, "/api/auth", "/api/cron"];

/**
 * Renova a sessão a cada request e protege as rotas.
 * Sem sessão numa rota não-pública → /login (públicas: páginas de auth + /api/auth + /api/cron).
 * Com sessão numa página de auth (/login, /cadastro, /recuperar-senha) → vai para o painel.
 * /redefinir-senha é protegido (exige sessão — a de recuperação serve).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: não coloque lógica entre createServerClient e getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PREFIXES.some((r) => path.startsWith(r));
  const isAuthPage = AUTH_PAGES.some((r) => path.startsWith(r));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
