import Link from "next/link";
import { AuthFooter, AuthLayout, FormMessage } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { createPublicAccountAction } from "./actions";

const errorMessages: Record<string, string> = {
  dados_invalidos: "Revise os campos e aceite os termos para continuar.",
  senhas_diferentes: "As senhas informadas são diferentes.",
  usuario_existente: "Já existe uma conta com este e-mail.",
  limite_email: "O limite temporário do servidor de e-mail foi atingido. Aguarde antes de tentar novamente.",
  criacao_falhou: "Não foi possível criar a conta agora.",
};

export default async function PublicSignupPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <AuthLayout
      eyebrow="Acesso público"
      title="Crie sua conta"
      description="Comece com os dados mínimos. Outras informações serão solicitadas somente quando forem necessárias."
      wide
    >
      {erro ? <FormMessage tone="error">{errorMessages[erro] ?? "Não foi possível concluir o cadastro."}</FormMessage> : null}
      <form action={createPublicAccountAction} className="grid gap-4">
        <Label>
          Seu nome
          <Input name="preferred_name" minLength={2} maxLength={120} autoComplete="name" required />
        </Label>
        <Label>
          Nome do negócio <span className="font-normal text-muted">(opcional)</span>
          <Input name="business_name" maxLength={160} autoComplete="organization" />
        </Label>
        <Label>
          E-mail
          <Input name="email" type="email" autoComplete="email" required />
        </Label>
        <Label>
          Senha
          <Input name="password" type="password" minLength={10} maxLength={128} autoComplete="new-password" required />
        </Label>
        <Label>
          Confirmar senha
          <Input name="password_confirmation" type="password" minLength={10} maxLength={128} autoComplete="new-password" required />
        </Label>
        <label className="flex items-start gap-2.5 text-sm text-ink">
          <input name="terms" type="checkbox" value="accepted" required className="mt-0.5 size-4 accent-primary" />
          <span>Li e aceito os termos e o aviso de privacidade aplicáveis.</span>
        </label>
        <Button size="lg" type="submit">
          Criar conta
        </Button>
      </form>
      <AuthFooter>
        <p className="text-muted">
          Já possui conta?{" "}
          <Link href="/entrar" className="font-semibold text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </AuthFooter>
    </AuthLayout>
  );
}
