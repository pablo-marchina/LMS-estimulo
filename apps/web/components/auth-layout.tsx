import type { ReactNode } from "react";
import { Award, Route, Sparkles } from "lucide-react";
import { EstimuloBrand } from "@/components/estimulo-brand";
import { cn } from "@/lib/utils";

export function AuthLayout({
  eyebrow,
  title,
  description,
  wide = false,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <main className="brand-auth-stage min-h-screen px-4 py-6 sm:px-6 lg:grid lg:grid-cols-[1.05fr_.95fr] lg:p-0">
      <section className="relative hidden min-h-screen flex-col justify-between overflow-hidden p-10 text-white lg:flex xl:p-16" aria-label="Sobre a plataforma">
        <div className="brand-logo-capsule"><EstimuloBrand href="/" /></div>
        <div className="max-w-xl animate-in">
          <h2 className="display-font text-5xl leading-[.98] xl:text-6xl">Seu negócio evolui. A forma de aprender também.</h2>
          <p className="mt-6 max-w-lg text-lg leading-8 text-white/78">Uma experiência gratuita que reúne conteúdos, ferramentas e recomendações personalizadas para ajudar você a evoluir como empreendedor.</p>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <BrandPromise icon={<Sparkles size={18} />} title="Descubra" text="Entenda por onde começar e receba recomendações para o seu momento." />
            <BrandPromise icon={<Route size={18} />} title="Desenvolva" text="Conteúdos práticos, ferramentas e jornadas com parceiros como a OpenAI para apoiar seu crescimento." />
            <BrandPromise icon={<Award size={18} />} title="Evolua" text="Sua evolução abre portas para certificados, mentorias e novas oportunidades." />
          </div>
        </div>
        <div aria-hidden="true" />
      </section>

      <section className="grid min-h-[calc(100vh-3rem)] place-items-center lg:min-h-screen lg:bg-white/8 lg:p-8">
        <div className={cn(
          "animate-in w-full rounded-[2rem] border border-white/55 bg-white p-6 shadow-[0_28px_90px_rgba(0,0,60,.28)] backdrop-blur sm:p-10 lg:p-12",
          wide ? "max-w-2xl" : "max-w-xl",
        )}>
          <div className="mb-8 flex justify-center lg:hidden"><div className="brand-logo-capsule border-border shadow-sm"><EstimuloBrand href="/" /></div></div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
          <h1 className="display-font mt-3 text-3xl text-ink sm:text-4xl">{title}</h1>
          {description ? <div className="mt-4 text-sm leading-7 text-muted">{description}</div> : null}
          <div className="mt-8 grid gap-5">{children}</div>
        </div>
      </section>
    </main>
  );
}

function BrandPromise({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
      <span className="grid size-9 place-items-center rounded-xl bg-brand-green text-secondary">{icon}</span>
      <strong className="mt-4 block text-sm">{title}</strong>
      <span className="mt-1 block text-xs text-white/65">{text}</span>
    </div>
  );
}

export function FormMessage({ tone, children }: { tone: "error" | "success" | "info"; children: ReactNode }) {
  const toneClasses = {
    error: "border-danger/25 bg-danger-soft text-danger",
    success: "border-success/25 bg-success-soft text-success",
    info: "border-info/25 bg-info-soft text-info",
  } as const;
  return <p role={tone === "error" ? "alert" : "status"} className={cn("rounded-lg border px-4 py-3 text-sm font-medium", toneClasses[tone])}>{children}</p>;
}

export function AuthFooter({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 border-t border-border pt-5 text-center text-sm">{children}</div>;
}
