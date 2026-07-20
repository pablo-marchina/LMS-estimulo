import { redirect } from "next/navigation";
import { EstimuloBrand } from "@/components/estimulo-brand";
import { getAuthContext } from "@/lib/auth/context";
import { createSessionClient } from "@/lib/supabase/server";
import { completePublicSignupAction } from "./actions";

export const dynamic = "force-dynamic";

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

  return <main className="auth-page">
    <section className="auth-card auth-card--wide">
      <EstimuloBrand centered />
      <div className="auth-heading">
        <p className="eyebrow">E-mail confirmado</p>
        <h1>Concluir perfil</h1>
        <p>Confirme os dados do perfil. Eles não concedem acesso administrativo.</p>
      </div>
      {erro ? <p className="form-message form-message--error" role="alert">Revise os dados antes de continuar.</p> : null}
      <form action={completePublicSignupAction} className="stack">
        <label>Seu nome<input name="preferred_name" defaultValue={preferredName} minLength={2} maxLength={120} autoComplete="name" required /></label>
        <label>Nome do negócio <span className="metadata">(opcional)</span><input name="business_name" defaultValue={businessName} maxLength={160} autoComplete="organization" /></label>
        <button className="button button--primary button--large" type="submit">Entrar na plataforma</button>
      </form>
    </section>
  </main>;
}
