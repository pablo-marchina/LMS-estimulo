import Link from "next/link";
import { AuthFooter, AuthLayout, FormMessage } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";

const errorMessages: Record<string, string> = {
  oauth_indisponivel: "Não foi possível iniciar o acesso com Google.",
  oauth_invalido: "A autenticação Google não pôde ser validada.",
  conta_google_necessaria: "Use uma conta Google Workspace da Estímulo.",
  dominio_invalido: "Somente contas com e-mail @estimulo.org podem acessar a administração.",
  permissao_necessaria: "A conta foi autenticada, mas ainda não possui um papel administrativo ativo.",
  identidade_desvinculada: "A conta Google foi recriada e precisa ser vinculada novamente ao acesso administrativo.",
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
      title="Entrar com Google"
      description={
        <>
          Esta entrada é exclusiva para contas Google Workspace com e-mail <strong>@estimulo.org</strong> e papel administrativo ativo.
        </>
      }
    >
      {erro ? <FormMessage tone="error">{errorMessages[erro] ?? "Não foi possível entrar na administração."}</FormMessage> : null}
      <form action="/auth/admin/start" method="get">
        <Button type="submit" size="lg" className="w-full">
          Continuar com Google
        </Button>
      </form>
      <AuthFooter>
        <Link href="/entrar" className="font-semibold text-primary hover:underline">
          Voltar para a entrada de participantes
        </Link>
        <p className="text-muted">O domínio identifica a equipe, mas as permissões continuam sendo controladas por RBAC.</p>
      </AuthFooter>
    </AuthLayout>
  );
}
