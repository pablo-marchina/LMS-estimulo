import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { redirect } from "next/navigation";
import { AuthLayout, FormMessage } from "@/components/auth-layout";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { PhoneField } from "@/components/phone-field";
import { Input, Label } from "@/components/ui/input";
import { getAuthContext } from "@/lib/auth/context";
import { getCurrentSignupLegalSnapshot, type SignupLegalSnapshot } from "@/lib/auth/public-signup-provisioning";
import { participantCopy } from "@/lib/content/participant-copy";
import { createSessionClient } from "@/lib/supabase/server";
import { completePublicSignupAction } from "./actions";

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  dados_invalidos: "Revise os dados antes de continuar.",
  cpf_invalido: "Informe um CPF válido.",
  cpf_ja_vinculado: "Este CPF já está vinculado a outra conta. Entre com o acesso anterior ou procure o suporte para recuperar seu cadastro.",
  cpf_revisao_necessaria: "A alteração do CPF exige revisão de identidade pelo suporte.",
  telefone_invalido: "Informe um telefone válido, com DDD.",
  cnpj_invalido: "Informe um CNPJ válido ou deixe o campo em branco.",
  cnpj_ja_vinculado: "Este CNPJ já está associado a outro negócio. Se o negócio é seu, procure o suporte para confirmar o vínculo com segurança.",
  cnpj_requer_nome_negocio: "Para informar um CNPJ, preencha também o nome do negócio.",
  protecao_cpf_indisponivel: "O serviço seguro de proteção do CPF está temporariamente indisponível. Nenhum CPF foi armazenado.",
  aceite_legal_necessario: "Para concluir uma conta criada antes da atualização dos documentos legais, confirme os Termos de Uso e a Política de Privacidade vigentes.",
  aceite_legal_invalido: "Os documentos legais mudaram enquanto você preenchia o formulário. Revise as versões atuais e confirme novamente.",
  aceite_legal_indisponivel: "Sua sessão está ativa, mas não foi possível registrar o aceite legal com segurança. Tente novamente.",
  provisionamento_falhou: "Não foi possível concluir o perfil agora. Os dados protegidos não foram parcialmente gravados.",
};

function hasSignupLegalSnapshotToken(metadata: Record<string, unknown>): boolean {
  return typeof metadata.signup_legal_snapshot_token === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(metadata.signup_legal_snapshot_token);
}

