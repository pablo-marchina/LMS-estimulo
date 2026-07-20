export const maturityDimensions = Object.freeze([
  Object.freeze({ code: "strategy", label: "Estratégia e prioridades", position: 1 }),
  Object.freeze({ code: "financial_management", label: "Gestão financeira", position: 2 }),
  Object.freeze({ code: "sales", label: "Vendas", position: 3 }),
  Object.freeze({ code: "digital", label: "Presença digital", position: 4 }),
  Object.freeze({ code: "operations", label: "Operação", position: 5 }),
  Object.freeze({ code: "continuous_improvement", label: "Desenvolvimento contínuo", position: 6 }),
]);

const expected = new Set(maturityDimensions.map((dimension) => dimension.code));

export function maturitySegmentForScore(score) {
  if (!Number.isInteger(score) || score < 0 || score > 100) {
    throw new Error("MATURITY_SCORE_OUT_OF_RANGE");
  }
  if (score <= 39) return "base";
  if (score <= 71) return "traction";
  return "evolution";
}

export function calculateMaturityPreview(answers) {
  if (answers.length !== maturityDimensions.length) {
    return { status: "abstained", reason: "missing_answer", confidence: null };
  }
  const seen = new Set();
  for (const answer of answers) {
    if (!expected.has(answer.dimension)) {
      return { status: "abstained", reason: "unknown_dimension", confidence: null };
    }
    if (seen.has(answer.dimension)) {
      return { status: "abstained", reason: "duplicate_dimension", confidence: null };
    }
    seen.add(answer.dimension);
    if (!Number.isInteger(answer.score) || answer.score < 0 || answer.score > 4) {
      return { status: "abstained", reason: "invalid_score", confidence: null };
    }
  }

  const byDimension = new Map(answers.map((answer) => [answer.dimension, answer.score]));
  const orderedScores = maturityDimensions.map((dimension) => ({
    dimension: dimension.code,
    score: byDimension.get(dimension.code),
  }));
  const total = orderedScores.reduce((sum, item) => sum + item.score, 0);
  const overallScore = Math.round((total / (maturityDimensions.length * 4)) * 100);
  const focusDimension = orderedScores.reduce((lowest, current) =>
    current.score < lowest.score ? current : lowest
  ).dimension;
  const dimensionScores = Object.fromEntries(
    orderedScores.map((item) => [item.dimension, Math.round((item.score / 4) * 100)]),
  );

  return {
    status: "calculated",
    overallScore,
    segment: maturitySegmentForScore(overallScore),
    focusDimension,
    dimensionScores,
    confidence: null,
  };
}
