"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AdminDisclosure } from "@/components/admin-section-nav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import {
  diagnosticResultBlocks,
  normalizeDiagnosticResultBlocks,
  type DiagnosticProfileResultContent,
  type DiagnosticResultContentByProfile,
} from "@/lib/diagnostics/result-blocks";
import { saveDiagnosticAction } from "./actions";

export type DiagnosticProfileInput = { code: string; name: string; description: string };
export type DiagnosticDimensionInput = { code: string; name: string; description: string };
export type DiagnosticQuestionInput = { prompt: string; dimension_code: string; options: Array<{ label: string; score: number | string }> };
export type DiagnosticRuleInput = { archetype_code: string; thresholds: Record<string, number | string> };

export type DiagnosticBuilderInitial = {
  definitionId: string;
  versionId: string;
  definitionCode: string;
  name: string;
  purpose: string;
  profiles: DiagnosticProfileInput[];
  dimensions: DiagnosticDimensionInput[];
  questions: DiagnosticQuestionInput[];
  defaultProfileCode: string;
  rules: DiagnosticRuleInput[];
  resultBlocks?: string[];
  resultContent?: DiagnosticResultContentByProfile;
};

type DiagnosticBuilderProps = {
  initial: DiagnosticBuilderInitial;
  previousProfiles: DiagnosticProfileInput[];
  canPublish: boolean;
};

function codeFrom(value: string, fallback: string) {
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);
  return /^[a-z][a-z0-9_-]{1,79}$/.test(normalized) ? normalized : fallback;
}

function blankOptions() {
  return [1, 2, 3, 4].map((score) => ({ label: "", score }));
}

function blankProfileResultContent(): DiagnosticProfileResultContent {
  return {
    strength: { title: "", body: "" },
    challenge: { title: "", body: "" },
    practical_tip: { title: "", body: "" },
    takeaway: { title: "", body: "" },
  };
}

function cloneProfileResultContent(value?: DiagnosticProfileResultContent): DiagnosticProfileResultContent {
  const fallback = blankProfileResultContent();
  if (!value) return fallback;
  return {
    strength: { ...value.strength },
    challenge: { ...value.challenge },
    practical_tip: { ...value.practical_tip },
    takeaway: { ...value.takeaway },
  };
}

const resultCopySections: Array<{ key: keyof DiagnosticProfileResultContent; label: string; help: string }> = [
  { key: "strength", label: "Pontos fortes", help: "Capacidades que já favorecem este perfil." },
  { key: "challenge", label: "Próximo desafio", help: "Principal oportunidade de evolução deste perfil." },
  { key: "practical_tip", label: "Dica prática", help: "Uma ação concreta que a pessoa pode aplicar agora." },
  { key: "takeaway", label: "Frase para levar", help: "Mensagem curta de fechamento para este perfil." },
];

function ProfileResultCopyFields({
  index,
  value,
  onChange,
}: {
  index: number;
  value: DiagnosticProfileResultContent;
  onChange: (section: keyof DiagnosticProfileResultContent, field: "title" | "body", nextValue: string) => void;
}) {
  return <details className="sm:col-span-2 rounded-xl border border-border bg-surface-muted/35">
    <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-secondary">Textos exibidos no resultado deste perfil</summary>
    <div className="grid gap-4 border-t border-border p-4">
      <p className="text-xs leading-5 text-muted">Preencha somente o que quiser personalizar. Títulos e textos são opcionais; título vazio não cria uma trava ao salvar. Se nenhum campo for preenchido, versões antigas continuam usando o texto padrão atual.</p>
      {resultCopySections.map((section) => <div key={section.key} className="grid gap-3 rounded-xl border border-border bg-white p-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><strong className="text-sm text-secondary">{section.label}</strong><p className="mt-1 text-xs text-muted">{section.help}</p></div>
        <Label>Título <span className="font-normal text-muted">(opcional)</span><Input name={`profile_result_${section.key}_title_${index}`} value={value[section.key].title} onChange={(event) => onChange(section.key, "title", event.target.value)} placeholder="Deixe em branco para não mostrar título" /></Label>
        <Label>Texto <span className="font-normal text-muted">(opcional)</span><Textarea name={`profile_result_${section.key}_body_${index}`} rows={3} value={value[section.key].body} onChange={(event) => onChange(section.key, "body", event.target.value)} placeholder="Texto mostrado ao participante" /></Label>
      </div>)}
    </div>
  </details>;
}

