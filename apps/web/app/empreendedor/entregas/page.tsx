import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { getAuthContext } from "@/lib/auth/context";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";
import { practiceRuntime } from "@/lib/practice/runtime";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo"
});

const reviewLabel: Record<string, string> = {
  accepted: "Aprovada",
  rejected: "Recusada"
};

const statusTone: Record<string, "success" | "warning" | "info" | "neutral"> = {
  upload_pending: "warning",
  processing: "info",
  available: "success",
  awaiting_review: "info"
};

const statusLabelMap: Record<string, string> = {
  upload_pending: "Envio pendente",
  processing: "Em verificação",
  available: "Disponível",
  awaiting_review: "Aguardando revisão"
};

export default async function ParticipantSubmissionsPage() {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;

  const { journeys } = await journeyRuntime.listParticipantJourneys(auth.identity.user_account_id);
  const journeysWithActivity = journeys.filter((journey) => journey.s?.step_instance_id);

  const submissionGroups = await Promise.all(
    journeysWithActivity.map(async (journey) => {
      const result = await practiceRuntime
        .listParticipant(auth.identity.user_account_id, journey.s!.step_instance_id)
        .catch(() => null);
      return { journey, result };
    })
  );

  const groupsWithSubmissions = submissionGroups.filter((group) => group.result && group.result.submissions.length > 0);
  const totalSubmissions = groupsWithSubmissions.reduce((sum, group) => sum + (group.result?.submissions.length ?? 0), 0);

  return (
    <div className="mx-auto grid max-w-[1400px] gap-8 px-5 py-8 lg:px-9 lg:py-10">
      <PageHeader
        eyebrow="Prática"
        title="Minhas entregas"
        description="Arquivos enviados nas atividades práticas da sua jornada atual e o status de revisão de cada envio."
      />

      {groupsWithSubmissions.length === 0 ? (
        <EmptyState title="Nenhuma entrega enviada ainda" tone="info">
          Quando você enviar uma evidência em uma atividade prática, ela aparecerá aqui com o status de revisão.
        </EmptyState>
      ) : (
        groupsWithSubmissions.map(({ journey, result }) => (
          <section key={journey.journey_instance_id} className="grid gap-4" aria-labelledby={`entregas-${journey.journey_instance_id}`}>
            <div>
              <h2 id={`entregas-${journey.journey_instance_id}`} className="display-font text-xl text-ink">
                {journey.journey_title ?? journey.journey_code}
              </h2>
              <p className="mt-1 text-sm text-muted">{result!.submissions.length} entrega(s) nesta atividade.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result!.submissions.map((submission) => (
                <Card key={submission.id} className="flex flex-col">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <StatusPill tone={statusTone[submission.status] ?? "neutral"}>
                      {statusLabelMap[submission.status] ?? submission.status}
                    </StatusPill>
                    <span className="text-xs text-muted">#{submission.submission_number}</span>
                  </div>
                  <h3 className="truncate font-semibold text-ink" title={submission.original_filename ?? undefined}>
                    {submission.original_filename ?? "Arquivo enviado"}
                  </h3>
                  <p className="mt-1 text-xs text-muted">{dateFormatter.format(new Date(submission.submitted_at))}</p>
                  {submission.review_status ? (
                    <p className="mt-3 rounded-lg bg-surface-muted p-3 text-sm text-ink">
                      <strong>{reviewLabel[submission.review_status] ?? submission.review_status}</strong>
                      {submission.review_feedback ? <span className="mt-1 block text-muted">{submission.review_feedback}</span> : null}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm text-muted">Ainda sem retorno da revisão.</p>
                  )}
                </Card>
              ))}
            </div>
          </section>
        ))
      )}

      {groupsWithSubmissions.length > 0 ? (
        <p className="text-sm text-muted">
          {totalSubmissions} entrega(s) no total, considerando a atividade prática atual de cada jornada.
        </p>
      ) : null}

      <div className="no-print flex items-center justify-between gap-3 border-t border-border pt-6">
        <ButtonLink href="/empreendedor" variant="secondary">
          Voltar ao painel
        </ButtonLink>
      </div>
    </div>
  );
}
