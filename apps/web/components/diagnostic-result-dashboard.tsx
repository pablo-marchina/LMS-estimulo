import { BarChart3, CheckCircle2, Compass, Focus, Lightbulb, Quote, Target } from "lucide-react";
import { PrintResultButton } from "@/components/print-result-button";
import { ShareAction } from "@/components/share-action";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  normalizeDiagnosticProfileResultContent,
  normalizeDiagnosticResultBlocks,
  type DiagnosticProfileResultContent,
  type DiagnosticResultBlockCode,
} from "@/lib/diagnostics/result-blocks";
import type { DiagnosticDimensionSummary } from "@/lib/engagement/contracts";

type ArchetypeInsight = { strength: string; challenge: string; tip: string; phrase: string };

function insightForArchetype(name: string): ArchetypeInsight {
  const normalized = name.toLocaleLowerCase("pt-BR");
  if (normalized.includes("fazendo acontecer")) return {
    strength: "Você conhece o seu trabalho, resolve problemas com rapidez e mantém o negócio em movimento mesmo diante da pressão do dia a dia.",
    challenge: "Transformar sua energia de execução em uma gestão mais organizada, com rotinas e planejamento que reduzam decisões de última hora.",
    tip: "Escolha uma rotina simples de gestão para fortalecer primeiro — por exemplo, acompanhar entradas e saídas toda semana ou definir três prioridades para o mês.",
    phrase: "Organizar o que você já faz bem cria espaço para crescer com mais tranquilidade.",
  };
  if (normalized.includes("fortalecendo a base")) return {
    strength: "Sua persistência e capacidade de atravessar desafios mostram uma base empreendedora forte e disposição para manter o negócio funcionando.",
    challenge: "Ganhar previsibilidade financeira e operacional para decidir com menos pressão e construir uma base mais estável.",
    tip: "Comece pelo indicador que mais reduz incerteza no seu dia a dia e acompanhe-o com frequência até ele virar uma rotina de gestão.",
    phrase: "Uma base mais organizada transforma esforço em segurança para o próximo passo.",
  };
  if (normalized.includes("construindo o crescimento")) return {
    strength: "Você já acompanha melhor o negócio, organiza informações e toma decisões com uma base mais consistente.",
    challenge: "Transformar organização em crescimento planejado, conectando metas, indicadores e oportunidades a uma direção clara.",
    tip: "Defina uma meta de crescimento concreta, escolha poucos indicadores para acompanhá-la e revise o avanço em uma cadência fixa.",
    phrase: "Crescer com direção é transformar uma boa base em escolhas cada vez mais intencionais.",
  };
  if (normalized.includes("pronto para o próximo nível") || normalized.includes("próximo nível")) return {
    strength: "Você já administra com visão de futuro, acompanha resultados e consegue tomar decisões pensando além das urgências do presente.",
    challenge: "Escalar sem perder a qualidade da gestão, fortalecendo processos, pessoas e capacidade de execução conforme o negócio cresce.",
    tip: "Identifique o processo que mais depende de você hoje e documente uma forma simples de delegar, medir e melhorar essa rotina.",
    phrase: "O próximo nível chega quando o negócio cresce sem precisar concentrar tudo em você.",
  };
  return {
    strength: "Seu diagnóstico revela capacidades que já sustentam o negócio e ajudam você a avançar.",
    challenge: "Escolher a área com maior oportunidade de evolução e transformá-la em uma prioridade prática.",
    tip: "Use o seu mapa para escolher uma melhoria pequena, mensurável e possível de aplicar no seu dia a dia.",
    phrase: "Evolução consistente começa com um próximo passo claro.",
  };
}

function legacyResultContent(insight: ArchetypeInsight): DiagnosticProfileResultContent {
  return {
    strength: { title: "O que já joga a seu favor", body: insight.strength },
    challenge: { title: "Onde concentrar energia agora", body: insight.challenge },
    practical_tip: { title: "Um passo para começar", body: insight.tip },
    takeaway: { title: "Uma frase para o seu momento", body: insight.phrase },
  };
}

function percent(value: number) { return Math.min(100, Math.max(0, Math.round(value))); }

