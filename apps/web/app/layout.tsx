import type { Metadata, Viewport } from "next";
import "./globals.css";

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
      <body className="antialiased">{children}</body>
    </html>
  );
}