export default async function CompleteSignupPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") redirect("/entrar?erro=confirmacao_necessaria");
  if (auth.identity.access_mode === "administrative") redirect(auth.identity.next_path || "/admin");
  if (auth.identity.entrepreneur_id) redirect("/empreendedor");

  const client = await createSessionClient();
  const { data } = await client.auth.getUser();
  const metadata = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
  const preferredName = typeof metadata.preferred_name === "string" ? metadata.preferred_name : "";
  const businessName = typeof metadata.business_name === "string" ? metadata.business_name : "";
  const phone = typeof metadata.signup_phone_e164 === "string" ? metadata.signup_phone_e164 : "";
  const cnpj = typeof metadata.signup_cnpj === "string" ? metadata.signup_cnpj : "";
  const hasProtectedCpf = Boolean(metadata.signup_cpf_encrypted && typeof metadata.signup_cpf_encrypted === "object");
  const needsLegacyLegalAcceptance = !hasSignupLegalSnapshotToken(metadata);
  let legalSnapshot: SignupLegalSnapshot | null = null;

  if (needsLegacyLegalAcceptance) {
    try {
      legalSnapshot = await getCurrentSignupLegalSnapshot();
    } catch {
      return (
        <AuthLayout
          eyebrow="E-mail confirmado"
          title="Sua sessão foi iniciada"
          description="Seu acesso foi autenticado, mas a conclusão do perfil depende dos documentos legais vigentes."
          wide
        >
          <FormMessage tone="error">
            Não foi possível carregar com segurança as versões publicadas dos Termos de Uso e da Política de Privacidade. Seu login não foi rejeitado; recarregue esta etapa quando os documentos estiverem disponíveis.
          </FormMessage>
          <Link href="/cadastro/concluir" className="font-semibold text-primary hover:underline">
            Tentar carregar novamente
          </Link>
        </AuthLayout>
      );
    }
  }

  return (
    <AuthLayout eyebrow="E-mail confirmado" title="Revise seus dados" description="Confirme as informações de identificação e contato antes de entrar na plataforma." wide>
      {erro ? <FormMessage tone="error">{errorMessages[erro] ?? "Revise os dados antes de continuar."}</FormMessage> : null}
      <form action={completePublicSignupAction} className="grid gap-4">
        <Label>Seu nome<Input name="preferred_name" defaultValue={preferredName} minLength={2} maxLength={120} autoComplete="name" required /></Label>
        {hasProtectedCpf ? (
          <div className="flex items-start gap-3 rounded-xl border border-success/25 bg-success-soft p-4"><CheckCircle2 className="mt-0.5 shrink-0 text-success" size={20} /><div><p className="font-semibold text-ink">{participantCopy.cpf.protectedTitle}</p><p className="mt-1 text-xs leading-5 text-muted">{participantCopy.cpf.protectedDescription}</p></div></div>
        ) : (
          <div className="grid gap-1.5"><Label>CPF<Input name="cpf" inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" minLength={11} maxLength={14} pattern="[0-9.\-]{11,14}" required /></Label><p className="text-xs leading-5 text-muted">CPF é obrigatório. {participantCopy.cpf.inputDescription}</p></div>
        )}
        <PhoneField defaultValue={phone} />
        <Label>Nome do negócio <span className="font-normal text-muted">(opcional)</span><Input name="business_name" defaultValue={businessName} maxLength={160} autoComplete="organization" /></Label>
        <div className="grid gap-1.5"><Label>CNPJ <span className="font-normal text-muted">(opcional)</span><Input name="cnpj" inputMode="numeric" autoComplete="off" placeholder="00.000.000/0000-00" maxLength={18} defaultValue={cnpj} /></Label><p className="text-xs leading-5 text-muted">Informe somente se deseja vincular este negócio à sua conta. O CNPJ será validado e não ficará exposto na plataforma.</p></div>

        {legalSnapshot ? (
          <section className="grid gap-3 rounded-xl border border-primary/20 bg-primary-soft/45 p-4">
            <div>
              <p className="font-semibold text-ink">Confirmação legal necessária para esta conta</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Sua conta foi criada antes do snapshot imutável de consentimento. Para concluir o perfil, confirme agora as versões exatas abaixo. Depois disso, novos logins não repetirão esta etapa enquanto essas versões permanecerem válidas.
              </p>
            </div>
            <input type="hidden" name="terms_document_version_id" value={legalSnapshot.terms.id} />
            <input type="hidden" name="privacy_document_version_id" value={legalSnapshot.privacy.id} />
            <label className="flex items-start gap-2.5 text-sm text-ink">
              <input name="terms" type="checkbox" value="accepted" required className="mt-0.5 size-4 accent-primary" />
              <span>
                Li e aceito os{" "}
                <Link href={`/termos?version=${encodeURIComponent(legalSnapshot.terms.id)}`} className="font-semibold text-primary hover:underline" target="_blank">
                  Termos de Uso (versão {legalSnapshot.terms.version_number})
                </Link>{" "}
                e a{" "}
                <Link href={`/privacidade?version=${encodeURIComponent(legalSnapshot.privacy.id)}`} className="font-semibold text-primary hover:underline" target="_blank">
                  Política de Privacidade (versão {legalSnapshot.privacy.version_number})
                </Link>
                .
              </span>
            </label>
          </section>
        ) : null}

        <PendingSubmitButton pendingLabel="Criando seu perfil…" size="lg">Entrar na plataforma</PendingSubmitButton>
      </form>
    </AuthLayout>
  );
}
