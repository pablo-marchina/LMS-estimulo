import Link from "next/link";
import { notFound } from "next/navigation";
import { EstimuloBrand } from "@/components/estimulo-brand";
import { testPublicSignupEnabled } from "@/lib/auth/test-public-signup";
import { signUpAction } from "./actions";

const errorMessages: Record<string, string> = {
  campos_obrigatorios: "Preencha nome, e-mail, senha e confirmação.",
  senha_curta: "A senha deve ter pelo menos 10 caracteres.",
  senhas_diferentes: "A senha e a confirmação não coincidem.",
  email_invalido: "Informe um endereço de e-mail válido.",
  usuario_existente: "Já existe uma conta com esse e-mail.",
  criacao_falhou: "Não foi possível criar a conta de teste.",
  autenticacao_falhou: "A conta foi criada, mas a autenticação inicial falhou.",
  provisionamento_falhou: "A conta foi criada, mas o perfil interno de teste não pôde ser provisionado."
};

export default async function TestSignupPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  if (!testPublicSignupEnabled()) notFound();
  const { erro } = await searchParams;

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="signup-title">
        <EstimuloBrand centered />
        <p className="eyebrow">Ambiente de desenvolvimento e teste</p>
        <h1 id="signup-title">Crie uma conta de teste</h1>
        <p className="lead">Esta conta é confirmada automaticamente e cria somente um perfil mínimo de empreendedor para validar o frontend.</p>
        <div className="status-panel status-panel--warning">
          <strong>Uso restrito a testes.</strong>
          <p>O cadastro permanece indisponível quando a aplicação é executada em produção.</p>
        </div>
        {erro ? <p className="form-message form-message--error" role="alert">{errorMessages[erro] ?? "Não foi possível concluir o cadastro."}</p> : null}
        <form action={signUpAction} className="stack">
          <label>Nome preferido<input name="preferred_name" type="text" autoComplete="name" minLength={2} maxLength={120} required /></label>
          <label>E-mail<input name="email" type="email" autoComplete="email" required /></label>
          <label>Senha<input name="password" type="password" autoComplete="new-password" minLength={10} required /></label>
          <label>Confirme a senha<input name="password_confirmation" type="password" autoComplete="new-password" minLength={10} required /></label>
          <button className="button button--primary" type="submit">Criar conta e entrar</button>
        </form>
        <p className="support-note"><Link href="/entrar">Voltar para a entrada</Link></p>
      </section>
    </main>
  );
}
