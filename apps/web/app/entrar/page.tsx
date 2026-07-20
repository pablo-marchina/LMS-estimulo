import Link from "next/link";
import { EstimuloBrand } from "@/components/estimulo-brand";
import { testPublicSignupEnabled } from "@/lib/auth/test-public-signup";
import { signInAction } from "./actions";

const errorMessages: Record<string, string> = {
  campos_obrigatorios: "Informe e-mail e senha.",
  credenciais_invalidas: "E-mail ou senha inválidos.",
  identidade_nao_vinculada: "Não foi possível resolver a identidade interna.",
  acesso_nao_autorizado: "A identidade não possui acesso ativo à plataforma.",
  cadastro_indisponivel: "O cadastro de teste está desabilitado neste ambiente.",
  cadastro_incompleto: "A conta foi autenticada, mas o perfil de teste não pôde ser concluído.",
  confirmacao_invalida: "O link de confirmação é inválido ou expirou.",
  confirmacao_necessaria: "Confirme seu e-mail antes de concluir o cadastro.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ erro?: string; cadastro?: string }> }) {
  const { erro, cadastro } = await searchParams;
  const allowTestSignup = testPublicSignupEnabled();
  return (
    <main className="auth-page">
      <section className="auth-card">
        <EstimuloBrand centered />
        <div className="auth-heading">
          <p className="eyebrow">Plataforma Estímulo</p>
          <h1>Entrar</h1>
          <p>Use sua identidade confirmada para acessar a jornada ou a operação autorizada.</p>
        </div>
        {cadastro === "criado" ? <p className="form-message form-message--success" role="status">Conta de teste criada. Você já pode entrar.</p> : null}
        {cadastro === "confirmacao" ? <p className="form-message form-message--success" role="status">Conta criada. Abra o e-mail de confirmação para continuar.</p> : null}
        {erro ? <p className="form-message form-message--error" role="alert">{errorMessages[erro] ?? "Não foi possível entrar."}</p> : null}
        <form action={signInAction} className="stack">
          <label>E-mail<input name="email" type="email" autoComplete="email" required /></label>
          <label>Senha<input name="password" type="password" autoComplete="current-password" required /></label>
          <button className="button button--primary button--large" type="submit">Entrar</button>
        </form>
        <div className="stack auth-footer">
          <Link className="button button--secondary" href="/cadastro">Criar conta</Link>
          {allowTestSignup ? <Link href="/cadastro/teste">Criar conta de teste</Link> : null}
          <p>O cadastro público cria somente um perfil de participante. Acesso administrativo exige concessão explícita.</p>
        </div>
      </section>
    </main>
  );
}
