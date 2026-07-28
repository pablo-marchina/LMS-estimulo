import { Award, Download, FileUp, ShieldCheck, Sparkles } from "lucide-react";
import { ExternalCredentialIssuerFields } from "@/components/external-credential-issuer-fields";
import { FileUploadPreview } from "@/components/file-upload-preview";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricTile } from "@/components/ui/metric-tile";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { Input, Label } from "@/components/ui/input";
import { StatusPanel } from "@/components/status-panel";
import { requireParticipantContext } from "@/lib/auth/participant-context";
import { participantCopy } from "@/lib/content/participant-copy";
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
  EXTERNAL_CREDENTIAL_TITLE_INVALID: "Informe o nome do curso.",
  EXTERNAL_CREDENTIAL_ISSUER_INVALID: "Selecione uma instituição válida.",
  EXTERNAL_CREDENTIAL_ISSUER_REQUIRED: "Selecione a instituição.",
  EXTERNAL_CREDENTIAL_OTHER_ISSUER_REQUIRED: "Informe o nome da instituição.",
  EXTERNAL_CREDENTIAL_URL_INVALID: "Use um link de validação que comece com https://.",
  EXTERNAL_CREDENTIAL_PROJECTION_INCONSISTENT: "O certificado foi salvo, mas a carteira ainda não foi atualizada. Recarregue a página.",
};

function fulfilled<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === "fulfilled" ? result.value : null;
}

