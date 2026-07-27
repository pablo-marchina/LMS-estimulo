import { Award, Download, FileUp, ShieldCheck, Sparkles } from "lucide-react";
import { FileUploadPreview } from "@/components/file-upload-preview";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricTile } from "@/components/ui/metric-tile";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { Input, Label } from "@/components/ui/input";
import { StatusPanel } from "@/components/status-panel";
import { getAuthContext } from "@/lib/auth/context";
import { credentialRuntime } from "@/lib/credentials/runtime";
import { extendedCredentialRuntime } from "@/lib/credentials/extended-runtime";
import { engagementRuntime } from "@/lib/engagement/runtime";

export const dynamic = "force-dynamic";
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Sao_Paulo" });
const uploadErrors: Record<string, string> = {
  EXTERNAL_CREDENTIAL_FILE_REQUIRED: "Selecione o arquivo do certificado.",
  EXTERNAL_CREDENTIAL_TYPE_NOT_ALLOWED: "Envie PDF, PNG, JPG ou WEBP.",
  EXTERNAL_CREDENTIAL_EXTENSION_NOT_ALLOWED: "A extensão não corresponde ao formato do arquivo.",
  EXTERNAL_CREDENTIAL_SIZE_INVALID: "O arquivo deve ter até 8 MB.",
  EXTERNAL_CREDENTIAL_TITLE_INVALID: "Informe o nome do curso ou certificado.",
  EXTERNAL_CREDENTIAL_ISSUER_INVALID: "Informe a instituição emissora.",
};

