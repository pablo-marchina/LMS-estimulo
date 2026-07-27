import { CheckCircle2 } from "lucide-react";
import { redirect } from "next/navigation";
import { AuthLayout, FormMessage } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { getAuthContext } from "@/lib/auth/context";
import { createSessionClient } from "@/lib/supabase/server";
import { completePublicSignupAction } from "./actions";

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  dados_invalidos: "Revise os dados antes de continuar.",
  cpf_invalido: "Informe um CPF válido.",
  cpf_ja_vinculado: "Este CPF já está vinculado a outra conta. Procure o suporte para recuperar o acesso.",
  cpf_revisao_necessaria: "A alteração do CPF exige revisão de identidade pelo suporte.",
  telefone_invalido: "Informe um telefone válido, com DDD.",
  cnpj_invalido: "Informe um CNPJ válido ou deixe o campo em branco.",
  cnpj_ja_vinculado: "Este CNPJ já está vinculado a outro negócio cadastrado.",
  cnpj_requer_nome_negocio: "Para informar um CNPJ, preencha também o nome do negócio.",
  protecao_cpf_indisponivel: "A proteção do CPF não está configurada neste ambiente.",
  provisionamento_falhou: "Não foi possível concluir o perfil agora.",
};

export default async function CompleteSignupPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") redirect("/entrar?erro=confirmacao_necessaria");
  if (auth.identity.entrepreneur_id) redirect("/empreendedor");

  const client = await createSessionClient();
  const { data } = await client.auth.getUser();
  const metadata = data.user?.user_metadata ?? {};
  const preferredName = typeof metadata.preferred_name === "string" ? metadata.preferred_name : "";
  const businessName = typeof metadata.business_name === "string" ? metadata.business_name : "";
  const phone = typeof metadata.signup_phone_e164 === "string" ? metadata.signup_phone_e164 : "";
  const cnpj = typeof metadata.signup_cnpj === "string" ? metadata.signup_cnpj : "";
  const hasProtectedCpf = Boolean(metadata.signup_cpf_encrypted && typeof metadata.signup_cpf_encrypted === "object");

  return (
    <AuthLayout eyebrow="E-mail confirmado" title="Revise seus dados" description="Confirme as informações fornecidas no cadastro antes de entrar na plataforma." wide>
      {erro ? <FormMessage tone="error">{errorMessages[erro] ?? "Revise os dados antes de continuar."}</FormMessage> : null}
      <form action={completePublicSignupAction} className="grid gap-4">
        <Label>Seu nome<Input name="preferred_name" defaultValue={preferredName} minLength={2} maxLength={120} autoComplete="name" required /></Label>
        {hasProtectedCpf ? (
          <div className="flex items-start gap-3 rounded-xl border border-success/25 bg-success-soft p-4"><CheckCircle2 className="mt-0.5 shrink-0 text-success" size={20} /><div><p className="font-semibold text-ink">CPF informado e protegido</p><p className="mt-1 text-xs leading-5 text-muted">Por segurança, o número não é exibido novamente. Ele será transferido da área temporária para o cadastro protegido.</p></div></div>
        ) : (
          <Label>CPF<Input name="cpf" inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" minLength={11} maxLength={14} pattern="[0-9.\-]{11,14}" required /></Label>
        )}
        <Label>Telefone<Input name="telefone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 91234-5678" defaultValue={phone} required /></Label>
        <Label>Nome do negócio <span className="font-normal text-muted">(opcional)</span><Input name="business_name" defaultValue={businessName} maxLength={160} autoComplete="organization" /></Label>
        <Label>CNPJ <span className="font-normal text-muted">(opcional)</span><Input name="cnpj" inputMode="numeric" autoComplete="off" placeholder="00.000.000/0000-00" maxLength={18} defaultValue={cnpj} /></Label>
        <Button size="lg" type="submit">Entrar na plataforma</Button>
      </form>
    </AuthLayout>
  );
}