"use client";

import { useMemo, useState } from "react";
import { AdminDisclosure } from "@/components/admin-section-nav";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { saveGamificationResourceAction } from "./actions";

type BadgeVersion = {
  id: string;
  version_number: number;
  status: string;
  title: string;
  description: string;
  criteria_rule_version_id: string;
};

type BadgeDefinition = {
  definition_id: string;
  name: string;
  versions: BadgeVersion[];
};

type RuleOption = { id: string; definitionName: string; version_number: number };

function currentVersion(item: BadgeDefinition | null) {
  if (!item) return null;
  const sorted = [...item.versions].sort((a, b) => b.version_number - a.version_number);
  return sorted.find((version) => version.status === "published") ?? sorted[0] ?? null;
}

export function BadgeEditor({ badges, ruleVersions }: { badges: BadgeDefinition[]; ruleVersions: RuleOption[] }) {
  const [selectedDefinitionId, setSelectedDefinitionId] = useState("");
  const selected = useMemo(
    () => badges.find((badge) => badge.definition_id === selectedDefinitionId) ?? null,
    [badges, selectedDefinitionId],
  );
  const version = currentVersion(selected);

  return (
    <Card>
      <div>
        <h2 className="text-lg font-black text-secondary">Criar ou atualizar selo</h2>
        <p className="mt-1 text-sm text-muted">Cadastre o reconhecimento aqui. Para premiar a conclusão de um módulo específico, vincule este selo à trilha correspondente no editor de Jornadas e aulas.</p>
      </div>
      <form key={selectedDefinitionId || "new"} action={saveGamificationResourceAction} className="mt-5 grid gap-4">
        <input type="hidden" name="resource_type" value="badge" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Label>
            Selo existente
            <Select name="definition_id" value={selectedDefinitionId} onChange={(event) => setSelectedDefinitionId(event.target.value)}>
              <option value="">Criar novo</option>
              {badges.map((item) => <option value={item.definition_id} key={item.definition_id}>{item.name}</option>)}
            </Select>
          </Label>
          <Label>
            Título para o participante
            <Input name="title" required defaultValue={version?.title ?? ""} />
          </Label>
        </div>
        <Label>
          O que o selo reconhece
          <Textarea name="description" rows={3} required defaultValue={version?.description ?? ""} />
        </Label>
        <div className="rounded-2xl border border-primary/20 bg-primary-soft/40 p-4 text-sm text-ink">
          <strong className="text-secondary">Como vincular a um módulo</strong>
          <p className="mt-1 text-muted">Em Jornadas e aulas, cada trilha funciona como um módulo/bloco de conteúdos. Abra a trilha que deve conceder o selo e selecione este selo na configuração da própria trilha. A concessão ocorre quando a condição de conclusão daquela trilha for atendida.</p>
        </div>
        <AdminDisclosure title="Identificação e disponibilidade" description="O vínculo com uma trilha é configurado na própria trilha. Uma condição automática é opcional e serve apenas para selos concedidos fora desse vínculo.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Label>
              Nome interno
              <Input name="name" required defaultValue={selected?.name ?? ""} />
            </Label>
            <Label>
              Disponibilidade
              <Select name="status" defaultValue={version?.status === "published" ? "published" : "draft"}>
                <option value="draft">Preparar sem mostrar</option>
                <option value="published">Ativar para vinculação</option>
              </Select>
            </Label>
            <Label className="sm:col-span-2">
              Condição automática opcional
              <Select name="criteria_rule_version_id" defaultValue={version?.criteria_rule_version_id ?? ""}>
                <option value="">Nenhuma — conceder somente pelos vínculos configurados</option>
                {ruleVersions.map((rule) => <option key={rule.id} value={rule.id}>{rule.definitionName} · versão {rule.version_number}</option>)}
              </Select>
              <span className="text-[11px] font-normal text-muted">As opções vêm das versões publicadas das regras de elegibilidade cadastradas em Gamificação. Não selecione uma regra de conclusão de trilha aqui; para esse caso, escolha o selo diretamente no editor da trilha.</span>
            </Label>
          </div>
        </AdminDisclosure>
        <PendingSubmitButton pendingLabel="Salvando selo…" className="w-fit">Salvar selo</PendingSubmitButton>
      </form>
    </Card>
  );
}
