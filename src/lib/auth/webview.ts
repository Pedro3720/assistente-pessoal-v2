/**
 * Detecta o WebView do app Android (Capacitor) pela string de user-agent.
 *
 * Por que existe: o Google recusa o fluxo OAuth dentro de WebView
 * ("disallowed_useragent"), então o botão de entrar com Google não deve
 * aparecer no APK. A decisão é tomada no servidor (a página /login é dinâmica),
 * o que evita flash e descasamento de hidratação.
 *
 * Dois sinais, de propósito:
 *  1. "ZeniteApp", token próprio adicionado em capacitor.config.ts
 *     (appendUserAgent). Determinístico, mas só vale a partir do próximo APK.
 *  2. "; wv)", marca do WebView do Android, que cobre o APK já instalado.
 *
 * Na dúvida (sem user-agent), devolve false: melhor mostrar o botão na web do
 * que escondê-lo de quem consegue usá-lo.
 */
export function isWebViewUA(ua: string | null | undefined): boolean {
  if (!ua) return false;
  if (ua.includes("ZeniteApp")) return true;
  return /;\s*wv\)/i.test(ua);
}
