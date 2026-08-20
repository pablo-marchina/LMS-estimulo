import { FileUploadPreview } from "@/components/file-upload-preview";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import {
  stringValue,
  type AdminProductPageModel,
} from "@/lib/admin/product-page-model";
import { deleteJourneyAction } from "./delete-journey-action";
import { saveJourneyAction } from "./journey-action";

export function JourneyGeneralSection({
  model,
}: {
  model: AdminProductPageModel;
}) {
  if (model.etapa !== "geral") return null;

  const {
    activePrograms,
    availableArchetypes,
    completionCertificateEnabled,
    completionCertificateOptions,
    configuredCompletionCertificateVersionId,
    currentCardId,
    currentFeaturedId,
    managedThemes,
    presentation,
    selectedArchetypes,
    selectedIsDraft,
    selectedIsPublished,
    selectedJourneyVersion,
    selectedThemeIds,
    canEdit,
  } = model;

  return (
    <Card className="grid gap-5">
      <div>
        <h2 className="text-lg font-black text-secondary">Informações principais</h2>
        <p className="mt-1 text-sm text-muted">
          Título é o único campo obrigatório para criar uma jornada.
        </p>
      </div>

      <form
        className="grid gap-4"
        action={saveJourneyAction}
        encType="multipart/form-data"
      >
        <input
          type="hidden"
          name="version_id"
          value={selectedJourneyVersion ? String(selectedJourneyVersion.id) : ""}
        />
        <input
          type="hidden"
          name="definition_id"
          value={selectedJourneyVersion?.definitionId ?? ""}
        />
        <input
          type="hidden"
          name="definition_code"
          value={selectedJourneyVersion?.definitionCode ?? ""}
        />
        <input
          type="hidden"
          name="configuration_snapshot"
          value={JSON.stringify(selectedJourneyVersion?.configuration ?? {})}
        />
        <input
          type="hidden"
          name="current_card_background_file_object_id"
          value={currentCardId}
        />
        <input
          type="hidden"
          name="current_featured_background_file_object_id"
          value={currentFeaturedId}
        />

        <label className="grid gap-1 text-sm font-medium text-ink">
          Programa <span className="text-xs font-normal text-muted">(opcional)</span>
          <Select
            name="program_id"
            defaultValue={selectedJourneyVersion?.programId ?? ""}
          >
            <option value="">Sem programa</option>
            {activePrograms.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
          <span className="text-[11px] font-normal text-muted">
            Use somente quando quiser agrupar jornadas relacionadas.
          </span>
        </label>

        <label className="grid gap-1 text-sm font-medium text-ink">
          Título
          <Input
            name="title"
            required
            defaultValue={
              selectedJourneyVersion?.title ??
              selectedJourneyVersion?.definitionName ??
              ""
            }
          />
          <span className="text-[11px] font-normal text-muted">
            É o nome visto nos cartões e dentro da jornada.
          </span>
        </label>

        <label className="grid gap-1 text-sm font-medium text-ink">
          Descrição
          <Textarea
            name="description"
            rows={3}
            defaultValue={
              selectedJourneyVersion?.description ??
              selectedJourneyVersion?.definitionPurpose ??
              ""
            }
          />
          <span className="text-[11px] font-normal text-muted">
            Explique em poucas frases o resultado que a pessoa alcançará.
          </span>
        </label>

        <details className="rounded-2xl border border-border">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-secondary">
            Visual e divulgação
          </summary>
          <div className="grid gap-5 border-t border-border p-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="grid gap-3 rounded-xl bg-surface-muted p-3">
                <div>
                  <strong className="text-sm text-secondary">Imagem do cartão</strong>
                  <p className="mt-1 text-xs text-muted">
                    Dimensão recomendada: 1200 × 1200 px, proporção 1:1.
                  </p>
                </div>
                {selectedJourneyVersion && currentCardId ? (
                  <img
                    src={`/api/journey-covers/${selectedJourneyVersion.id}/card`}
                    alt="Capa atual"
                    className="aspect-square w-full max-w-48 rounded-xl object-cover"
                  />
                ) : null}
                <FileUploadPreview
                  name="card_background_file"
                  accept="image/png,image/jpeg,image/webp"
                  label="Escolher imagem"
                  help="PNG, JPG ou WebP · 1200 × 1200 px."
                />
                <label className="grid gap-1 text-sm font-medium text-ink">
                  Descrição da imagem
                  <Input
                    name="card_background_alt"
                    defaultValue={stringValue(presentation.card_background_alt)}
                  />
                </label>
              </div>

              <div className="grid gap-3 rounded-xl bg-surface-muted p-3">
                <div>
                  <strong className="text-sm text-secondary">
                    Imagem de destaque
                  </strong>
                  <p className="mt-1 text-xs text-muted">
                    Dimensão recomendada: 1920 × 900 px, proporção aproximada
                    32:15.
                  </p>
                </div>
                {selectedJourneyVersion && (currentFeaturedId || currentCardId) ? (
                  <img
                    src={`/api/journey-covers/${selectedJourneyVersion.id}/${
                      currentFeaturedId ? "featured" : "card"
                    }`}
                    alt="Destaque atual"
                    className="aspect-[32/15] w-full rounded-xl object-cover"
                  />
                ) : null}
                <FileUploadPreview
                  name="featured_background_file"
                  accept="image/png,image/jpeg,image/webp"
                  label="Escolher imagem"
                  help="PNG, JPG ou WebP · 1920 × 900 px."
                />
                <label className="grid gap-1 text-sm font-medium text-ink">
                  Descrição da imagem
                  <Input
                    name="featured_background_alt"
                    defaultValue={stringValue(
                      presentation.featured_background_alt,
                    )}
                  />
                </label>
              </div>
            </div>

            <label className="flex items-start gap-3 rounded-xl bg-primary-soft p-3 text-sm text-ink">
              <input
                type="checkbox"
                name="presentation_featured"
                defaultChecked={presentation.featured === true}
                className="mt-0.5 size-4 accent-primary"
              />
              <span>
                <strong className="block">Destacar esta jornada</strong>
                <small className="text-muted">
                  Ela ganha mais espaço na página de jornadas.
                </small>
              </span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="grid gap-1 text-sm font-medium text-ink">
                Cor
                <Select
                  name="presentation_tone"
                  defaultValue={stringValue(presentation.tone) || "blue"}
                >
                  <option value="blue">Azul</option>
                  <option value="green">Verde</option>
                  <option value="cyan">Ciano</option>
                  <option value="magenta">Magenta</option>
                  <option value="orange">Laranja</option>
                </Select>
              </label>

              <label className="grid gap-1 text-sm font-medium text-ink">
                Ícone
                <Select
                  name="presentation_icon"
                  defaultValue={stringValue(presentation.icon) || "sparkles"}
                >
                  <option value="sparkles">Brilhos</option>
                  <option value="rocket">Foguete</option>
                  <option value="book-open">Livro</option>
                  <option value="lightbulb">Ideia</option>
                </Select>
              </label>

              <label className="grid gap-1 text-sm font-medium text-ink">
                Texto do botão
                <Input
                  name="presentation_cta"
                  defaultValue={
                    stringValue(presentation.cta) || "Entrar nesta jornada"
                  }
                />
              </label>

              <label className="grid gap-1 text-sm font-medium text-ink sm:col-span-2 lg:col-span-1">
                Temas administrados
                <select
                  name="theme_ids"
                  multiple
                  size={Math.min(6, Math.max(3, managedThemes.length))}
                  defaultValue={selectedThemeIds}
                  className="min-h-28 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                >
                  {managedThemes.map((theme) => (
                    <option key={theme.id} value={theme.id}>
                      {theme.name}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] font-normal text-muted">
                  Selecione vários com Ctrl ou Cmd. Gerencie a lista em Mais
                  configurações.
                </span>
              </label>
            </div>

            {managedThemes.length === 0 ? (
              <p className="rounded-lg bg-warning-soft p-3 text-xs text-warning">
                Cadastre temas em Mais configurações para classificar esta jornada.
              </p>
            ) : null}

            <input
              type="hidden"
              name="presentation_featured_rank"
              value={String(
                typeof presentation.featured_rank === "number"
                  ? presentation.featured_rank
                  : 9999,
              )}
            />
            <input
              type="hidden"
              name="presentation_eyebrow"
              value={stringValue(presentation.eyebrow) || "Jornada Estímulo"}
            />
            <input
              type="hidden"
              name="presentation_badge"
              value={stringValue(presentation.badge) || "Capacitação Estímulo"}
            />
          </div>
        </details>

        <details className="rounded-2xl border border-border">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-secondary">
            Quem pode acessar
          </summary>
          <div className="grid gap-3 border-t border-border p-4">
            <p className="text-xs text-muted">
              Sem seleção, a jornada fica disponível para todos os perfis. A lista
              acompanha o diagnóstico atualmente publicado.
            </p>
            <div className="flex flex-wrap gap-4">
              {availableArchetypes.map((item) => (
                <label
                  key={item.code}
                  className="flex items-center gap-2 text-sm text-ink"
                >
                  <input
                    type="checkbox"
                    name="eligible_archetype_codes"
                    value={item.code}
                    defaultChecked={selectedArchetypes.has(item.code)}
                    className="size-4 accent-primary"
                  />
                  {item.name}
                </label>
              ))}
              {availableArchetypes.length === 0 ? (
                <p className="text-sm text-muted">
                  Nenhum perfil foi publicado no diagnóstico ativo.
                </p>
              ) : null}
            </div>
          </div>
        </details>

        <details
          className="rounded-2xl border border-border"
          open={completionCertificateEnabled}
        >
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-secondary">
            Conclusão e certificado
          </summary>
          <div className="grid gap-4 border-t border-border p-4">
            <p className="text-xs text-muted">
              A jornada decide se a conclusão gera certificado. O catálogo de
              certificados continua responsável pelo template, validade e identidade
              visual.
            </p>

            {selectedJourneyVersion ? (
              <>
                <label className="flex items-start gap-3 rounded-xl bg-primary-soft p-3 text-sm text-ink">
                  <input
                    type="checkbox"
                    name="completion_certificate_enabled"
                    defaultChecked={completionCertificateEnabled}
                    className="mt-0.5 size-4 accent-primary"
                  />
                  <span>
                    <strong className="block">
                      Emitir certificado ao concluir a jornada
                    </strong>
                    <small className="text-muted">
                      A emissão acontece automaticamente quando o estado muda para
                      concluída.
                    </small>
                  </span>
                </label>

                <label className="grid gap-1 text-sm font-medium text-ink">
                  Certificado emitido
                  <Select
                    name="completion_certificate_version_id"
                    defaultValue={configuredCompletionCertificateVersionId}
                  >
                    <option value="">Selecione um certificado publicado</option>
                    {completionCertificateOptions.map((item) => (
                      <option value={item.id} key={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </Select>
                  <span className="text-[11px] font-normal text-muted">
                    Somente certificados publicados e já vinculados a esta jornada
                    aparecem aqui.
                  </span>
                </label>

                {completionCertificateOptions.length === 0 ? (
                  <div className="grid gap-3 rounded-xl border border-warning/30 bg-warning-soft p-3">
                    <p className="text-sm text-ink">
                      Nenhum certificado publicado está disponível para esta jornada.
                      Configure o certificado antes de ativar a emissão.
                    </p>
                    <ButtonLink
                      href="/admin/gamificacao?tipo=certificados"
                      variant="secondary"
                      size="sm"
                      className="w-fit"
                    >
                      Configurar certificados
                    </ButtonLink>
                  </div>
                ) : null}

                <div className="rounded-xl bg-surface-muted p-3">
                  <strong className="text-sm text-secondary">
                    Dados preenchidos automaticamente
                  </strong>
                  <p className="mt-1 text-xs text-muted">
                    Nome do participante, título da jornada, data de emissão e código
                    de verificação. Gatilho canônico:{" "}
                    <code>journey.instance.completed</code>.
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted">
                Salve a jornada primeiro. Depois você poderá associar um certificado
                publicado a ela.
              </p>
            )}
          </div>
        </details>

        <Button type="submit" className="w-fit">
          {selectedIsPublished ? "Salvar e atualizar agora" : "Salvar rascunho"}
        </Button>
      </form>

      {selectedIsDraft && selectedJourneyVersion && canEdit ? (
        <details className="rounded-2xl border border-danger/25 bg-danger/5">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-danger">
            Excluir rascunho
          </summary>
          <form
            action={deleteJourneyAction}
            className="grid gap-3 border-t border-danger/20 p-4"
          >
            <input
              type="hidden"
              name="journey_version_id"
              value={String(selectedJourneyVersion.id)}
            />
            <p className="text-sm text-muted">
              A jornada será removida da administração. Esta ação não é permitida
              enquanto ela estiver publicada.
            </p>
            <label className="flex items-start gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name="confirm_delete"
                value="true"
                required
                className="mt-0.5 size-4 accent-danger"
              />
              Confirmo que desejo excluir esta jornada em rascunho.
            </label>
            <Button type="submit" variant="danger" size="sm" className="w-fit">
              Excluir rascunho
            </Button>
          </form>
        </details>
      ) : null}
    </Card>
  );
}
