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

  return (
    <AuthLayout
      eyebrow="E-mail confirmado"
      title="Concluir perfil"
      description="O CPF é obrigatório para identificar a mesma pessoa sem duplicidade. Ele é validado, cifrado no servidor e não é gravado em metadata, URL ou logs."
      wide
    >
      {erro ? <FormMessage tone="error">{errorMessages[erro] ?? "Revise os dados antes de continuar."}</FormMessage> : null}
      <form action={completePublicSignupAction} className="grid gap-4">
        <Label>
          Seu nome
          <Input name="preferred_name" defaultValue={preferredName} minLength={2} maxLength={120} autoComplete="name" required />
        </Label>
        <Label>
          CPF
          <Input
            name="cpf"
            inputMode="numeric"
            autoComplete="off"
            placeholder="000.000.000-00"
            minLength={11}
            maxLength={14}
            pattern="[0-9.\-]{11,14}"
            required
            aria-describedby="cpf-protection"
          />
        </Label>
        <p id="cpf-protection" className="-mt-2 text-sm text-muted">
          O sistema mantém uma versão cifrada e um token HMAC de busca. O CPF bruto não é enviado ao HubSpot por padrão.
        </p>
        <Label>
          Nome do negócio <span className="font-normal text-muted">(opcional)</span>
          <Input name="business_name" defaultValue={businessName} maxLength={160} autoComplete="organization" />
        </Label>
        <Button size="lg" type="submit">
          Entrar na plataforma
        </Button>
      </form>
    </AuthLayout>
  );
}
