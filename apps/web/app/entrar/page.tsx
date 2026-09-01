import Link from "next/link";
import { AuthFooter, AuthLayout, FormMessage } from "@/components/auth-layout";
import { PasswordField } from "@/components/password-field";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { Input, Label } from "@/components/ui/input";
import { signInAction } from "./actions";

const errorMessages: Record<string, string> = {
  campos_obrigatorios: "Informe e-mail e senha.",
  credenciais_invalidas: "E-mail ou senha inválidos. Se não lembrar a senha, use a recuperação abaixo.",
  identidade_nao_vinculada: "Sua autenticação foi concluída, mas não foi possível preparar seu acesso à plataforma. Tente entrar novamente; se o problema continuar, fale com a equipe Estímulo.",
  acesso_nao_autorizado: "A identidade não possui acesso ativo à plataforma.",
  confirmacao_invalida: "Não foi possível concluir a confirmação. Solicite uma nova mensagem e tente novamente.",
  confirmacao_necessaria: "Seu e-mail ainda não foi confirmado. Abra a mensagem de confirmação recebida antes de entrar.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ erro?: string; cadastro?: string; senha?: string }> }) {
  const { erro, cadastro, senha } = await searchParams;

  return (
    <AuthLayout eyebrow="Plataforma Estímulo" title="Entrar" description="Use o e-mail e a senha que você cadastrou.">
      {cadastro === "confirmacao" ? <FormMessage tone="success">Conta criada. Abra o e-mail de confirmação para continuar.</FormMessage> : null}
      {cadastro === "confirmado" ? <FormMessage tone="success">E-mail confirmado. Entre com a mesma senha definida no cadastro.</FormMessage> : null}
      {senha === "alterada" ? <FormMessage tone="success">Senha atualizada. Entre com a sua nova senha.</FormMessage> : null}
      {erro ? <FormMessage tone="error">{errorMessages[erro] ?? "Não foi possível entrar."}</FormMessage> : null}

      <form action={signInAction} className="grid gap-4">
        <Label>
          E-mail
          <Input name="email" type="email" autoComplete="email" required />
        </Label>
        <div className="grid gap-2">
          <PasswordField name="password" autoComplete="current-password" required />
          <Link href="/recuperar-senha" className="justify-self-end text-sm font-semibold text-primary hover:underline">
            Esqueci minha senha
          </Link>
        </div>
        <PendingSubmitButton pendingLabel="Entrando…" size="lg" className="w-full bg-[#00008d] !text-white hover:bg-[#1a1aa4] active:bg-[#000071]">
          Entrar
        </PendingSubmitButton>
      </form>

      <AuthFooter>
        <p className="text-muted">
          Não tem conta?{" "}
          <Link href="/cadastro" className="font-semibold text-primary hover:underline">
            Criar minha conta
          </Link>
        </p>
      </AuthFooter>
    </AuthLayout>
  );
}
