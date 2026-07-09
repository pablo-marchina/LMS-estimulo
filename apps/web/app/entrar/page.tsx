import { signInAction } from "./actions";

const errorMessages: Record<string, string> = {
  campos_obrigatorios: "Preencha e-mail e senha.",
  credenciais_invalidas: "Não foi possível entrar com essas credenciais.",
  identidade_nao_vinculada: "A autenticação foi concluída, mas a identidade interna ainda não está vinculada.",
  acesso_nao_autorizado: "Sua identidade não possui acesso ativo a uma jornada ou área operacional."
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="brand brand--center"><span className="brand-mark" aria-hidden="true">E</span><span><strong>Estímulo</strong><small>Desenvolvimento do empreendedor</small></span></div>
        <p className="eyebrow">Plataforma de jornadas</p>
        <h1 id="login-title">Entre para continuar seu desenvolvimento</h1>
        <p className="lead">Acesse as jornadas disponibilizadas para o seu negócio. O cadastro público não está habilitado.</p>
        {erro ? <p className="form-message form-message--error" role="alert">{errorMessages[erro] ?? "Não foi possível entrar."}</p> : null}
        <form action={signInAction} className="stack">
          <label>E-mail<input name="email" type="email" autoComplete="email" required /></label>
          <label>Senha<input name="password" type="password" autoComplete="current-password" required /></label>
          <button className="button button--primary" type="submit">Entrar</button>
        </form>
        <p className="support-note">O acesso é concedido por convite e vinculado à identidade interna do Estímulo.</p>
      </section>
    </main>
  );
}
