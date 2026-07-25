import Link from "next/link";
import { AuthFooter, AuthLayout, FormMessage } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { createPublicAccountAction } from "./actions";

const errorMessages: Record<string, string> = {
  dados_invalidos: "Revise os campos e aceite os termos para continuar.",
  senhas_diferentes: "As senhas informadas são diferentes.",
  cpf_invalido: "Informe um CPF válido.",
  telefone_invalido: "Informe um telefone válido, com DDD.",
  cnpj_invalido: "Informe um CNPJ válido ou deixe o campo em branco.",
  cnpj_requer_nome_negocio: "Para informar o CNPJ, preencha também o nome do negócio.",
  protecao_cpf_indisponivel: "Não foi possível proteger o CPF neste ambiente.",
  usuario_existente: "Já existe uma conta com este e-mail.",
  limite_email: "O limite temporário do servidor de e-mail foi atingido. Aguarde antes de tentar novamente.",
  criacao_falhou: "Não foi possível criar a conta agora.",
};

export default async function PublicSignupPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <AuthLayout
      eyebrow="Acesso à plataforma"
      title="Crie sua conta"
      description="Informe seus dados de identificação e contato. O CNPJ é opcional para quem ainda não formalizou o negócio."
      wide
    >
      {erro ? <FormMessage tone="error">{errorMessages[erro] ?? "Não foi possível concluir o cadastro."}</FormMessage> : null}
      <form action={createPublicAccountAction} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Label>Seu nome<Input name="preferred_name" minLength={2} maxLength={120} autoComplete="name" required /></Label>
          <Label>CPF<Input name="cpf" inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" minLength={11} maxLength={14} pattern="[0-9.\-]{11,14}" required /></Label>
          <Label>Telefone<Input name="telefone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 91234-5678" required /></Label>
          <Label>Nome do negócio <span className="font-normal text-muted">(opcional)</span><Input name="business_name" maxLength={160} autoComplete="organization" /></Label>
          <Label className="sm:col-span-2">CNPJ <span className="font-normal text-muted">(opcional)</span><Input name="cnpj" inputMode="numeric" autoComplete="off" placeholder="00.000.000/0000-00" maxLength={18} /></Label>
        </div>
        <p className="rounded-xl border border-primary/15 bg-primary-soft/55 px-4 py-3 text-xs leading-5 text-muted">O CPF é validado e cifrado antes de ser guardado. Ele não é colocado em URLs, logs ou enviado ao HubSpot por padrão.</p>
        <Label>E-mail<Input name="email" type="email" autoComplete="email" required /></Label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Label>Senha<Input name="password" type="password" minLength={10} maxLength={128} autoComplete="new-password" required /></Label>
          <Label>Confirmar senha<Input name="password_confirmation" type="password" minLength={10} maxLength={128} autoComplete="new-password" required /></Label>
        </div>
        <label className="flex items-start gap-2.5 text-sm text-ink"><input name="terms" type="checkbox" value="accepted" required className="mt-0.5 size-4 accent-primary" /><span>Li e aceito os termos e o aviso de privacidade aplicáveis.</span></label>
        <Button size="lg" type="submit">Criar conta</Button>
      </form>
      <AuthFooter><p className="text-muted">Já possui conta? <Link href="/entrar" className="font-semibold text-primary hover:underline">Entrar</Link></p></AuthFooter>
    </AuthLayout>
  );
}