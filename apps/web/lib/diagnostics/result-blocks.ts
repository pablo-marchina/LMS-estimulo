export const diagnosticResultBlocks = [
  { code: "maturity_map", label: "Mapa de maturidade", description: "Pontuação geral, perfil e barras por dimensão." },
  { code: "focus", label: "Foco claro", description: "Destaca a dimensão prioritária." },
  { code: "right_content", label: "Conteúdo certo", description: "Orienta o participante para conteúdos e jornadas relevantes." },
  { code: "real_application", label: "Aplicação real", description: "Reforça a transformação do aprendizado em ação." },
  { code: "strengths", label: "Pontos fortes", description: "Mostra capacidades que já favorecem o negócio." },
  { code: "challenge", label: "Próximo desafio", description: "Expõe a principal oportunidade de evolução." },
  { code: "practical_tip", label: "Dica prática", description: "Sugere uma ação concreta para começar." },
  { code: "takeaway", label: "Frase para levar", description: "Fecha o resultado com uma mensagem para o momento atual." },
] as const;

type AvailableDiagnosticResultBlockCode = typeof diagnosticResultBlocks[number]["code"];

// `next_moves` is kept only in the public type so older persisted payloads and
// rendering code can still be read safely. It is intentionally excluded from
// `diagnosticResultBlocks` and `validCodes`, so normalization removes the
// retired “próximos três movimentos” block from both new and existing results.
export type DiagnosticResultBlockCode = AvailableDiagnosticResultBlockCode | "next_moves";

const validCodes = new Set<string>(diagnosticResultBlocks.map((block) => block.code));
export const defaultDiagnosticResultBlocks: AvailableDiagnosticResultBlockCode[] = diagnosticResultBlocks.map((block) => block.code);

export function normalizeDiagnosticResultBlocks(value: unknown): DiagnosticResultBlockCode[] {
  if (!Array.isArray(value)) return [...defaultDiagnosticResultBlocks];
  const normalized = value
    .map(String)
    .filter((code): code is AvailableDiagnosticResultBlockCode => validCodes.has(code));
  return normalized.length ? Array.from(new Set(normalized)) : [...defaultDiagnosticResultBlocks];
}
