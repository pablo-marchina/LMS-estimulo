import Link from "next/link";
import { EstimuloBrand } from "@/components/estimulo-brand";
import { signInAction } from "./actions";

const errorMessages: Record<string, string> = {
  campos_obrigatorios: "Informe e-mail e senha.",
  credenciais_invalidas: "E-mail ou senha inválidos.",
  identidade_nao_vinculada: "Não foi possível resolver a identidade interna.",
  acesso_nao_autorizado: "A identidade não possui acesso ativo à plataforma.",
  confirmacao_invalida: "Não foi possível concluir a confirmação. Solicite uma nova mensagem e tente novamente.",
  confirmacao_necessaria: "Confirme seu e-mail antes de concluir o cadastro.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ erro?: string; cadastro?: string }> }) {
  const { erro, cadastro } = await searchParams;
  return (
    <main className="auth-page">
      <section className="auth-card">
        <EstimuloBrand centered />
        <div className="auth-heading">
          <p className="eyebrow">Plataforma Estímulo</p>
          <h1>Entrar como participante</h1>
          <p>Use o e-mail e a senha da sua conta de participante.</p>
        </div>
        {cadastro === "confirmacao" ? <p className="form-message form-message--success" role="status">Conta criada. Abra o e-mail de confirmação para continuar.</p> : null}
        {cadastro === "confirmado" ? <p className="form-message form-message--success" role="status">O link de confirmação já foi processado. Entre com a senha cadastrada.</p> : null}
        {erro ? <p className="form-message form-message--error" role="alert">{errorMessages[erro] ?? "Não foi possível entrar."}</p> : null}
        <form action={signInAction} className="stack">
          <label>E-mail<input name="email" type="email" autoComplete="email" required /></label>
          <label>Senha<input name="password" type="password" autoComplete="current-password" required /></label>
          <button className="button button--primary button--large" type="submit">Entrar</button>
        </form>
        <div className="stack auth-footer">
          <Link className="button button--secondary" href="/cadastro">Criar conta</Link>
          <Link href="/entrar/administracao">Acesso administrativo com Google</Link>
          <p>Contas da equipe Estímulo entram exclusivamente pela área administrativa.</p>
        </div>
      </section>
    </main>
  );
}
