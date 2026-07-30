import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Termos de Uso | Plataforma Estímulo" };

export default function TermsPage() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-4xl gap-8 px-5 py-10 lg:px-9 lg:py-14">
      <PageHeader
        eyebrow="Documento público"
        title="Termos de Uso"
        description="Versão operacional de 29 de julho de 2026. O aceite desta versão fica registrado no cadastro."
      />

      <Card className="prose prose-slate max-w-none text-sm leading-7">
        <h2>1. Finalidade da plataforma</h2>
        <p>A Plataforma Estímulo oferece jornadas de aprendizagem, diagnósticos de perfil, atividades, acompanhamento de progresso, certificados e ferramentas de apoio ao desenvolvimento empreendedor.</p>

        <h2>2. Conta e acesso</h2>
        <p>Você deve fornecer informações verdadeiras, manter suas credenciais protegidas e utilizar somente a sua própria conta. Atividades realizadas na conta podem ser registradas para manter o progresso, a segurança e a rastreabilidade da experiência.</p>

        <h2>3. Uso adequado</h2>
        <p>Não é permitido tentar acessar dados de outras pessoas, contornar controles de segurança, enviar arquivos maliciosos, prejudicar o funcionamento da plataforma ou utilizar os conteúdos em violação a direitos de terceiros.</p>

        <h2>4. Conteúdos e atividades</h2>
        <p>Os conteúdos têm finalidade educacional. Diagnósticos personalizam recomendações de aprendizagem e não constituem avaliação de crédito, aconselhamento financeiro, jurídico ou profissional.</p>

        <h2>5. Arquivos, certificados e entregas</h2>
        <p>Arquivos enviados devem ser legítimos e relacionados às funcionalidades disponíveis. A plataforma pode validar formato, tamanho e segurança, restringir downloads e remover conteúdo incompatível com estes termos.</p>

        <h2>6. Disponibilidade e alterações</h2>
        <p>A experiência pode ser atualizada para corrigir falhas, melhorar a segurança e evoluir as jornadas. Quando uma alteração material exigir novo consentimento, uma nova versão será apresentada.</p>

        <h2>7. Privacidade</h2>
        <p>O tratamento de dados pessoais é descrito na <Link href="/privacidade">Política de Privacidade</Link>.</p>

        <h2>8. Contato e revisão institucional</h2>
        <p>Esta versão organiza o fluxo operacional e deve passar pela aprovação jurídica e de privacidade da organização antes da liberação definitiva para usuários reais.</p>
      </Card>

      <Link href="/cadastro" className="w-fit font-semibold text-primary hover:underline">Voltar ao cadastro</Link>
    </main>
  );
}
