import Link from "next/link";
import { EstimuloBrand } from "@/components/estimulo-brand";
import { confirmEmailAction } from "./actions";

type ConfirmationSearchParams = {
  token_hash?: string;
  type?: string;
  code?: string;
  error?: string;
  error_code?: string;
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

  return (
    <main className="auth-page">
      <section className="auth-card">
        <EstimuloBrand centered />
        <div className="auth-heading">
          <p className="eyebrow">Confirmação de cadastro</p>
          <h1>Confirme seu e-mail</h1>
          <p>
            Por segurança, a confirmação só será concluída depois que você pressionar o botão abaixo.
          </p>
        </div>

        {hasConfirmationData ? (
          <form action={confirmEmailAction} className="stack">
            <input type="hidden" name="token_hash" value={tokenHash} />
            <input type="hidden" name="type" value={type} />
            <input type="hidden" name="code" value={code} />
            <button className="button button--primary button--large" type="submit">
              Confirmar e continuar
            </button>
          </form>
        ) : (
          <p className="form-message form-message--error" role="alert">
            Este link não contém os dados necessários para confirmar o cadastro.
          </p>
        )}

        <p className="auth-footer">
          <Link href="/entrar">Voltar para a entrada</Link>
        </p>
      </section>
    </main>
  );
}
