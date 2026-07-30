import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Ajuda | Plataforma Estímulo" };

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
  {
    title: "Preciso falar com a equipe",
    body: "Use o canal institucional de suporte informado pela Estímulo. Esta página pode ser conectada ao WhatsApp ou a uma central de atendimento quando o canal oficial for configurado.",
    href: "/",
    link: "Voltar ao início",
  },
] as const;

export default function HelpPage() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-5xl gap-8 px-5 py-10 lg:px-9 lg:py-14">
      <PageHeader eyebrow="Suporte" title="Como podemos ajudar?" description="Encontre o próximo passo para os problemas mais comuns da plataforma." />
      <div className="grid gap-4 sm:grid-cols-2">
        {topics.map((topic) => (
          <Card key={topic.title} className="flex flex-col">
            <h2 className="text-lg font-black text-secondary">{topic.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{topic.body}</p>
            <Link href={topic.href} className="mt-auto pt-5 text-sm font-bold text-primary hover:underline">
              {topic.link}
            </Link>
          </Card>
        ))}
      </div>
      <p className="text-xs leading-5 text-muted">Ao relatar um erro, informe a página, o horário aproximado e o que você tentou fazer. Não envie senhas, CPF completo ou arquivos sensíveis por canais não autorizados.</p>
    </main>
  );
}
