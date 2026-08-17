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
  falha: {
    title: "A jornada não pôde ser salva",
    description: "Nenhuma alteração parcial deve ser considerada concluída. Reabra o formulário, revise os campos e tente novamente.",
    checklist: ["Revise campos obrigatórios.", "Se houver imagens, confirme formato e tamanho.", "Se o erro persistir, registre o horário e a ação realizada para localizar o evento nos logs."],
  },
};

export default async function JourneySaveErrorPage({ searchParams }: { searchParams: Promise<{ codigo?: string; versao?: string }> }) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const item = guidance[query.codigo ?? ""] ?? guidance.falha;
  const returnHref = query.versao ? `/admin/produto?etapa=geral&versao=${encodeURIComponent(query.versao)}` : "/admin/produto?etapa=geral";

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
