import { Award, BookOpenCheck, Compass, FileCheck2, Sparkles, Target, Users } from "lucide-react";
import { EstimuloBrand } from "@/components/estimulo-brand";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const archetypes = [
  { name: "Fazedor", description: "Transforma ideias em ação e aprende enquanto executa.", accent: "bg-brand-green" },
  { name: "Batalhador", description: "Mantém o negócio em movimento mesmo diante de desafios.", accent: "bg-brand-cyan" },
  { name: "Construtor", description: "Cria processos, estrutura e consistência para crescer.", accent: "bg-accent-gold" },
  { name: "Navegador", description: "Lê cenários, testa caminhos e toma decisões com clareza.", accent: "bg-brand-magenta" },
];

export default function PublicLandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background">
      <a href="#conteudo-principal" className="skip-link">Pular para o conteúdo</a>
      <header className="relative z-20 border-b border-border/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex min-h-20 max-w-[1400px] items-center gap-4 px-5 lg:px-9">
          <EstimuloBrand href="/" />
          <nav className="ml-auto hidden items-center gap-7 text-sm font-semibold text-secondary md:flex" aria-label="Navegação pública">
            <a href="#como-funciona" className="hover:text-primary">Como funciona</a>
            <a href="#jornadas" className="hover:text-primary">Jornadas</a>
            <a href="#perfis" className="hover:text-primary">Perfis</a>
          </nav>
          <ButtonLink href="/entrar" size="sm" className="ml-auto md:ml-4">Entrar</ButtonLink>
        </div>
      </header>

      <div id="conteudo-principal">
        <section className="brand-hero brand-dots-bg brand-chevrons-bg px-5 py-20 sm:py-28 lg:px-9 lg:py-32">
          <div className="mx-auto grid max-w-[1400px] items-center gap-14 lg:grid-cols-[1.08fr_.92fr]">
            <div className="animate-in max-w-3xl">
              <p className="brand-kicker">Plataforma Estímulo</p>
              <h1 className="display-font mt-6 text-5xl leading-[.93] sm:text-6xl lg:text-7xl">Conhecimento que movimenta o seu negócio.</h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-white/78 sm:text-xl">Descubra seu perfil, escolha jornadas práticas e transforme cada aprendizado em uma próxima ação concreta.</p>
              <div className="mt-9 flex flex-wrap gap-3">
                <ButtonLink href="/cadastro" variant="secondary" size="lg">Começar agora</ButtonLink>
                <ButtonLink href="/entrar" variant="ghost" size="lg" className="!border-white/35 !text-white hover:!bg-white/10">Já tenho acesso</ButtonLink>
              </div>
              <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm font-semibold text-white/72">
                <span className="flex items-center gap-2"><Target size={16} className="text-brand-cyan" /> Diagnóstico orientador</span>
                <span className="flex items-center gap-2"><BookOpenCheck size={16} className="text-brand-green" /> Aprendizado aplicável</span>
                <span className="flex items-center gap-2"><Award size={16} className="text-accent-gold" /> Conquistas verificáveis</span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl">
              <div className="absolute -inset-5 rotate-3 rounded-[2.5rem] bg-brand-magenta/25 blur-sm" aria-hidden="true" />
              <div className="relative rounded-[2rem] border border-white/30 bg-white/12 p-5 shadow-[0_30px_90px_rgba(0,0,50,.35)] backdrop-blur-md sm:p-7">
                <div className="rounded-[1.5rem] bg-white p-6 text-secondary shadow-lg sm:p-8">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="rounded-full bg-brand-green px-3 py-1 text-xs font-bold uppercase tracking-wide">Sua próxima evolução</span>
                      <h2 className="display-font mt-5 text-3xl">Uma jornada feita para sair do plano.</h2>
                    </div>
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-white"><Compass /></span>
                  </div>
                  <div className="mt-8 grid gap-3">
                    <JourneyPreview number="01" title="Entenda seu momento" color="bg-brand-cyan" />
                    <JourneyPreview number="02" title="Aprenda com atividades curtas" color="bg-brand-magenta" />
                    <JourneyPreview number="03" title="Aplique e envie evidências" color="bg-brand-green" />
                    <JourneyPreview number="04" title="Conquiste selos e certificados" color="bg-accent-gold" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="como-funciona" className="px-5 py-20 lg:px-9 lg:py-28">
          <div className="mx-auto max-w-[1400px]">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[.14em] text-primary">Uma experiência que acompanha você</p>
              <h2 className="display-font mt-3 text-4xl text-secondary sm:text-5xl">Menos páginas soltas. Mais direção.</h2>
              <p className="mt-5 text-lg leading-8 text-muted">A plataforma organiza diagnóstico, conteúdo, prática, entregas e reconhecimento em um fluxo simples de acompanhar.</p>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              <FeatureCard icon={<Compass />} number="01" title="Descubra" text="O diagnóstico ajuda a identificar seu momento e apresenta caminhos compatíveis com seu perfil." accent="bg-brand-cyan" />
              <FeatureCard icon={<Sparkles />} number="02" title="Experimente" text="Aulas, ferramentas e atividades foram pensadas para virar aplicação no dia a dia do negócio." accent="bg-brand-magenta" />
              <FeatureCard icon={<FileCheck2 />} number="03" title="Comprove" text="Entregas, selos e certificados registram o que você realizou e o que está pronto para compartilhar." accent="bg-brand-green" />
            </div>
          </div>
        </section>

        <section id="jornadas" className="px-5 pb-20 lg:px-9 lg:pb-28">
          <div className="mx-auto max-w-[1400px] overflow-hidden rounded-[2rem] bg-secondary text-white shadow-lg">
            <div className="grid lg:grid-cols-[.9fr_1.1fr]">
              <div className="brand-dots-bg p-8 sm:p-12 lg:p-16">
                <p className="brand-kicker">Jornada em destaque</p>
                <h2 className="display-font mt-5 text-4xl sm:text-5xl">IA para o seu negócio, da estratégia à execução.</h2>
                <p className="mt-6 leading-7 text-white/70">A capacitação Estímulo &lt;&gt; OpenAI reúne Marketing e Vendas, Gestão e Desenvolvimento com Codex em trilhas práticas.</p>
                <ButtonLink href="/entrar" variant="secondary" size="lg" className="mt-8">Acessar jornadas</ButtonLink>
              </div>
              <div className="grid gap-px bg-white/10 sm:grid-cols-3">
                <JourneyPillar number="1" title="Marketing e Vendas com IA" text="Comunicação, relacionamento e oportunidades." />
                <JourneyPillar number="2" title="Gestão com IA" text="Rotina, decisões e organização do negócio." />
                <JourneyPillar number="3" title="Desenvolvimento com Codex" text="Construção de soluções e automações." />
              </div>
            </div>
          </div>
        </section>

        <section id="perfis" className="border-y border-border bg-white px-5 py-20 lg:px-9 lg:py-28">
          <div className="mx-auto max-w-[1400px]">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="max-w-3xl">
                <p className="text-sm font-bold uppercase tracking-[.14em] text-primary">Cada negócio tem seu ritmo</p>
                <h2 className="display-font mt-3 text-4xl text-secondary sm:text-5xl">Sua experiência começa por quem você é.</h2>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-muted"><Users size={18} /> Quatro perfis para orientar, nunca limitar.</div>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {archetypes.map((archetype, index) => (
                <Card key={archetype.name} className="brand-accent-card min-h-56 pt-8">
                  <span className={`grid size-11 place-items-center rounded-2xl ${archetype.accent} font-bold text-secondary`}>0{index + 1}</span>
                  <h3 className="display-font mt-7 text-2xl text-secondary">{archetype.name}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted">{archetype.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-20 lg:px-9 lg:py-28">
          <div className="brand-hero mx-auto max-w-5xl rounded-[2rem] px-7 py-14 text-center shadow-lg sm:px-12 sm:py-16">
            <p className="brand-kicker">Seu próximo passo pode começar agora</p>
            <h2 className="display-font mx-auto mt-5 max-w-3xl text-4xl sm:text-5xl">Entre, escolha uma jornada e continue construindo.</h2>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/cadastro" variant="secondary" size="lg">Criar acesso</ButtonLink>
              <ButtonLink href="/entrar" variant="ghost" size="lg" className="!border-white/35 !text-white hover:!bg-white/10">Entrar</ButtonLink>
            </div>
          </div>
        </section>
      </div>

      <footer className="border-t border-border bg-white px-5 py-8 lg:px-9">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4">
          <EstimuloBrand compact />
          <p className="text-sm text-muted">Capacitação prática para fortalecer quem empreende.</p>
        </div>
      </footer>
    </main>
  );
}

