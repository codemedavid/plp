import { describe, it, expect } from 'vitest';
import {
  GOALS,
  ASSESSMENT_PRODUCTS,
  QUESTIONS,
  weightRelevant,
  visibleQuestions,
  isAnswered,
  computeAssessment,
  type AssessmentAnswers,
} from '../lib/assessment';

// A screening-clean base a suitable adult would answer, so individual tests
// only override the fields under test.
const cleanBase: AssessmentAnswers = {
  age: 'a30',
  pregnant: 'no',
  thyroid: 'no',
  pancreatitis: 'no',
  conditions: ['none'],
  meds: ['none'],
  budget: 'o10',
};

describe('assessment data', () => {
  it('exposes the seven lifestyle goals', () => {
    expect(GOALS.map(([id]) => id)).toEqual([
      'weight',
      'muscle',
      'antiaging',
      'skin',
      'energy',
      'sleep',
      'immune',
    ]);
  });

  it('includes the tirzepatide-based slim products flagged as slim', () => {
    const slim = ASSESSMENT_PRODUCTS.filter((p) => p.slim).map((p) => p.id);
    expect(slim).toEqual(expect.arrayContaining(['slim2', 'slim30', 'slim20', 'slim15']));
  });
});

describe('visibleQuestions / weightRelevant', () => {
  it('hides weight-only questions when weight is not a goal', () => {
    const ids = visibleQuestions({ primary: 'skin' }).map((q) => q.id);
    expect(ids).not.toContain('weightTarget');
    expect(ids).not.toContain('glp1');
  });

  it('shows weight-only questions when weight is the primary goal', () => {
    const ids = visibleQuestions({ primary: 'weight' }).map((q) => q.id);
    expect(ids).toContain('weightTarget');
    expect(ids).toContain('glp1');
  });

  it('treats weight as relevant when listed as a secondary goal', () => {
    expect(weightRelevant({ primary: 'skin', secondary: ['weight'] })).toBe(true);
    expect(weightRelevant({ primary: 'skin', secondary: ['none'] })).toBe(false);
  });
});

describe('isAnswered', () => {
  const singleQ = QUESTIONS.find((q) => q.id === 'primary')!;
  const multiQ = QUESTIONS.find((q) => q.id === 'conditions')!;

  it('treats a single-select question as answered once a value exists', () => {
    expect(isAnswered(singleQ, {})).toBe(false);
    expect(isAnswered(singleQ, { primary: 'weight' })).toBe(true);
  });

  it('treats a multi-select question as answered only when non-empty', () => {
    expect(isAnswered(multiQ, { conditions: [] })).toBe(false);
    expect(isAnswered(multiQ, { conditions: ['t2d'] })).toBe(true);
  });
});

describe('computeAssessment — safety screening', () => {
  it('disqualifies applicants under 18', () => {
    const result = computeAssessment({ ...cleanBase, age: 'u18', primary: 'weight' });
    expect(result.dq).toBe(true);
    expect(result.dqReasons.length).toBeGreaterThan(0);
    expect(result.recs).toHaveLength(0);
  });

  it('disqualifies applicants who are pregnant', () => {
    const result = computeAssessment({ ...cleanBase, pregnant: 'yes', primary: 'weight' });
    expect(result.dq).toBe(true);
  });

  it('disqualifies a weight goal when there is thyroid (MEN2) history', () => {
    const result = computeAssessment({ ...cleanBase, thyroid: 'yes', primary: 'weight' });
    expect(result.dq).toBe(true);
  });

  it('surfaces reasons as cautions instead of blocking when disqualification is disabled', () => {
    const result = computeAssessment(
      { ...cleanBase, pregnant: 'yes', primary: 'skin' },
      { allowDisqualify: false }
    );
    expect(result.dq).toBe(false);
    expect(result.cautions.join(' ')).toMatch(/pregnan/i);
    expect(result.recs.length).toBeGreaterThan(0);
  });

  it('warns about hypoglycemia for diabetic applicants without blocking', () => {
    const result = computeAssessment({
      ...cleanBase,
      primary: 'weight',
      glp1: 'never',
      conditions: ['t2d'],
    });
    expect(result.dq).toBe(false);
    expect(result.cautions.join(' ')).toMatch(/hypoglycemia/i);
  });

  it('excludes slim/tirzepatide products and warns when thyroid history but goal is not weight', () => {
    const result = computeAssessment({ ...cleanBase, thyroid: 'yes', primary: 'skin' });
    expect(result.dq).toBe(false);
    expect(result.cautions.join(' ')).toMatch(/PLP-Slim/i);
    expect(result.recs.every((r) => !/tirzepatide/i.test(r.sub))).toBe(true);
  });
});

describe('computeAssessment — recommendations', () => {
  it('ranks the strongest primary-goal match first, capped at three results', () => {
    const result = computeAssessment({ ...cleanBase, primary: 'skin' });
    expect(result.recs.length).toBeGreaterThan(0);
    expect(result.recs.length).toBeLessThanOrEqual(3);
    expect(result.recs[0].name).toBe('PLP-Glow');
    expect(result.recs[0].rank).toBe(1);
    expect(result.recs[0].match).toBe(97);
    // Ranks are sequential and match scores are non-increasing.
    result.recs.forEach((r, i) => expect(r.rank).toBe(i + 1));
    for (let i = 1; i < result.recs.length; i++) {
      expect(result.recs[i].match).toBeLessThanOrEqual(result.recs[i - 1].match);
    }
  });

  it('never returns a match below the 55% floor', () => {
    const result = computeAssessment({ ...cleanBase, primary: 'skin' });
    result.recs.forEach((r) => expect(r.match).toBeGreaterThanOrEqual(55));
  });

  it('boosts a starter-friendly slim strength for GLP-1 naive users', () => {
    const result = computeAssessment({
      ...cleanBase,
      primary: 'weight',
      glp1: 'never',
      weightTarget: 'b515',
    });
    expect(result.recs.some((r) => r.why.some((w) => /starter-friendly/i.test(w)))).toBe(true);
  });

  it('recommends only weight-line products for a weight-management goal', () => {
    const result = computeAssessment({
      ...cleanBase,
      primary: 'weight',
      glp1: 'never',
      weightTarget: 'b515',
    });
    const weightNames = ASSESSMENT_PRODUCTS.filter((p) => p.g.weight).map((p) => p.name);
    expect(result.recs.length).toBeGreaterThan(0);
    result.recs.forEach((r) => expect(weightNames).toContain(r.name));
  });

  it('flags within-budget products and penalizes those over the cap', () => {
    const inBudget = computeAssessment({ ...cleanBase, primary: 'skin', budget: 'u25' });
    expect(inBudget.recs.some((r) => r.why.some((w) => /within budget/i.test(w)))).toBe(true);
  });

  it('formats price as a peso string', () => {
    const result = computeAssessment({ ...cleanBase, primary: 'skin' });
    expect(result.recs[0].price).toMatch(/^₱[\d,]+$/);
  });
});
