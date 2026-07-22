import Link from "next/link";
import { StatusPanel } from "@/components/status-panel";
import { getAuthContext } from "@/lib/auth/context";
import { credentialRuntime } from "@/lib/credentials/runtime";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeZone: "America/Sao_Paulo"
});

export default async function ParticipantCredentialsPage() {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const credentials = await credentialRuntime.listParticipant(auth.identity.user_account_id);
  const activeBadges = credentials.badges.filter((badge) => badge.status === "active").length;
  const validCertificates = credentials.certificates.filter((certificate) => certificate.valid).length;

  return <>
    <header className="page-heading"><p className="eyebrow">Conquistas</p><h1>Minhas credenciais</h1><p>Selos e certificados são emitidos a partir de resultados e regras versionadas.</p></header>
    <div className="metrics-grid">
      <article className="metric"><span>Selos ativos</span><strong>{activeBadges}</strong></article>
      <article className="metric"><span>Certificados válidos</span><strong>{validCertificates}</strong></article>
    </div>

    <section className="stack stack--large" aria-labelledby="selos-titulo">
      <div><h2 id="selos-titulo">Selos</h2><p className="support-note">Marcos intermediários ou conclusões de jornada.</p></div>
      {credentials.badges.length === 0 ? <StatusPanel title="Nenhum selo emitido" tone="info"><p>Seus selos aparecerão aqui após uma regra publicada ser atendida.</p></StatusPanel> : <div className="credential-grid">
        {credentials.badges.map((badge) => <article className="credential-card" key={badge.award_id}>
          <span className="credential-mark" aria-hidden="true">✓</span>
          <span className="status-pill">Selo</span><h3>{badge.title}</h3><p>{badge.description}</p><p className="metadata">{badge.journey_title} · {dateFormatter.format(new Date(badge.awarded_at))}</p>
          {badge.status !== "active" ? <p className="moderation-reason">Esta credencial não está ativa.</p> : null}
        </article>)}
      </div>}
    </section>

    <section className="stack stack--large" aria-labelledby="certificados-titulo">
      <div><h2 id="certificados-titulo">Certificados</h2><p className="support-note">Cada certificado possui um código público de validação.</p></div>
      {credentials.certificates.length === 0 ? <StatusPanel title="Nenhum certificado emitido" tone="info"><p>Certificados aparecem quando a jornada e as avaliações exigidas são concluídas.</p></StatusPanel> : <div className="credential-grid">
        {credentials.certificates.map((certificate) => <article className="credential-card credential-card--certificate" key={certificate.issuance_id}>
          <span className="status-pill">Certificado</span><h3>{certificate.certificate_name}</h3><p>{certificate.journey_title}</p><p className="metadata">Emitido em {dateFormatter.format(new Date(certificate.issued_at))} · código {certificate.verification_code}</p>
          {!certificate.valid ? <p className="moderation-reason">Este certificado não está válido.</p> : null}
          <Link className="button button--primary" href={`/credenciais/${certificate.verification_code}`}>Abrir certificado</Link>
        </article>)}
      </div>}
    </section>

    <div className="form-footer journey-page-footer no-print"><Link className="button button--secondary" href="/empreendedor">Voltar ao painel</Link></div>
  </>;
}
