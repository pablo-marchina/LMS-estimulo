import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpenCheck,
  Check,
  ChevronDown,
  Clock3,
  Gift,
  Play,
  Smartphone,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { EstimuloBrand } from "@/components/estimulo-brand";

const lessonCards = [
  {
    title: "O básico para começar a usar o ChatGPT no seu negócio",
    description: "Entenda o que a IA pode fazer e como conversar com ela sem complicação.",
    image: "/brand/announcement-openai.svg",
  },
  {
    title: "Aprenda a fazer pedidos melhores para a IA",
    description: "Transforme uma ideia simples em instruções claras e respostas mais úteis.",
    image: "/brand/announcement-diagnostic.svg",
  },
  {
    title: "Crie conteúdos para divulgar o seu negócio",
    description: "Use o ChatGPT para acelerar textos, roteiros, legendas e ideias de comunicação.",
    image: "/brand/announcement-achievements.svg",
  },
  {
    title: "Organize o trabalho e ganhe tempo no dia a dia",
    description: "Aplique a IA em tarefas reais de atendimento, rotina, vendas e organização.",
    image: "/brand/announcement-openai.svg",
  },
];

const modules = [
  {
    number: "MÓDULO 1",
    title: "Crie conteúdos para divulgar o seu negócio.",
    items: ["Primeiros passos com o ChatGPT", "A arte de pedir para a IA", "Legendas, posts e calendário de conteúdo"],
  },
  {
    number: "MÓDULO 2",
    title: "Agilize atendimento e prepare-se melhor para vender.",
    items: ["Mensagens e respostas personalizadas", "Roteiros para atendimento", "Organização de dúvidas e informações"],
  },
  {
    number: "MÓDULO 3",
    title: "Use a IA para organizar melhor o negócio.",
    items: ["Rotina e tarefas", "Documentos e finanças", "Assistentes para apoiar decisões do dia a dia"],
  },
];

const faq = [
  ["Preciso saber usar inteligência artificial?", "Não. O curso foi pensado para quem está começando e explica tudo de forma prática."],
  ["Quanto tempo tenho para concluir?", "Você aprende no seu ritmo. Os conteúdos ficam disponíveis para você avançar na ordem que fizer mais sentido."],
  ["O curso é gratuito?", "Sim. A capacitação é gratuita para os participantes da Estímulo."],
  ["Preciso instalar algum programa?", "Não. Você pode acompanhar pelo navegador no computador ou no celular."],
  ["Vou receber certificado?", "Ao cumprir os requisitos da jornada, os certificados disponíveis aparecem automaticamente no seu perfil."],
  ["Como funcionam os pontos e recompensas?", "Ações elegíveis dentro da plataforma geram pontos que podem ser usados diretamente nas recompensas disponíveis."],
];

