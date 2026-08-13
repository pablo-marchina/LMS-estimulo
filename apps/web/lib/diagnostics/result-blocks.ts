export const diagnosticResultBlocks = [
  { code: "maturity_map", label: "Mapa de maturidade", description: "Pontuação geral, perfil e barras por dimensão." },
  { code: "next_moves", label: "Próximos movimentos", description: "Sequência prática de três próximos passos." },
  { code: "focus", label: "Foco claro", description: "Destaca a dimensão prioritária." },
  { code: "right_content", label: "Conteúdo certo", description: "Orienta o participante para conteúdos e jornadas relevantes." },
  { code: "real_application", label: "Aplicação real", description: "Reforça a transformação do aprendizado em ação." },
  { code: "strengths", label: "Pontos fortes", description: "Mostra capacidades que já favorecem o negócio." },
  { code: "challenge", label: "Próximo desafio", description: "Expõe a principal oportunidade de evolução." },
  { code: "practical_tip", label: "Dica prática", description: "Sugere uma ação concreta para começar." },
  { code: "takeaway", label: "Frase para levar", description: "Fecha o resultado com uma mensagem para o momento atual." },
] as const;

export type DiagnosticResultBlockCode = typeof diagnosticResultBlocks[number]["code"];

const validCodes = new Set<string>(diagnosticResultBlocks.map((block) => block.code));
export const defaultDiagnosticResultBlocks: DiagnosticResultBlockCode[] = diagnosticResultBlocks.map((block) => block.code);

export function normalizeDiagnosticResultBlocks(value: unknown): DiagnosticResultBlockCode[] {
  if (!Array.isArray(value)) return [...defaultDiagnosticResultBlocks];
  const normalized = value.map(String).filter((code): code is DiagnosticResultBlockCode => validCodes.has(code));
  return normalized.length ? Array.from(new Set(normalized)) : [...defaultDiagnosticResultBlocks];
}
