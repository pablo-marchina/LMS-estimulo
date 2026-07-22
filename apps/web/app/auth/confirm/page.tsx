import Link from "next/link";
import { AuthFooter, AuthLayout, FormMessage } from "@/components/auth-layout";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
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
    <AuthLayout
      eyebrow="Confirmação de cadastro"
      title={hasConfirmationData ? "Conclua a confirmação" : "Verifique sua conta"}
      description={
        hasConfirmationData
          ? "Pressione o botão para concluir a sessão. Se o e-mail já tiver sido confirmado em outro navegador, você será encaminhado para entrar com sua senha."
          : "O link já foi processado ou não pode mais ser utilizado."
      }
    >
      {params.reenviado === "1" ? (
        <FormMessage tone="success">
          A solicitação foi aceita. Se a conta existir e ainda estiver pendente, uma nova mensagem será enviada. Contas já confirmadas não recebem outro e-mail de cadastro.
        </FormMessage>
      ) : null}

      {params.erro && resendErrors[params.erro] ? <FormMessage tone="error">{resendErrors[params.erro]}</FormMessage> : null}

      {hasConfirmationData ? (
        <form action={confirmEmailAction}>
          <input type="hidden" name="token_hash" value={tokenHash} />
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="code" value={code} />
          <Button size="lg" type="submit" className="w-full">
            Concluir confirmação
          </Button>
        </form>
      ) : (
        <div className="grid gap-4">
          <FormMessage tone="info">
            {linkAlreadyProcessed
              ? "A conta pode já estar confirmada. Entre com a senha cadastrada; somente contas ainda pendentes recebem um novo e-mail."
              : "Tente entrar com a senha cadastrada. Se o Supabase informar que a confirmação ainda é necessária, solicite outra mensagem abaixo."}
          </FormMessage>
          <ButtonLink href="/entrar?cadastro=confirmado" size="lg">
            Entrar com minha senha
          </ButtonLink>
          <form action={resendConfirmationAction} className="grid gap-3">
            <Label>
              E-mail
              <Input name="email" type="email" autoComplete="email" required />
            </Label>
            <Button variant="secondary" type="submit">
              Reenviar confirmação
            </Button>
          </form>
        </div>
      )}

      <AuthFooter>
        <Link href="/entrar" className="font-semibold text-primary hover:underline">
          Voltar para a entrada
        </Link>
      </AuthFooter>
    </AuthLayout>
  );
}
