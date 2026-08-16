"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { createActivityCommentAction } from "@/app/actions/journey";
import type { ActivityComment } from "@/lib/journey-runtime/contracts";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/input";
import { StatusPanel } from "@/components/status-panel";
import { StatusPill } from "@/components/ui/status-pill";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

type Props = {
  journeyInstanceId: string;
  stepInstanceId: string;
  initialComments: ActivityComment[];
};

export function ActivityCommentPanel({ journeyInstanceId, stepInstanceId, initialComments }: Props) {
  const [comments, setComments] = useState(initialComments);
  const [pending, setPending] = useState(false);
  const [published, setPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    setPending(true);
    setPublished(false);
    setError(null);

    try {
      const comment = await createActivityCommentAction(formData);
      setComments((current) => current.some((item) => item.id === comment.id) ? current : [comment, ...current]);
      form.reset();
      setPublished(true);
    } catch {
      setError("Não foi possível publicar o comentário. Tente novamente sem sair da aula.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="grid content-start gap-3">
        {published ? (
          <StatusPanel title="Comentário publicado" tone="success">
            Sua participação já está visível sem interromper o conteúdo da aula.
          </StatusPanel>
        ) : null}
        {error ? (
          <StatusPanel title="Comentário não publicado" tone="warning">
            {error}
          </StatusPanel>
        ) : null}

        <form onSubmit={submit} className="grid gap-3 rounded-2xl bg-surface-muted p-4">
          <input type="hidden" name="journey_instance_id" value={journeyInstanceId} />
          <input type="hidden" name="step_instance_id" value={stepInstanceId} />
          <label htmlFor="activity-comment" className="text-sm font-semibold text-ink">
            Novo comentário
          </label>
          <Textarea
            id="activity-comment"
            name="body"
            minLength={1}
            maxLength={2000}
            rows={4}
            required
            disabled={pending}
            placeholder="Conte o que você testou ou quer entender."
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-muted">Até 2.000 caracteres</span>
            <Button type="submit" size="sm" icon={<MessageCircle size={14} />} disabled={pending}>
              {pending ? "Publicando…" : "Publicar"}
            </Button>
          </div>
        </form>
      </div>

      {comments.length === 0 ? (
        <EmptyState title="Nenhum comentário ainda" tone="info">
          Seja a primeira pessoa a participar.
        </EmptyState>
      ) : (
        <div className="grid max-h-[520px] content-start gap-2 overflow-y-auto pr-1" aria-live="polite">
          {comments.map((comment) => (
            <article key={comment.id} className="rounded-2xl border border-border bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <strong className="text-sm text-ink">{comment.author_name}</strong>
                {comment.is_own ? <StatusPill tone="info">Você</StatusPill> : null}
                <time dateTime={comment.created_at} className="ml-auto text-[11px] text-muted">
                  {dateFormatter.format(new Date(comment.created_at))}
                </time>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink">{comment.body}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
