import { ClipboardList, FileUp } from "lucide-react";
import { saveExtensionAction } from "@/app/admin/extension-actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import type { JsonRecord } from "@/lib/extensions/runtime";

function text(value: unknown) { return typeof value === "string" ? value : ""; }
function number(value: unknown, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function record(value: unknown): JsonRecord { return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}; }
function records(value: unknown): JsonRecord[] { return Array.isArray(value) ? value.filter((item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : []; }
function referenceText(value: unknown) { return Array.isArray(value) ? value.map((item) => typeof item === "string" ? item : text(record(item).content)).filter(Boolean).join("\n") : ""; }

const formats = [["text","Texto"],["external_link","Link"],["image","Imagem"],["pdf","PDF"],["document","Documento"],["spreadsheet","Planilha"],["code","Código"],["zip","ZIP"],["audio","Áudio"],["video","Vídeo"]] as const;
const gradingLabels: Record<string,string> = { ai_human_review: "IA sugere e uma pessoa aprova", automatic: "IA publica quando estiver segura", ai_assistant: "IA apenas auxilia" };

export function AdminDeliveryConfigurationManager({
  configurations,
  libraryItems,
  activities,
}: {
  configurations: JsonRecord[];
  libraryItems: JsonRecord[];
  activities: JsonRecord[];
}) {
  return <div className="grid gap-5">
    <Card className="grid gap-4">
      <div className="flex items-start gap-3"><FileUp className="mt-0.5 text-primary" /><div><h2 className="text-lg font-black text-secondary">Nova atividade com entrega</h2><p className="text-sm text-muted">Associe uma entrega a um conteúdo da biblioteca ou a uma aula. A correção recebida será acompanhada em Operação.</p></div></div>
      <DeliveryForm libraryItems={libraryItems} activities={activities} />
    </Card>

    <section className="grid gap-3">
      <div className="flex items-start gap-3"><ClipboardList className="mt-0.5 text-primary" /><div><h2 className="text-lg font-black text-secondary">Configurações existentes</h2><p className="text-sm text-muted">Critérios e formatos ficam junto do conteúdo; as respostas enviadas ficam em Operação → Entregas.</p></div></div>
      {configurations.length === 0 ? <Card><p className="text-sm text-muted">Nenhuma entrega configurada.</p></Card> : <div className="grid gap-3 lg:grid-cols-2">{configurations.map((configuration) => <Card key={text(configuration.id)} className="grid gap-3"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-ink">{text(configuration.title)}</h3><p className="text-sm text-muted">{text(configuration.target_title)}</p></div><StatusPill tone={text(configuration.status) === "active" ? "success" : "neutral"}>{text(configuration.status) === "active" ? "Ativa" : text(configuration.status) === "inactive" ? "Inativa" : "Rascunho"}</StatusPill></div><p className="line-clamp-3 text-sm text-muted">{text(configuration.instructions)}</p><p className="text-xs text-muted">{number(configuration.submission_count)} envio(s) · {gradingLabels[text(configuration.grading_mode)] ?? "Correção configurada"}</p><details className="rounded-xl border border-border"><summary className="cursor-pointer p-3 text-sm font-bold text-secondary">Editar configuração</summary><div className="border-t border-border p-4"><DeliveryForm configuration={configuration} libraryItems={libraryItems} activities={activities} /></div></details></Card>)}</div>}
    </section>
  </div>;
}

function DeliveryForm({ configuration = {}, libraryItems, activities }: { configuration?: JsonRecord; libraryItems: JsonRecord[]; activities: JsonRecord[] }) {
  const targetType = text(configuration.target_type) || "library";
  const targetId = targetType === "library" ? text(configuration.library_item_version_id) : text(configuration.activity_version_id);
  const selectedFormats = Array.isArray(configuration.allowed_submission_types) ? configuration.allowed_submission_types.map(String) : ["text"];
  const rubric = record(configuration.rubric);
  const criteria = records(rubric.criteria);
  const points = record(configuration.points_configuration);
  const fileSizeMb = Math.max(1, Math.round(number(configuration.max_file_size_bytes, 26214400) / 1024 / 1024));

  return <form action={saveExtensionAction} className="grid gap-3 sm:grid-cols-2">
    <input type="hidden" name="resource_type" value="delivery_configuration" />
    <input type="hidden" name="return_to" value="/admin/biblioteca?view=entregas" />
    <input type="hidden" name="array_fields" value="allowed_submission_types,required_submission_types" />
    <input type="hidden" name="boolean_fields" value="allow_late,allow_resubmit" />
    <input type="hidden" name="id" value={text(configuration.id)} />

    <Label>Onde será usada<Select name="target_type" defaultValue={targetType}><option value="library">Conteúdo da biblioteca</option><option value="activity">Aula de uma jornada</option></Select></Label>
    <Label>Conteúdo ou aula<Select name="target_id" defaultValue={targetId} required><option value="">Selecione</option><optgroup label="Biblioteca">{libraryItems.map((item) => <option key={text(item.library_item_version_id)} value={text(item.library_item_version_id)}>{text(item.title)}</option>)}</optgroup><optgroup label="Aulas">{activities.map((item) => <option key={text(item.id)} value={text(item.id)}>{text(item.title)}</option>)}</optgroup></Select></Label>
    <Label className="sm:col-span-2">Título da entrega<Input name="title" defaultValue={text(configuration.title)} placeholder="Ex.: Plano de ação" required /></Label>
    <Label className="sm:col-span-2">O que deve ser enviado<Textarea name="instructions" rows={3} defaultValue={text(configuration.instructions)} required /></Label>
    <Label>Como será corrigida<Select name="grading_mode" defaultValue={text(configuration.grading_mode) || "ai_human_review"}><option value="ai_human_review">IA sugere e administrador aprova</option><option value="automatic">IA publica quando estiver segura</option><option value="ai_assistant">IA apenas auxilia</option></Select></Label>
    <Label>Disponibilidade<Select name="status" defaultValue={text(configuration.status) || "active"}><option value="draft">Salvar como rascunho</option><option value="active">Disponibilizar</option><option value="inactive">Retirar temporariamente</option></Select></Label>

    <details className="rounded-xl border border-border sm:col-span-2"><summary className="cursor-pointer p-3 text-sm font-bold text-secondary">Formatos, prazo e tentativas</summary><div className="grid gap-3 border-t border-border p-3 sm:grid-cols-2"><fieldset className="grid gap-2 rounded-xl bg-surface-muted p-3 sm:col-span-2"><legend className="text-sm font-bold text-secondary">Formatos aceitos</legend><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{formats.map(([format,label]) => <label key={format} className="flex items-center gap-2 text-sm"><input type="checkbox" name="allowed_submission_types" value={format} defaultChecked={selectedFormats.includes(format)} className="accent-primary" />{label}</label>)}</div></fieldset><Label>Máximo de arquivos<Input name="max_files" type="number" min="0" max="20" defaultValue={String(number(configuration.max_files, 5))} /></Label><Label>Tamanho por arquivo (MB)<Input name="max_file_size_mb" type="number" min="1" max="100" defaultValue={String(fileSizeMb)} /></Label><Label>Tentativas máximas<Input name="max_attempts" type="number" min="1" defaultValue={configuration.max_attempts === null ? "" : String(number(configuration.max_attempts))} placeholder="Vazio = sem limite" /></Label><Label>Nota mínima<Input name="passing_score" type="number" min="0" max="100" step="0.01" defaultValue={configuration.passing_score === null ? "" : String(number(configuration.passing_score))} /></Label><Label>Nota considerada<Select name="grade_strategy" defaultValue={text(configuration.grade_strategy) || "highest"}><option value="highest">Maior nota</option><option value="latest">Última tentativa</option><option value="average">Média</option></Select></Label><Label>Prazo<Input name="due_at" type="datetime-local" defaultValue={text(configuration.due_at).slice(0,16)} /></Label><label className="flex items-center gap-2 text-sm"><input type="hidden" name="allow_late" value="false" /><input type="checkbox" name="allow_late" value="true" defaultChecked={configuration.allow_late === true} className="accent-primary" />Aceitar após o prazo</label><label className="flex items-center gap-2 text-sm"><input type="hidden" name="allow_resubmit" value="false" /><input type="checkbox" name="allow_resubmit" value="true" defaultChecked={configuration.allow_resubmit !== false} className="accent-primary" />Permitir nova tentativa</label></div></details>

    <details className="rounded-xl border border-border sm:col-span-2"><summary className="cursor-pointer p-3 text-sm font-bold text-secondary">Critérios da correção</summary><div className="grid gap-4 border-t border-border p-3">{[0,1,2,3].map((index) => { const criterion = criteria[index] ?? {}; return <fieldset key={index} className="grid gap-3 rounded-xl bg-surface-muted p-3 sm:grid-cols-[1fr_120px]"><legend className="px-1 text-sm font-bold text-secondary">Critério {index+1}</legend><Label>Nome<Input name={`criterion_name_${index}`} defaultValue={text(criterion.name)} placeholder={index === 0 ? "Ex.: Clareza e aplicação prática" : "Opcional"} /></Label><Label>Peso<Input name={`criterion_weight_${index}`} type="number" min="1" max="10" defaultValue={criterion.weight ? String(number(criterion.weight,1)) : "1"} /></Label><Label className="sm:col-span-2">O que observar<Textarea name={`criterion_description_${index}`} rows={2} defaultValue={text(criterion.description)} /></Label></fieldset>; })}<Label>Orientações adicionais para a IA<Textarea name="ai_instructions" rows={3} defaultValue={text(configuration.ai_instructions)} placeholder="Ex.: valorize exemplos concretos e não desconte pontos por ortografia." /></Label><Label>Referências para correção<Textarea name="reference_material_text" rows={4} defaultValue={referenceText(configuration.reference_material)} placeholder="Uma referência por linha." /></Label></div></details>

    <details className="rounded-xl border border-border sm:col-span-2"><summary className="cursor-pointer p-3 text-sm font-bold text-secondary">Pontos opcionais</summary><div className="grid gap-3 border-t border-border p-3 sm:grid-cols-3"><Label>Ao enviar<Input name="points_on_submit" type="number" min="0" defaultValue={String(number(points.on_submit))} /></Label><Label>Ao aprovar<Input name="points_on_approve" type="number" min="0" defaultValue={String(number(points.on_approve))} /></Label><Label>Máximo<Input name="points_maximum" type="number" min="0" defaultValue={String(number(points.max_points))} /></Label><label className="flex items-center gap-2 text-sm sm:col-span-3"><input type="checkbox" name="points_proportional" defaultChecked={points.proportional_to_score === true} className="accent-primary" />Calcular os pontos proporcionalmente à nota</label></div></details>

    <PendingSubmitButton pendingLabel="Salvando…" className="w-fit sm:col-span-2">Salvar configuração</PendingSubmitButton>
  </form>;
}
