import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Ajuda | Plataforma Estímulo" };

const defaultSupportEmail = "contato@estimulo.org";
const defaultSupportWhatsAppUrl = "https://wa.me/5511935027090";

function supportEmail() {
  const candidate = process.env.SUPPORT_EMAIL?.trim().toLowerCase() ?? "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(candidate) ? candidate : defaultSupportEmail;
}

function supportWhatsAppUrl() {
  const candidate = process.env.SUPPORT_WHATSAPP_URL?.trim() ?? "";
  try {
    const url = new URL(candidate || defaultSupportWhatsAppUrl);
    if (url.protocol !== "https:") return defaultSupportWhatsAppUrl;
    return url.toString();
  } catch {
    return defaultSupportWhatsAppUrl;
  }
}

const topics = [
  {
    title: "Não consigo entrar",
    body: "Confira o e-mail e a senha cadastrados. Para contas de participante, use “Esqueci minha senha”. Pessoas da equipe Estímulo devem entrar pela área administrativa com Google.",
    href: "/recuperar-senha",
    link: "Recuperar senha",
  },
  {
    title: "O diagnóstico não abre",
    body: "Recarregue a página e tente novamente pela Home ou pelo Perfil. Se a plataforma informar que o diagnóstico ainda não está configurado, a equipe precisa publicar uma versão ativa.",
    href: "/empreendedor/perfil",
    link: "Abrir Perfil",
  },
  {
    title: "Enviei um certificado ou uma entrega",
    body: "Aguarde a confirmação visual antes de sair da página. Arquivos salvos continuam privados e devem aparecer novamente após recarregar.",
    href: "/empreendedor/conquistas",
    link: "Abrir certificados",
  },
] as const;

export default function HelpPage() {
  const email = supportEmail();
  const whatsAppUrl = supportWhatsAppUrl();

  return (
    <main className="mx-auto grid min-h-dvh max-w-5xl gap-8 px-5 py-10 lg:px-9 lg:py-14">
      <PageHeader eyebrow="Suporte" title="Como podemos ajudar?" description="Encontre o próximo passo para os problemas mais comuns ou fale com a equipe Estímulo." />

      <section className="grid gap-4 sm:grid-cols-2" aria-labelledby="falar-com-equipe">
        <Card className="sm:col-span-2">
          <p className="brand-kicker">Atendimento</p>
          <h2 id="falar-com-equipe" className="mt-1 text-xl font-black text-secondary">Fale com a equipe Estímulo</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">Use um dos canais institucionais abaixo. Não envie senhas, CPF completo ou arquivos sensíveis na primeira mensagem.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ButtonLink href={whatsAppUrl} target="_blank" rel="noreferrer" icon={<MessageCircle size={18} aria-hidden="true" />}>Abrir WhatsApp</ButtonLink>
            <ButtonLink href={`mailto:${email}`} variant="secondary" icon={<Mail size={18} aria-hidden="true" />}>Enviar e-mail</ButtonLink>
          </div>
          <p className="mt-4 text-xs text-muted">E-mail: {email}</p>
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-2" aria-label="Dúvidas frequentes">
        {topics.map((topic) => (
          <Card key={topic.title} className="flex flex-col">
            <h2 className="text-lg font-black text-secondary">{topic.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{topic.body}</p>
            <Link href={topic.href} className="mt-auto pt-5 text-sm font-bold text-primary hover:underline">
              {topic.link}
            </Link>
          </Card>
        ))}
      </section>

      <p className="text-xs leading-5 text-muted">Ao relatar um erro, informe a página, o horário aproximado e o que você tentou fazer. A equipe pode pedir dados adicionais apenas pelo fluxo autorizado de atendimento.</p>
    </main>
  );
}
