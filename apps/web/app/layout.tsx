import type { Metadata } from "next";
import "./globals.css";
import "./responsive-media.css";
import { Space_Grotesk, Manrope } from "next/font/google";
import { AppProviders } from "@/components/app-providers";
import { SupportButton } from "@/components/support-button";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Plataforma Estímulo",
  description: "Capacitação para empreendedores da Estímulo",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${spaceGrotesk.variable} ${manrope.variable}`}>
      <body className="min-h-screen bg-background text-ink antialiased">
        <AppProviders>
          {children}
          <SupportButton />
        </AppProviders>
      </body>
    </html>
  );
}
