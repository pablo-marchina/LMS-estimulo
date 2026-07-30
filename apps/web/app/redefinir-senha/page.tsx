import { AuthLayout, FormMessage } from "@/components/auth-layout";
import { PasswordField } from "@/components/password-field";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { updateRecoveredPasswordAction } from "./actions";

const errorMessages: Record<string, string> = {
  senhas_diferentes: "As senhas informadas são diferentes.",
  senha_invalida: "Use uma senha com pelo menos 10 caracteres.",
  atualizacao_falhou: "Não foi possível atualizar a senha. Solicite um novo link e tente novamente.",
};

export const metadata = { title: "Definir nova senha | Plataforma Estímulo" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const query = await searchParams;

  return (
    <AuthLayout
      eyebrow="Acesso à plataforma"
      title="Defina uma nova senha"
      description="A nova senha substitui a anterior assim que você concluir."
    >
      {query.erro ? <FormMessage tone="error">{errorMessages[query.erro] ?? "Não foi possível atualizar a senha."}</FormMessage> : null}

      <form action={updateRecoveredPasswordAction} className="grid gap-4">
        <PasswordField
          name="password"
          label="Nova senha"
          minLength={10}
          maxLength={128}
          autoComplete="new-password"
          required
          help="Use pelo menos 10 caracteres."
        />
        <PasswordField
          name="password_confirmation"
          label="Confirmar nova senha"
          minLength={10}
          maxLength={128}
          autoComplete="new-password"
          required
        />
        <PendingSubmitButton pendingLabel="Atualizando senha…" size="lg">
          Atualizar senha
        </PendingSubmitButton>
      </form>
    </AuthLayout>
  );
}
