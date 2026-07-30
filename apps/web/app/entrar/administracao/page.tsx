import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { AuthFooter, AuthLayout, FormMessage } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const errorMessages: Record<string, string> = {
  oauth_indisponivel: "Não foi possível iniciar o acesso com Google.",
  oauth_invalido: "A autenticação Google não pôde ser concluída. Tente novamente e confirme a conta selecionada.",
  conta_google_necessaria: "Selecione uma conta Google válida para continuar.",
  dominio_invalido: "Use o endereço corporativo terminado em @estimulo.org que recebeu o acesso administrativo.",
  permissao_necessaria: "Esta conta não possui um papel administrativo ativo. Confirme o endereço informado ou solicite a vinculação à equipe.",
  identidade_desvinculada: "A conta Google precisa ser vinculada novamente ao acesso administrativo.",
};

export default async function AdministrativeSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  return (
    <AuthLayout
      eyebrow="Administração Estímulo"
      title="Acessar área administrativa"
      description="Informe seu e-mail corporativo para o Google abrir a conta correta. Depois da autenticação, a plataforma confirma o papel administrativo ativo antes de liberar o acesso."
    >
      {erro ? <FormMessage tone="error">{errorMessages[erro] ?? "Não foi possível entrar na administração."}</FormMessage> : null}
      <div className="rounded-2xl border border-primary/20 bg-primary-soft/55 p-4 text-sm leading-6 text-ink">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-primary shadow-sm" aria-hidden="true">
            <ShieldCheck size={20} />
          </span>
          <div>
            <p className="font-bold text-secondary">Acesso protegido em duas etapas</p>
            <p className="mt-1 text-muted">A conta precisa pertencer ao domínio Estímulo e também possuir um papel administrativo ativo no sistema.</p>
          </div>
        </div>
      </div>
      <form action="/auth/admin/start" method="get">
        <div className="grid gap-4">
          <Label>
            E-mail corporativo
            <Input name="email" type="email" inputMode="email" autoComplete="email" placeholder="nome@estimulo.org" pattern="[^@\s]+@estimulo\.org" required />
          </Label>
          <Button type="submit" size="lg" className="w-full">
            Continuar com Google
          </Button>
        </div>
      </form>
      <AuthFooter>
        <Link href="/entrar" className="font-semibold text-primary hover:underline">
          Voltar para a entrada de participantes
        </Link>
        <p className="text-muted">O endereço informado é usado como dica segura de conta; sua senha permanece exclusivamente no Google.</p>
      </AuthFooter>
    </AuthLayout>
  );
}