function JourneyPreview({ number, title, color }: { number: string; title: string; color: string }) {
  return <div className="flex items-center gap-4 rounded-2xl bg-surface-muted px-4 py-3"><span className={`grid size-9 place-items-center rounded-xl ${color} text-xs font-bold text-secondary`}>{number}</span><strong className="text-sm">{title}</strong></div>;
}

function FeatureCard({ icon, number, title, text, accent }: { icon: React.ReactNode; number: string; title: string; text: string; accent: string }) {
  return <Card className="brand-accent-card p-7"><div className="flex items-center justify-between"><span className={`grid size-12 place-items-center rounded-2xl ${accent} text-secondary`}>{icon}</span><span className="display-font text-4xl text-primary/15">{number}</span></div><h3 className="display-font mt-8 text-2xl text-secondary">{title}</h3><p className="mt-3 leading-7 text-muted">{text}</p></Card>;
}

function JourneyPillar({ number, title, text }: { number: string; title: string; text: string }) {
  return <article className="flex min-h-72 flex-col justify-end bg-white/5 p-7 transition-colors hover:bg-white/10 sm:p-8"><span className="display-font text-6xl text-brand-green">{number}</span><h3 className="mt-8 text-lg font-bold">{title}</h3><p className="mt-3 text-sm leading-6 text-white/60">{text}</p></article>;
}
