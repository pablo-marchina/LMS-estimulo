import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import type { Trilha } from "@/lib/admin/product-management";
import { saveTrilhaAction } from "./actions";
import { savePathBadgeAction } from "./badge-actions";

export type EditableTrilha = Omit<Trilha, "aulas"> & {
  aulas: Array<unknown>;
  is_default?: boolean;
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function TrilhaEditor({
  journeyVersionId,
  trilha,
  lessonsHref,
}: {
  journeyVersionId: string;
  trilha: EditableTrilha;
  lessonsHref: string;
}) {
  const presentation = trilha.presentation ?? {};
  const tone = stringValue(presentation.tone) || "cyan";
  const icon = stringValue(presentation.icon) || "sparkles";

  return (
    <details className="rounded-2xl border border-border bg-white shadow-sm">
      <summary className="cursor-pointer list-none px-4 py-4 [&::-webkit-details-marker]:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-primary">TRILHA {trilha.position}</span>
            <h3 className="font-black text-secondary">{trilha.name}</h3>
            <p className="text-sm text-muted">{trilha.aulas.length} aula(s) · {trilha.is_required === false ? "opcional" : "principal"}</p>
          </div>
          <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">Editar trilha</span>
        </div>
      </summary>

      <div className="grid gap-4 border-t border-border p-4">
        <form action={saveTrilhaAction} className="grid gap-4">
          <input type="hidden" name="journey_version_id" value={journeyVersionId} />
          <input type="hidden" name="path_template_id" value={trilha.id} />
          <input type="hidden" name="code" value={trilha.code} />

          <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
            <label className="grid gap-1 text-sm font-medium text-ink">Nome<Input name="name" required defaultValue={trilha.name} /></label>
            <label className="grid gap-1 text-sm font-medium text-ink">Posição<Input name="position" type="number" min="1" required defaultValue={String(trilha.position)} /></label>
          </div>
          <label className="grid gap-1 text-sm font-medium text-ink">Descrição<Textarea name="description" rows={2} defaultValue={trilha.description ?? ""} /></label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-ink">Cor<Select name="tone" defaultValue={tone}><option value="cyan">Ciano</option><option value="magenta">Magenta</option><option value="green">Verde</option><option value="yellow">Amarelo</option><option value="orange">Laranja</option><option value="violet">Violeta</option></Select></label>
            <label className="grid gap-1 text-sm font-medium text-ink">Ícone<Select name="icon" defaultValue={icon}><option value="sparkles">Brilhos</option><option value="rocket">Foguete</option><option value="book-open">Livro</option><option value="lightbulb">Ideia</option></Select></label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm text-ink"><input type="checkbox" name="is_required" defaultChecked={trilha.is_required !== false} className="mt-0.5 size-4 accent-primary" /><span><strong className="block">Conta para conclusão</strong><small className="text-muted">Desmarque para tornar opcional.</small></span></label>
            <label className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm text-ink"><input type="checkbox" name="is_default" defaultChecked={trilha.is_default === true} className="mt-0.5 size-4 accent-primary" /><span><strong className="block">Trilha padrão</strong><small className="text-muted">Usada como caminho inicial quando aplicável.</small></span></label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm">Salvar trilha</Button>
            <ButtonLink href={lessonsHref} variant="secondary" size="sm">Editar aulas</ButtonLink>
          </div>
        </form>

        <form action={savePathBadgeAction} className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-2">
          <input type="hidden" name="journey_version_id" value={journeyVersionId} />
          <input type="hidden" name="path_template_id" value={trilha.id} />
          <div className="col-span-full"><h4 className="text-sm font-black text-secondary">Selo da trilha</h4><p className="text-[11px] text-muted">Edite os textos ou deixe o título vazio para remover o selo desta versão.</p></div>
          <label className="grid gap-1 text-sm font-medium text-ink">Título<Input name="badge_title" defaultValue={trilha.badge?.title ?? ""} placeholder="Sem selo" /></label>
          <label className="grid gap-1 text-sm font-medium text-ink">Descrição<Input name="badge_description" defaultValue={trilha.badge?.description ?? ""} placeholder="Como o selo será apresentado" /></label>
          <Button type="submit" variant="secondary" size="sm" className="w-fit">Salvar selo</Button>
        </form>
      </div>
    </details>
  );
}
