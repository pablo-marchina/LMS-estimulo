import Link from "next/link";
import { redirect } from "next/navigation";
import { StatusPanel } from "@/components/status-panel";
import { ButtonLink } from "@/components/ui/button";
import { getAuthContext } from "@/lib/auth/context";
import { isEstimuloAdministrativeEmail } from "@/lib/auth/administrative-email";
import { safeParticipantPreviewRoute } from "@/lib/interface-preview/constants";

export const dynamic = "force-dynamic";

export default async function ParticipantInterfacePreview({
  searchParams,
}: {
  searchParams: Promise<{ route?: string; erro?: string }>;
}) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated" || !isEstimuloAdministrativeEmail(auth.email)) {
    redirect("/entrar/administracao?erro=acesso_nao_autorizado");
  }

  if (!query.erro) {
    const route = safeParticipantPreviewRoute(query.route);
    redirect(`/interface-preview/participant/start?route=${encodeURIComponent(route)}`);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-surface-muted p-6">
      <div className="w-full max-w-lg">
        <StatusPanel title="Prévia participante indisponível" tone="warning">
          Não existe um participante ativo com perfil concluído para exibir a interface real. Cadastre ou ative um participante e abra a prévia novamente.
        </StatusPanel>
        <div className="mt-4 flex flex-wrap gap-3">
          <ButtonLink href="/admin/usuarios">Gerenciar participantes</ButtonLink>
          <Link href="/admin/experiencia" className="inline-flex items-center text-sm font-bold text-primary hover:underline">
            Voltar à interface
          </Link>
        </div>
      </div>
    </main>
  );
}
