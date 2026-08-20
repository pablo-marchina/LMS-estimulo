import "server-only";

import { getAdminJourneyEditorDetails, type JourneyEditorActivityDetails } from "@/lib/admin/journey-editor";
import { getAdminProductWorkspace, type Trilha, type TrilhaAula, type VersionSummary } from "@/lib/admin/product-management";
import { extensionsRuntime } from "@/lib/extensions/runtime";
import { libraryRuntime } from "@/lib/library/runtime";
import {
  objectValue,
  queryValue,
  resolveAdminProductFeedback,
  resolveAdminProductStep,
  stringValue,
  summarizeAdminProductTracks,
  timestampValue,
} from "@/lib/admin/product-page-core.mjs";

export type AdminProductSearchParams = Record<string, string | string[] | undefined>;

type ArchetypeOption = {
  code: string;
  name: string;
  description?: string | null;
};

export type EditableAdminLesson = Omit<TrilhaAula, "assets" | "assessment" | "practice"> & {
  activity_definition_id?: string;
  activity_definition_code?: string;
  estimated_minutes?: number;
  assets: JourneyEditorActivityDetails["assets"];
  assessment: JourneyEditorActivityDetails["assessment"];
  practice: JourneyEditorActivityDetails["practice"];
  step_metadata?: Record<string, unknown>;
};

export type EditableAdminTrack = Omit<Trilha, "aulas"> & {
  aulas: EditableAdminLesson[];
};

function archetypesFromVersion(version: VersionSummary | null | undefined): ArchetypeOption[] {
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

function fallbackAssessment(aula: TrilhaAula): JourneyEditorActivityDetails["assessment"] {
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
  query: AdminProductSearchParams;
  actorUserAccountId: string;
  organizationId: string;
  canEdit: boolean;
  canPublish: boolean;
}) {
  const { query, actorUserAccountId, organizationId, canEdit, canPublish } = input;
  const [workspace, libraryData, extensionWorkspace] = await Promise.all([
    getAdminProductWorkspace(actorUserAccountId, organizationId),
    libraryRuntime.listOperator(actorUserAccountId, organizationId).catch(() => ({
      organization_id: organizationId,
      items: [],
      journey_versions: [],
    })),
    extensionsRuntime.adminWorkspace(actorUserAccountId, organizationId),
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

  const activePrograms = workspace.programs.filter((item) => item.status !== "retired");
  const activeJourneys = workspace.journeys.filter((item) => item.status !== "retired");
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
      .map((journey) =>
        journey.versions
          .filter((version) => version.status === "draft" || version.status === "published")
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

  const selectedVersionId = queryValue(query.versao);
  const selectedJourneyVersion =
    latestVersions.find((item) => String(item.id) === selectedVersionId) ?? null;
  const selectedIsDraft = selectedJourneyVersion?.status === "draft";
  const selectedIsPublished = selectedJourneyVersion?.status === "published";

  const editorDetails = selectedJourneyVersion
    ? await getAdminJourneyEditorDetails({
        actorUserAccountId,
        organizationId,
        journeyVersionId: String(selectedJourneyVersion.id),
      }).catch(() => ({
        journey_version_id: String(selectedJourneyVersion.id),
        activities: [],
      }))
    : null;

  const activityDetails = new Map(
    (editorDetails?.activities ?? []).map((item) => [item.activity_version_id, item]),
  );
  const pathDetails = new Map(workspace.paths.map((item) => [item.id, item]));

  const selectedTrilhas: EditableAdminTrack[] = (selectedJourneyVersion?.trilhas ?? [])
    .slice()
    .sort((a: Trilha, b: Trilha) => a.position - b.position)
    .map((trilha) => {
      const path = pathDetails.get(trilha.id);
      const stepDetails = new Map(
        (path?.steps ?? []).map((step) => [stringValue(step.id), step]),
      );
      const aulas: EditableAdminLesson[] = trilha.aulas.map((aula) => {
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

  const activeDiagnosticVersion = workspace.diagnostics
    .flatMap((definition) => definition.versions)
    .filter((version) => version.status === "published")
    .sort(
      (a, b) =>
        timestampValue(b.published_at) - timestampValue(a.published_at) ||
        b.version_number - a.version_number,
    )[0] ?? null;

  const activeArchetypes = archetypesFromVersion(activeDiagnosticVersion);
  const selectedArchetypes = new Set(selectedJourneyVersion?.eligible_archetype_codes ?? []);
  const legacyArchetypes = [...selectedArchetypes]
    .filter((code) => !activeArchetypes.some((item) => item.code === code))
    .map((code) => ({ code, name: `${code} (perfil anterior)` }));
  const availableArchetypes = [...activeArchetypes, ...legacyArchetypes];

  const configuration = objectValue(selectedJourneyVersion?.configuration);
  const presentation = objectValue(configuration.presentation);
  const completionCertificate = objectValue(configuration.completion_certificate);
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
                String(version.journey_version_id ?? "") === String(selectedJourneyVersion.id),
            )
            .map((version) => ({
              id: String(version.id),
              name: definition.name,
              versionNumber: Number(version.version_number),
            })),
        )
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR") || b.versionNumber - a.versionNumber)
    : [];

  const presentationTags = Array.isArray(presentation.tags)
    ? presentation.tags.filter((item): item is string => typeof item === "string")
    : [];
  const managedThemes = extensionWorkspace.themes
    .filter((theme) => stringValue(theme.status) === "active")
    .map((theme) => ({ id: stringValue(theme.id), name: stringValue(theme.name) }))
    .filter((theme) => theme.id && theme.name)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const selectedThemeIds = managedThemes
    .filter((theme) => presentationTags.includes(theme.name))
    .map((theme) => theme.id);

  const etapa = resolveAdminProductStep(query.etapa);
  const feedback = resolveAdminProductFeedback(query.sucesso, query.erro);
  const canEditSelected =
    canEdit &&
    (!selectedJourneyVersion || selectedIsDraft || (selectedIsPublished && canPublish));
  const trackSummary = summarizeAdminProductTracks(selectedTrilhas);

  return {
    workspace,
    libraryItems,
    activePrograms,
    latestVersions,
    selectedVersionId,
    selectedJourneyVersion,
    selectedIsDraft,
    selectedIsPublished,
    selectedTrilhas,
    selectedArchetypes,
    availableArchetypes,
    presentation,
    completionCertificateEnabled,
    configuredCompletionCertificateVersionId,
    completionCertificateOptions,
    managedThemes,
    selectedThemeIds,
    etapa,
    canEditSelected,
    currentCardId: stringValue(presentation.card_background_file_object_id),
    currentFeaturedId: stringValue(presentation.featured_background_file_object_id),
    ...trackSummary,
    ...feedback,
  };
}

export type AdminProductPageModel = Awaited<ReturnType<typeof loadAdminProductPageModel>>;
