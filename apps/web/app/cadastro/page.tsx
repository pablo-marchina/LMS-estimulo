import Link from "next/link";
import { AuthFooter, AuthLayout, FormMessage } from "@/components/auth-layout";
import { PasswordField } from "@/components/password-field";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { Input, Label } from "@/components/ui/input";
import { createPublicAccountAction } from "./actions";

const errorMessages: Record<string, string> = {
  dados_invalidos: "Revise os campos e aceite os termos para continuar.",
  senhas_diferentes: "As senhas informadas são diferentes.",
  conta_existente_ou_vinculada: "Não foi possível abrir uma nova conta com este e-mail. Entre com o método já utilizado. Contas @estimulo.org com acesso administrativo devem usar o Google.",
  usuario_existente: "Não foi possível abrir uma nova conta com este e-mail. Tente entrar com o acesso já utilizado.",
  limite_email: "O limite temporário do servidor de e-mail foi atingido. Aguarde antes de tentar novamente.",
  servico_indisponivel: "O cadastro está temporariamente indisponível porque uma dependência de segurança não passou na verificação.",
  criacao_falhou: "Não foi possível criar a conta agora.",
};

export default async function PublicSignupPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;

  return (
    <AuthLayout
      eyebrow="Crie sua conta grátis"
      title="Crie sua conta"
      description="Primeiro, confirme seu e-mail. Depois, você preenche CPF e telefone — só para confirmarmos que é você e emitirmos seu certificado no futuro."
      wide
    >
      {erro ? <FormMessage tone="error">{errorMessages[erro] ?? "Não foi possível concluir o cadastro."}</FormMessage> : null}

      <form action={createPublicAccountAction} className="grid gap-4">
        <Label>
          Seu nome
          <Input name="preferred_name" minLength={2} maxLength={120} autoComplete="name" required />
        </Label>
        <Label>
          E-mail
          <Input name="email" type="email" autoComplete="email" required />
        </Label>
        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordField
            name="password"
            label="Senha"
            minLength={10}
            maxLength={128}
            autoComplete="new-password"
            required
            help="Use pelo menos 10 caracteres."
          />
          <PasswordField
            name="password_confirmation"
            label="Confirmar senha"
            minLength={10}
            maxLength={128}
            autoComplete="new-password"
            required
          />
        </div>

        <p className="rounded-xl border border-primary/15 bg-primary-soft/55 px-4 py-3 text-xs leading-5 text-muted">
          Seu CPF e telefone só são pedidos depois que você confirma o e-mail, e ficam protegidos com a gente.
        </p>

        <input type="hidden" name="terms_version" value="2026-07-29" />
        <input type="hidden" name="privacy_version" value="2026-07-29" />
        <label className="flex items-start gap-2.5 text-sm text-ink">
          <input name="terms" type="checkbox" value="accepted" required className="mt-0.5 size-4 accent-primary" />
          <span>
            Li e aceito os{" "}
            <Link href="/termos" className="font-semibold text-primary hover:underline" target="_blank">
              Termos de Uso
            </Link>{" "}
            e a{" "}
            <Link href="/privacidade" className="font-semibold text-primary hover:underline" target="_blank">
              Política de Privacidade
            </Link>
            .
          </span>
        </label>

        <PendingSubmitButton pendingLabel="Criando sua conta…" size="lg">
          Criar minha conta
        </PendingSubmitButton>
      </form>

      <AuthFooter>
        <p>
          Já tem conta?{" "}
          <Link href="/entrar" className="font-semibold text-primary hover:underline">
            Entrar
          </Link>
        </p>
        <div className="mt-3 grid gap-1 border-t border-border pt-3 text-xs text-muted">
          <Link href="/entrar/administracao" className="w-fit font-semibold text-primary hover:underline">
            Sou da equipe Estímulo
          </Link>
        </div>
      </AuthFooter>
    </AuthLayout>
  );
}
