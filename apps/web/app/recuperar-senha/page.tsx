import Link from "next/link";
import { AuthFooter, AuthLayout, FormMessage } from "@/components/auth-layout";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { Input, Label } from "@/components/ui/input";
import { requestPasswordRecoveryAction } from "./actions";

const errorMessages: Record<string, string> = {
  email_invalido: "Informe um e-mail válido.",
  limite_email: "Muitas solicitações foram feitas em pouco tempo. Tente novamente mais tarde.",
  link_invalido: "O link de recuperação é inválido ou expirou. Solicite um novo.",
};

export const metadata = { title: "Recuperar senha | Plataforma Estímulo" };

export default async function PasswordRecoveryPage({ searchParams }: { searchParams: Promise<{ erro?: string; enviado?: string }> }) {
  const query = await searchParams;

  return (
    <AuthLayout
      eyebrow="Acesso à plataforma"
      title="Recuperar senha"
      description="Informe o e-mail da sua conta. Enviaremos um link para você definir uma nova senha."
    >
      {query.enviado ? (
        <FormMessage tone="success">
          Se existir uma conta com esse e-mail, o link de recuperação será enviado. Verifique também a caixa de spam.
        </FormMessage>
      ) : null}
      {query.erro ? <FormMessage tone="error">{errorMessages[query.erro] ?? "Não foi possível solicitar a recuperação."}</FormMessage> : null}

      <form action={requestPasswordRecoveryAction} className="grid gap-4">
        <Label>
          E-mail
          <Input name="email" type="email" autoComplete="email" required />
        </Label>
        <PendingSubmitButton pendingLabel="Enviando link…" size="lg">
          Enviar link de recuperação
        </PendingSubmitButton>
      </form>

      <AuthFooter>
        <Link href="/entrar" className="font-semibold text-primary hover:underline">
          Voltar para entrar
        </Link>
      </AuthFooter>
    </AuthLayout>
  );
}
