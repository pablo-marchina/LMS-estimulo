import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { getAdminGamificationWorkspace } from "@/lib/admin/gamification-management";
import type { Trilha } from "@/lib/admin/product-management";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { saveTrackAction } from "./track-save-action";

export type EditableTrilha = Omit<Trilha, "aulas"> & {
  aulas: Array<unknown>;
  is_default?: boolean;
  status?: string;
};

function stringValue(value: unknown) { return typeof value === "string" ? value : ""; }

export async function TrilhaEditor({ journeyVersionId, trilha }: { journeyVersionId: string; trilha: EditableTrilha }) {
  if (trilha.status === "retired") return null;

  const presentation = trilha.presentation ?? {};
  const tone = stringValue(presentation.tone) || "cyan";
  const icon = stringValue(presentation.icon) || "sparkles";
  const completionBadgeVersionId = stringValue(presentation.completion_badge_version_id);
  const auth = await getAuthContext();
  const organization = auth.status === "authenticated" ? administrativeOrganization(auth.identity) : null;
  const gamification = auth.status === "authenticated" && organization
    ? await getAdminGamificationWorkspace(auth.identity.user_account_id, organization.organization_id).catch(() => null)
    : null;
  const badgeOptions = (gamification?.badges ?? [])
    .filter((definition) => definition.status !== "retired")
    .flatMap((definition) => {
      const published = definition.versions
        .filter((version) => version.status === "published")
        .slice()
        .sort((a, b) => b.version_number - a.version_number)[0];
      return published ? [{ id: String(published.id), title: stringValue(published.title) || definition.name }] : [];
    })
    .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));

  return (
    <details className="rounded-2xl border border-border bg-white shadow-sm">
      <summary className="cursor-pointer list-none px-4 py-4 [&::-webkit-details-marker]:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><span className="text-xs font-bold text-primary">TRILHA {trilha.position}</span><h3 className="font-black text-secondary">{trilha.name}</h3><p className="text-sm text-muted">{trilha.aulas.length} aula(s) · {trilha.is_required === false ? "opcional" : "principal"}</p></div><span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">Editar</span></div>
      </summary>
      <div className="grid gap-5 border-t border-border p-4">
        <form action={saveTrackAction} className="grid gap-4">
          <input type="hidden" name="journey_version_id" value={journeyVersionId} />
          <input type="hidden" name="path_template_id" value={trilha.id} />
          <input type="hidden" name="code" value={trilha.code} />
          <label className="grid gap-1 text-sm font-medium text-ink">Nome<Input name="name" required defaultValue={trilha.name} /><span className="text-[11px] font-normal text-muted">É o nome que o participante escolhe na jornada.</span></label>
          <label className="grid gap-1 text-sm font-medium text-ink">Explicação curta<Textarea name="description" rows={2} defaultValue={trilha.description ?? ""} /><span className="text-[11px] font-normal text-muted">Uma frase sobre o que será aprendido.</span></label>
          <details className="rounded-xl border border-border"><summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-secondary">Opções da trilha</summary><div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2"><label className="grid gap-1 text-sm font-medium text-ink">Ordem<Input name="position" type="number" min="1" required defaultValue={String(trilha.position)} /><span className="text-[11px] font-normal text-muted">1 aparece antes de 2.</span></label><label className="grid gap-1 text-sm font-medium text-ink">Cor<Select name="tone" defaultValue={tone}><option value="cyan">Ciano</option><option value="magenta">Magenta</option><option value="green">Verde</option><option value="yellow">Amarelo</option><option value="orange">Laranja</option><option value="violet">Violeta</option></Select></label><label className="grid gap-1 text-sm font-medium text-ink">Ícone<Select name="icon" defaultValue={icon}><option value="sparkles">Brilhos</option><option value="rocket">Foguete</option><option value="book-open">Livro</option><option value="lightbulb">Ideia</option></Select></label><div className="grid gap-2"><label className="flex items-start gap-3 rounded-xl bg-surface-muted p-3 text-sm text-ink"><input type="checkbox" name="is_required" defaultChecked={trilha.is_required !== false} className="mt-0.5 size-4 accent-primary" /><span><strong className="block">Conta para conclusão</strong><small className="text-muted">Desmarque para tornar opcional.</small></span></label><label className="flex items-start gap-3 rounded-xl bg-surface-muted p-3 text-sm text-ink"><input type="checkbox" name="is_default" defaultChecked={trilha.is_default === true} className="mt-0.5 size-4 accent-primary" /><span><strong className="block">Trilha padrão</strong><small className="text-muted">Usada como caminho inicial.</small></span></label></div><label className="grid gap-1 text-sm font-medium text-ink sm:col-span-2">Selo ao concluir<Select name="completion_badge_version_id" defaultValue={completionBadgeVersionId}><option value="">Sem selo</option>{badgeOptions.map((badge) => <option key={badge.id} value={badge.id}>{badge.title}</option>)}</Select><span className="text-[11px] font-normal text-muted">Cadastre e publique o selo em Pontuação → Selos. A trilha apenas define qual selo será concedido ao concluir.</span></label></div></details>
          <Button type="submit" size="sm" className="w-fit">Salvar trilha</Button>
        </form>
      </div>
    </details>
  );
}
