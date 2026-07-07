import type { Metadata } from "next";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ThemedToaster } from "@/components/providers/themed-toaster";
import { AnimatedBackground } from "@/components/effects/animated-background";

// Corpo/UI — Inter (legível, precisão)
const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

// Títulos — Space Grotesk (geométrica, técnica, com personalidade)
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

// Números/valores — IBM Plex Mono (tabular, mais suave que JetBrains)
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Zênite Assistente Pessoal",
  description: "Agenda, finanças, tarefas e mais — em um só lugar.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${plexMono.variable}`}>
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
        </ThemeProvider>
      </body>
    </html>
  );
}
