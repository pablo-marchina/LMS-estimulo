import Link from "next/link";
import { EstimuloBrand } from "@/components/estimulo-brand";
import { signInWithGoogleAction } from "./actions";

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
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="admin-sign-in-title">
        <EstimuloBrand centered />
        <div className="auth-heading">
          <p className="eyebrow">Administração Estímulo</p>
          <h1 id="admin-sign-in-title">Entrar com Google</h1>
          <p>Esta entrada é exclusiva para contas Google Workspace com e-mail <strong>@estimulo.org</strong> e papel administrativo ativo.</p>
        </div>
        {erro ? <p className="form-message form-message--error" role="alert">{errorMessages[erro] ?? "Não foi possível entrar na administração."}</p> : null}
        <form action={signInWithGoogleAction} className="stack">
          <button className="button button--primary button--large" type="submit">Continuar com Google</button>
        </form>
        <div className="stack auth-footer">
          <Link href="/entrar">Voltar para a entrada de participantes</Link>
          <p>O domínio identifica a equipe, mas as permissões continuam sendo controladas por RBAC.</p>
        </div>
      </section>
    </main>
  );
}
