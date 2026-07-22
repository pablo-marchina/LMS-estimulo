import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricTile } from "@/components/ui/metric-tile";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
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

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Conquistas"
        title="Minhas credenciais"
        description="Selos e certificados são emitidos a partir de resultados e regras versionadas."
      />

      <div className="grid grid-cols-2 gap-4">
        <MetricTile index={0} label="Selos ativos" value={activeBadges} />
        <MetricTile index={1} label="Certificados válidos" value={validCertificates} />
      </div>

      <section className="grid gap-4" aria-labelledby="selos-titulo">
        <div>
          <h2 id="selos-titulo" className="text-xl font-semibold text-ink">Selos</h2>
          <p className="mt-1 text-sm text-muted">Marcos intermediários ou conclusões de jornada.</p>
        </div>
        {credentials.badges.length === 0 ? (
          <EmptyState title="Nenhum selo emitido" tone="info">
            Seus selos aparecerão aqui após uma regra publicada ser atendida.
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {credentials.badges.map((badge) => (
              <Card key={badge.award_id}>
                <div className="flex items-start gap-4">
                  <span
                    className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary-soft text-lg font-bold text-primary"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                  <div>
                    <StatusPill tone="neutral">Selo</StatusPill>
                    <h3 className="mt-2 font-semibold text-ink">{badge.title}</h3>
                    <p className="mt-1 text-sm text-muted">{badge.description}</p>
                    <p className="mt-2 text-xs text-muted">
                      {badge.journey_title} · {dateFormatter.format(new Date(badge.awarded_at))}
                    </p>
                  </div>
                </div>
                {badge.status !== "active" ? (
                  <p className="mt-3 rounded-lg bg-warning-soft p-3 text-sm text-warning">
                    Esta credencial não está ativa.
                  </p>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4" aria-labelledby="certificados-titulo">
        <div>
          <h2 id="certificados-titulo" className="text-xl font-semibold text-ink">Certificados</h2>
          <p className="mt-1 text-sm text-muted">Cada certificado possui um código público de validação.</p>
        </div>
        {credentials.certificates.length === 0 ? (
          <EmptyState title="Nenhum certificado emitido" tone="info">
            Certificados aparecem quando a jornada e as avaliações exigidas são concluídas.
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {credentials.certificates.map((certificate) => (
              <Card key={certificate.issuance_id} className="flex flex-col">
                <StatusPill tone="info">Certificado</StatusPill>
                <h3 className="mt-2 font-semibold text-ink">{certificate.certificate_name}</h3>
                <p className="mt-1 text-sm text-muted">{certificate.journey_title}</p>
                <p className="mt-2 text-xs text-muted">
                  Emitido em {dateFormatter.format(new Date(certificate.issued_at))} · código {certificate.verification_code}
                </p>
                {!certificate.valid ? (
                  <p className="mt-3 rounded-lg bg-warning-soft p-3 text-sm text-warning">
                    Este certificado não está válido.
                  </p>
                ) : null}
                <div className="mt-auto pt-4">
                  <ButtonLink href={`/credenciais/${certificate.verification_code}`} size="sm">
                    Abrir certificado
                  </ButtonLink>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <div className="no-print flex items-center justify-between gap-3 border-t border-border pt-6">
        <ButtonLink href="/empreendedor" variant="secondary">Voltar ao painel</ButtonLink>
      </div>
    </div>
  );
}
