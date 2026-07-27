import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import type { Trilha, TrilhaAula } from "@/lib/admin/product-management";
import { ActivityContentFields, type ActivityLibraryOption } from "./activity-content-fields";
import { QuickCheckBuilderFields } from "./quick-check-builder-fields";
import { saveAulaAction } from "./actions";

type TrilhaAulaBuilderProps = {
  journeyVersionId: string;
  organizationId: string;
  trilha: Trilha;
  libraryItems: ActivityLibraryOption[];
};

function aulaSummary(aula: TrilhaAula) {
  const details: string[] = [];
  if (aula.assets?.length) details.push(`${aula.assets.length} conteúdo(s)`);
  if (aula.assessment) details.push(`Verificação (${aula.assessment.questions.length})`);
  if (aula.practice) details.push("Entrega prática");
  return details.length ? ` · ${details.join(" · ")}` : "";
}

export function TrilhaAulaBuilder({ journeyVersionId, organizationId, trilha, libraryItems }: TrilhaAulaBuilderProps) {
  const aulas = trilha.aulas.slice().sort((a, b) => a.position - b.position);
  return (
    <article className="grid gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <header className="grid gap-1"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-base font-black text-secondary">{trilha.position}. {trilha.name}</h4><span className="text-xs text-muted">{aulas.length} aula(s) · todas disponíveis</span></div>{trilha.description ? <p className="max-w-3xl text-sm text-muted">{trilha.description}</p> : null}</header>

      <section className="grid gap-2" aria-label={`Aulas de ${trilha.name}`}><h5 className="text-sm font-semibold text-ink">Aulas configuradas</h5>{aulas.length ? aulas.map((aula) => <div key={aula.step_id} className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-border bg-white px-3 py-3"><p className="text-sm text-ink"><strong>{aula.position}. {aula.title}</strong><span className="text-muted">{aulaSummary(aula)}</span></p><span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary">{aula.activity_type === "practice" ? "Encerramento" : "Aula"}</span></div>) : <p className="text-sm text-muted">Nenhuma aula adicionada.</p>}</section>

      <details className="group rounded-2xl border border-primary/20 bg-white" open={aulas.length === 0}>
        <summary className="cursor-pointer px-4 py-3 text-sm font-black text-primary marker:content-none [&::-webkit-details-marker]:hidden">Adicionar aula</summary>
        <form action={saveAulaAction} encType="multipart/form-data" className="grid gap-5 border-t border-border p-4">
          <input type="hidden" name="organization_id" value={organizationId} /><input type="hidden" name="journey_version_id" value={journeyVersionId} /><input type="hidden" name="path_template_id" value={trilha.id} /><input type="hidden" name="position" value={String(aulas.length + 1)} />
          <div className="grid gap-3 sm:grid-cols-[1fr_11rem]"><label className="grid gap-1 text-sm font-medium text-ink">Título<Input name="title" required /><span className="text-[11px] font-normal text-muted">Visível ao participante.</span></label><label className="grid gap-1 text-sm font-medium text-ink">Duração<Input name="estimated_minutes" type="number" min="1" defaultValue="10" required /><span className="text-[11px] font-normal text-muted">Em minutos.</span></label></div>
          <label className="grid gap-1 text-sm font-medium text-ink">Descrição curta<Textarea name="description" rows={2} placeholder="O que a pessoa aprenderá ou fará." /></label>

          <ActivityContentFields items={libraryItems} />

          <details className="rounded-2xl border border-border bg-white"><summary className="cursor-pointer px-4 py-3 text-sm font-black text-secondary">Texto complementar <span className="font-normal text-muted">· opcional</span></summary><div className="grid gap-3 border-t border-border p-4"><p className="text-[11px] text-muted">Use somente quando o conteúdo principal precisar de contexto adicional.</p>{[0, 1].map((index) => <div key={index} className="grid gap-2 rounded-xl bg-surface-muted p-3"><Input name={`section_heading_${index}`} placeholder={`Título da parte ${index + 1}`} /><Textarea name={`section_body_${index}`} rows={3} placeholder="Texto curto." /></div>)}</div></details>

          <details className="rounded-2xl border border-border bg-white"><summary className="cursor-pointer px-4 py-3 text-sm font-black text-secondary">Prompts <span className="font-normal text-muted">· opcional</span></summary><div className="grid gap-3 border-t border-border p-4"><p className="text-[11px] text-muted">Adicione até três prompts prontos para copiar.</p>{[0, 1, 2].map((index) => <div key={index} className="grid gap-2 sm:grid-cols-[.7fr_1.3fr]"><Input name={`prompt_title_${index}`} placeholder={`Nome ${index + 1}`} /><Textarea name={`prompt_text_${index}`} rows={2} placeholder="Prompt" /></div>)}</div></details>

          <QuickCheckBuilderFields />

          <details className="rounded-2xl border border-border bg-white"><summary className="cursor-pointer px-4 py-3 text-sm font-black text-secondary">Entrega prática <span className="font-normal text-muted">· opcional</span></summary><div className="grid gap-3 border-t border-border p-4"><label className="flex items-start gap-2.5 text-sm text-ink"><input type="checkbox" name="is_closing" value="on" className="mt-0.5 size-4 accent-primary" /><span><strong className="block">Solicitar arquivo ou evidência</strong><small className="text-muted">Não bloqueia outras aulas.</small></span></label><label className="grid gap-1 text-sm font-medium text-ink">Checklist<Textarea name="practice_checklist" rows={4} placeholder="Um item por linha" /></label><label className="grid gap-1 text-sm font-medium text-ink">Selo relacionado<Input name="badge_title" /><span className="text-[11px] font-normal text-muted">Opcional.</span></label></div></details>
          <Button type="submit" size="sm" className="w-fit">Salvar aula</Button>
        </form>
      </details>
    </article>
  );
}
