import { acceptPendingLegalDocumentsAction } from "@/app/empreendedor/legal-actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { Card } from "@/components/ui/card";
import type { JsonRecord } from "@/lib/extensions/runtime";

function text(record: JsonRecord, field: string) {
  return typeof record[field] === "string" ? String(record[field]) : "";
}

function label(type: string) {
  return type === "privacy_policy" ? "Política de Privacidade" : "Termos de Uso";
}

export function LegalReacceptanceGate({ documents }: { documents: JsonRecord[] }) {
  if (documents.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-secondary/75 p-4 backdrop-blur-sm sm:p-8" role="dialog" aria-modal="true" aria-labelledby="legal-reacceptance-title">
      <div className="mx-auto grid min-h-full max-w-3xl place-items-center">
        <Card className="grid w-full gap-5 border-primary/20 shadow-2xl">
          <div>
            <p className="brand-kicker">Atualização obrigatória</p>
            <h1 id="legal-reacceptance-title" className="mt-1 text-2xl font-black text-secondary">Revise os documentos atualizados</h1>
            <p className="mt-2 text-sm leading-6 text-muted">Para continuar usando a plataforma, confirme a aceitação das versões publicadas abaixo.</p>
          </div>

          <form action={acceptPendingLegalDocumentsAction} className="grid gap-5">
            {documents.map((document) => {
              const id = text(document, "id");
              const type = text(document, "document_type");
              const title = text(document, "title") || label(type);
              return (
                <section key={id} className="grid gap-3 rounded-2xl border border-border bg-surface-muted p-4">
                  <input type="hidden" name="legal_document_version_ids" value={id} />
                  <div>
                    <h2 className="font-black text-secondary">{title}</h2>
                    <p className="text-xs text-muted">{label(type)} · versão {String(document.version_number ?? "atual")}</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-white p-4 text-sm leading-6 text-ink/90" tabIndex={0}>{text(document, "body")}</div>
                  <label className="flex items-start gap-3 text-sm font-semibold text-ink">
                    <input type="checkbox" name="accepted_document_ids" value={id} required className="mt-0.5 size-4 accent-primary" />
                    Li e aceito esta versão de {label(type).toLowerCase()}.
                  </label>
                </section>
              );
            })}
            <PendingSubmitButton pendingLabel="Registrando aceitação…" className="w-fit">Aceitar e continuar</PendingSubmitButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