export default function PublicLandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f5f8fb] text-ink">
      <a href="#conteudo-principal" className="skip-link">Pular para o conteúdo</a>

      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-4 px-4 sm:px-6">
          <EstimuloBrand href="/" compact />
          <nav className="ml-auto hidden items-center gap-6 text-xs font-semibold text-muted md:flex" aria-label="Navegação pública">
            <a href="#sobre" className="transition hover:text-primary">Sobre o curso</a>
            <a href="#conteudos" className="transition hover:text-primary">Conteúdos</a>
            <a href="#duvidas" className="transition hover:text-primary">Dúvidas</a>
          </nav>
          <Link href="/cadastro" className="ml-auto inline-flex min-h-9 items-center gap-2 rounded-full bg-gradient-to-r from-[#13b58a] to-[#0098fc] px-4 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5 md:ml-2">
            Começar agora <ArrowRight size={14} />
          </Link>
          <Link href="/entrar" className="hidden text-xs font-semibold text-primary sm:inline">Já tenho acesso</Link>
        </div>
      </header>

      <div id="conteudo-principal">
        <section className="relative overflow-hidden bg-[radial-gradient(circle_at_88%_8%,rgba(0,209,181,.42),transparent_30%),radial-gradient(circle_at_8%_96%,rgba(0,152,252,.32),transparent_28%),linear-gradient(135deg,#041136_0%,#041b47_55%,#073d56_100%)] px-4 py-12 text-white sm:px-6 sm:py-16 lg:py-20">
          <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:22px_22px]" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-[1180px] items-center gap-10 lg:grid-cols-[.9fr_1.1fr]">
            <div className="max-w-xl">
              <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#65e6cd]">Parceria Estímulo + OpenAI</p>
              <h1 className="mt-4 text-[38px] font-bold leading-[1.02] tracking-[-.045em] sm:text-5xl lg:text-[58px]">ChatGPT para o seu negócio</h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-white/82 sm:text-lg">Aprenda, na prática, como usar inteligência artificial para ganhar tempo, organizar a rotina, vender melhor e criar conteúdos para o seu negócio.</p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link href="/cadastro" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-[#13b58a] to-[#0098fc] px-5 text-sm font-bold text-white shadow-[0_10px_28px_rgba(0,152,252,.25)] transition hover:-translate-y-0.5">
                  Começar gratuitamente <ArrowRight size={16} />
                </Link>
                <span className="text-xs font-medium text-white/65">Gratuito · Aprenda no seu ritmo</span>
              </div>
            </div>

            <div className="mx-auto w-full max-w-[620px]">
              <div className="overflow-hidden rounded-2xl border border-white/15 bg-[#08143b] shadow-[0_24px_70px_rgba(0,0,0,.32)]">
                <div className="relative aspect-video overflow-hidden bg-[linear-gradient(135deg,#251067,#0d1c67_55%,#0072b5)]">
                  <img src="/brand/announcement-openai.svg" alt="" className="absolute inset-0 size-full object-cover opacity-55" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#02081f]/80 via-transparent to-transparent" />
                  <div className="absolute inset-0 grid place-items-center">
                    <span className="grid size-16 place-items-center rounded-full border border-white/25 bg-white/15 text-white shadow-xl backdrop-blur"><Play size={25} fill="currentColor" /></span>
                  </div>
                  <div className="absolute inset-x-4 bottom-3 flex items-center gap-3 text-[10px] text-white/70">
                    <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/20"><span className="block h-full w-[38%] rounded-full bg-[#56d7ff]" /></span>
                    <span>Apresentação</span>
                  </div>
                </div>
                <div className="px-4 py-3 text-xs font-medium text-white/78">Descubra como o ChatGPT pode facilitar o dia a dia do seu negócio.</div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white px-4 py-5 sm:px-6">
          <div className="mx-auto grid max-w-[980px] grid-cols-2 gap-4 text-xs font-semibold text-muted sm:grid-cols-4">
            <span className="flex items-center gap-2"><Clock3 size={16} className="text-[#12a889]" /> Aprenda no seu ritmo</span>
            <span className="flex items-center gap-2"><Smartphone size={16} className="text-[#12a889]" /> Acesse de onde quiser</span>
            <span className="flex items-center gap-2"><BookOpenCheck size={16} className="text-[#12a889]" /> Conteúdo prático</span>
            <span className="flex items-center gap-2"><Award size={16} className="text-[#12a889]" /> Certificado disponível</span>
          </div>
        </section>

        <section id="sobre" className="px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-[980px]">
            <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#0d9b80]">Curso para começar</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-bold leading-tight tracking-[-.035em] text-[#090b36] sm:text-4xl">Você não precisa entender de tecnologia para usar a inteligência artificial a favor do seu negócio.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">Aulas curtas, linguagem simples e exemplos que fazem parte da rotina de quem empreende.</p>

            <div className="mt-9 grid gap-5 sm:grid-cols-2">
              {lessonCards.map((lesson, index) => (
                <article key={lesson.title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_28px_rgba(15,23,42,.06)]">
                  <div className="relative aspect-[16/9] overflow-hidden bg-[#091448]">
                    <img src={lesson.image} alt="" className="size-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#03102e]/65 via-transparent to-transparent" />
                    <span className="absolute bottom-4 left-4 grid size-10 place-items-center rounded-full bg-white text-primary shadow-lg"><Play size={16} fill="currentColor" /></span>
                    <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">AULA {index + 1}</span>
                  </div>
                  <div className="p-5">
                    <h3 className="text-base font-bold leading-snug text-[#090b36]">{lesson.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{lesson.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[radial-gradient(circle_at_70%_0%,rgba(0,183,196,.28),transparent_28%),linear-gradient(130deg,#041332,#041d3d_64%,#063c49)] px-4 py-14 text-white sm:px-6 sm:py-16">
          <div className="mx-auto max-w-[760px] text-center">
            <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#65e6cd]">Direto ao ponto</p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-.035em] sm:text-4xl">Quer aprender a fazer tudo isso?</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/75">Entre na jornada, assista às aulas na ordem que preferir e aplique cada ideia no seu próprio negócio.</p>
            <Link href="/cadastro" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-[#18ba8a] to-[#0098fc] px-5 text-sm font-bold text-white shadow-lg">Começar agora <ArrowRight size={16} /></Link>
          </div>
        </section>

        <section id="conteudos" className="bg-[#f1f5f8] px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-[980px]">
            <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#0d9b80]">O que você vai aprender</p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-.035em] text-[#090b36] sm:text-4xl">Temas práticos, com entregas concretas para o seu negócio.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">Conteúdos organizados para você aprender, testar e voltar quando precisar.</p>
            <div className="mt-8 grid gap-4">
              {modules.map((module) => (
                <article key={module.number} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#0d9b80]">{module.number}</p>
                  <h3 className="mt-2 text-lg font-bold text-[#090b36]">{module.title}</h3>
                  <ul className="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-2">
                    {module.items.map((item) => <li key={item} className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-[#13a986]" />{item}</li>)}
                  </ul>
                </article>
              ))}
            </div>
            <div className="mt-7 text-center"><Link href="/cadastro" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-[#14af87] to-[#0098fc] px-5 text-sm font-bold text-white shadow-md">Quero começar essa jornada <ArrowRight size={16} /></Link></div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-[980px]">
            <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#0d9b80]">Aprender também vale benefícios</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-[-.035em] text-[#090b36] sm:text-4xl">E quanto mais você participa, mais você ganha.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">Conclua conteúdos e jornadas, acumule pontos diretamente e use-os nas recompensas disponíveis.</p>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                ["1", "APRENDA", "Assista aos conteúdos e avance pela jornada."],
                ["2", "GANHE PONTOS", "Ações elegíveis registram pontos no seu saldo."],
                ["3", "TROQUE POR BENEFÍCIOS", "Use seus pontos nas recompensas disponíveis."],
              ].map(([step, title, text]) => (
                <div key={step} className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <span className="grid size-8 place-items-center rounded-full bg-[#dff8f0] text-xs font-black text-[#0d8f75]">{step}</span>
                  <h3 className="mt-4 text-xs font-black tracking-[.12em] text-[#090b36]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-[linear-gradient(135deg,#06133d,#073c50)] p-5 text-white"><Gift size={20} className="text-[#61e0c7]" /><h3 className="mt-3 font-bold">Mentorias e experiências</h3><p className="mt-1 text-sm leading-6 text-white/70">Benefícios para aplicar o aprendizado com apoio de especialistas.</p></div>
              <div className="rounded-2xl bg-[linear-gradient(135deg,#06133d,#073c50)] p-5 text-white"><Trophy size={20} className="text-[#61e0c7]" /><h3 className="mt-3 font-bold">Certificados e reconhecimento</h3><p className="mt-1 text-sm leading-6 text-white/70">Registre suas conquistas na plataforma e acompanhe sua evolução.</p></div>
            </div>
            <div className="mt-7 text-center"><Link href="/cadastro" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-[#14af87] to-[#0098fc] px-5 text-sm font-bold text-white shadow-md">Quero começar agora <ArrowRight size={16} /></Link></div>
          </div>
        </section>

        <section id="duvidas" className="border-y border-slate-200 bg-white px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-[840px]">
            <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#0d9b80]">Antes de começar</p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-.035em] text-[#090b36] sm:text-4xl">Dúvidas rápidas</h2>
            <div className="mt-7 divide-y divide-slate-200 border-y border-slate-200">
              {faq.map(([question, answer]) => (
                <details key={question} className="group py-1">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-semibold text-[#090b36] marker:content-none">{question}<ChevronDown size={17} className="shrink-0 transition group-open:rotate-180" /></summary>
                  <p className="pb-4 pr-8 text-sm leading-6 text-muted">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[radial-gradient(circle_at_80%_25%,rgba(0,194,173,.32),transparent_28%),linear-gradient(135deg,#061333,#061b3e_62%,#063c4b)] px-4 py-14 text-white sm:px-6 sm:py-20">
          <div className="mx-auto max-w-[760px] text-center">
            <Sparkles className="mx-auto text-[#64e2ca]" size={24} />
            <h2 className="mt-4 text-3xl font-bold tracking-[-.035em] sm:text-4xl">Descubra quanto a IA pode facilitar o dia a dia do seu negócio.</h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/72">Comece sem complicação, aprenda no seu ritmo e leve cada aula para uma situação real da sua empresa.</p>
            <Link href="/cadastro" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-[#15b38a] to-[#0098fc] px-5 text-sm font-bold text-white shadow-lg">Começar gratuitamente <ArrowRight size={16} /></Link>
          </div>
        </section>
      </div>

      <footer className="border-t border-slate-200 bg-white px-4 py-7 sm:px-6">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-4">
          <EstimuloBrand compact />
          <div className="flex items-center gap-5 text-xs text-muted"><span className="flex items-center gap-1.5"><Users size={14} /> Estímulo</span><Link href="/entrar">Entrar</Link></div>
        </div>
      </footer>
    </main>
  );
}
