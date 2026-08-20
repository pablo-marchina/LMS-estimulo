import { StatusPanel } from "@/components/status-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import { versionStatus } from "@/lib/admin/product-page-core.mjs";
import type { AdminProductPageModel } from "@/lib/admin/product-page-model";
import { publishJourneyAction } from "./publish-action";
import { retireJourneyAction } from "./retire-journey-action";
import { unpublishJourneyAction } from "./unpublish-action";

type ProductPublicationSectionProps = {
  model: AdminProductPageModel;
  canPublish: boolean;
};

export function ProductPublicationSection({ model, canPublish }: ProductPublicationSectionProps) {
  const {
    selectedJourneyVersion,
    selectedIsDraft,
    selectedIsPublished,
    trackCount,
    lessonCount,
    emptyTrackCount,
    graphLooksComplete,
  } = model;

  if (!selectedJourneyVersion) {
    return <StatusPanel title="Escolha uma jornada" tone="info">Abra uma jornada para revisar sua publicação.</StatusPanel>;
  }

  return (
    <Card className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-secondary">Publicação</h2>
          <p className="mt-1 text-sm text-muted">Confira a estrutura antes de disponibilizar a jornada.</p>
        </div>
        <StatusPill tone={selectedIsPublished ? "success" : "neutral"}>{versionStatus(selectedJourneyVersion.status)}</StatusPill>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-primary-soft p-4">
          <strong className="text-2xl text-primary">{trackCount}</strong>
          <p className="text-sm text-muted">trilhas</p>
        </div>
        <div className="rounded-xl bg-success-soft p-4">
          <strong className="text-2xl text-success">{lessonCount}</strong>
          <p className="text-sm text-muted">aulas</p>
        </div>
        <div className="rounded-xl bg-warning-soft p-4">
          <strong className="text-2xl text-warning">{emptyTrackCount}</strong>
          <p className="text-sm text-muted">trilhas sem aula</p>
        </div>
      </div>

      {selectedIsDraft && canPublish ? (
        <form action={publishJourneyAction}>
          <input type="hidden" name="journey_version_id" value={String(selectedJourneyVersion.id)} />
          <input type="hidden" name="content_hash" value={selectedJourneyVersion.content_hash ?? ""} />
          <Button type="submit" disabled={!graphLooksComplete || !selectedJourneyVersion.content_hash}>Publicar jornada</Button>
          {!graphLooksComplete ? <p className="mt-2 text-sm text-warning">Cada trilha precisa ter ao menos uma aula.</p> : null}
        </form>
      ) : selectedIsPublished ? (
        <div className="grid gap-4">
          <StatusPanel title="Publicação ativa" tone="success">A jornada está no ar. Alterações salvas continuam sendo aplicadas imediatamente.</StatusPanel>
          {canPublish ? (
            <>
              <details className="rounded-2xl border border-warning/30 bg-warning-soft/40">
                <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-warning">Voltar para rascunho</summary>
                <form action={unpublishJourneyAction} className="grid gap-3 border-t border-warning/25 p-4">
                  <input type="hidden" name="journey_version_id" value={String(selectedJourneyVersion.id)} />
                  <p className="text-sm text-muted">A jornada será retirada do catálogo e voltará ao estado de rascunho. Participantes em andamento serão interrompidos imediatamente.</p>
                  <label className="flex items-start gap-2 text-sm text-ink">
                    <input type="checkbox" name="confirm_unpublish" value="true" required className="mt-0.5 size-4 accent-warning" />
                    Confirmo que desejo retirar esta jornada do ar e interromper os acessos em andamento.
                  </label>
                  <Button type="submit" variant="secondary" size="sm" className="w-fit">Voltar para rascunho</Button>
                </form>
              </details>

              <details className="rounded-2xl border border-danger/25 bg-danger/5">
                <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-danger">Arquivar jornada</summary>
                <form action={retireJourneyAction} className="grid gap-3 border-t border-danger/20 p-4">
                  <input type="hidden" name="journey_definition_id" value={String(selectedJourneyVersion.definitionId)} />
                  <p className="text-sm text-muted">Arquivar remove a jornada das listas ativas sem apagar o histórico. Use “Voltar para rascunho” se sua intenção for interromper imediatamente participantes em andamento e continuar editando.</p>
                  <label className="grid gap-1 text-sm font-medium text-ink">
                    Digite ARQUIVAR
                    <Input name="confirmation" autoComplete="off" required />
                  </label>
                  <Button type="submit" variant="danger" size="sm" className="w-fit">Confirmar arquivamento</Button>
                </form>
              </details>
            </>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted">Somente um administrador com permissão de publicação pode concluir esta etapa.</p>
      )}
    </Card>
  );
}
