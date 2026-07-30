import Link from "next/link";
import { ShieldCheck, UserPlus } from "lucide-react";
import { AuthFooter, AuthLayout, FormMessage } from "@/components/auth-layout";
import { PasswordField } from "@/components/password-field";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { ButtonLink } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { signInAction } from "./actions";

const errorMessages: Record<string, string> = {
  campos_obrigatorios: "Informe e-mail e senha.",
  credenciais_invalidas: "E-mail ou senha inválidos.",
  identidade_nao_vinculada: "Não foi possível resolver a identidade interna.",
  acesso_nao_autorizado: "A identidade não possui acesso ativo à plataforma.",
  confirmacao_invalida: "Não foi possível concluir a confirmação. Solicite uma nova mensagem e tente novamente.",
  confirmacao_necessaria: "Confirme seu e-mail antes de concluir o cadastro.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ erro?: string; cadastro?: string; senha?: string }> }) {
  const { erro, cadastro, senha } = await searchParams;

  return (
    <AuthLayout eyebrow="Plataforma Estímulo" title="Entrar" description="Use o e-mail e a senha que você cadastrou.">
      {cadastro === "confirmacao" ? <FormMessage tone="success">Conta criada. Abra o e-mail de confirmação para continuar.</FormMessage> : null}
      {cadastro === "confirmado" ? <FormMessage tone="success">O link de confirmação já foi processado. Entre com a senha cadastrada.</FormMessage> : null}
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
        <PendingSubmitButton pendingLabel="Entrando…" size="lg">
          Entrar
        </PendingSubmitButton>
      </form>

      <AuthFooter>
        <div className="grid gap-3 text-left sm:grid-cols-2">
          <section className="flex flex-col rounded-2xl border border-border bg-surface-muted/70 p-4">
            <span className="grid size-10 place-items-center rounded-xl bg-white text-primary shadow-sm" aria-hidden="true">
              <UserPlus size={20} />
            </span>
            <h2 className="mt-3 font-bold text-secondary">Ainda não tem conta?</h2>
            <p className="mt-1 flex-1 text-sm leading-6 text-muted">Crie seu acesso de participante para começar as jornadas.</p>
            <ButtonLink href="/cadastro" variant="secondary" className="mt-4 w-full">
              Criar minha conta
            </ButtonLink>
          </section>

          <section className="flex flex-col rounded-2xl border border-primary/20 bg-primary-soft/55 p-4">
            <span className="grid size-10 place-items-center rounded-xl bg-white text-primary shadow-sm" aria-hidden="true">
              <ShieldCheck size={20} />
            </span>
            <h2 className="mt-3 font-bold text-secondary">Equipe Estímulo</h2>
            <p className="mt-1 flex-1 text-sm leading-6 text-muted">Entre com a conta Google que possui um papel administrativo ativo.</p>
            <ButtonLink href="/entrar/administracao" className="mt-4 w-full">
              Acessar área administrativa
            </ButtonLink>
          </section>
        </div>
      </AuthFooter>
    </AuthLayout>
  );
}
