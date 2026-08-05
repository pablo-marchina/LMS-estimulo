import { CircleHelp, Coins } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { ParticipantPointRule } from "@/lib/engagement/contracts";

const frequencyLabels: Record<ParticipantPointRule["frequency"], string> = {
  once: "Uma vez",
  per_activity: "Por atividade",
  per_assessment: "Por avaliação",
  per_path: "Por trilha",
  per_journey: "Por jornada",
  daily: "Por dia",
  weekly: "Por semana",
  unlimited: "Sem limite de frequência",
};

export function PointsRulesSection({ rules }: { rules: ParticipantPointRule[] }) {
  return (
    <section id="como-conseguir-pontos" className="scroll-mt-24" aria-labelledby="como-conseguir-pontos-titulo">
      <Card>
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><CircleHelp size={20} /></span>
          <div>
            <p className="brand-kicker">Regras transparentes</p>
            <h2 id="como-conseguir-pontos-titulo" className="display-font mt-1 text-3xl text-secondary">Como conseguir pontos</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">Confira todas as ações publicadas pela administração, quantos pontos cada uma concede e a frequência permitida.</p>
          </div>
        </div>

        {rules.length ? (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-black">Ação</th>
                  <th className="px-4 py-3 font-black">Descrição</th>
                  <th className="px-4 py-3 text-center font-black">Frequência</th>
                  <th className="px-4 py-3 text-center font-black">Limite</th>
                  <th className="px-4 py-3 text-right font-black">Pontos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-white">
                {rules.map((rule) => (
                  <tr key={rule.definition_id}>
                    <td className="px-4 py-4 font-bold text-ink">{rule.name}</td>
                    <td className="max-w-md px-4 py-4 leading-6 text-muted">{rule.description}</td>
                    <td className="px-4 py-4 text-center text-muted">{frequencyLabels[rule.frequency]}</td>
                    <td className="px-4 py-4 text-center text-muted">{rule.maximum_awards > 0 ? rule.maximum_awards : "Sem limite"}</td>
                    <td className="px-4 py-4 text-right"><span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1 font-black text-primary"><Coins size={15} />+{rule.amount}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-6 rounded-2xl bg-surface-muted p-4 text-sm leading-6 text-muted">As regras ativas de pontuação aparecerão aqui assim que forem publicadas pela administração.</p>
        )}
        <p className="mt-4 text-xs leading-5 text-muted">O ranking usa apenas pontos de aprendizagem da plataforma. Ele não representa avaliação financeira, crédito ou desempenho comercial.</p>
      </Card>
    </section>
  );
}
