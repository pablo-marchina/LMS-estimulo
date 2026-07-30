import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { AuthFooter, AuthLayout, FormMessage } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";

const errorMessages: Record<string, string> = {
  oauth_indisponivel: "Não foi possível iniciar o acesso com Google.",
  oauth_invalido: "A autenticação Google não pôde ser concluída. Tente novamente e confirme a conta selecionada.",
  conta_google_necessaria: "Selecione uma conta Google válida para continuar.",
  permissao_necessaria: "Esta conta Google não possui um papel administrativo ativo. Selecione a conta autorizada ou solicite a vinculação à equipe.",
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
      description="Entre com a conta Google vinculada à equipe. Depois da autenticação, a plataforma confirma o papel administrativo ativo antes de liberar o acesso."
    >
      {erro ? <FormMessage tone="error">{errorMessages[erro] ?? "Não foi possível entrar na administração."}</FormMessage> : null}
      <div className="rounded-2xl border border-primary/20 bg-primary-soft/55 p-4 text-sm leading-6 text-ink">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-primary shadow-sm" aria-hidden="true">
            <ShieldCheck size={20} />
          </span>
          <div>
            <p className="font-bold text-secondary">Acesso protegido por permissões</p>
            <p className="mt-1 text-muted">O endereço de e-mail identifica a conta; o acesso é autorizado somente quando há um vínculo administrativo ativo no sistema.</p>
          </div>
        </div>
      </div>
      <form action="/auth/admin/start" method="get">
        <Button type="submit" size="lg" className="w-full">
          Escolher conta Google
        </Button>
      </form>
      <AuthFooter>
        <Link href="/entrar" className="font-semibold text-primary hover:underline">
          Voltar para a entrada de participantes
        </Link>
        <p className="text-muted">Ao abrir a janela do Google, selecione a conta que recebeu o acesso administrativo.</p>
      </AuthFooter>
    </AuthLayout>
  );
}