export function DiagnosticBuilder({ initial, previousProfiles, canPublish }: DiagnosticBuilderProps) {
  const initialProfiles = initial.profiles.length ? initial.profiles : [{ code: "perfil_1", name: "Novo perfil", description: "" }];
  const [profiles, setProfiles] = useState<DiagnosticProfileInput[]>(initialProfiles);
  const [profileResultContent, setProfileResultContent] = useState<DiagnosticProfileResultContent[]>(() => initialProfiles.map((profile) => cloneProfileResultContent(initial.resultContent?.[profile.code])));
  const [dimensions, setDimensions] = useState<DiagnosticDimensionInput[]>(initial.dimensions.length ? initial.dimensions : [{ code: "dimensao_1", name: "Nova dimensão", description: "" }]);
  const [questions, setQuestions] = useState<DiagnosticQuestionInput[]>(initial.questions.length ? initial.questions : [{ prompt: "", dimension_code: initial.dimensions[0]?.code ?? "dimensao_1", options: blankOptions() }]);
  const [defaultProfileCode, setDefaultProfileCode] = useState(initial.defaultProfileCode || initial.profiles[0]?.code || "perfil_1");
  const [publishNow, setPublishNow] = useState(false);
  const [mapping, setMapping] = useState<Record<string, string>>(() => Object.fromEntries(previousProfiles.map((profile) => [profile.code, initial.profiles.some((item) => item.code === profile.code) ? profile.code : initial.profiles[0]?.code ?? ""])));
  const enabledResultBlocks = useMemo(() => new Set(normalizeDiagnosticResultBlocks(initial.resultBlocks)), [initial.resultBlocks]);

  const initialThresholds = useMemo(() => {
    const result: Record<string, Record<string, number | string>> = {};
    for (const rule of initial.rules) result[rule.archetype_code] = { ...rule.thresholds };
    return result;
  }, [initial.rules]);

  function updateProfile(index: number, patch: Partial<DiagnosticProfileInput>) {
    setProfiles((current) => current.map((profile, itemIndex) => itemIndex === index ? { ...profile, ...patch } : profile));
  }

  function updateProfileResult(index: number, section: keyof DiagnosticProfileResultContent, field: "title" | "body", value: string) {
    setProfileResultContent((current) => current.map((content, itemIndex) => itemIndex === index
      ? { ...content, [section]: { ...content[section], [field]: value } }
      : content));
  }

  function updateProfileCode(index: number, nextCode: string) {
    const previousCode = profiles[index]?.code ?? "";
    const normalized = codeFrom(nextCode, `perfil_${index + 1}`);
    updateProfile(index, { code: normalized });
    if (defaultProfileCode === previousCode) setDefaultProfileCode(normalized);
    setMapping((current) => Object.fromEntries(Object.entries(current).map(([oldCode, targetCode]) => [oldCode, targetCode === previousCode ? normalized : targetCode])));
  }

  function addProfile() {
    const code = `perfil_${profiles.length + 1}`;
    setProfiles((current) => [...current, { code, name: `Perfil ${current.length + 1}`, description: "" }]);
    setProfileResultContent((current) => [...current, blankProfileResultContent()]);
    if (!defaultProfileCode) setDefaultProfileCode(code);
  }

  function removeProfile(index: number) {
    const removed = profiles[index];
    if (profiles.length <= 1) return;
    const remaining = profiles.filter((_, itemIndex) => itemIndex !== index);
    setProfiles(remaining);
    setProfileResultContent((current) => current.filter((_, itemIndex) => itemIndex !== index));
    if (defaultProfileCode === removed.code) setDefaultProfileCode(remaining[0]?.code ?? "");
    setMapping((current) => Object.fromEntries(Object.entries(current).map(([oldCode, targetCode]) => [oldCode, targetCode === removed.code ? remaining[0]?.code ?? "" : targetCode])));
  }

  function updateDimension(index: number, patch: Partial<DiagnosticDimensionInput>) {
    setDimensions((current) => current.map((dimension, itemIndex) => itemIndex === index ? { ...dimension, ...patch } : dimension));
  }

  function updateDimensionCode(index: number, nextCode: string) {
    const previousCode = dimensions[index]?.code ?? "";
    const normalized = codeFrom(nextCode, `dimensao_${index + 1}`);
    updateDimension(index, { code: normalized });
    setQuestions((current) => current.map((question) => question.dimension_code === previousCode ? { ...question, dimension_code: normalized } : question));
  }

  function addDimension() {
    const code = `dimensao_${dimensions.length + 1}`;
    setDimensions((current) => [...current, { code, name: `Dimensão ${current.length + 1}`, description: "" }]);
  }

  function removeDimension(index: number) {
    if (dimensions.length <= 1) return;
    const removed = dimensions[index];
    const remaining = dimensions.filter((_, itemIndex) => itemIndex !== index);
    setDimensions(remaining);
    setQuestions((current) => current.map((question) => question.dimension_code === removed.code ? { ...question, dimension_code: remaining[0]?.code ?? "" } : question));
  }

  function updateQuestion(index: number, patch: Partial<DiagnosticQuestionInput>) {
    setQuestions((current) => current.map((question, itemIndex) => itemIndex === index ? { ...question, ...patch } : question));
  }

  function updateOption(questionIndex: number, optionIndex: number, patch: Partial<DiagnosticQuestionInput["options"][number]>) {
    setQuestions((current) => current.map((question, itemIndex) => itemIndex === questionIndex ? { ...question, options: question.options.map((option, currentOptionIndex) => currentOptionIndex === optionIndex ? { ...option, ...patch } : option) } : question));
  }

  function addQuestion() {
    setQuestions((current) => [...current, { prompt: "", dimension_code: dimensions[0]?.code ?? "", options: blankOptions() }]);
  }

  function removeQuestion(index: number) {
    if (questions.length <= 1) return;
    setQuestions((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  return <form action={saveDiagnosticAction} className="grid gap-4">
    <input type="hidden" name="definition_id" value={initial.definitionId} />
    <input type="hidden" name="version_id" value={initial.versionId} />
    <input type="hidden" name="definition_code" value={initial.definitionCode} />
    <input type="hidden" name="profile_count" value={profiles.length} />
    <input type="hidden" name="dimension_count" value={dimensions.length} />
    <input type="hidden" name="item_count" value={questions.length} />
    <input type="hidden" name="mapping_count" value={previousProfiles.length} />
    <input type="hidden" name="intent" value={publishNow ? "publish" : "draft"} />

    <Card className="grid gap-4"><div><h2 className="text-lg font-black text-secondary">Informações principais</h2><p className="mt-1 text-sm text-muted">Nome e objetivo identificam o formulário para a equipe.</p></div><Label>Nome do diagnóstico<Input name="name" defaultValue={initial.name} required /><span className="text-[11px] font-normal text-muted">Nome interno usado pela equipe.</span></Label><Label>Objetivo<Textarea name="purpose" rows={3} defaultValue={initial.purpose} required /><span className="text-[11px] font-normal text-muted">Explique o que o diagnóstico pretende compreender.</span></Label></Card>

    <AdminDisclosure title="Perfis de resultado" description="Adicione quantos perfis forem necessários e edite, no próprio perfil, os textos que aparecem para o participante.">
      <div className="grid gap-3">{profiles.map((profile, index) => <div key={`profile-${index}`} className="grid gap-3 rounded-xl border border-border bg-white p-4 sm:grid-cols-2"><Label>Nome do perfil<Input name={`profile_name_${index}`} value={profile.name} onChange={(event) => updateProfile(index, { name: event.target.value })} required /></Label><Label>Código interno<Input name={`profile_code_${index}`} value={profile.code} onChange={(event) => updateProfileCode(index, event.target.value)} pattern="[a-z][a-z0-9_-]{1,79}" required /><span className="text-[11px] font-normal text-muted">Sem espaços; identifica o perfil nas jornadas.</span></Label><Label className="sm:col-span-2">Descrição<Textarea name={`profile_description_${index}`} rows={3} value={profile.description} onChange={(event) => updateProfile(index, { description: event.target.value })} /></Label><ProfileResultCopyFields index={index} value={profileResultContent[index] ?? blankProfileResultContent()} onChange={(section, field, nextValue) => updateProfileResult(index, section, field, nextValue)} /><Button type="button" variant="secondary" size="sm" className="w-fit" icon={<Trash2 size={14} />} disabled={profiles.length <= 1} onClick={() => removeProfile(index)}>Remover perfil</Button></div>)}</div>
      <Button type="button" variant="secondary" size="sm" className="mt-4 w-fit" icon={<Plus size={14} />} onClick={addProfile}>Adicionar perfil</Button>
    </AdminDisclosure>

    <AdminDisclosure title="Dimensões avaliadas" description="Crie os eixos necessários para organizar as perguntas e a classificação. Renomear o código atualiza automaticamente as perguntas vinculadas.">
      <div className="grid gap-3">{dimensions.map((dimension, index) => <div key={`dimension-${index}`} className="grid gap-3 rounded-xl border border-border bg-white p-4 sm:grid-cols-2"><Label>Nome da dimensão<Input name={`dimension_name_${index}`} value={dimension.name} onChange={(event) => updateDimension(index, { name: event.target.value })} required /></Label><Label>Código interno<Input name={`dimension_code_${index}`} value={dimension.code} onChange={(event) => updateDimensionCode(index, event.target.value)} pattern="[a-z][a-z0-9_-]{1,79}" required /><span className="text-[11px] font-normal text-muted">Pode ser renomeado; vínculos das perguntas são preservados.</span></Label><Label className="sm:col-span-2">Descrição<Textarea name={`dimension_description_${index}`} rows={2} value={dimension.description} onChange={(event) => updateDimension(index, { description: event.target.value })} /></Label><Button type="button" variant="secondary" size="sm" className="w-fit" icon={<Trash2 size={14} />} disabled={dimensions.length <= 1} onClick={() => removeDimension(index)}>Remover dimensão</Button></div>)}</div>
      <Button type="button" variant="secondary" size="sm" className="mt-4 w-fit" icon={<Plus size={14} />} onClick={addDimension}>Adicionar dimensão</Button>
    </AdminDisclosure>

    <AdminDisclosure title="Perguntas" description="Adicione ou remova perguntas. Cada pergunta precisa apontar para uma dimensão configurada.">
      <div className="grid gap-3">{questions.map((question, index) => <details key={`question-${index}`} className="rounded-xl border border-border bg-surface-muted/35" open={!question.prompt}><summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-secondary">Pergunta {index + 1}{question.prompt ? ` · ${question.prompt}` : ""}</summary><fieldset className="grid gap-3 border-t border-border p-4"><Label>Dimensão<Select name={`item_dimension_${index}`} value={question.dimension_code} onChange={(event) => updateQuestion(index, { dimension_code: event.target.value })} required><option value="">Selecione</option>{dimensions.map((dimension) => <option key={dimension.code} value={dimension.code}>{dimension.name}</option>)}</Select></Label><Label>Enunciado<Textarea name={`item_prompt_${index}`} rows={2} value={question.prompt} onChange={(event) => updateQuestion(index, { prompt: event.target.value })} required /></Label><div className="grid gap-3 sm:grid-cols-2">{question.options.map((option, optionIndex) => <div key={optionIndex} className="grid grid-cols-[1fr_96px] gap-2"><Label>Resposta {optionIndex + 1}<Input name={`item_option_label_${index}_${optionIndex}`} value={option.label} onChange={(event) => updateOption(index, optionIndex, { label: event.target.value })} required /></Label><Label>Pontos<Input name={`item_option_score_${index}_${optionIndex}`} type="number" step="0.1" value={option.score} onChange={(event) => updateOption(index, optionIndex, { score: event.target.value })} required /></Label></div>)}</div><p className="text-[11px] text-muted">As pontuações aceitam números inteiros e decimais.</p><Button type="button" variant="secondary" size="sm" className="w-fit" icon={<Trash2 size={14} />} disabled={questions.length <= 1} onClick={() => removeQuestion(index)}>Remover pergunta</Button></fieldset></details>)}</div>
      <Button type="button" variant="secondary" size="sm" className="mt-4 w-fit" icon={<Plus size={14} />} onClick={addQuestion}>Adicionar pergunta</Button>
    </AdminDisclosure>

    <AdminDisclosure title="Regras de classificação" description="Defina limites por perfil e dimensão. Campos vazios não participam da regra; limites aceitam valores decimais.">
      <div className="grid gap-5"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="p-2 text-left">Perfil</th>{dimensions.map((dimension) => <th key={dimension.code} className="min-w-36 p-2 text-left">{dimension.name}</th>)}</tr></thead><tbody>{profiles.map((profile, profileIndex) => <tr key={profile.code} className="border-t border-border"><td className="p-2 font-medium text-ink">{profile.name}</td>{dimensions.map((dimension, dimensionIndex) => <td key={dimension.code} className="p-2"><Input name={`threshold_${profileIndex}_${dimensionIndex}`} type="number" step="0.1" placeholder="—" defaultValue={initialThresholds[profile.code]?.[dimension.code] ?? ""} /></td>)}</tr>)}</tbody></table></div><Label>Perfil padrão<Select name="default_archetype_code" value={defaultProfileCode} onChange={(event) => setDefaultProfileCode(event.target.value)} required><option value="">Selecione</option>{profiles.map((profile) => <option key={profile.code} value={profile.code}>{profile.name}</option>)}</Select><span className="text-[11px] font-normal text-muted">Usado quando nenhuma regra específica é atendida.</span></Label></div>
    </AdminDisclosure>

    <AdminDisclosure title="Blocos do resultado" description="Escolha quais blocos aparecem no resultado. Os textos específicos de cada perfil ficam dentro de “Perfis de resultado”, acima.">
      <div className="grid gap-3 sm:grid-cols-2">{diagnosticResultBlocks.map((block) => <label key={block.code} className="flex items-start gap-3 rounded-xl border border-border bg-white p-4 text-sm text-ink"><input type="checkbox" name="result_blocks" value={block.code} defaultChecked={enabledResultBlocks.has(block.code)} className="mt-0.5 size-4 accent-primary" /><span><strong className="block text-secondary">{block.label}</strong><small className="mt-1 block leading-5 text-muted">{block.description}</small></span></label>)}</div>
    </AdminDisclosure>

    {publishNow && previousProfiles.length ? <Card className="grid gap-4 border-warning/30 bg-warning-soft"><div><h2 className="font-semibold text-ink">Migração dos perfis atuais</h2><p className="mt-1 text-sm text-muted">Para cada perfil do diagnóstico publicado, escolha o perfil correspondente neste novo diagnóstico. A publicação atualiza usuários e restrições das jornadas em uma única operação.</p></div>{previousProfiles.map((oldProfile, index) => <div key={oldProfile.code} className="grid gap-1 sm:grid-cols-[1fr_1fr] sm:items-center"><input type="hidden" name={`mapping_old_code_${index}`} value={oldProfile.code} /><span className="text-sm font-semibold text-secondary">{oldProfile.name}</span><Select name={`mapping_target_code_${index}`} value={mapping[oldProfile.code] ?? ""} onChange={(event) => setMapping((current) => ({ ...current, [oldProfile.code]: event.target.value }))} required><option value="">Selecione o novo perfil</option>{profiles.map((profile) => <option key={profile.code} value={profile.code}>{profile.name}</option>)}</Select></div>)}</Card> : null}

    <Card className="grid gap-4 border-primary/20 bg-primary-soft/40"><div className="flex items-center justify-between gap-4"><div><h2 className="font-semibold text-ink">Salvar</h2><p className="mt-1 text-sm text-muted">O rascunho não afeta participantes. A publicação substitui o único formulário ativo.</p></div><StatusPill tone={publishNow ? "warning" : "neutral"}>{publishNow ? "Publicar" : "Rascunho"}</StatusPill></div>{canPublish ? <label className="flex items-start gap-3 rounded-xl bg-white p-3 text-sm text-ink"><input type="checkbox" checked={publishNow} onChange={(event) => setPublishNow(event.target.checked)} className="mt-0.5 size-4 accent-primary" /><span><strong className="block">Publicar agora</strong><small className="text-muted">Exige o mapeamento dos perfis anteriores e substitui o diagnóstico ativo.</small></span></label> : null}<Button type="submit" className="w-fit">{publishNow ? "Salvar e publicar diagnóstico" : "Salvar rascunho"}</Button></Card>
  </form>;
}
