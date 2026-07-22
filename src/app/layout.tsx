import type { Metadata } from "next";
import { Space_Grotesk, Inter, Plus_Jakarta_Sans } from "next/font/google";
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

// Números/valores — Plus Jakarta Sans (sans proporcional, bold; visual fintech)
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-num",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Zênite Assistente Pessoal",
  description: "Agenda, finanças, tarefas e mais, tudo em um só lugar.",
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
        </ThemeProvider>
      </body>
    </html>
  );
}
