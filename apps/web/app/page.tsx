import Link from "next/link";
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpenCheck,
  BriefcaseBusiness,
  CheckCircle2,
  Compass,
  Gauge,
  Gift,
  Play,
  Rocket,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { EstimuloBrand } from "@/components/estimulo-brand";

const profiles = [
  {
    name: "Fazendo acontecer",
    description: "Você conhece bem o seu trabalho e faz o negócio acontecer todos os dias. Agora é hora de fortalecer a gestão para crescer com mais tranquilidade.",
    icon: BriefcaseBusiness,
  },
  {
    name: "Fortalecendo a base",
    description: "Você já superou muitos desafios. Agora o foco é organizar a casa, ganhar mais previsibilidade e preparar o negócio para crescer.",
    icon: Gauge,
  },
  {
    name: "Construindo o crescimento",
    description: "Seu negócio já tem uma boa base. O próximo passo é transformar organização em crescimento planejado.",
    icon: BarChart3,
  },
  {
    name: "Próximo nível",
    description: "Você já pensa no negócio de forma estratégica. Agora é hora de acelerar o crescimento e ampliar seu impacto.",
    icon: Rocket,
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
    <main className="min-h-screen overflow-hidden bg-[#f7f8fa] text-ink">
      <a href="#conteudo-principal" className="skip-link">Pular para o conteúdo</a>

      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-4 px-4 sm:px-6">
          <EstimuloBrand href="/" compact />
          <nav className="ml-auto hidden items-center gap-6 text-xs font-semibold text-muted md:flex" aria-label="Navegação pública">
            <a href="#como-funciona" className="transition hover:text-primary">Como funciona</a>
            <a href="#aprendizado-personalizado" className="transition hover:text-primary">Aprendizado personalizado</a>
            <a href="#curso-chatgpt" className="transition hover:text-primary">Curso ChatGPT</a>
          </nav>
          <Link href="/cadastro" className="ml-auto inline-flex min-h-9 items-center gap-2 rounded-full bg-gradient-to-r from-[#13b58a] to-[#0098fc] px-4 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5 md:ml-2">
            Criar conta gratuitamente <ArrowRight size={14} />
          </Link>
          <Link href="/entrar" className="hidden text-xs font-semibold text-primary sm:inline">Já tenho acesso</Link>
        </div>
      </header>

      <div id="conteudo-principal">
        <section className="relative overflow-hidden bg-[radial-gradient(circle_at_88%_8%,rgba(0,209,181,.38),transparent_30%),radial-gradient(circle_at_8%_96%,rgba(0,152,252,.30),transparent_28%),linear-gradient(135deg,#041136_0%,#041b47_55%,#073d56_100%)] px-4 py-14 text-white sm:px-6 sm:py-20 lg:py-24">
          <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:22px_22px]" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-[1180px] items-center gap-10 lg:grid-cols-[1fr_.95fr]">
            <div className="max-w-2xl">
              <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#65e6cd]">Capacitação Estímulo</p>
              <h1 className="mt-4 text-[42px] font-bold leading-[1.02] tracking-[-.045em] sm:text-5xl lg:text-[62px]">Seu negócio evolui. A forma de aprender também.</h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/82 sm:text-lg">Uma experiência gratuita que reúne conteúdos, ferramentas e recomendações personalizadas para ajudar você a evoluir como empreendedor.</p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link href="/cadastro" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-[#13b58a] to-[#0098fc] px-5 text-sm font-bold text-white shadow-[0_10px_28px_rgba(0,152,252,.25)] transition hover:-translate-y-0.5">Criar conta gratuitamente <ArrowRight size={16} /></Link>
                <Link href="/entrar" className="inline-flex min-h-11 items-center rounded-full border border-white/35 px-5 text-sm font-semibold text-white transition hover:bg-white/10">Já tenho acesso</Link>
              </div>
            </div>

            <div className="mx-auto w-full max-w-[520px] rounded-2xl border border-white/15 bg-white/10 p-5 shadow-[0_24px_70px_rgba(0,0,0,.28)] backdrop-blur-sm sm:p-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-[#65e6cd]"><Compass size={13} /> Aprendizado para o seu momento</span>
              <h2 className="mt-4 text-2xl font-bold tracking-[-.03em] text-white">Conhecimento que vira resultado no seu negócio.</h2>
              <div className="mt-6 grid gap-3">
                <JourneyPreview icon={<Compass size={17} />} title="Descubra por onde começar" />
                <JourneyPreview icon={<BookOpenCheck size={17} />} title="Desenvolva habilidades práticas" />
                <JourneyPreview icon={<Trophy size={17} />} title="Evolua e abra novas oportunidades" />
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white px-4 py-5 sm:px-6">
          <div className="mx-auto grid max-w-[980px] grid-cols-2 gap-4 text-xs font-semibold text-muted sm:grid-cols-4">
            <span className="flex items-center gap-2"><Target size={16} className="text-[#12a889]" /> Recomendado para você</span>
            <span className="flex items-center gap-2"><BookOpenCheck size={16} className="text-[#12a889]" /> Conteúdo prático</span>
            <span className="flex items-center gap-2"><Award size={16} className="text-[#12a889]" /> Certificados</span>
            <span className="flex items-center gap-2"><Gift size={16} className="text-[#12a889]" /> Benefícios</span>
          </div>
        </section>

        <section id="como-funciona" className="px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-[1080px]">
            <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#0d9b80]">Uma experiência simples e prática</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-bold leading-tight tracking-[-.035em] text-[#090b36] sm:text-4xl">Conhecimento que vira resultado no seu negócio.</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <FeatureCard icon={<Compass />} title="Descubra" text="Entenda por onde começar e receba recomendações para o seu momento." />
              <FeatureCard icon={<BookOpenCheck />} title="Desenvolva" text="Acesse conteúdos práticos, ferramentas e jornadas para apoiar seu crescimento." />
              <FeatureCard icon={<Trophy />} title="Evolua" text="Sua evolução abre portas para certificados, mentorias e novas oportunidades." />
            </div>
          </div>
        </section>

        <section id="curso-chatgpt" className="relative overflow-hidden bg-[radial-gradient(circle_at_75%_0%,rgba(0,183,196,.28),transparent_28%),linear-gradient(130deg,#041332,#041d3d_64%,#063c49)] px-4 py-14 text-white sm:px-6 sm:py-20">
          <div className="mx-auto grid max-w-[1080px] items-center gap-9 lg:grid-cols-[.92fr_1.08fr]">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#65e6cd]">Curso em destaque · Estímulo + OpenAI</p>
              <h2 className="mt-3 text-3xl font-bold tracking-[-.035em] sm:text-4xl">ChatGPT para o seu negócio</h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/75">Uma jornada prática para aprender a usar inteligência artificial no dia a dia: conteúdo, atendimento, organização e produtividade.</p>
              <ul className="mt-5 grid gap-2 text-sm text-white/82">
                <li className="flex items-start gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#65e6cd]" /> Aulas curtas e linguagem simples</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#65e6cd]" /> Aplicações reais para o negócio</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#65e6cd]" /> Aprenda no seu ritmo</li>
              </ul>
              <Link href="/cadastro" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-[#18ba8a] to-[#0098fc] px-5 text-sm font-bold text-white shadow-lg">Conhecer a jornada <ArrowRight size={16} /></Link>
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/15 bg-[#08143b] shadow-[0_24px_70px_rgba(0,0,0,.32)]">
              <div className="relative aspect-video overflow-hidden bg-[linear-gradient(135deg,#251067,#0d1c67_55%,#0072b5)]">
                <img src="/brand/announcement-openai.svg" alt="" className="absolute inset-0 size-full object-cover opacity-60" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#02081f]/80 via-transparent to-transparent" />
                <span className="absolute inset-0 m-auto grid size-16 place-items-center rounded-full border border-white/25 bg-white/15 text-white shadow-xl backdrop-blur"><Play size={25} fill="currentColor" /></span>
              </div>
              <div className="px-4 py-3 text-xs font-medium text-white/78">Prévia da jornada ChatGPT para o seu negócio</div>
            </div>
          </div>
        </section>

        <section id="aprendizado-personalizado" className="bg-white px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-[1080px]">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div className="max-w-3xl">
                <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#0d9b80]">Aprendizado personalizado</p>
                <h2 className="mt-3 text-3xl font-bold tracking-[-.035em] text-[#090b36] sm:text-4xl">Cada empreendedor aprende de um jeito.</h2>
                <p className="mt-4 text-sm leading-7 text-muted">Um diagnóstico rápido ajuda a recomendar os melhores conteúdos para você.</p>
              </div>
              <span className="flex items-center gap-2 text-xs font-semibold text-muted"><Users size={16} /> Recomendações que orientam, sem limitar.</span>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {profiles.map((profile) => {
                const Icon = profile.icon;
                return <article key={profile.name} className="rounded-2xl border border-slate-200 bg-[#fbfbfa] p-5 shadow-sm"><span className="grid size-10 place-items-center rounded-xl bg-[#e4f7f2] text-[#0d8f75]"><Icon size={20} /></span><h3 className="mt-4 text-base font-bold text-[#090b36]">{profile.name}</h3><p className="mt-2 text-sm leading-6 text-muted">{profile.description}</p></article>;
              })}
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto grid max-w-[1080px] gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#0d9b80]">Tudo em um só lugar</p>
              <h2 className="mt-3 text-3xl font-bold tracking-[-.035em] text-[#090b36] sm:text-4xl">O que você encontra na plataforma</h2>
              <p className="mt-4 text-sm leading-7 text-muted">Recursos para aprender, aplicar e acompanhar cada conquista do seu negócio.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {platformResources.map((resource) => <div key={resource} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#e4f7f2] text-[#0d8f75]"><CheckCircle2 size={16} /></span><strong className="pt-1 text-sm leading-6 text-[#090b36]">{resource}</strong></div>)}
            </div>
          </div>
        </section>

        <section className="px-4 pb-14 sm:px-6 sm:pb-20">
          <div className="mx-auto max-w-[920px] rounded-3xl bg-[radial-gradient(circle_at_80%_20%,rgba(0,194,173,.32),transparent_28%),linear-gradient(135deg,#061333,#061b3e_62%,#063c4b)] px-6 py-12 text-center text-white shadow-xl sm:px-10 sm:py-14">
            <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#65e6cd]">Comece gratuitamente</p>
            <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-bold tracking-[-.035em] sm:text-4xl">Crie sua conta gratuitamente e comece a desenvolver o seu negócio.</h2>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/cadastro" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-[#15b38a] to-[#0098fc] px-5 text-sm font-bold text-white shadow-lg">Criar conta gratuitamente <ArrowRight size={16} /></Link>
              <Link href="/entrar" className="inline-flex min-h-11 items-center rounded-full border border-white/35 px-5 text-sm font-semibold text-white hover:bg-white/10">Já tenho acesso</Link>
            </div>
          </div>
        </section>
      </div>

      <footer className="border-t border-slate-200 bg-white px-4 py-7 sm:px-6">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-4"><EstimuloBrand compact /><p className="text-xs text-muted">Capacitação prática para fortalecer quem empreende.</p></div>
      </footer>
    </main>
  );
}

function JourneyPreview({ icon, title }: { icon: React.ReactNode; title: string }) {
  return <div className="flex items-center gap-3 rounded-xl border border-white/12 bg-white/10 px-4 py-3"><span className="grid size-8 place-items-center rounded-lg bg-white text-primary">{icon}</span><strong className="text-sm text-white">{title}</strong></div>;
}

function FeatureCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="grid size-10 place-items-center rounded-xl bg-[#e4f7f2] text-[#0d8f75]">{icon}</span><h3 className="mt-4 text-lg font-bold text-[#090b36]">{title}</h3><p className="mt-2 text-sm leading-6 text-muted">{text}</p></article>;
}
