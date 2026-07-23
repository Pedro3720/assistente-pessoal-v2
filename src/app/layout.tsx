import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ThemedToaster } from "@/components/providers/themed-toaster";
import { AnimatedBackground } from "@/components/effects/animated-background";
import { RegisterSW } from "@/components/pwa/register-sw";

// Corpo/UI — Inter (legível, precisão)
const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

// Títulos — Space Grotesk (geométrica, técnica, com personalidade)
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

// Números/valores — Plus Jakarta Sans (sans proporcional, bold; visual fintech)
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-num",
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
  themeColor: "#080b12",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${plusJakarta.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AnimatedBackground />
          <div className="relative z-10">{children}</div>
          <div className="grain-overlay" aria-hidden />
          <ThemedToaster />
          <RegisterSW />
        </ThemeProvider>
      </body>
    </html>
  );
}
