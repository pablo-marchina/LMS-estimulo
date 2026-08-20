import { StatusPanel } from "@/components/status-panel";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import type { AdminProductPageModel } from "@/lib/admin/product-page-model";
import { saveTrilhaAction } from "./actions";
import { TrilhaAulaBuilder } from "./trilha-aula-builder";
import { TrilhaEditor, type EditableTrilha } from "./trilha-editor";

type ProductContentSectionProps = {
  model: AdminProductPageModel;
  organizationId: string;
};

export function ProductContentSection({ model, organizationId }: ProductContentSectionProps) {
  const { selectedJourneyVersion, selectedTrilhas, libraryItems } = model;

  if (!selectedJourneyVersion) {
    return (
      <StatusPanel title="Salve as informações primeiro" tone="info">
        <ButtonLink href="/admin/produto?etapa=geral" className="mt-3 w-fit">Criar jornada</ButtonLink>
      </StatusPanel>
    );
  }

  return (
    <div className="grid gap-5">
      <Card>
        <h2 className="text-lg font-black text-secondary">Trilhas e aulas</h2>
        <p className="mt-1 text-sm text-muted">Cada trilha reúne suas próprias aulas. Ao abrir uma aula, o conteúdo atual aparece antes da escolha de origem.</p>
      </Card>

      {selectedTrilhas.map((trilha) => (
        <section key={trilha.id} className="grid gap-3">
          <TrilhaEditor journeyVersionId={String(selectedJourneyVersion.id)} trilha={trilha as EditableTrilha} />
          <TrilhaAulaBuilder
            journeyVersionId={String(selectedJourneyVersion.id)}
            organizationId={organizationId}
            trilha={trilha}
            libraryItems={libraryItems}
          />
        </section>
      ))}

      {selectedTrilhas.length === 0 ? (
        <StatusPanel title="Comece pela primeira trilha" tone="info">Uma trilha é um grupo de aulas sobre o mesmo objetivo.</StatusPanel>
      ) : null}

      <details className="rounded-2xl border border-primary/20 bg-white">
        <summary className="cursor-pointer px-5 py-4 font-semibold text-primary">Adicionar trilha</summary>
        <form action={saveTrilhaAction} className="grid gap-4 border-t border-border p-5">
          <input type="hidden" name="journey_version_id" value={String(selectedJourneyVersion.id)} />
          <label className="grid gap-1 text-sm font-medium text-ink">
            Nome
            <Input name="name" required />
            <span className="text-[11px] font-normal text-muted">Ex.: Primeiros passos, Vendas ou Gestão financeira.</span>
          </label>
          <label className="grid gap-1 text-sm font-medium text-ink">
            Explicação curta
            <Textarea name="description" rows={2} />
          </label>
          <input type="hidden" name="position" value={String(selectedTrilhas.length + 1)} />
          <input type="hidden" name="tone" value="cyan" />
          <input type="hidden" name="icon" value="sparkles" />
          <input type="hidden" name="is_required" value="true" />
          <Button type="submit" size="sm" className="w-fit">Adicionar trilha</Button>
        </form>
      </details>
    </div>
  );
}
