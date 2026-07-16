import Link from "next/link";
import { redirect } from "next/navigation";
import { EstimuloBrand } from "@/components/estimulo-brand";
import { getAuthContext } from "@/lib/auth/context";
import { resolveAuthenticatedDestination, sanitizeReturnTo } from "@/lib/auth/navigation.js";
import { testPublicSignupEnabled } from "@/lib/auth/test-public-signup";
import { signInAction } from "./actions";

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  campos_obrigatorios: "Preencha e-mail e senha.",
  credenciais_invalidas: "Não foi possível entrar com essas credenciais.",
  identidade_nao_vinculada: "A autenticação foi concluída, mas a identidade interna ainda não está vinculada.",
  acesso_nao_autorizado: "Sua identidade não possui acesso ativo a uma jornada ou área operacional.",
  cadastro_indisponivel: "O cadastro público está desabilitado neste ambiente.",
  cadastro_incompleto: "A conta foi autenticada, mas o perfil de teste não pôde ser concluído."
};

type SignInSearchParams = {
  erro?: string;
  cadastro?: string;
  returnTo?: string;
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<SignInSearchParams> }) {
  const query = await searchParams;
  const returnTo = sanitizeReturnTo(query.returnTo);
  const auth = await getAuthContext();

  if (auth.status === "authenticated") {
    const destination = resolveAuthenticatedDestination(auth.identity, returnTo);
    if (destination) redirect(destination);
  }

  const displayedError = query.erro
    ?? (auth.status === "identity_error" ? "identidade_nao_vinculada" : undefined)
    ?? (auth.status === "authenticated" ? "acesso_nao_autorizado" : undefined);
  const publicSignupEnabled = testPublicSignupEnabled();

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <EstimuloBrand centered />
        <p className="eyebrow">Plataforma de jornadas</p>
        <h1 id="login-title">Entre para continuar seu desenvolvimento</h1>
        <p className="lead">Acesse as jornadas disponibilizadas para o seu negócio.</p>
        {query.cadastro === "criado" ? <p className="form-message form-message--success" role="status">Conta de teste criada. Você já pode entrar.</p> : null}
        {displayedError ? <p className="form-message form-message--error" role="alert">{errorMessages[displayedError] ?? "Não foi possível entrar."}</p> : null}
        <form action={signInAction} className="stack">
          {returnTo ? <input name="returnTo" type="hidden" value={returnTo} /> : null}
          <label>E-mail<input name="email" type="email" autoComplete="email" required /></label>
          <label>Senha<input name="password" type="password" autoComplete="current-password" required /></label>
          <button className="button button--primary" type="submit">Entrar</button>
        </form>
        {publicSignupEnabled ? (
          <div className="auth-alternative">
            <span>Ambiente de teste</span>
            <Link className="button button--secondary" href="/cadastro">Criar conta de teste</Link>
          </div>
        ) : <p className="support-note">O acesso é concedido por convite e vinculado à identidade interna do Estímulo.</p>}
      </section>
    </main>
  );
}
