import type { Metadata } from "next";
import { DM_Serif_Display, Archivo_Black } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ThemedToaster } from "@/components/providers/themed-toaster";
import { AnimatedBackground } from "@/components/effects/animated-background";

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-sans",
});

const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Assistente Pessoal",
  description: "Agenda, finanças, tarefas e mais — em um só lugar.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${dmSerif.variable} ${archivoBlack.variable}`}>
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