export default async function ParticipantAchievementsPage({ searchParams }: { searchParams: Promise<{ certificadoExterno?: string; codigo?: string }> }) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const [engagement, credentials, external] = await Promise.all([
    engagementRuntime.participantHub(auth.identity.user_account_id).catch(() => null),
    credentialRuntime.listParticipant(auth.identity.user_account_id).catch(() => ({ entrepreneur_id: null, badges: [], certificates: [] })),
    extendedCredentialRuntime.listExternal(auth.identity.user_account_id).catch(() => ({ items: [] })),
  ]);
  const available = (engagement?.rewards ?? []).filter((reward) => !reward.earned);

  return <div className="mx-auto grid max-w-[1400px] gap-9 px-5 py-8 lg:px-9 lg:py-10">
    <PageHeader eyebrow="Seu reconhecimento" title="Conquistas e certificados" description="Uma carteira para selos, certificados da plataforma e formações externas." />
    <section className="grid grid-cols-2 gap-4 lg:grid-cols-4"><MetricTile index={0} label="Selos" value={credentials.badges.filter((item) => item.status === "active").length} /><MetricTile index={1} label="Certificados Estímulo" value={credentials.certificates.length} /><MetricTile index={2} label="Certificados externos" value={external.items.length} /><MetricTile index={3} label="Próximas conquistas" value={available.length} /></section>

    <section className="grid gap-4"><h2 className="display-font text-2xl text-secondary">Selos conquistados</h2>{credentials.badges.length === 0 ? <EmptyState icon={<Sparkles size={24} />} title="Seu primeiro selo está a caminho" tone="info">Conclua trilhas para desbloquear reconhecimentos.</EmptyState> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{credentials.badges.map((badge) => <Card key={badge.award_id} className="border-success/30 bg-success-soft/35"><StatusPill tone={badge.status === "active" ? "success" : "neutral"}>{badge.status === "active" ? "Conquistado" : "Revogado"}</StatusPill><div className="mt-5 flex gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-green text-secondary"><Award /></span><div><h3 className="font-bold text-ink">{badge.title}</h3><p className="mt-1 text-sm text-muted">{badge.description}</p><p className="mt-3 text-xs font-semibold text-primary">{badge.journey_title}</p></div></div></Card>)}</div>}</section>

    <section className="grid gap-4" id="certificados-estimulo"><h2 className="display-font text-2xl text-secondary">Certificados de jornada</h2>{credentials.certificates.length === 0 ? <EmptyState icon={<ShieldCheck size={24} />} title="Nenhum certificado emitido" tone="info">Ao concluir uma jornada, o PDF aparecerá aqui.</EmptyState> : <div className="grid gap-4 sm:grid-cols-2">{credentials.certificates.map((certificate) => <Card key={certificate.issuance_id}><StatusPill tone={certificate.valid ? "success" : "warning"}>{certificate.valid ? "Válido" : "Indisponível"}</StatusPill><h3 className="mt-3 font-bold text-ink">{certificate.certificate_name}</h3><p className="mt-1 text-sm text-muted">{certificate.journey_title}</p><p className="mt-3 text-xs text-muted">Emitido em {dateFormatter.format(new Date(certificate.issued_at))}</p><div className="mt-5 flex gap-2"><ButtonLink href={`/api/certificates/${certificate.issuance_id}/download`} size="sm" icon={<Download size={15} />}>Baixar PDF</ButtonLink><ButtonLink href={`/credenciais/${encodeURIComponent(certificate.verification_code)}`} variant="secondary" size="sm">Validar</ButtonLink></div></Card>)}</div>}</section>

    <section className="grid gap-5" id="certificados-externos"><div><h2 className="display-font text-2xl text-secondary">Certificados de outros cursos</h2><p className="mt-2 text-sm text-muted">Os arquivos permanecem privados e agora podem ser conferidos antes do envio.</p></div>{query.certificadoExterno === "enviado" ? <StatusPanel title="Certificado adicionado" tone="success">O arquivo já está na sua carteira.</StatusPanel> : null}{query.certificadoExterno === "erro" ? <StatusPanel title="Não foi possível adicionar" tone="warning">{uploadErrors[query.codigo ?? ""] ?? "Revise os dados."}</StatusPanel> : null}
      <Card><form action="/api/external-credential-uploads" method="post" encType="multipart/form-data" className="grid gap-4 sm:grid-cols-2"><Label>Curso ou certificado<Input name="title" required minLength={3} maxLength={180} placeholder="Ex.: Gestão Financeira" /></Label><Label>Instituição emissora<Input name="issuer" required minLength={2} maxLength={160} placeholder="Ex.: Sebrae" /></Label><Label>Data de emissão<Input name="issued_on" type="date" /></Label><Label>Data de validade<Input name="expires_on" type="date" /></Label><Label className="sm:col-span-2">Link de validação<Input name="verification_url" type="url" placeholder="https://..." /></Label><FileUploadPreview className="sm:col-span-2" name="file" accept=".pdf,.png,.jpg,.jpeg,.webp" required label="Arquivo do certificado" help="PDF ou imagem, até 8 MB." /><Button type="submit" className="w-fit sm:col-span-2" icon={<FileUp size={16} />}>Adicionar à carteira</Button></form></Card>
      {external.items.length === 0 ? <EmptyState title="Nenhum certificado externo" tone="info">Use o formulário acima.</EmptyState> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{external.items.map((item) => <Card key={item.id}><StatusPill tone="info">Externo</StatusPill><h3 className="mt-3 font-bold text-ink">{item.title}</h3><p className="mt-1 text-sm text-muted">{item.issuer}</p><div className="mt-4 flex gap-2"><ButtonLink href={`/api/external-credentials/${item.id}/download`} variant="secondary" size="sm" icon={<Download size={14} />}>Baixar</ButtonLink>{item.verification_url ? <ButtonLink href={item.verification_url} variant="ghost" size="sm">Validar</ButtonLink> : null}</div></Card>)}</div>}
    </section>

    <section className="grid gap-4"><h2 className="display-font text-2xl text-secondary">O que você ainda pode conquistar</h2>{available.length === 0 ? <EmptyState title="Nenhuma recompensa pendente" tone="success">Você já conquistou tudo disponível.</EmptyState> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{available.map((reward) => <Card key={`${reward.type}:${reward.version_id}`}><StatusPill tone="neutral">Disponível</StatusPill><h3 className="mt-3 font-semibold text-ink">{reward.title}</h3><p className="mt-1 text-sm text-muted">{reward.description}</p></Card>)}</div>}</section>
  </div>;
}