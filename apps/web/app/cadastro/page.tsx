import Link from "next/link";
import { EstimuloBrand } from "@/components/estimulo-brand";
import { createPublicAccountAction } from "./actions";

const errorMessages: Record<string, string> = {
  dados_invalidos: "Revise os campos e aceite os termos para continuar.",
  senhas_diferentes: "As senhas informadas são diferentes.",
  usuario_existente: "Já existe uma conta com este e-mail.",
  criacao_falhou: "Não foi possível criar a conta agora.",
};

export default async function PublicSignupPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return <main className="auth-page">
    <section className="auth-card auth-card--wide">
      <EstimuloBrand centered />
      <div className="auth-heading">
        <p className="eyebrow">Acesso público</p>
        <h1>Crie sua conta</h1>
        <p>Comece com os dados mínimos. Outras informações serão solicitadas somente quando forem necessárias.</p>
      </div>
      {erro ? <p className="form-message form-message--error" role="alert">{errorMessages[erro] ?? "Não foi possível concluir o cadastro."}</p> : null}
      <form action={createPublicAccountAction} className="stack">
        <label>Seu nome<input name="preferred_name" minLength={2} maxLength={120} autoComplete="name" required /></label>
        <label>Nome do negócio <span className="metadata">(opcional)</span><input name="business_name" maxLength={160} autoComplete="organization" /></label>
        <label>E-mail<input name="email" type="email" autoComplete="email" required /></label>
        <label>Senha<input name="password" type="password" minLength={10} maxLength={128} autoComplete="new-password" required /></label>
        <label>Confirmar senha<input name="password_confirmation" type="password" minLength={10} maxLength={128} autoComplete="new-password" required /></label>
        <label className="checkbox-row"><input name="terms" type="checkbox" value="accepted" required /><span>Li e aceito os termos e o aviso de privacidade aplicáveis.</span></label>
        <button className="button button--primary button--large" type="submit">Criar conta</button>
      </form>
      <p className="auth-footer">Já possui conta? <Link href="/entrar">Entrar</Link></p>
    </section>
  </main>;
}
