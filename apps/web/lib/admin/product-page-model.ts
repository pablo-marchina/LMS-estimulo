import "server-only";

import {
  getAdminJourneyEditorDetails,
  type JourneyEditorActivityDetails,
} from "@/lib/admin/journey-editor";
import {
  getAdminProductWorkspace,
  type Trilha,
  type TrilhaAula,
  type VersionSummary,
} from "@/lib/admin/product-management";
import { extensionsRuntime } from "@/lib/extensions/runtime";
import { libraryRuntime } from "@/lib/library/runtime";

export type AdminProductSearchParams = Record<string, string | string[] | undefined>;

export type ArchetypeOption = {
  code: string;
  name: string;
  description?: string | null;
};

export function singleQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function versionStatus(status: string) {
  if (status === "draft") return "Rascunho";
  if (status === "published") return "Publicada";
  return status;
}

function dateValue(value: unknown) {
  const date = typeof value === "string" ? Date.parse(value) : Number.NaN;
  return Number.isFinite(date) ? date : 0;
}

function archetypesFromVersion(
  version: VersionSummary | null | undefined,
): ArchetypeOption[] {
  const raw = version && Array.isArray(version.archetypes) ? version.archetypes : [];
  return raw
    .map((item) => objectValue(item))
    .map((item) => ({
      code: stringValue(item.code),
      name: stringValue(item.name),
      description: stringValue(item.description) || null,
    }))
    .filter((item) => item.code && item.name);
}

function fallbackAssessment(
  aula: TrilhaAula,
): JourneyEditorActivityDetails["assessment"] {
  if (!aula.assessment) return null;

  return {
    passing_score: aula.assessment.passing_score,
    max_attempts: aula.assessment.max_attempts,
    questions: aula.assessment.questions.map((question) => ({
      id: question.id,
      code: question.code,
      prompt: question.prompt,
      question_type: question.question_type ?? "single_choice",
      points: 1,
      position: question.position,
      configuration: {},
      options: question.options.map((option) => ({
        id: option.id,
        code: option.code,
        label: option.label,
        value: {},
        is_correct: option.is_correct,
        position: option.position,
      })),
    })),
  };
}