export function DiagnosticResultDashboard({
  archetype,
  dimensions,
  resultBlocks,
  resultContent,
  primaryHref = "/empreendedor/jornadas",
  primaryLabel = "Acessar minhas jornadas",
}: {
  archetype: { name?: string | null; description?: string | null };
  dimensions: DiagnosticDimensionSummary[];
  resultBlocks?: string[];
  resultContent?: unknown;
  primaryHref?: string;
  primaryLabel?: string;
}) {
  const enabled = new Set<DiagnosticResultBlockCode>(normalizeDiagnosticResultBlocks(resultBlocks));
  const normalized = dimensions.map((dimension) => ({ ...dimension, percentage: percent(dimension.percentage) }));
  const priority = normalized.slice().sort((a, b) => a.percentage - b.percentage)[0] ?? null;
  const name = archetype.name?.trim() || "Perfil identificado";
  const legacyInsight = insightForArchetype(name);
  const copy = normalizeDiagnosticProfileResultContent(resultContent) ?? legacyResultContent(legacyInsight);
  const shareText = `Meu perfil empreendedor é “${name}”. ${priority ? `Minha prioridade agora é ${priority.name}.` : ""}`.trim();
  const movements = [
    { title: priority ? `Fortaleça ${priority.name}` : "Escolha seu foco", body: "Comece pela área com maior espaço de evolução e transforme-a em uma prioridade concreta." },
    { title: "Aplique uma ação prática", body: copy.practical_tip.body || legacyInsight.tip },
    { title: "Acompanhe o que mudou", body: "Revise seus indicadores e o progresso nas jornadas para decidir o próximo passo com evidências." },
  ];

  return <section className="grid gap-6" aria-label="Resultado do diagnóstico empreendedor">
    {enabled.has("maturity_map") ? <div className="grid gap-4 lg:grid-cols-[1.02fr_.98fr]">
      <Card className="relative overflow-hidden border border-info/20 bg-info-soft p-6 text-secondary shadow-lg after:!hidden sm:p-7">
        <Compass className="absolute right-5 top-5 text-primary/10" size={74} aria-hidden="true" />
        <div className="relative">
          <span className="inline-flex rounded-full bg-primary px-3 py-1 text-[10px] font-black uppercase tracking-[.14em] text-white">Seu perfil empreendedor</span>
          <h2 className="display-font mt-5 text-3xl text-secondary sm:text-4xl">{name}</h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted">{archetype.description || "Seu resultado reúne suas respostas e ajuda a transformar o diagnóstico em próximos passos concretos."}</p>
          <div className="no-print mt-6 flex flex-wrap gap-2">
            <ButtonLink href={primaryHref} size="sm">{primaryLabel}</ButtonLink>
            <PrintResultButton />
            <ShareAction title="Meu diagnóstico empreendedor" text={shareText} entityType="diagnostic_result" entityId={name.toLocaleLowerCase("pt-BR").replace(/\s+/g, "_")} />
          </div>
        </div>
      </Card>

      <Card className="grid gap-5 border border-primary/10 bg-white p-5 after:!hidden sm:p-6">
        <div className="flex items-center gap-2"><BarChart3 size={19} className="text-primary" /><div><p className="text-xs font-black uppercase tracking-[.12em] text-primary">Seu mapa de maturidade</p><h3 className="mt-0.5 font-black text-secondary">Um olhar mais de perto</h3></div></div>
        {normalized.length ? <div className="grid gap-4">{normalized.map((dimension) => <div key={dimension.code} className="grid gap-1.5"><div className="flex items-center justify-between gap-3 text-sm"><strong className="text-secondary">{dimension.name}</strong><span className="font-black tabular-nums text-secondary">{dimension.percentage}%</span></div><div className="h-2.5 overflow-hidden rounded-full bg-surface-muted" role="progressbar" aria-label={dimension.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={dimension.percentage}><div className="h-full rounded-full bg-primary" style={{ width: `${dimension.percentage}%` }} /></div></div>)}</div> : <p className="text-sm text-muted">O mapa aparecerá assim que houver dimensões suficientes para compor o resultado.</p>}
        <div className="rounded-xl bg-success-soft p-4"><p className="text-[10px] font-black uppercase tracking-[.14em] text-success">Sua prioridade agora</p><p className="mt-1 text-lg font-black text-secondary">{priority?.name ?? "Transformar o diagnóstico em ação"}</p>{priority ? <p className="mt-1 text-xs text-muted">Esta é a dimensão com maior espaço de evolução neste resultado.</p> : null}</div>
      </Card>
    </div> : null}

    {enabled.has("next_moves") ? <Card className="border border-primary/10 bg-white p-5 after:!hidden sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-primary">Rota recomendada</p><h3 className="display-font mt-1 text-3xl text-secondary">Seus próximos três movimentos</h3></div><span className="text-xs font-semibold text-muted">Uma sequência simples para sair do diagnóstico e ir para a prática</span></div>
      <div className="mt-5 grid gap-4 md:grid-cols-3">{movements.map((movement, index) => <article key={movement.title} className="rounded-2xl border border-info/20 bg-info-soft/55 p-5"><span className="grid size-8 place-items-center rounded-full bg-primary text-sm font-black text-white">{index + 1}</span><h4 className="mt-5 font-black text-secondary">{movement.title}</h4><p className="mt-2 text-sm leading-6 text-muted">{movement.body}</p></article>)}</div>
    </Card> : null}

    {enabled.has("focus") || enabled.has("right_content") || enabled.has("real_application") ? <div className="grid gap-4 md:grid-cols-3">
      {enabled.has("focus") ? <MiniInsight icon={<Focus size={18} />} title="Foco claro" body={priority ? `Você sabe que ${priority.name} merece atenção primeiro.` : "Escolha onde colocar sua energia primeiro."} /> : null}
      {enabled.has("right_content") ? <MiniInsight icon={<Lightbulb size={18} />} title="Conteúdo certo" body="Use as jornadas e conteúdos recomendados para desenvolver o que faz sentido para o seu momento." /> : null}
      {enabled.has("real_application") ? <MiniInsight icon={<CheckCircle2 size={18} />} title="Aplicação real" body="Transforme cada aprendizado em uma pequena ação no seu negócio e acompanhe o efeito." /> : null}
    </div> : null}

    {enabled.has("strengths") || enabled.has("challenge") || enabled.has("practical_tip") || enabled.has("takeaway") ? <div className="grid gap-4 sm:grid-cols-2">
      {enabled.has("strengths") && (copy.strength.title || copy.strength.body) ? <InsightCard icon={<CheckCircle2 size={20} />} eyebrow="Pontos fortes" title={copy.strength.title} body={copy.strength.body} /> : null}
      {enabled.has("challenge") && (copy.challenge.title || copy.challenge.body) ? <InsightCard icon={<Target size={20} />} eyebrow="Seu próximo desafio" title={copy.challenge.title} body={copy.challenge.body} /> : null}
      {enabled.has("practical_tip") && (copy.practical_tip.title || copy.practical_tip.body) ? <InsightCard icon={<Lightbulb size={20} />} eyebrow="Dica prática" title={copy.practical_tip.title} body={copy.practical_tip.body} /> : null}
      {enabled.has("takeaway") && (copy.takeaway.title || copy.takeaway.body) ? <InsightCard icon={<Quote size={20} />} eyebrow="Para levar com você" title={copy.takeaway.title} body={copy.takeaway.body} /> : null}
    </div> : null}

    <p className="text-xs leading-5 text-muted">Seu resultado ajuda a personalizar sua experiência e indicar conteúdos e jornadas que fazem mais sentido para você. Ele é uma leitura de desenvolvimento, não uma avaliação de crédito.</p>
  </section>;
}

function MiniInsight({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return <Card className="flex gap-3 border border-primary/10 bg-white p-4 after:!hidden"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">{icon}</span><div><h4 className="font-black text-secondary">{title}</h4><p className="mt-1 text-sm leading-5 text-muted">{body}</p></div></Card>;
}

function InsightCard({ icon, eyebrow, title, body }: { icon: React.ReactNode; eyebrow: string; title?: string; body?: string }) {
  return <Card className="flex gap-4 border border-primary/10 bg-white"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">{icon}</span><div><p className="text-xs font-bold uppercase tracking-[.12em] text-primary">{eyebrow}</p>{title ? <h3 className="mt-1 font-black text-secondary">{title}</h3> : null}{body ? <p className="mt-2 text-sm leading-6 text-muted">{body}</p> : null}</div></Card>;
}
