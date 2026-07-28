import "server-only";
import { headers } from "next/headers";
import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiting reutilizável (sliding window) via Upstash Redis.
 *
 * FAIL-OPEN: se o Upstash não estiver configurado (env ausente) ou o Redis
 * falhar, libera a ação. Assim o app continua funcionando antes de o dono criar
 * a conta Upstash, e uma queda do Redis não derruba o uso legítimo.
 *
 * Env do dono (Vercel + .env.local):
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

if (!redis && process.env.NODE_ENV === "production") {
  console.warn(
    "[ratelimit] Upstash nao configurado (UPSTASH_REDIS_REST_URL/TOKEN). Rate limiting desativado (fail-open)."
  );
}

export type LimitName =
  | "auth" // login/cadastro (por IP)
  | "passwordReset" // e-mail de recuperacao (por IP)
  | "passwordChange" // troca de senha (por IP)
  | "financeWrite" // escritas de financas (por usuario)
  | "upload" // envio de imagem (por usuario)
  | "pluggyConnect" // emissao de connect token (por usuario)
  | "pluggySync"; // sync manual de um item (por usuario)

const CONFIG: Record<LimitName, { tokens: number; window: Duration }> = {
  auth: { tokens: 10, window: "60 s" },
  passwordReset: { tokens: 5, window: "1 h" },
  passwordChange: { tokens: 10, window: "1 h" },
  financeWrite: { tokens: 60, window: "60 s" },
  upload: { tokens: 20, window: "300 s" },
  // conectar banco é ação rara: teto baixo limita abuso da emissão de token
  pluggyConnect: { tokens: 10, window: "300 s" },
  pluggySync: { tokens: 12, window: "300 s" },
};

const cache = new Map<LimitName, Ratelimit>();

function limiter(name: LimitName): Ratelimit | null {
  if (!redis) return null;
  let l = cache.get(name);
  if (!l) {
    const c = CONFIG[name];
    l = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(c.tokens, c.window),
      prefix: `zenite:${name}`,
      analytics: false,
    });
    cache.set(name, l);
  }
  return l;
}

/**
 * true = pode seguir. Fail-open quando o Upstash nao esta configurado ou o
 * Redis falha (nunca bloqueia por causa de infra).
 */
export async function rateLimitOk(name: LimitName, identifier: string): Promise<boolean> {
  const l = limiter(name);
  if (!l) return true;
  try {
    const { success } = await l.limit(identifier);
    return success;
  } catch {
    return true;
  }
}

/** Igual ao rateLimitOk, mas lanca uma mensagem amigavel quando estoura. */
export async function enforceRate(
  name: LimitName,
  identifier: string,
  message = "Muitas tentativas em pouco tempo. Aguarde um instante e tente de novo."
): Promise<void> {
  if (!(await rateLimitOk(name, identifier))) throw new Error(message);
}

/** IP do cliente pelos headers (a Vercel seta x-forwarded-for). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}
