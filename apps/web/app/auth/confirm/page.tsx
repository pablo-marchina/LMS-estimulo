import Link from "next/link";
import { EstimuloBrand } from "@/components/estimulo-brand";
import { confirmEmailAction, resendConfirmationAction } from "./actions";

type ConfirmationSearchParams = {
  token_hash?: string;
  type?: string;
  code?: string;
  error?: string;
  error_code?: string;
  reenviado?: string;
  erro?: string;
};

const resendErrors: Record<string, string> = {
  email_invalido: "Informe um e-mail válido.",
  limite_envio: "Aguarde pelo menos um minuto antes de solicitar outra mensagem.",
  envio_falhou: "O servidor de e-mail recusou o reenvio. Tente novamente mais tarde.",
};

export default async function EmailConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<ConfirmationSearchParams>;
}) {
  const params = await searchParams;
  const tokenHash = params.token_hash?.trim() ?? "";
  const type = params.type?.trim() ?? "";
  const code = params.code?.trim() ?? "";
  const hasConfirmationData = Boolean((tokenHash && type) || code);
  const linkAlreadyProcessed = params.error_code === "otp_expired" || params.error === "access_denied";

  return (
    <main className="auth-page">
      <section className="auth-card">
        <EstimuloBrand centered />
        <div className="auth-heading">
          <p className="eyebrow">Confirmação de cadastro</p>
          <h1>{hasConfirmationData ? "Conclua a confirmação" : "Verifique sua conta"}</h1>
          <p>
            {hasConfirmationData
              ? "Pressione o botão para concluir a sessão. Se o e-mail já tiver sido confirmado em outro navegador, você será encaminhado para entrar com sua senha."
              : "O link já foi processado ou não pode mais ser utilizado."}
          </p>
        </div>

        {params.reenviado === "1" ? (
          <p className="form-message form-message--success" role="status">
            A solicitação foi aceita. Se a conta existir e ainda estiver pendente, uma nova mensagem será enviada. Contas já confirmadas não recebem outro e-mail de cadastro.
          </p>
        ) : null}

        {params.erro && resendErrors[params.erro] ? (
          <p className="form-message form-message--error" role="alert">{resendErrors[params.erro]}</p>
        ) : null}

        {hasConfirmationData ? (
          <form action={confirmEmailAction} className="stack">
            <input type="hidden" name="token_hash" value={tokenHash} />
            <input type="hidden" name="type" value={type} />
            <input type="hidden" name="code" value={code} />
            <button className="button button--primary button--large" type="submit">
              Concluir confirmação
            </button>
          </form>
        ) : (
          <div className="stack">
            <p className="form-message" role="status">
              {linkAlreadyProcessed
                ? "A conta pode já estar confirmada. Entre com a senha cadastrada; somente contas ainda pendentes recebem um novo e-mail."
                : "Tente entrar com a senha cadastrada. Se o Supabase informar que a confirmação ainda é necessária, solicite outra mensagem abaixo."}
            </p>
            <Link className="button button--primary button--large" href="/entrar?cadastro=confirmado">
              Entrar com minha senha
            </Link>
            <form action={resendConfirmationAction} className="stack">
              <label>
                E-mail
                <input name="email" type="email" autoComplete="email" required />
              </label>
              <button className="button button--secondary" type="submit">Reenviar confirmação</button>
            </form>
          </div>
        )}

        <p className="auth-footer">
          <Link href="/entrar">Voltar para a entrada</Link>
        </p>
      </section>
    </main>
  );
}
