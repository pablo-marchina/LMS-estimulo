import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { getAuthContext } from "@/lib/auth/context";
import { ANNOUNCEMENT_BANNER_MAX_BYTES } from "@/lib/storage/announcement-banners";

export const dynamic = "force-dynamic";

const maxImageMegabytes = Math.round(ANNOUNCEMENT_BANNER_MAX_BYTES / (1024 * 1024));

const guidance: Record<string, { title: string; description: string; checklist: string[] }> = {
  imagem_tamanho_invalido: {
    title: "A imagem ultrapassa o limite permitido",
    description: `Use uma imagem de até ${maxImageMegabytes} MB. Reduza o arquivo e tente salvar a jornada novamente.`,
    checklist: ["Formatos aceitos: PNG, JPG/JPEG ou WebP.", `Tamanho máximo: ${maxImageMegabytes} MB por imagem.`, "Você pode comprimir a imagem sem alterar a estrutura da jornada."],
  },
  imagem_formato_invalido: {
    title: "O formato da imagem não é aceito",
    description: "Troque o arquivo por uma imagem PNG, JPG/JPEG ou WebP e tente novamente.",
    checklist: ["Não use SVG, GIF, HEIC ou arquivos renomeados apenas pela extensão.", "Confirme que o formato real do arquivo corresponde à extensão."],
  },
  imagem_extensao_invalida: {
    title: "A extensão não corresponde ao arquivo",
    description: "O tipo real da imagem e a extensão do nome do arquivo precisam ser compatíveis.",
    checklist: ["PNG deve terminar em .png.", "JPEG deve terminar em .jpg ou .jpeg.", "WebP deve terminar em .webp."],
  },
  imagem_upload_falhou: {
    title: "Não foi possível armazenar a imagem",
    description: "A jornada não foi salva com um upload incompleto. Tente novamente; se o erro persistir, use outra imagem antes de revisar permissões ou armazenamento.",
    checklist: ["Verifique sua conexão.", "Tente novamente com uma imagem menor.", "Se continuar falhando, anote o horário do teste para facilitar a investigação."],
  },
  configuracao_invalida: {
    title: "A configuração da jornada ficou inconsistente",
    description: "Reabra a jornada e salve novamente as informações principais. O sistema interrompeu a gravação para não persistir uma configuração inválida.",
    checklist: ["Recarregue a página antes de repetir alterações antigas.", "Revise título, programa e opções visuais antes de salvar."],
  },
  sem_permissao: {
    title: "Seu acesso não permite esta alteração",
    description: "A conta atual pode visualizar a administração, mas não possui a permissão necessária para salvar esta jornada.",
    checklist: ["Confirme que está usando a conta administrativa correta.", "Solicite a permissão de gestão de jornadas se precisar editar."],
  },
  conteudo_biblioteca_indisponivel: {
    title: "O conteúdo selecionado não está disponível na Biblioteca",
    description: "A aula não foi salva porque o conteúdo escolhido para vinculação não está mais disponível como versão publicada e ativa.",
    checklist: ["Reabra a aula e confirme o conteúdo selecionado.", "Se você não pretendia trocar o material, mantenha o vínculo atual: edições comuns da aula preservam esse vínculo.", "Se quiser substituir o material, selecione uma versão publicada e ativa da Biblioteca."],
  },
  conteudo_biblioteca_obrigatorio: {
    title: "Selecione um conteúdo da Biblioteca",
    description: "A opção de usar a Biblioteca está ativa, mas nenhum conteúdo foi selecionado.",
    checklist: ["Escolha um conteúdo publicado na Biblioteca.", "Ou altere a origem do conteúdo antes de salvar a aula."],
  },
  aula_nao_encontrada: {
    title: "A aula não está mais disponível para edição",
    description: "A aula pode ter sido removida, movida ou alterada em outra sessão antes do salvamento.",
    checklist: ["Volte para Trilhas e aulas e recarregue a estrutura.", "Abra novamente a aula que deseja editar antes de repetir a alteração."],
  },
  trilha_nao_encontrada: {
    title: "A trilha não está mais disponível",
    description: "A aula não pôde ser salva porque a trilha associada foi removida, arquivada ou alterada.",
    checklist: ["Recarregue a jornada.", "Confirme em qual trilha a aula deve ficar e abra a aula novamente."],
  },
  dados_aula_invalidos: {
    title: "Há dados inválidos na aula",
    description: "O sistema bloqueou o salvamento para não persistir uma aula incompleta ou inconsistente.",
    checklist: ["Reabra a aula e revise os campos obrigatórios.", "Confirme posição, duração, tipo de atividade e origem do conteúdo antes de salvar."],
  },
  falha_aula: {
    title: "A aula não pôde ser salva",
    description: "Nenhuma alteração parcial deve ser considerada concluída. O restante da jornada foi preservado.",
    checklist: ["Reabra a aula e tente salvar novamente.", "Se o erro persistir, anote o horário e a aula alterada para localizar a falha nos logs."],
  },
  falha: {
    title: "A jornada não pôde ser salva",
    description: "Nenhuma alteração parcial deve ser considerada concluída. Reabra o formulário, revise os campos e tente novamente.",
    checklist: ["Revise campos obrigatórios.", "Se houver imagens, confirme formato e tamanho.", "Se o erro persistir, registre o horário e a ação realizada para localizar o evento nos logs."],
  },
};

export default async function JourneySaveErrorPage({ searchParams }: { searchParams: Promise<{ codigo?: string; versao?: string; etapa?: string }> }) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const item = guidance[query.codigo ?? ""] ?? guidance.falha;
  const etapa = query.etapa === "conteudo" || query.etapa === "publicacao" ? query.etapa : "geral";
  const returnHref = query.versao ? `/admin/produto?etapa=${etapa}&versao=${encodeURIComponent(query.versao)}` : `/admin/produto?etapa=${etapa}`;

  return (
    <AppShell area="admin" email={auth.email}>
      <div className="grid gap-6">
        <PageHeader eyebrow="Jornadas" title="Não foi possível salvar" description="Veja o motivo provável e o que corrigir antes de tentar novamente." />
        <StatusPanel title={item.title} tone="warning">
          <p>{item.description}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {item.checklist.map((entry) => <li key={entry}>{entry}</li>)}
          </ul>
        </StatusPanel>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href={returnHref}>Voltar e corrigir</ButtonLink>
          <ButtonLink href="/admin/produto" variant="secondary">Ver jornadas</ButtonLink>
        </div>
      </div>
    </AppShell>
  );
}
