import { EstimuloBrand } from "@/components/estimulo-brand";
import { ButtonLink } from "@/components/ui/button";

const STATS = [
  { value: "R$ 420 milhões+", label: "em crédito desembolsado para micro e pequenos negócios" },
  { value: "200 mil+", label: "pessoas impactadas em todo o Brasil" },
  { value: "88", label: "NPS médio de satisfação dos empreendedores" },
] as const;

const ARCHETYPES = [
  { icon: "🔨", name: "Fazedor(a)", description: "Sabe fazer. Está aprendendo a gerir." },
  { icon: "💪", name: "Batalhador(a)", description: "Tem garra. Precisa transformar garra em estrutura." },
  { icon: "🧱", name: "Construtor(a)", description: "Tem base. Falta direção." },
  { icon: "🧭", name: "Navegador(a)", description: "Sabe onde está. Sabe para onde vai." },
] as const;

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <a href="#conteudo-principal" className="skip-link">
        Pular para o conteúdo
      </a>

      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-4 lg:px-9">
          <EstimuloBrand />
          <ButtonLink href="/entrar">Entrar</ButtonLink>
        </div>
      </header>

      <main id="conteudo-principal">
        <section className="animate-in brand-dots-bg relative overflow-hidden bg-primary px-5 py-16 text-white sm:py-24 lg:px-9">
          <div className="mx-auto max-w-[900px] text-center">
            <h1 className="display-font text-4xl sm:text-6xl">
              Descubra o arquétipo empreendedor do seu negócio
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-white/80 sm:text-xl">
              Crédito acessível, capacitação personalizada e uma jornada feita para o momento do seu negócio.
            </p>
            <div className="mt-8">
              <ButtonLink href="/entrar" variant="secondary" size="lg">
                Entrar na plataforma
              </ButtonLink>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 px-5 py-14 sm:grid-cols-3 lg:px-9" aria-label="Números do Estímulo">
          {STATS.map((stat) => (
            <div key={stat.label} className="rounded-card border border-border bg-surface p-6 text-center shadow-card">
              <p className="display-font text-3xl text-primary sm:text-4xl">{stat.value}</p>
              <p className="mt-2 text-sm text-muted">{stat.label}</p>
            </div>
          ))}
        </section>

        <section className="bg-surface-muted px-5 py-14 lg:px-9" aria-labelledby="arquetipos-titulo">
          <div className="mx-auto max-w-[1400px]">
            <h2 id="arquetipos-titulo" className="display-font text-center text-2xl text-ink sm:text-3xl">
              Qual é o seu arquétipo empreendedor?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-sm text-muted">
              Ao entrar na plataforma, você pode responder um diagnóstico rápido e receber uma jornada de capacitação feita para você.
            </p>
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {ARCHETYPES.map((archetype) => (
                <div key={archetype.name} className="rounded-card border border-border bg-surface p-6 text-center shadow-card">
                  <span className="text-3xl" aria-hidden="true">
                    {archetype.icon}
                  </span>
                  <h3 className="mt-3 font-semibold text-ink">{archetype.name}</h3>
                  <p className="mt-1 text-sm text-muted">{archetype.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1400px] px-5 pb-14 lg:px-9">
          <p className="text-center text-sm text-muted">
            Fomos laboratório de estudo sobre Blended Finance pela Universidade de Harvard.
          </p>
        </section>
      </main>

      <footer className="border-t border-border bg-surface px-5 py-10 lg:px-9">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center gap-4 text-center">
          <EstimuloBrand compact />
          <ButtonLink href="/entrar" variant="secondary">
            Entrar
          </ButtonLink>
        </div>
      </footer>
    </div>
  );
}
