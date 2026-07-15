import type { Metadata } from "next";
import "./globals.css";
import "./brand-auth.css";

export const metadata: Metadata = {
  title: { default: "Plataforma Estímulo", template: "%s | Estímulo" },
  description: "Jornadas de desenvolvimento para pequenos empreendedores."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