export default async function ParticipantAchievementsPage({ searchParams }: { searchParams: Promise<{ certificadoExterno?: string; codigo?: string }> }) {
  const query = await searchParams;
  const auth = await requireParticipantContext();
  const results = await Promise.allSettled([
    engagementRuntime.participantHub(auth.identity.user_account_id),
    credentialRuntime.listParticipant(auth.identity.user_account_id),
    extendedCredentialRuntime.listExternal(auth.identity.user_account_id),
    extendedCredentialRuntime.listIssuers(auth.identity.user_account_id),
  ] as const);

  const engagement = fulfilled(results[0]);
  const credentials = fulfilled(results[1]);
  const external = fulfilled(results[2]);
  const issuers = fulfilled(results[3]);
  const available = (engagement?.rewards ?? []).filter((reward) => !reward.earned);
  const platformUnavailable = results[1].status === "rejected";
  const externalUnavailable = results[2].status === "rejected";
  const issuersUnavailable = results[3].status === "rejected" || !issuers?.items.length;

  return <div className="mx-auto grid max-w-[1400px] gap-9 px-5 py-8 lg:px-9 lg:py-10">
    <PageHeader eyebrow="Seu reconhecimento" title="Conquistas e certificados" description={participantCopy.certificates.pageDescription} />
    {(platformUnavailable || externalUnavailable) ? <StatusPanel title="A carteira não pôde ser atualizada por completo" tone="warning">Nenhum certificado foi apagado. Recarregue a página para tentar novamente.</StatusPanel> : null}
    <section className="grid grid-cols-2 gap-4 lg:grid-cols-4"><MetricTile index={0} label="Selos" value={platformUnavailable ? "—" : credentials?.badges.filter((item) => item.status === "active").length ?? 0} /><MetricTile index={1} label="Certificados Estímulo" value={platformUnavailable ? "—" : credentials?.certificates.length ?? 0} /><MetricTile index={2} label="Certificados externos" value={externalUnavailable ? "—" : external?.count ?? 0} meta={externalUnavailable ? "Não foi possível atualizar" : undefined} /><MetricTile index={3} label="Próximas conquistas" value={results[0].status === "rejected" ? "—" : available.length} /></section>

    <section className="grid gap-4"><h2 className="display-font text-2xl text-secondary">Selos conquistados</h2>{platformUnavailable ? <StatusPanel title="Selos temporariamente indisponíveis" tone="warning">Tente novamente em instantes.</StatusPanel> : credentials?.badges.length === 0 ? <EmptyState icon={<Sparkles size={24} />} title="Seu primeiro selo está a caminho" tone="info">Conclua jornadas para desbloquear reconhecimentos.</EmptyState> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{credentials?.badges.map((badge) => <Card key={badge.award_id} className="border-success/30 bg-success-soft/35"><StatusPill tone={badge.status === "active" ? "success" : "neutral"}>{badge.status === "active" ? "Conquistado" : "Revogado"}</StatusPill><div className="mt-5 flex gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-green text-secondary"><Award /></span><div><h3 className="font-bold text-ink">{badge.title}</h3><p className="mt-1 text-sm text-muted">{badge.description}</p><p className="mt-3 text-xs font-semibold text-primary">{badge.journey_title}</p></div></div></Card>)}</div>}</section>

    <section className="grid gap-4" id="certificados-estimulo"><h2 className="display-font text-2xl text-secondary">Certificados de jornada</h2>{platformUnavailable ? <StatusPanel title="Certificados da plataforma temporariamente indisponíveis" tone="warning">Tente novamente em instantes.</StatusPanel> : credentials?.certificates.length === 0 ? <EmptyState icon={<ShieldCheck size={24} />} title="Nenhum certificado emitido" tone="info">Ao concluir uma jornada, o PDF aparecerá aqui automaticamente.</EmptyState> : <div className="grid gap-4 sm:grid-cols-2">{credentials?.certificates.map((certificate) => <Card key={certificate.issuance_id}><StatusPill tone={certificate.valid ? "success" : "warning"}>{certificate.valid ? "Válido" : "Indisponível"}</StatusPill><h3 className="mt-3 font-bold text-ink">{certificate.certificate_name}</h3><p className="mt-1 text-sm text-muted">{certificate.journey_title}</p><p className="mt-3 text-xs text-muted">Emitido em {dateFormatter.format(new Date(certificate.issued_at))}</p><div className="mt-5 flex gap-2"><ButtonLink href={`/api/certificates/${certificate.issuance_id}/download`} size="sm" icon={<Download size={15} />}>Baixar PDF</ButtonLink><ButtonLink href={`/credenciais/${encodeURIComponent(certificate.verification_code)}`} variant="secondary" size="sm">Validar</ButtonLink></div></Card>)}</div>}</section>

    <section className="grid gap-5" id="certificados-externos"><div><h2 className="display-font text-2xl text-secondary">Certificados de outros cursos</h2><p className="mt-2 text-sm text-muted">{participantCopy.certificates.externalSectionDescription}</p></div>{query.certificadoExterno === "enviado" ? <StatusPanel title="Certificado adicionado" tone="success">O certificado está salvo na sua carteira.</StatusPanel> : null}{query.certificadoExterno === "erro" ? <StatusPanel title="Não foi possível adicionar" tone="warning">{uploadErrors[query.codigo ?? ""] ?? "Revise os dados e tente novamente."}</StatusPanel> : null}
      {issuersUnavailable ? <StatusPanel title="Formulário temporariamente indisponível" tone="warning">Não foi possível carregar a lista de instituições. Seus certificados já salvos continuam disponíveis.</StatusPanel> : <Card><form action="/api/external-credential-uploads" method="post" encType="multipart/form-data" className="grid gap-4 sm:grid-cols-2"><Label>{participantCopy.certificates.fields.courseName}<Input name="title" required minLength={3} maxLength={180} placeholder="Ex.: Marketing e Vendas" /></Label><ExternalCredentialIssuerFields issuers={issuers?.items ?? []} /><Label>{participantCopy.certificates.fields.issuedOn}<Input name="issued_on" type="date" /></Label><Label>{participantCopy.certificates.fields.expiresOn}<Input name="expires_on" type="date" /></Label><Label className="sm:col-span-2">{participantCopy.certificates.fields.verificationUrl}<Input name="verification_url" type="url" placeholder="https://..." /></Label><FileUploadPreview className="sm:col-span-2" name="file" accept=".pdf,.png,.jpg,.jpeg,.webp" required label={participantCopy.certificates.fields.file} help="PDF ou imagem, até 8 MB." /><PendingSubmitButton pendingLabel="Enviando certificado…" className="w-fit sm:col-span-2" icon={<FileUp size={16} />}>{participantCopy.certificates.submit}</PendingSubmitButton></form></Card>}
      {externalUnavailable ? <StatusPanel title="Certificados externos temporariamente indisponíveis" tone="warning">A consulta falhou, mas nenhum registro foi removido.</StatusPanel> : external?.items.length === 0 ? <EmptyState title="Nenhum certificado externo" tone="info">Use o formulário acima para adicionar sua primeira formação.</EmptyState> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{external?.items.map((item) => <Card key={item.id}><StatusPill tone={item.storage_status === "ready" ? "info" : "warning"}>{item.storage_status === "ready" ? "Externo" : "Arquivo em verificação"}</StatusPill><h3 className="mt-3 font-bold text-ink">{item.title}</h3><p className="mt-1 text-sm text-muted">{item.issuer}</p><div className="mt-4 flex gap-2">{item.download_available ? <ButtonLink href={`/api/external-credentials/${item.id}/download`} variant="secondary" size="sm" icon={<Download size={14} />}>Baixar</ButtonLink> : null}{item.verification_url ? <ButtonLink href={item.verification_url} variant="ghost" size="sm">Validar</ButtonLink> : null}</div></Card>)}</div>}
    </section>

    <section className="grid gap-4"><h2 className="display-font text-2xl text-secondary">O que você ainda pode conquistar</h2>{results[0].status === "rejected" ? <StatusPanel title="Reconhecimentos temporariamente indisponíveis" tone="warning">Tente novamente em instantes.</StatusPanel> : available.length === 0 ? <EmptyState title="Nenhuma recompensa pendente" tone="success">Você já conquistou tudo disponível.</EmptyState> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{available.map((reward) => <Card key={`${reward.type}:${reward.version_id}`}><StatusPill tone="neutral">Disponível</StatusPill><h3 className="mt-3 font-semibold text-ink">{reward.title}</h3><p className="mt-1 text-sm text-muted">{reward.description}</p></Card>)}</div>}</section>
  </div>;
}
