"use client";

import { useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { createActivityCommentAction } from "@/app/actions/journey";
import type { ActivityComment } from "@/lib/journey-runtime/contracts";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { StatusPanel } from "@/components/status-panel";

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

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts.at(-1)?.[0] ?? "" : "");
}

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
    <div>
      <a
        href="#comentarios"
        className="fixed bottom-20 right-4 z-40 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-lg transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:hidden"
        aria-label="Ir para os comentários desta aula"
      >
        <MessageCircle size={17} aria-hidden="true" />
        Comentar esta aula
      </a>

      {published ? (
        <div className="mb-3">
          <StatusPanel title="Comentário publicado" tone="success">Sua participação já está visível sem interromper a aula.</StatusPanel>
        </div>
      ) : null}
      {error ? (
        <div className="mb-3">
          <StatusPanel title="Comentário não publicado" tone="warning">{error}</StatusPanel>
        </div>
      ) : null}

      <form onSubmit={submit} className="grid gap-2">
        <input type="hidden" name="journey_instance_id" value={journeyInstanceId} />
        <input type="hidden" name="step_instance_id" value={stepInstanceId} />
        <Textarea
          name="body"
          minLength={1}
          maxLength={2000}
          rows={3}
          required
          disabled={pending}
          placeholder="Escreva um comentário..."
          aria-label="Novo comentário"
          className="resize-none"
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" icon={<Send size={14} />} disabled={pending}>
            {pending ? "Publicando…" : "Publicar"}
          </Button>
        </div>
      </form>

      {comments.length ? (
        <ul className="mt-6 grid gap-5" aria-live="polite">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-[11px] font-bold uppercase text-primary">
                {initials(comment.author_name)}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">
                  {comment.is_own ? "Você" : comment.author_name}
                  <span className="font-normal text-muted"> · {dateFormatter.format(new Date(comment.created_at))}</span>
                </p>
                <p className="mt-1 whitespace-pre-line text-sm leading-6 text-muted">{comment.body}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-muted">Ainda não há comentários. Seja a primeira pessoa a participar.</p>
      )}
    </div>
  );
}
