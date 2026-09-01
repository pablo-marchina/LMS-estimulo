import Link from "next/link";
import { Mail, MessageCircle, UsersRound } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getPublicPlatformSettings } from "@/lib/platform-settings/runtime";

export const metadata = { title: "Ajuda | Plataforma Estímulo" };
export const dynamic = "force-dynamic";

const defaultSupportEmail = "contato@estimulo.org";
const defaultSupportWhatsAppUrl = "https://wa.me/5511935027090";

function emailValue(raw: string | null) {
  const candidate = raw?.trim().toLowerCase() ?? "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(candidate) ? candidate : defaultSupportEmail;
}
function whatsappValue(raw: string | null) {
  const candidate = raw?.trim() ?? "";
  if (!candidate) return defaultSupportWhatsAppUrl;
  if (/^\+?[0-9 ()-]{10,24}$/u.test(candidate)) return `https://wa.me/${candidate.replace(/\D/gu, "")}`;
  try { const url = new URL(candidate); return url.protocol === "https:" ? url.toString() : defaultSupportWhatsAppUrl; } catch { return defaultSupportWhatsAppUrl; }
}
function safeHttps(raw: string | null) { if (!raw) return null; try { const url = new URL(raw); return url.protocol === "https:" ? url.toString() : null; } catch { return null; } }

const topics = [
  { title: "Não consigo entrar", body: "Confira o e-mail e a senha cadastrados. Para contas de participante, use “Esqueci minha senha”. Pessoas da equipe Estímulo devem entrar pela área administrativa com Google.", href: "/recuperar-senha", link: "Recuperar senha" },
  { title: "O diagnóstico não abre", body: "Recarregue a página e tente novamente pela Home ou pelo Perfil. Se a plataforma informar que o diagnóstico ainda não está configurado, a equipe precisa publicar uma versão ativa.", href: "/empreendedor/perfil", link: "Abrir Perfil" },
  { title: "Enviei um certificado ou uma entrega", body: "Aguarde a confirmação visual antes de sair da página. Arquivos salvos continuam privados e devem aparecer novamente após recarregar.", href: "/empreendedor/conquistas", link: "Abrir certificados" },
] as const;

export default async function HelpPage() {
  const settings = await getPublicPlatformSettings();
  const email = emailValue(settings.support_email);
  const whatsAppUrl = whatsappValue(settings.support_whatsapp);
  const communityUrl = safeHttps(settings.community_whatsapp_url);

  return <div className="mx-auto grid min-h-dvh max-w-5xl gap-8 px-5 py-10 lg:px-9 lg:py-14">
    <PageHeader eyebrow="Suporte" title="Como podemos ajudar?" description="Encontre o próximo passo para os problemas mais comuns, entre na comunidade ou fale com a equipe Estímulo." />

    <section className="grid gap-4" aria-labelledby="falar-com-equipe">
      <Card>
        <p className="brand-kicker">Atendimento</p>
        <h2 id="falar-com-equipe" className="mt-1 text-xl font-black text-secondary">Fale com a equipe Estímulo</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">Use um dos canais institucionais abaixo. Não envie senhas, CPF completo ou arquivos sensíveis na primeira mensagem.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink href={whatsAppUrl} target="_blank" rel="noreferrer" icon={<MessageCircle size={18} aria-hidden="true" />}>Abrir WhatsApp</ButtonLink>
          <ButtonLink href={`mailto:${email}`} variant="secondary" icon={<Mail size={18} aria-hidden="true" />}>Enviar e-mail</ButtonLink>
          {communityUrl ? <ButtonLink href={communityUrl} target="_blank" rel="noreferrer" variant="secondary" icon={<UsersRound size={18} aria-hidden="true" />}>Entrar na comunidade</ButtonLink> : null}
        </div>
        <div className="mt-4 grid gap-1 text-xs text-muted"><p>E-mail: {email}</p>{settings.support_phone ? <p>Telefone: {settings.support_phone}</p> : null}{settings.support_hours ? <p>Atendimento: {settings.support_hours}</p> : null}</div>
      </Card>
    </section>

    <section className="grid gap-4 sm:grid-cols-2" aria-label="Dúvidas frequentes">{topics.map((topic) => <Card key={topic.title} className="flex flex-col"><h2 className="text-lg font-black text-secondary">{topic.title}</h2><p className="mt-2 text-sm leading-6 text-muted">{topic.body}</p><Link href={topic.href} className="mt-auto pt-5 text-sm font-bold text-primary hover:underline">{topic.link}</Link></Card>)}</section>

    <p className="text-xs leading-5 text-muted">Ao relatar um erro, informe a página, o horário aproximado e o que você tentou fazer. A equipe pode pedir dados adicionais apenas pelo fluxo autorizado de atendimento.</p>
  </div>;
}
