import { notFound } from "next/navigation";
import { BookOpen, Brain, CheckCircle2, MessageCircle, Route, Star, Trophy } from "lucide-react";
import { ActivityCompactWorkspace } from "@/components/activity-compact-workspace";
import densityStyles from "@/components/participant-density.module.css";
import activityStyles from "@/app/empreendedor/atividade/[stepInstanceId]/layout.module.css";
import { displayContentName } from "@/lib/content/display-name";

export const dynamic = "force-dynamic";

export default function ParticipantVisualAudit() {
  if (process.env.VERCEL_ENV === "production") notFound();
  const journeyTitle = displayContentName("capacitacao_ia_mei_openai", "Jornada");

  return (
    <div className={`participant-stage min-h-screen bg-background ${densityStyles.density}`}>
      <header className="sticky top-0 z-40 flex min-h-16 items-center bg-primary px-5 text-white shadow-sm">
        <strong className="text-lg">estímulo</strong>
        <nav className="ml-auto flex gap-8 text-sm font-semibold"><span>Início</span><span>Jornadas</span><span>Biblioteca</span><span>Pontuação</span></nav>
      </header>
      <main id="conteudo-principal" className="w-full max-w-none">
        <div className={activityStyles.activityLayout} data-activity-workspace data-active-section="conteudo">
          <ActivityCompactWorkspace />
          <div className="grid w-full gap-5 px-5 py-5 lg:px-7">
            <aside className="rounded-2xl border border-primary/15 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-primary text-white"><BookOpen size={19} /></span>
                <div><p className="text-xs font-bold uppercase tracking-[.13em] text-primary/70">{journeyTitle}</p><h1 className="text-lg font-black text-secondary">Boas-vindas: IA para mover o seu negócio</h1></div>
                <span className="ml-auto rounded-full bg-primary-soft px-3 py-1.5 text-xs font-bold text-primary">Atividade em andamento</span>
              </div>
            </aside>

            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
              <main className="grid min-w-0 gap-5">
                <section id="conteudo" className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
                  <div className="flex items-start gap-3 border-b border-border bg-surface-muted/65 px-4 py-4"><span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary"><BookOpen size={19} /></span><div><p className="brand-kicker">Conteúdo da aula</p><h2 className="text-xl font-black text-secondary">Aprenda no seu ritmo</h2><p className="text-sm text-muted">1 material obrigatório. O progresso é salvo automaticamente.</p></div></div>
                  <div className="p-4"><article className="rounded-2xl border border-border bg-surface-muted p-4"><p className="brand-kicker">Vídeo</p><h3 className="mt-1 text-lg font-black text-secondary">Módulo 1 — Introdução</h3><div className="mt-3 aspect-video rounded-xl bg-black" /></article></div>
                </section>
                <section id="avaliacao" className="grid gap-4 rounded-2xl border border-border bg-white p-4 shadow-sm"><div className="flex items-center gap-3"><Brain className="text-primary" /><div><p className="brand-kicker">Verificação</p><h2 className="text-xl font-black text-secondary">Verifique o que aprendeu</h2></div></div><article className="rounded-xl bg-primary-soft p-4"><p className="font-semibold text-secondary">Qual é a melhor forma de aproveitar esta jornada?</p><label className="mt-3 flex gap-2 rounded-xl bg-white p-3"><input type="radio" name="audit-answer" /> Aplicar, revisar e adaptar ao contexto do negócio</label></article></section>
                <section id="comentarios" className="rounded-2xl border border-border bg-white p-4 shadow-sm"><div className="flex items-center gap-3"><MessageCircle className="text-primary" /><div><p className="brand-kicker">Discussão</p><h2 className="text-xl font-black text-secondary">Discuta a aula</h2></div></div></section>
              </main>
              <aside className="grid gap-3 xl:sticky xl:top-20"><article className="rounded-2xl border border-border bg-white p-4 shadow-sm"><p className="brand-kicker">Seu avanço nesta aula</p><strong className="mt-2 block text-2xl text-secondary">0%</strong><div className="mt-3 h-2 rounded-full bg-primary-soft" /></article><article id="utilidade" className="rounded-2xl border border-border bg-white p-4 shadow-sm"><div className="flex gap-3"><Star className="text-warning" fill="currentColor" /><div><h2 className="font-black text-secondary">Avalie esta aula</h2><p className="text-xs text-muted">A nota melhora o conteúdo.</p></div></div><div className="mt-3 grid grid-cols-5 gap-1">{[1,2,3,4,5].map((rating)=><span key={rating} className="rounded-lg border p-2 text-center text-xs">★ {rating}</span>)}</div><a href="?utilidade=registrada#utilidade" className="mt-3 block rounded-xl border border-primary px-3 py-2 text-center text-sm font-bold text-primary">Enviar avaliação</a></article></aside>
            </div>
            <footer className="flex items-center justify-between border-t border-border pt-4"><a href="#conteudo" className="rounded-xl border border-primary px-4 py-2 font-bold text-primary">Voltar ao conteúdo</a><a href="#avaliacao" className="rounded-xl bg-primary px-4 py-2 font-bold text-white">Ir para a verificação</a></footer>
          </div>
        </div>

        <section className="mx-auto grid max-w-[1400px] gap-8 px-5 py-8 lg:px-9 lg:py-10">
          <header><p className="brand-kicker">Jornadas</p><h2 className="display-font mt-1 text-3xl text-secondary">Aprenda, aplique e evolua</h2></header>
          <article className="brand-featured-journey relative min-h-[25rem] overflow-hidden rounded-[2rem] bg-primary p-10 text-white"><div className="relative z-10 min-h-[20rem]"><p className="text-sm font-bold uppercase">Capacitação</p><h3 className="display-font mt-4 text-4xl text-white">Capacitação em IA para MEI/ME — Estímulo &lt;&gt; OpenAI</h3><p className="mt-3 max-w-2xl text-white/85">Conteúdo prático organizado em trilhas editoriais.</p></div></article>
          <div className="grid gap-4 md:grid-cols-3">{["Boas-vindas e mapa da jornada","Marketing e Vendas com IA","Gestão com IA"].map((title)=><article key={title} className="brand-journey-card flex min-h-[24rem] flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm"><div className="aspect-square bg-primary-soft" /><div className="p-5"><Route className="text-primary" /><h3 className="mt-3 font-black text-secondary">{title}</h3><p className="mt-2 text-sm text-muted">Atividades organizadas para avançar com clareza.</p></div></article>)}</div>
          <section className="grid grid-cols-3 gap-4"><article className="rounded-2xl bg-white p-6 shadow-sm"><Trophy className="text-primary" /><strong className="mt-3 block text-3xl text-secondary">120</strong><span className="text-sm text-muted">Pontos registrados</span></article><article className="rounded-2xl bg-white p-6 shadow-sm"><CheckCircle2 className="text-success" /><strong className="mt-3 block text-3xl text-secondary">3/7</strong><span className="text-sm text-muted">Etapas concluídas</span></article><article className="rounded-2xl bg-white p-6 shadow-sm"><BookOpen className="text-primary" /><strong className="mt-3 block text-3xl text-secondary">43%</strong><span className="text-sm text-muted">Progresso total</span></article></section>
        </section>
      </main>
    </div>
  );
}
