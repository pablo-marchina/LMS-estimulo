import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { AuthFooter, AuthLayout, FormMessage } from "@/components/auth-layout";
import { ButtonLink } from "@/components/ui/button";

const errorMessages: Record<string, string> = {
  oauth_indisponivel: "Não foi possível iniciar o acesso com Google. Tente novamente.",
  oauth_invalido: "A autenticação Google não pôde ser concluída. Tente novamente e confirme a conta selecionada.",
  conta_google_necessaria: "Selecione uma conta Google válida para continuar.",
  dominio_invalido: "Esta conta não possui acesso administrativo válido.",
  permissao_necessaria: "Seu vínculo com a Estímulo foi reconhecido, mas você ainda precisa receber permissões administrativas.",
  vinculo_estimulo_necessario: "Esta conta Google não possui um vínculo ativo com a Estímulo.",
  identidade_desvinculada: "A conta Google precisa ser vinculada novamente ao acesso administrativo.",
};

export default async function AdministrativeSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  return (
    <AuthLayout
      eyebrow="Administração Estímulo"
      title="Acessar área administrativa"
      description="Continue com sua conta Google. A plataforma verificará se sua identidade possui um vínculo ativo com a Estímulo antes de liberar a área administrativa."
    >
      {erro ? <FormMessage tone="error">{errorMessages[erro] ?? "Não foi possível entrar na administração."}</FormMessage> : null}

      <div className="rounded-2xl border border-primary/20 bg-primary-soft/55 p-4 text-sm leading-6 text-ink">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-primary shadow-sm" aria-hidden="true">
            <ShieldCheck size={20} />
          </span>
          <div>
            <p className="font-bold text-secondary">Acesso exclusivo da equipe Estímulo</p>
            <p className="mt-1 text-muted">O vínculo com a organização libera a entrada. As ações disponíveis dependem das permissões concedidas por um administrador.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        <ButtonLink href="/auth/admin/start" size="lg" className="w-full">
          Continuar com Google
        </ButtonLink>
        <p className="text-center text-xs leading-5 text-muted">Você será redirecionado para a seleção de contas do Google. Sua senha não é compartilhada com a plataforma.</p>
      </div>

      <AuthFooter>
        <Link href="/entrar" className="font-semibold text-primary hover:underline">
          Voltar para a entrada de participantes
        </Link>
      </AuthFooter>
    </AuthLayout>
  );
}
