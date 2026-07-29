import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import type { JourneyEditorActivityDetails } from "@/lib/admin/journey-editor";
import type { Trilha, TrilhaAula } from "@/lib/admin/product-management";
import { ActivityContentFields, type ActivityLibraryOption } from "./activity-content-fields";
import { QuickCheckBuilderFields } from "./quick-check-builder-fields";
import { saveAulaAction } from "./actions";

export type EditableTrilhaAula = Omit<TrilhaAula, "assets" | "assessment" | "practice"> & {
  activity_definition_id?: string;
  activity_definition_code?: string;
  estimated_minutes?: number;
  assets: JourneyEditorActivityDetails["assets"];
  assessment: JourneyEditorActivityDetails["assessment"];
  practice: JourneyEditorActivityDetails["practice"];
  step_metadata?: Record<string, unknown>;
};

export type EditableLessonTrack = Omit<Trilha, "aulas"> & { aulas: EditableTrilhaAula[] };
type TrilhaAulaBuilderProps = { journeyVersionId: string; organizationId: string; trilha: EditableLessonTrack; libraryItems: ActivityLibraryOption[] };
type ContentSection = { heading: string; body: string };
type PromptItem = { title: string; text: string };

function recordValue(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function stringValue(value: unknown) { return typeof value === "string" ? value : ""; }
function contentSections(configuration: Record<string, unknown>): ContentSection[] { return Array.isArray(configuration.content_sections) ? configuration.content_sections.map((item) => { const value = recordValue(item); return { heading: stringValue(value.heading), body: stringValue(value.body) }; }).filter((item) => item.heading || item.body) : []; }
function prompts(configuration: Record<string, unknown>): PromptItem[] { return Array.isArray(configuration.prompts) ? configuration.prompts.map((item) => { const value = recordValue(item); return { title: stringValue(value.title), text: stringValue(value.text) }; }).filter((item) => item.title || item.text) : []; }
function practiceChecklist(configuration: Record<string, unknown>) { return Array.isArray(configuration.practice_checklist) ? configuration.practice_checklist.filter((item): item is string => typeof item === "string") : []; }
function aulaSummary(aula: EditableTrilhaAula) { const details: string[] = []; if (aula.assets.length) details.push(`${aula.assets.length} conteúdo(s)`); if (aula.assessment) details.push(`${aula.assessment.questions.length} pergunta(s)`); if (aula.practice) details.push("entrega prática"); return details.length ? details.join(" · ") : "Aula simples"; }

function AulaForm({ journeyVersionId, organizationId, pathTemplateId, libraryItems, aula, position }: { journeyVersionId: string; organizationId: string; pathTemplateId: string; libraryItems: ActivityLibraryOption[]; aula?: EditableTrilhaAula; position: number }) {
  const configuration = aula?.configuration ?? {};
  const sections = contentSections(configuration);
  const promptItems = prompts(configuration);
  const checklist = practiceChecklist(configuration);
  const currentAsset = aula?.assets[0] ?? null;
  const currentLibraryItemVersionId = currentAsset?.library_item_version_id ?? null;
  const isPractice = Boolean(aula?.practice) || aula?.activity_type === "practice";
  const questions = aula?.assessment?.questions.map((question) => ({ prompt: question.prompt, question_type: question.question_type, options: question.options.map((option) => ({ label: option.label, is_correct: option.is_correct })) })) ?? [];
  const hasOptionalResources = sections.length > 0 || promptItems.length > 0 || questions.length > 0 || isPractice;

  return (
    <form action={saveAulaAction} encType="multipart/form-data" className="grid gap-5 border-t border-border p-4">
      <input type="hidden" name="organization_id" value={organizationId} />
      <input type="hidden" name="journey_version_id" value={journeyVersionId} />
      <input type="hidden" name="path_template_id" value={pathTemplateId} />
      <input type="hidden" name="step_id" value={aula?.step_id ?? ""} />
      <input type="hidden" name="step_code" value={aula?.code ?? ""} />
      <input type="hidden" name="activity_definition_id" value={aula?.activity_definition_id ?? ""} />
      <input type="hidden" name="activity_version_id" value={aula?.activity_version_id ?? ""} />
      <input type="hidden" name="activity_definition_code" value={aula?.activity_definition_code ?? ""} />
      <input type="hidden" name="configuration_snapshot" value={JSON.stringify(configuration)} />
      <input type="hidden" name="metadata_snapshot" value={JSON.stringify(aula?.step_metadata ?? {})} />

      <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
        <label className="grid gap-1 text-sm font-medium text-ink">Título<Input name="title" required defaultValue={aula?.title ?? ""} /><span className="text-[11px] font-normal text-muted">Nome mostrado ao participante.</span></label>
        <label className="grid gap-1 text-sm font-medium text-ink">Duração<Input name="estimated_minutes" type="number" min="1" defaultValue={String(aula?.estimated_minutes ?? 10)} required /><span className="text-[11px] font-normal text-muted">Em minutos.</span></label>
      </div>
      <label className="grid gap-1 text-sm font-medium text-ink">O que a pessoa fará<Textarea name="description" rows={2} defaultValue={aula?.description ?? ""} placeholder="Explique em uma frase." /></label>

      <ActivityContentFields items={libraryItems} currentLibraryItemVersionId={currentLibraryItemVersionId} currentAssetPresent={Boolean(currentAsset)} currentContentRequired={currentAsset?.is_required === true} />

      <details className="rounded-2xl border border-border bg-white"><summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-secondary">Ordem e obrigatoriedade</summary><div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2"><label className="grid gap-1 text-sm font-medium text-ink">Ordem<Input name="position" type="number" min="1" defaultValue={String(aula?.position ?? position)} required /><span className="text-[11px] font-normal text-muted">1 aparece antes de 2.</span></label><label className="flex items-start gap-3 rounded-xl bg-surface-muted p-3 text-sm text-ink"><input type="checkbox" name="is_required" defaultChecked={aula?.is_required !== false} className="mt-0.5 size-4 accent-primary" /><span><strong className="block">Aula obrigatória</strong><small className="text-muted">Conta para a conclusão da jornada.</small></span></label></div></details>

      <details className="rounded-2xl border border-primary/20 bg-primary-soft/20" open={hasOptionalResources}>
        <summary className="cursor-pointer px-4 py-3 text-sm font-black text-secondary">Recursos opcionais <span className="font-normal text-muted">· textos, perguntas e entrega</span></summary>
        <div className="grid gap-4 border-t border-border p-4">
          <details className="rounded-xl border border-border bg-white" open={sections.length > 0}><summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-secondary">Texto complementar</summary><div className="grid gap-3 border-t border-border p-4">{[0, 1, 2, 3].map((index) => <div key={index} className="grid gap-2 rounded-xl bg-surface-muted p-3"><Input name={`section_heading_${index}`} defaultValue={sections[index]?.heading ?? ""} placeholder={`Título da parte ${index + 1}`} /><Textarea name={`section_body_${index}`} defaultValue={sections[index]?.body ?? ""} rows={3} placeholder="Texto curto." /></div>)}</div></details>
          <details className="rounded-xl border border-border bg-white" open={promptItems.length > 0}><summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-secondary">Prompts prontos</summary><div className="grid gap-3 border-t border-border p-4">{[0, 1, 2, 3, 4, 5].map((index) => <div key={index} className="grid gap-2 sm:grid-cols-[.7fr_1.3fr]"><Input name={`prompt_title_${index}`} defaultValue={promptItems[index]?.title ?? ""} placeholder={`Nome ${index + 1}`} /><Textarea name={`prompt_text_${index}`} defaultValue={promptItems[index]?.text ?? ""} rows={2} placeholder="Prompt" /></div>)}</div></details>
          <QuickCheckBuilderFields questions={questions} passingScore={aula?.assessment?.passing_score} maxAttempts={aula?.assessment?.max_attempts} />
          <details className="rounded-xl border border-border bg-white" open={isPractice}><summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-secondary">Entrega prática</summary><div className="grid gap-3 border-t border-border p-4"><label className="flex items-start gap-2.5 text-sm text-ink"><input type="checkbox" name="is_closing" value="on" defaultChecked={isPractice} className="mt-0.5 size-4 accent-primary" /><span><strong className="block">Solicitar arquivo ou evidência</strong><small className="text-muted">Desmarcar remove a entrega ao salvar.</small></span></label><label className="grid gap-1 text-sm font-medium text-ink">Checklist<Textarea name="practice_checklist" rows={4} defaultValue={checklist.join("\n")} placeholder="Um item por linha" /></label><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm font-medium text-ink">Forma de envio<Select name="submission_mode" defaultValue={aula?.practice?.submission_mode ?? "file"}><option value="file">Arquivo</option><option value="text">Texto</option><option value="mixed">Arquivo ou texto</option></Select></label><label className="flex items-start gap-2.5 rounded-xl bg-surface-muted p-3 text-sm text-ink"><input type="checkbox" name="review_required" defaultChecked={aula?.practice?.review_required ?? true} className="mt-0.5 size-4 accent-primary" /><span><strong className="block">Exigir revisão</strong><small className="text-muted">A equipe valida a entrega.</small></span></label></div></div></details>
        </div>
      </details>
      <Button type="submit" size="sm" className="w-fit">{aula ? "Salvar aula" : "Adicionar aula"}</Button>
    </form>
  );
}

export function TrilhaAulaBuilder({ journeyVersionId, organizationId, trilha, libraryItems }: TrilhaAulaBuilderProps) {
  const aulas = trilha.aulas.slice().sort((a, b) => a.position - b.position);
  return <article className="grid gap-4 rounded-2xl border border-border bg-surface p-4"><header><h4 className="font-black text-secondary">Aulas de {trilha.name}</h4><p className="text-sm text-muted">Abra somente a aula que deseja alterar.</p></header><section className="grid gap-3">{aulas.map((aula) => <details key={aula.step_id} className="rounded-2xl border border-border bg-white"><summary className="cursor-pointer list-none px-4 py-3 [&::-webkit-details-marker]:hidden"><div className="flex flex-wrap items-start justify-between gap-2"><div><strong className="text-sm text-ink">{aula.position}. {aula.title}</strong><p className="text-xs text-muted">{aulaSummary(aula)}</p></div><span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary">Editar</span></div></summary><AulaForm journeyVersionId={journeyVersionId} organizationId={organizationId} pathTemplateId={trilha.id} libraryItems={libraryItems} aula={aula} position={aula.position} /></details>)}</section><details className="rounded-2xl border border-primary/20 bg-white" open={aulas.length === 0}><summary className="cursor-pointer px-4 py-3 text-sm font-black text-primary">Adicionar aula</summary><AulaForm journeyVersionId={journeyVersionId} organizationId={organizationId} pathTemplateId={trilha.id} libraryItems={libraryItems} position={aulas.length + 1} /></details></article>;
}
