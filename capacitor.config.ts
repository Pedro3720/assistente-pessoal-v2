import type { CapacitorConfig } from "@capacitor/cli";

// App Android nativo (Capacitor): um WebView nativo que carrega o site já hospedado na
// Vercel. Sem Play Store, o APK é gerado no GitHub Actions e instalado direto (sideload).
// Como o app é renderizado no servidor (Server Components/Actions), carregamos a URL remota
// em vez de empacotar os arquivos (precisa de internet, igual ao PWA).
const config: CapacitorConfig = {
  appId: "com.zenite.assistente",
  appName: "Zênite",
  webDir: "capacitor/www",
  server: {
    // Domínio de produção. Se o domínio da Vercel mudar, troque aqui.
    url: "https://assistente-pessoal-v2.vercel.app",
    cleartext: false,
  },
  android: {
    backgroundColor: "#080b12",
  },
};

export default config;
