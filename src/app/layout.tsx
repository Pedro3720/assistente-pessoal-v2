import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import { ViewTransitions } from "next-view-transitions";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ThemedToaster } from "@/components/providers/themed-toaster";
import { RegisterSW } from "@/components/pwa/register-sw";
import { AppleSplash } from "@/components/pwa/apple-splash";
import { LockZoom } from "@/components/pwa/lock-zoom";

// Corpo/UI — Inter (legível, precisão)
const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

// Títulos — Space Grotesk (geométrica, técnica, com personalidade)
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "Zênite",
  title: "Zênite Assistente Pessoal",
  description: "Agenda, finanças, tarefas e mais, tudo em um só lugar.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Zênite",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  // O Next emite o padrão "mobile-web-app-capable"; o iOS ainda depende do
  // legado "apple-mobile-web-app-capable" para abrir em standalone (tela cheia).
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#05070c",
  viewportFit: "cover",
  // Trava a escala em 1 para o PWA instalado sempre abrir na proporção correta,
  // sem ficar preso em zoom (o iOS memoriza o pinch entre aberturas). Cara de app nativo.
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ViewTransitions>
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} ${spaceGrotesk.variable}`}>
        <AppleSplash />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <div className="relative z-10">{children}</div>
          <ThemedToaster />
          <RegisterSW />
          <LockZoom />
        </ThemeProvider>
      </body>
    </html>
    </ViewTransitions>
  );
}
