import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { AuthFooter, AuthLayout, FormMessage } from "@/components/auth-layout";
import { PendingSubmitButton } from "@/components/pending-submit-button";

const errorMessages: Record<string, string> = {
  oauth_indisponivel: "Não foi possível iniciar o acesso com Google. Tente novamente.",
  oauth_invalido: "A autenticação Google não pôde ser concluída. Tente novamente e confirme a conta selecionada.",
  conta_google_necessaria: "Selecione uma conta Google válida para continuar.",
  dominio_invalido: "Use uma conta Google corporativa terminada em @estimulo.org.",
  permissao_necessaria: "Esta conta não possui um papel administrativo ativo. Solicite a vinculação à equipe Estímulo.",
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
      description="Continue com sua conta Google corporativa. A plataforma verificará o domínio Estímulo e o papel administrativo antes de liberar o acesso."
    >
      {erro ? <FormMessage tone="error">{errorMessages[erro] ?? "Não foi possível entrar na administração."}</FormMessage> : null}

      <div className="rounded-2xl border border-primary/20 bg-primary-soft/55 p-4 text-sm leading-6 text-ink">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-primary shadow-sm" aria-hidden="true">
            <ShieldCheck size={20} />
          </span>
          <div>
            <p className="font-bold text-secondary">Acesso exclusivo da equipe</p>
            <p className="mt-1 text-muted">No Google, selecione a conta corporativa terminada em @estimulo.org.</p>
          </div>
        </div>
      </div>

      <form action="/auth/admin/start" method="get">
        <div className="grid gap-3">
          <PendingSubmitButton pendingLabel="Abrindo o Google…" size="lg" className="w-full">
            Continuar com Google
          </PendingSubmitButton>
          <p className="text-center text-xs leading-5 text-muted">O clique abre a seleção de contas do Google. Sua senha não é compartilhada com a plataforma.</p>
        </div>
      </form>

      <AuthFooter>
        <Link href="/entrar" className="font-semibold text-primary hover:underline">
          Voltar para a entrada de participantes
        </Link>
      </AuthFooter>
    </AuthLayout>
  );
}
