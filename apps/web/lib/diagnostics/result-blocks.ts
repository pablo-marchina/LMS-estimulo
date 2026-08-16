export const diagnosticResultBlocks = [
  { code: "maturity_map", label: "Mapa de maturidade", description: "Perfil e barras por dimensão." },
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

export type DiagnosticResultText = {
  title: string;
  body: string;
};

export type DiagnosticProfileResultContent = {
  strength: DiagnosticResultText;
  challenge: DiagnosticResultText;
  practical_tip: DiagnosticResultText;
  takeaway: DiagnosticResultText;
};

export type DiagnosticResultContentByProfile = Record<string, DiagnosticProfileResultContent>;

const validCodes = new Set<string>(diagnosticResultBlocks.map((block) => block.code));
export const defaultDiagnosticResultBlocks: AvailableDiagnosticResultBlockCode[] = diagnosticResultBlocks.map((block) => block.code);

export function normalizeDiagnosticResultBlocks(value: unknown): DiagnosticResultBlockCode[] {
  // Missing legacy configuration still receives the historical default set.
  // An explicit array, including [], is authoritative: an administrator who
  // unchecks a result block must not have it silently restored by normalization.
  if (!Array.isArray(value)) return [...defaultDiagnosticResultBlocks];
  return Array.from(new Set(value
    .map(String)
    .filter((code): code is AvailableDiagnosticResultBlockCode => validCodes.has(code))));
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function normalizeDiagnosticProfileResultContent(value: unknown): DiagnosticProfileResultContent | null {
  const source = record(value);
  if (Object.keys(source).length === 0) return null;
  const section = (key: keyof DiagnosticProfileResultContent): DiagnosticResultText => {
    const item = record(source[key]);
    return { title: text(item.title), body: text(item.body) };
  };
  return {
    strength: section("strength"),
    challenge: section("challenge"),
    practical_tip: section("practical_tip"),
    takeaway: section("takeaway"),
  };
}

export function normalizeDiagnosticResultContentByProfile(value: unknown): DiagnosticResultContentByProfile {
  const source = record(value);
  const result: DiagnosticResultContentByProfile = {};
  for (const [profileCode, raw] of Object.entries(source)) {
    const content = normalizeDiagnosticProfileResultContent(raw);
    if (profileCode && content) result[profileCode] = content;
  }
  return result;
}
