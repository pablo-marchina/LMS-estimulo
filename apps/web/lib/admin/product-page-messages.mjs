const successNotices = new Map([
  [
    "jornada_publicada",
    {
      title: "Jornada publicada",
      message: "A jornada já pode ser acessada pelos participantes.",
    },
  ],
  [
    "jornada_arquivada",
    {
      title: "Jornada arquivada",
      message: "A jornada saiu das listas ativas e o histórico foi preservado.",
    },
  ],
  [
    "atualizado_ao_vivo",
    {
      title: "Atualização publicada",
      message:
        "As mudanças já estão disponíveis para participantes no próximo carregamento.",
    },
  ],
  [
    "jornada_em_rascunho",
    {
      title: "Jornada voltou para rascunho",
      message:
        "A jornada foi retirada do ar e voltou ao estado de rascunho. Participantes em andamento foram interrompidos.",
    },
  ],
  [
    "rascunho_excluido",
    {
      title: "Rascunho excluído",
      message: "A jornada em rascunho foi removida da administração.",
    },
  ],
]);

const defaultSuccessNotice = {
  title: "Rascunho salvo",
  message: "Continue a edição ou publique quando estiver pronto.",
};

const errorMessages = new Map([
  [
    "certificado_conclusao_obrigatorio",
    "Selecione qual certificado deve ser emitido ao concluir a jornada.",
  ],
  [
    "certificado_conclusao_incompativel",
    "O certificado selecionado não está publicado ou não pertence a esta jornada.",
  ],
  ["somente_rascunho", "Somente rascunhos podem ser excluídos."],
  [
    "publicacao_nao_encontrada",
    "A jornada já não está publicada ou foi alterada por outra pessoa.",
  ],
  [
    "confirmacao_arquivamento",
    "Digite ARQUIVAR para confirmar o arquivamento da jornada.",
  ],
  [
    "jornada_nao_encontrada",
    "A jornada não foi encontrada ou já foi arquivada.",
  ],
  [
    "falha_arquivamento",
    "Não foi possível arquivar a jornada. Tente novamente ou revise as permissões.",
  ],
  [
    "temas_nao_salvos",
    "A jornada foi salva, mas não foi possível sincronizar os temas. Tente salvar novamente.",
  ],
]);

export function getAdminProductSuccessNotice(code) {
  return successNotices.get(code) ?? defaultSuccessNotice;
}

export function getAdminProductErrorMessage(code) {
  return (
    errorMessages.get(code) ??
    "Revise os campos obrigatórios e tente novamente."
  );
}