export async function loadAdminProductPageModel(input: {
  actorUserAccountId: string;
  organizationId: string;
  permissions: readonly string[];
  query: AdminProductSearchParams;
}) {
  const canEdit = input.permissions.includes("journey.definition.manage");
  const canPublish = input.permissions.includes("journey.definition.publish");

  const [workspace, libraryData, extensionWorkspace] = await Promise.all([
    getAdminProductWorkspace(input.actorUserAccountId, input.organizationId),
    libraryRuntime
      .listOperator(input.actorUserAccountId, input.organizationId)
      .catch(() => ({
        organization_id: input.organizationId,
        items: [],
        journey_versions: [],
      })),
    extensionsRuntime.adminWorkspace(input.actorUserAccountId, input.organizationId),
  ]);

  const libraryItems = libraryData.items
    .filter((item) => item.status === "published")
    .map((item) => ({
      library_item_version_id: item.library_item_version_id,
      title: item.title,
      summary: item.summary,
      body: item.body,
      external_url: item.external_url,
      original_filename: item.original_filename,
      content_kind: item.content_kind,
      content_format: item.content_format,
      source_name: item.source_name,
      discoverable_in_library: item.discoverable_in_library,
    }));

  const activePrograms = workspace.programs.filter(
    (item) => item.status !== "retired",
  );
  const activeJourneys = workspace.journeys.filter(
    (item) => item.status !== "retired",
  );

  const journeyVersions = activeJourneys.flatMap((item) =>
    item.versions.map((version) => ({
      ...version,
      definitionName: item.name,
      definitionId: item.definition_id,
      definitionCode: item.code,
      definitionPurpose: stringValue(item.purpose),
      programId: stringValue(item.program_id),
    })),
  );

  const latestVersionIds = new Set(
    activeJourneys
      .map(
        (journey) =>
          journey.versions
            .filter(
              (version) =>
                version.status === "draft" || version.status === "published",
            )
            .slice()
            .sort((a, b) => b.version_number - a.version_number)[0]?.id,
      )
      .filter(Boolean)
      .map(String),
  );

  const latestVersions = journeyVersions
    .filter(
      (item) =>
        latestVersionIds.has(String(item.id)) &&
        (item.status === "draft" || item.status === "published"),
    )
    .sort((a, b) => a.definitionName.localeCompare(b.definitionName, "pt-BR"));

  const selectedVersionId = singleQueryValue(input.query.versao);
  const selectedJourneyVersion =
    latestVersions.find((item) => String(item.id) === selectedVersionId) ?? null;
  const selectedIsDraft = selectedJourneyVersion?.status === "draft";
  const selectedIsPublished = selectedJourneyVersion?.status === "published";

  const editorDetails = selectedJourneyVersion
    ? await getAdminJourneyEditorDetails({
        actorUserAccountId: input.actorUserAccountId,
        organizationId: input.organizationId,
        journeyVersionId: String(selectedJourneyVersion.id),
      }).catch(() => ({
        journey_version_id: String(selectedJourneyVersion.id),
        activities: [],
      }))
    : null;

  const activityDetails = new Map(
    (editorDetails?.activities ?? []).map((item) => [
      item.activity_version_id,
      item,
    ]),
  );
  const pathDetails = new Map(workspace.paths.map((item) => [item.id, item]));

  const selectedTrilhas = (selectedJourneyVersion?.trilhas ?? [])
    .slice()
    .sort((a: Trilha, b: Trilha) => a.position - b.position)
    .map((trilha) => {
      const path = pathDetails.get(trilha.id);
      const stepDetails = new Map(
        (path?.steps ?? []).map((step) => [stringValue(step.id), step]),
      );
      const aulas = trilha.aulas.map((aula) => {
        const details = activityDetails.get(aula.activity_version_id);
        const step = stepDetails.get(aula.step_id);

        return {
          ...aula,
          activity_definition_id: details?.activity_definition_id,
          activity_definition_code: details?.definition_code,
          estimated_minutes: details?.estimated_minutes ?? 10,
          assets: details?.assets ?? aula.assets ?? [],
          assessment: details?.assessment ?? fallbackAssessment(aula),
          practice: details?.practice ?? aula.practice,
          step_metadata: objectValue(step?.metadata),
        };
      });

      return {
        ...trilha,
        is_default: path?.is_default,
        is_required: path?.is_required ?? trilha.is_required,
        presentation: path?.presentation ?? trilha.presentation,
        aulas,
      };
    });

  const activeDiagnosticVersion =
    workspace.diagnostics
      .flatMap((definition) => definition.versions)
      .filter((version) => version.status === "published")
      .sort(
        (a, b) =>
          dateValue(b.published_at) - dateValue(a.published_at) ||
          b.version_number - a.version_number,
      )[0] ?? null;

  const activeArchetypes = archetypesFromVersion(activeDiagnosticVersion);
  const selectedArchetypes = new Set(
    selectedJourneyVersion?.eligible_archetype_codes ?? [],
  );
  const legacyArchetypes = [...selectedArchetypes]
    .filter((code) => !activeArchetypes.some((item) => item.code === code))
    .map((code) => ({ code, name: `${code} (perfil anterior)` }));
  const availableArchetypes = [...activeArchetypes, ...legacyArchetypes];

  const configuration = objectValue(selectedJourneyVersion?.configuration);
  const presentation = objectValue(configuration.presentation);
  const completionCertificate = objectValue(
    configuration.completion_certificate,
  );
  const completionCertificateEnabled = completionCertificate.enabled === true;
  const configuredCompletionCertificateVersionId = stringValue(
    completionCertificate.certificate_version_id,
  );

  const completionCertificateOptions = selectedJourneyVersion
    ? workspace.certificates
        .filter((definition) => definition.status !== "retired")
        .flatMap((definition) =>
          definition.versions
            .filter(
              (version) =>
                version.status === "published" &&
                String(version.journey_version_id ?? "") ===
                  String(selectedJourneyVersion.id),
            )
            .map((version) => ({
              id: String(version.id),
              name: definition.name,
              versionNumber: Number(version.version_number),
            })),
        )
        .sort(
          (a, b) =>
            a.name.localeCompare(b.name, "pt-BR") ||
            b.versionNumber - a.versionNumber,
        )
    : [];

  const presentationTags = Array.isArray(presentation.tags)
    ? presentation.tags.filter(
        (item): item is string => typeof item === "string",
      )
    : [];

  const managedThemes = extensionWorkspace.themes
    .filter((theme) => stringValue(theme.status) === "active")
    .map((theme) => ({
      id: stringValue(theme.id),
      name: stringValue(theme.name),
    }))
    .filter((theme) => theme.id && theme.name)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const selectedThemeIds = managedThemes
    .filter((theme) => presentationTags.includes(theme.name))
    .map((theme) => theme.id);

  const requestedStep = singleQueryValue(input.query.etapa);
  const stepAliases: Record<string, string> = {
    jornada: "geral",
    trilhas: "conteudo",
    aulas: "conteudo",
    publicar: "publicacao",
  };
  const normalizedStep = stepAliases[requestedStep] ?? requestedStep;
  const etapa = ["geral", "conteudo", "publicacao"].includes(normalizedStep)
    ? normalizedStep
    : "geral";

  const success = singleQueryValue(input.query.sucesso);
  const error = singleQueryValue(input.query.erro);
  const canEditSelected =
    canEdit &&
    (!selectedJourneyVersion ||
      selectedIsDraft ||
      (selectedIsPublished && canPublish));
  const graphLooksComplete =
    selectedTrilhas.length > 0 &&
    selectedTrilhas.every((trilha) => trilha.aulas.length > 0);
  const currentCardId = stringValue(
    presentation.card_background_file_object_id,
  );
  const currentFeaturedId = stringValue(
    presentation.featured_background_file_object_id,
  );

  return {
    canEdit,
    canPublish,
    libraryItems,
    activePrograms,
    latestVersions,
    selectedVersionId,
    selectedJourneyVersion,
    selectedIsDraft,
    selectedIsPublished,
    selectedTrilhas,
    availableArchetypes,
    selectedArchetypes,
    presentation,
    completionCertificateEnabled,
    configuredCompletionCertificateVersionId,
    completionCertificateOptions,
    managedThemes,
    selectedThemeIds,
    etapa,
    success,
    error,
    canEditSelected,
    graphLooksComplete,
    currentCardId,
    currentFeaturedId,
  };
}

export type AdminProductPageModel = Awaited<
  ReturnType<typeof loadAdminProductPageModel>
>;
