import Link from "next/link";
import { AuthFooter, AuthLayout, FormMessage } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
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
      eyebrow="Acesso à plataforma"
      title="Crie seu acesso"
      description="Primeiro, confirme seu e-mail. Depois, em uma sessão autenticada, você informará CPF, telefone e os dados opcionais do negócio."
      wide
    >
      {erro ? <FormMessage tone="error">{errorMessages[erro] ?? "Não foi possível concluir o cadastro."}</FormMessage> : null}
      <form action={createPublicAccountAction} className="grid gap-4">
        <Label>Seu nome<Input name="preferred_name" minLength={2} maxLength={120} autoComplete="name" required /></Label>
        <Label>E-mail<Input name="email" type="email" autoComplete="email" required /></Label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Label>Senha<Input name="password" type="password" minLength={10} maxLength={128} autoComplete="new-password" required /></Label>
          <Label>Confirmar senha<Input name="password_confirmation" type="password" minLength={10} maxLength={128} autoComplete="new-password" required /></Label>
        </div>
        <p className="rounded-xl border border-primary/15 bg-primary-soft/55 px-4 py-3 text-xs leading-5 text-muted">Dados sensíveis não são enviados antes da confirmação do e-mail. O CPF é validado e cifrado somente no servidor, durante a conclusão autenticada do perfil.</p>
        <label className="flex items-start gap-2.5 text-sm text-ink"><input name="terms" type="checkbox" value="accepted" required className="mt-0.5 size-4 accent-primary" /><span>Li e aceito os termos e o aviso de privacidade aplicáveis.</span></label>
        <Button size="lg" type="submit">Criar acesso</Button>
      </form>
      <AuthFooter>
        <div className="grid gap-2 text-muted">
          <p>Já possui conta? <Link href="/entrar" className="font-semibold text-primary hover:underline">Entrar</Link></p>
          <p>Equipe Estímulo? <Link href="/entrar/administracao" className="font-semibold text-primary hover:underline">Acesso administrativo com Google</Link></p>
        </div>
      </AuthFooter>
    </AuthLayout>
  );
}
