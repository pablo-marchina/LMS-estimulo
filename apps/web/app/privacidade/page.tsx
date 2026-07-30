import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Política de Privacidade | Plataforma Estímulo" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-4xl gap-8 px-5 py-10 lg:px-9 lg:py-14">
      <PageHeader
        eyebrow="Documento público"
        title="Política de Privacidade"
        description="Versão operacional de 29 de julho de 2026. Explica, em linguagem direta, como os dados são usados na plataforma."
      />

      <Card className="prose prose-slate max-w-none text-sm leading-7">
        <h2>1. Dados tratados</h2>
        <p>Podemos tratar dados de cadastro e contato, informações de identificação necessárias para confirmar a conta, dados opcionais do negócio, respostas de diagnóstico, progresso, atividades, comentários, certificados, arquivos enviados e registros técnicos de segurança.</p>

        <h2>2. Finalidades</h2>
        <p>Os dados são usados para autenticar a conta, evitar duplicidade, operar jornadas, personalizar recomendações, registrar progresso, emitir certificados, prestar suporte, prevenir abuso e produzir informações operacionais e educacionais autorizadas.</p>

        <h2>3. CPF e informações sensíveis</h2>
        <p>O CPF é solicitado somente após a confirmação do e-mail. Ele é validado e protegido no servidor e não deve ser exibido integralmente nas telas administrativas ou de participante.</p>

        <h2>4. Compartilhamento</h2>
        <p>O acesso é limitado a pessoas e fornecedores necessários para operar a plataforma, conforme permissões, contratos e requisitos de segurança. Não vendemos dados pessoais.</p>

        <h2>5. Arquivos</h2>
        <p>Certificados e evidências são armazenados de forma privada. Downloads dependem de autenticação e autorização, e os arquivos podem passar por validações de tipo, tamanho e segurança.</p>

        <h2>6. Retenção e segurança</h2>
        <p>Os dados são mantidos pelo período necessário para as finalidades informadas, obrigações aplicáveis, segurança e auditoria. São utilizados controles de acesso, rastreabilidade, proteção criptográfica e segregação por organização.</p>

        <h2>7. Direitos da pessoa titular</h2>
        <p>Você pode solicitar confirmação de tratamento, acesso, correção, informações sobre compartilhamento e, quando aplicável, eliminação, oposição ou revogação de consentimentos opcionais.</p>

        <h2>8. Alterações</h2>
        <p>Versões materiais serão identificadas e poderão exigir novo aceite. A versão aceita fica vinculada ao cadastro.</p>

        <h2>9. Revisão institucional</h2>
        <p>Este aviso implementa a transparência mínima da interface e deve ser validado pelo responsável jurídico e de privacidade antes da liberação definitiva para usuários reais.</p>
      </Card>

      <div className="flex flex-wrap gap-4 text-sm font-semibold">
        <Link href="/termos" className="text-primary hover:underline">Ver Termos de Uso</Link>
        <Link href="/cadastro" className="text-primary hover:underline">Voltar ao cadastro</Link>
      </div>
    </main>
  );
}
