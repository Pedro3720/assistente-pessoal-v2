import type { NextConfig } from "next";

// Em produção o NODE_ENV é "production" (next build/start); em dev é "development".
// Usamos isso para afrouxar a CSP só no dev (HMR do Next usa eval e websocket).
const isDev = process.env.NODE_ENV !== "production";

// Origem do Supabase (banco, auth, storage e realtime via websocket). Deriva da env
// pública para não desalinhar da configuração real; cai no valor conhecido se faltar.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://qlqewlrzjlbwrybwrimt.supabase.co";
const supabaseOrigin = new URL(supabaseUrl).origin; // https://xxxx.supabase.co
const supabaseWs = supabaseOrigin.replace(/^https:/, "wss:"); // realtime

// Content Security Policy. Bloqueia o que a app legítima nunca precisa:
//  - default/object/base/frame-ancestors travados: sem clickjacking, sem <base> injetado,
//    sem plugins, sem carregar recursos de origens não listadas.
//  - connect-src só self + Supabase (as chamadas ao Google são server-side, nunca do browser).
//  - img-src inclui data:/blob: por causa das prévias de upload e o host do Supabase Storage.
// Observação: script-src usa 'unsafe-inline' porque o Next e o next-themes injetam scripts
// inline e a CSP aqui é estática (headers() não gera nonce por request). Isso ainda barra
// scripts de origens externas; o próximo degrau de robustez seria CSP com nonce no middleware.
// Pluggy (Open Finance): o widget roda num iframe servido por connect.pluggy.ai
// e conversa com api.pluggy.ai. Sem estes dois liberados, o widget abre e fica
// girando para sempre, porque o navegador barra o iframe e as chamadas.
// São os ÚNICOS domínios externos liberados, e apenas para frame e connect:
// nenhum script de terceiro passa a ser executado por causa disto.
const pluggyFrame = "https://connect.pluggy.ai";
const pluggyApi = "https://api.pluggy.ai";

const csp = [
  `default-src 'self'`,
  `base-uri 'self'`,
  `object-src 'none'`,
  `frame-ancestors 'none'`,
  `form-action 'self'`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: ${supabaseOrigin}`,
  `font-src 'self' data:`,
  `connect-src 'self' ${supabaseOrigin} ${supabaseWs} ${pluggyApi}${isDev ? " ws: wss:" : ""}`,
  `frame-src 'self' ${pluggyFrame}`,
  `worker-src 'self' blob:`,
  `manifest-src 'self'`,
  `media-src 'self'`,
  // Sobe requisições http para https em produção (rede de segurança); no dev quebraria o localhost.
  ...(isDev ? [] : [`upgrade-insecure-requests`]),
]
  .join("; ")
  .concat(";");

// Cabeçalhos de segurança aplicados a todas as respostas.
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Força HTTPS por 2 anos (a Vercel já redireciona http->https; isto memoriza no browser).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Permissions-Policy",
    // Desliga recursos que a app não usa; mantém WebAuthn (Face ID do cofre) para a própria origem.
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), interest-cohort=(), publickey-credentials-get=(self)",
  },
];

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "qlqewlrzjlbwrybwrimt.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
