export const maturityDimensions: readonly [
  { readonly code: "strategy"; readonly label: "Estratégia e prioridades"; readonly position: 1 },
  { readonly code: "financial_management"; readonly label: "Gestão financeira"; readonly position: 2 },
  { readonly code: "sales"; readonly label: "Vendas"; readonly position: 3 },
  { readonly code: "digital"; readonly label: "Presença digital"; readonly position: 4 },
  { readonly code: "operations"; readonly label: "Operação"; readonly position: 5 },
  { readonly code: "continuous_improvement"; readonly label: "Desenvolvimento contínuo"; readonly position: 6 },
];

export type MaturityDimensionCode = (typeof maturityDimensions)[number]["code"];
export type MaturityAnswer = { dimension: MaturityDimensionCode; score: number };
export type MaturitySegment = "base" | "traction" | "evolution";
export type MaturityPreviewResult =
  | {
      status: "calculated";
      overallScore: number;
      segment: MaturitySegment;
      focusDimension: MaturityDimensionCode;
      dimensionScores: Record<MaturityDimensionCode, number>;
      confidence: null;
    }
  | {
      status: "abstained";
      reason: "missing_answer" | "duplicate_dimension" | "unknown_dimension" | "invalid_score";
      confidence: null;
    };

export function maturitySegmentForScore(score: number): MaturitySegment;
export function calculateMaturityPreview(answers: readonly MaturityAnswer[]): MaturityPreviewResult;
