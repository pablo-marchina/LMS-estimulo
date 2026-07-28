import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { NavigationFeedback } from "@/components/navigation-feedback";
import "./globals.css";
import "./brand-motion.css";

export const metadata: Metadata = {
  title: { default: "Plataforma Estímulo", template: "%s | Estímulo" },
  description: "Jornadas de desenvolvimento para pequenos empreendedores.",
  icons: {
    icon: "/brand/estimulo-symbol-color.svg",
    apple: "/brand/estimulo-symbol-color.svg"
  }
};

export const viewport: Viewport = {
  themeColor: "#00008d",
  colorScheme: "light"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <Suspense fallback={null}>
          <NavigationFeedback />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
