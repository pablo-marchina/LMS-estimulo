import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateMaturityPreview,
  maturityDimensions,
  maturitySegmentForScore,
} from "../../apps/web/lib/maturity/engine-core.mjs";

const answers = (score) => maturityDimensions.map((dimension) => ({ dimension: dimension.code, score }));

test("maturity preview calculates boundaries deterministically", () => {
  assert.equal(calculateMaturityPreview(answers(0)).overallScore, 0);
  assert.equal(calculateMaturityPreview(answers(0)).segment, "base");
  assert.equal(calculateMaturityPreview(answers(4)).overallScore, 100);
  assert.equal(calculateMaturityPreview(answers(4)).segment, "evolution");
  assert.equal(maturitySegmentForScore(39), "base");
  assert.equal(maturitySegmentForScore(40), "traction");
  assert.equal(maturitySegmentForScore(71), "traction");
  assert.equal(maturitySegmentForScore(72), "evolution");
});

test("maturity preview uses stable dimension order as tie break", () => {
  const result = calculateMaturityPreview(answers(2));
  assert.equal(result.status, "calculated");
  assert.equal(result.focusDimension, "strategy");
  assert.equal(result.confidence, null);
});

test("maturity preview abstains on incomplete, duplicate and invalid answers", () => {
  assert.deepEqual(calculateMaturityPreview(answers(2).slice(0, 5)), {
    status: "abstained", reason: "missing_answer", confidence: null,
  });
  const duplicate = answers(2);
  duplicate[5] = { dimension: "strategy", score: 2 };
  assert.equal(calculateMaturityPreview(duplicate).reason, "duplicate_dimension");
  const invalid = answers(2);
  invalid[1] = { ...invalid[1], score: 5 };
  assert.equal(calculateMaturityPreview(invalid).reason, "invalid_score");
});

test("maturity score rejects values outside zero to one hundred", () => {
  assert.throws(() => maturitySegmentForScore(-1), /MATURITY_SCORE_OUT_OF_RANGE/u);
  assert.throws(() => maturitySegmentForScore(101), /MATURITY_SCORE_OUT_OF_RANGE/u);
});
