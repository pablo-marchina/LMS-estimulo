import {
  Award,
  BarChart3,
  BookOpenCheck,
  BriefcaseBusiness,
  CheckCircle2,
  Compass,
  Gauge,
  Rocket,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { EstimuloBrand } from "@/components/estimulo-brand";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const profiles = [
  {
    name: "Fazendo acontecer",
    description: "Você conhece bem o seu trabalho e faz o negócio acontecer todos os dias. Agora é hora de fortalecer a gestão para crescer com mais tranquilidade.",
    icon: <BriefcaseBusiness size={23} />,
    accent: "bg-brand-green",
  },
  {
    name: "Fortalecendo a base",
    description: "Você já superou muitos desafios. Agora o foco é organizar a casa, ganhar mais previsibilidade e preparar o negócio para crescer.",
    icon: <Gauge size={23} />,
    accent: "bg-brand-cyan",
  },
  {
    name: "Construindo o crescimento",
    description: "Seu negócio já tem uma boa base. O próximo passo é transformar organização em crescimento planejado.",
    icon: <BarChart3 size={23} />,
    accent: "bg-accent-gold",
  },
  {
    name: "Próximo nível",
    description: "Você já pensa no negócio de forma estratégica. Agora é hora de acelerar o crescimento e ampliar seu impacto.",
    icon: <Rocket size={23} />,
    accent: "bg-brand-magenta",
  },
];

const platformResources = [
  "Conteúdos recomendados para o seu momento",
  "Certificados e reconhecimento da sua evolução",
  "Benefícios exclusivos, como mentorias e experiências",
  "Ferramentas práticas para aplicar no dia a dia",
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
            <a href="#aprendizado-personalizado" className="hover:text-primary">Aprendizado personalizado</a>
          </nav>
          <ButtonLink href="/entrar" size="sm" className="ml-auto md:ml-4">Já tenho acesso</ButtonLink>
        </div>
      </header>

      <div id="conteudo-principal">
        <section className="brand-hero brand-dots-bg brand-chevrons-bg px-5 py-20 sm:py-28 lg:px-9 lg:py-32">
          <div className="mx-auto grid max-w-[1400px] items-center gap-14 lg:grid-cols-[1.08fr_.92fr]">
            <div className="animate-in max-w-3xl">
              <p className="brand-kicker">COMO FUNCIONA</p>
              <h1 className="display-font mt-6 text-5xl leading-[.93] sm:text-6xl lg:text-7xl">Seu negócio evolui. A forma de aprender também.</h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-white/78 sm:text-xl">Uma experiência gratuita que reúne conteúdos, ferramentas e recomendações personalizadas para ajudar você a evoluir como empreendedor.</p>
              <div className="mt-9 flex flex-wrap gap-3">
                <ButtonLink href="/cadastro" variant="secondary" size="lg">Criar conta gratuitamente</ButtonLink>
                <ButtonLink href="/entrar" variant="ghost" size="lg" className="!border-white/35 !text-white hover:!bg-white/10">Já tenho acesso</ButtonLink>
              </div>
              <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm font-semibold text-white/72">
                <span className="flex items-center gap-2"><Target size={16} className="text-brand-cyan" /> Recomendado para você</span>
                <span className="flex items-center gap-2"><BookOpenCheck size={16} className="text-brand-green" /> Conteúdo para aplicar no dia a dia</span>
                <span className="flex items-center gap-2"><Award size={16} className="text-accent-gold" /> Certificados e benefícios</span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl">
              <div className="absolute -inset-5 rotate-3 rounded-[2.5rem] bg-brand-magenta/25 blur-sm" aria-hidden="true" />
              <div className="relative rounded-[2rem] border border-white/30 bg-white/12 p-5 shadow-[0_30px_90px_rgba(0,0,50,.35)] backdrop-blur-md sm:p-7">
                <div className="rounded-[1.5rem] bg-white p-6 text-secondary shadow-lg sm:p-8">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="rounded-full bg-brand-green px-3 py-1 text-xs font-bold uppercase tracking-wide">Aprendizado para o seu momento</span>
                      <h2 className="display-font mt-5 text-3xl">Conhecimento que vira resultado no seu negócio.</h2>
                    </div>
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-white"><Compass /></span>
                  </div>
                  <div className="mt-8 grid gap-3">
                    <JourneyPreview icon={<Compass size={17} />} title="Descubra por onde começar" color="bg-brand-cyan" />
                    <JourneyPreview icon={<BookOpenCheck size={17} />} title="Desenvolva habilidades práticas" color="bg-brand-magenta" />
                    <JourneyPreview icon={<Trophy size={17} />} title="Evolua e abra novas oportunidades" color="bg-brand-green" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="como-funciona" className="px-5 py-20 lg:px-9 lg:py-28">
          <div className="mx-auto max-w-[1400px]">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[.14em] text-primary">Uma experiência simples e prática</p>
              <h2 className="display-font mt-3 text-4xl text-secondary sm:text-5xl">Conhecimento que vira resultado no seu negócio.</h2>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              <FeatureCard icon={<Compass />} title="Descubra" text="Entenda por onde começar e receba recomendações para o seu momento." accent="bg-brand-cyan" />
              <FeatureCard icon={<BookOpenCheck />} title="Desenvolva" text="Conteúdos práticos, ferramentas e jornadas com parceiros como a OpenAI para apoiar seu crescimento." accent="bg-brand-magenta" />
              <FeatureCard icon={<Trophy />} title="Evolua" text="Sua evolução abre portas para certificados, mentorias e novas oportunidades." accent="bg-brand-green" />
            </div>
          </div>
        </section>

        <section id="aprendizado-personalizado" className="border-y border-border bg-white px-5 py-20 lg:px-9 lg:py-28">
          <div className="mx-auto max-w-[1400px]">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="max-w-3xl">
                <p className="text-sm font-bold uppercase tracking-[.14em] text-primary">APRENDIZADO PERSONALIZADO</p>
                <h2 className="display-font mt-3 text-4xl text-secondary sm:text-5xl">Cada empreendedor aprende de um jeito.</h2>
                <p className="mt-5 text-lg leading-8 text-muted">Um diagnóstico rápido ajuda a recomendar os melhores conteúdos para você.</p>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-muted"><Users size={18} /> Recomendações que orientam, sem limitar.</div>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {profiles.map((profile) => (
                <Card key={profile.name} className="brand-accent-card min-h-72 pt-8">
                  <span className={`grid size-12 place-items-center rounded-2xl ${profile.accent} text-secondary`}>{profile.icon}</span>
                  <h3 className="display-font mt-7 text-2xl text-secondary">{profile.name}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted">{profile.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-20 lg:px-9 lg:py-28">
          <div className="mx-auto grid max-w-[1400px] gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[.14em] text-primary">Tudo em um só lugar</p>
              <h2 className="display-font mt-3 text-4xl text-secondary sm:text-5xl">O que você encontra na plataforma</h2>
              <p className="mt-5 text-lg leading-8 text-muted">Recursos para aprender, aplicar e acompanhar cada conquista do seu negócio.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {platformResources.map((resource) => <div key={resource} className="flex items-start gap-3 rounded-2xl border border-border bg-white p-5 shadow-sm"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-success-soft text-success"><CheckCircle2 size={18} /></span><strong className="pt-1 text-sm leading-6 text-secondary">{resource}</strong></div>)}
            </div>
          </div>
        </section>

        <section className="px-5 pb-20 lg:px-9 lg:pb-28">
          <div className="brand-hero mx-auto max-w-5xl rounded-[2rem] px-7 py-14 text-center shadow-lg sm:px-12 sm:py-16">
            <p className="brand-kicker">Comece gratuitamente</p>
            <h2 className="display-font mx-auto mt-5 max-w-3xl text-4xl sm:text-5xl">Crie sua conta gratuitamente e comece a desenvolver o seu negócio.</h2>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/cadastro" variant="secondary" size="lg">Criar conta gratuitamente</ButtonLink>
              <ButtonLink href="/entrar" variant="ghost" size="lg" className="!border-white/35 !text-white hover:!bg-white/10">Já tenho acesso</ButtonLink>
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

function JourneyPreview({ icon, title, color }: { icon: React.ReactNode; title: string; color: string }) {
  return <div className="flex items-center gap-4 rounded-2xl bg-surface-muted px-4 py-3"><span className={`grid size-9 place-items-center rounded-xl ${color} text-secondary`}>{icon}</span><strong className="text-sm">{title}</strong></div>;
}

function FeatureCard({ icon, title, text, accent }: { icon: React.ReactNode; title: string; text: string; accent: string }) {
  return <Card className="brand-accent-card p-7"><span className={`grid size-12 place-items-center rounded-2xl ${accent} text-secondary`}>{icon}</span><h3 className="display-font mt-8 text-2xl text-secondary">{title}</h3><p className="mt-3 leading-7 text-muted">{text}</p></Card>;
}
