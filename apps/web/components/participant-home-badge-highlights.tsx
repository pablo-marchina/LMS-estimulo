import Link from "next/link";
import { CheckCircle2, Sparkles } from "lucide-react";
import { badgeHighlightsRuntime } from "@/lib/engagement/badge-highlights-runtime";

export async function ParticipantHomeBadgeHighlights({ actorUserAccountId }: { actorUserAccountId: string }) {
  const data = await badgeHighlightsRuntime.participant(actorUserAccountId).catch(() => ({ display_limit: 3, badges: [] }));
  const badges = data.badges.slice(0, Math.max(1, data.display_limit));

  return (
    <section className="brand-recognition-strip mt-8 grid gap-5" aria-labelledby="selos-destaque-titulo">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="brand-kicker">Reconhecimento do seu avanço</p><h2 id="selos-destaque-titulo" className="display-font mt-1 text-2xl text-secondary">Selos em destaque</h2><p className="mt-2 text-sm text-muted">Conheça os reconhecimentos selecionados pela equipe e acompanhe quais você já conquistou.</p></div>
        <Link href="/empreendedor/conquistas" className="text-sm font-bold text-primary hover:underline">Ver todas as conquistas</Link>
      </div>

      {badges.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {badges.map((badge) => (
            <article key={badge.badge_version_id} className={`brand-float-card rounded-2xl border bg-white p-4 shadow-sm ${badge.earned ? "border-success/35" : "border-accent-gold/45"}`}>
              <span className={`grid size-10 place-items-center rounded-xl ${badge.earned ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>{badge.earned ? <CheckCircle2 size={20} /> : <Sparkles size={20} />}</span>
              <p className={`mt-3 text-xs font-bold uppercase tracking-[.12em] ${badge.earned ? "text-success" : "text-warning"}`}>{badge.earned ? "Conquistado" : "Em destaque"}</p>
              <h3 className="mt-1 font-black text-secondary">{badge.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{badge.description}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl bg-white p-4 text-sm text-muted">A equipe ainda não selecionou selos para aparecer nesta área.</p>
      )}
    </section>
  );
}
