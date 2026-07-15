import Link from "next/link";
import { EstimuloBrand } from "@/components/estimulo-brand";
import { testPublicSignupEnabled } from "@/lib/auth/test-public-signup";
import { signInAction } from "./actions";

const errorMessages: Record<string, string> = {
  campos_obrigatorios: "Preencha e-mail e senha.",
  credenciais_invalidas: "Não foi possível entrar com essas credenciais.",
  identidade_nao_vinculada: "A autenticação foi concluída, mas a identidade interna ainda não está vinculada.",
  acesso_nao_autorizado: "Sua identidade não possui acesso ativo a uma jornada ou área operacional.",
  cadastro_indisponivel: "O cadastro público está desabilitado neste ambiente.",
  cadastro_incompleto: "A conta foi autenticada, mas o perfil de teste não pôde ser concluído."
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ erro?: string; cadastro?: string }> }) {
  const { erro, cadastro } = await searchParams;
  const publicSignupEnabled = testPublicSignupEnabled();

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <EstimuloBrand centered />
        <p className="eyebrow">Plataforma de jornadas</p>
        <h1 id="login-title">Entre para continuar seu desenvolvimento</h1>
        <p className="lead">Acesse as jornadas disponibilizadas para o seu negócio.</p>
        {cadastro === "criado" ? <p className="form-message form-message--success" role="status">Conta de teste criada. Você já pode entrar.</p> : null}
        {erro ? <p className="form-message form-message--error" role="alert">{errorMessages[erro] ?? "Não foi possível entrar."}</p> : null}
        <form action={signInAction} className="stack">
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
