import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { InterfaceContentProvider } from "@/components/interface-content-provider";
import { NavigationFeedback } from "@/components/navigation-feedback";
import { getPublishedInterfaceContent } from "@/lib/interface-content/runtime";
import "./globals.css";
import "./brand-motion.css";

export const metadata: Metadata = {
  title: { default: "Plataforma Estímulo", template: "%s | Estímulo" },
  description: "Jornadas de desenvolvimento para pequenos empreendedores.",
  icons: {
    icon: "/brand/estimulo-symbol-color.svg",
    apple: "/brand/estimulo-symbol-color.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#00008d",
  colorScheme: "light",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const interfaceContent = await getPublishedInterfaceContent();
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <InterfaceContentProvider content={interfaceContent}>
          <Suspense fallback={null}>
            <NavigationFeedback />
          </Suspense>
          {children}
        </InterfaceContentProvider>
      </body>
    </html>
  );
}
