export function queryValue(value) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export function stringValue(value) {
  return typeof value === "string" ? value : "";
}

export function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function timestampValue(value) {
  const timestamp = typeof value === "string" ? Date.parse(value) : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function versionStatus(status) {
  if (status === "draft") return "Rascunho";
  if (status === "published") return "Publicada";
  return status;
}

const stepAliases = {
  jornada: "geral",
  trilhas: "conteudo",
  aulas: "conteudo",
  publicar: "publicacao",
};

const allowedSteps = new Set(["geral", "conteudo", "publicacao"]);

export function resolveAdminProductStep(value) {
  const requested = queryValue(value);
  const resolved = stepAliases[requested] ?? requested;
  return allowedSteps.has(resolved) ? resolved : "geral";
}

export function buildAdminProductStepHref(step, versionId = "") {
  const resolved = resolveAdminProductStep(step);
  const normalizedVersionId = stringValue(versionId).trim();
  const params = new URLSearchParams({ etapa: resolved });
  if (normalizedVersionId) params.set("versao", normalizedVersionId);
  return `/admin/produto?${params.toString()}`;
}

const successFeedback = {
  jornada_publicada: {
    title: "Jornada publicada",
    message: "A jornada já pode ser acessada pelos participantes.",
  },
  jornada_arquivada: {
    title: "Jornada arquivada",
    message: "A jornada saiu das listas ativas e o histórico foi preservado.",
  },
  atualizado_ao_vivo: {
    title: "Atualização publicada",
    message: "As mudanças já estão disponíveis para participantes no próximo carregamento.",
  },
  jornada_em_rascunho: {
    title: "Jornada voltou para rascunho",
    message: "A jornada foi retirada do ar e voltou ao estado de rascunho. Participantes em andamento foram interrompidos.",
  },
  rascunho_excluido: {
    title: "Rascunho excluído",
    message: "A jornada em rascunho foi removida da administração.",
  },
};

const errorFeedback = {
  certificado_conclusao_obrigatorio: "Selecione qual certificado deve ser emitido ao concluir a jornada.",
  certificado_conclusao_incompativel: "O certificado selecionado não está publicado ou não pertence a esta jornada.",
  somente_rascunho: "Somente rascunhos podem ser excluídos.",
  publicacao_nao_encontrada: "A jornada já não está publicada ou foi alterada por outra pessoa.",
  confirmacao_arquivamento: "Digite ARQUIVAR para confirmar o arquivamento da jornada.",
  jornada_nao_encontrada: "A jornada não foi encontrada ou já foi arquivada.",
  falha_arquivamento: "Não foi possível arquivar a jornada. Tente novamente ou revise as permissões.",
};

export function resolveAdminProductFeedback(success, error) {
  const successCode = queryValue(success);
  const errorCode = queryValue(error);
  const resolvedSuccess = successFeedback[successCode] ?? {
    title: "Rascunho salvo",
    message: "Continue a edição ou publique quando estiver pronto.",
  };

  return {
    success: successCode,
    error: errorCode,
    successTitle: resolvedSuccess.title,
    successMessage: resolvedSuccess.message,
    errorMessage: errorFeedback[errorCode] ?? "Revise os campos obrigatórios e tente novamente.",
  };
}

export function summarizeAdminProductTracks(tracks) {
  const safeTracks = Array.isArray(tracks) ? tracks : [];
  const lessonCounts = safeTracks.map((track) => Array.isArray(track?.aulas) ? track.aulas.length : 0);
  return {
    trackCount: safeTracks.length,
    lessonCount: lessonCounts.reduce((sum, count) => sum + count, 0),
    emptyTrackCount: lessonCounts.filter((count) => count === 0).length,
    graphLooksComplete: safeTracks.length > 0 && lessonCounts.every((count) => count > 0),
  };
}
