// Peptide Assessment — pure scoring & screening logic.
//
// Ported from the imported "Peptide Assessment" design (Claude Design .dc.html).
// Everything here is framework-free and side-effect-free so it can be unit
// tested in isolation and reused by the React quiz components.

export type GoalId =
  | 'weight'
  | 'muscle'
  | 'antiaging'
  | 'skin'
  | 'energy'
  | 'sleep'
  | 'immune';

/** [id, human label] pairs, in display order. */
export const GOALS: ReadonlyArray<readonly [GoalId, string]> = [
  ['weight', 'Weight management'],
  ['muscle', 'Muscle growth & recovery'],
  ['antiaging', 'Anti-aging & longevity'],
  ['skin', 'Skin, hair & beauty'],
  ['energy', 'Energy & focus'],
  ['sleep', 'Sleep & stress'],
  ['immune', 'Immune support'],
];

export interface AssessmentProduct {
  id: string;
  name: string;
  sub: string;
  price: number;
  /** True for tirzepatide-based products excluded by GLP-1 contraindications. */
  slim: boolean;
  tag: string;
  /** Goal → affinity weight. */
  g: Partial<Record<GoalId, number>>;
  desc: string;
}

export const ASSESSMENT_PRODUCTS: ReadonlyArray<AssessmentProduct> = [
  { id: 'slim2', name: 'PLP-Slim 2.0', sub: 'Tirzepatide 30mg + Cagrilintide 5mg', price: 9499, slim: true, tag: 'ADVANCED FORMULA', g: { weight: 10 }, desc: 'Dual-agonist combination pairing tirzepatide with cagrilintide for advanced appetite and weight control.' },
  { id: 'slim30', name: 'PLP-Slim', sub: 'Tirzepatide 30mg', price: 4999, slim: true, tag: 'HIGH STRENGTH', g: { weight: 9 }, desc: 'Tirzepatide-based weight management support at the highest single-agent strength.' },
  { id: 'slim20', name: 'PLP-Slim', sub: 'Tirzepatide 20mg', price: 4499, slim: true, tag: 'MID STRENGTH', g: { weight: 8 }, desc: 'Tirzepatide-based weight management support at a mid-range 20mg strength.' },
  { id: 'slim15', name: 'PLP-Slim', sub: 'Tirzepatide 15mg', price: 3999, slim: true, tag: 'STARTER STRENGTH', g: { weight: 8 }, desc: 'Tirzepatide-based weight management support at an entry 15mg strength.' },
  { id: 'appetite', name: 'PLP Appetite Control', sub: 'Appetite regulation blend', price: 3899, slim: false, tag: 'APPETITE SUPPORT', g: { weight: 7 }, desc: 'Peptide blend formulated to support appetite regulation and cravings control.' },
  { id: 'lipoc', name: 'PLP-Slim Booster', sub: 'Lipo-C with B12', price: 2499, slim: false, tag: 'METABOLIC BOOSTER', g: { weight: 5, energy: 6 }, desc: 'Lipotropic booster with B12 to support metabolism and energy alongside a weight protocol.' },
  { id: 'lipovela', name: 'Lipo Vela', sub: 'Lipotropic support', price: 1200, slim: false, tag: 'LIPOTROPIC', g: { weight: 4 }, desc: 'Lipotropic support formula for metabolism during a weight management program.' },
  { id: 'youth', name: 'PLP-Youth', sub: 'NAD+ 500mg', price: 3499, slim: false, tag: 'CELLULAR LONGEVITY', g: { antiaging: 10, energy: 9, sleep: 5, muscle: 6, immune: 4 }, desc: 'NAD+ 500mg supporting cellular energy, repair, recovery and healthy aging.' },
  { id: 'glow', name: 'PLP-Glow', sub: 'GHK-Cu 100mg', price: 2499, slim: false, tag: 'SKIN RENEWAL', g: { skin: 10, antiaging: 6 }, desc: 'GHK-Cu copper peptide supporting skin renewal, firmness and hair health.' },
  { id: 'glutax', name: 'Glutax 22000000 GS', sub: 'Glutathione drip', price: 600, slim: false, tag: 'ANTIOXIDANT', g: { skin: 8, immune: 5 }, desc: 'Glutathione drip for skin brightening and antioxidant support.' },
  { id: 'laennec', name: 'Laennec Placenta', sub: 'Placenta-derived formula', price: 550, slim: false, tag: 'RECOVERY & VITALITY', g: { antiaging: 7, skin: 6, immune: 6, energy: 5, muscle: 4, sleep: 3 }, desc: 'Placenta-derived formula supporting recovery, vitality and skin health.' },
];

export interface QuestionOption {
  v: string;
  label: string;
  note?: string;
}

export interface Question {
  id: string;
  sec: string;
  title: string;
  sub: string;
  opts: QuestionOption[];
  /** Multi-select question (checkbox semantics). */
  multi?: boolean;
  /** Only shown when this goal is relevant (currently only 'weight'). */
  cond?: GoalId;
}

/** Answers keyed by question id. Single-select stores a string, multi an array. */
export type AssessmentAnswers = Record<string, string | string[] | undefined>;

const goalOpts: QuestionOption[] = GOALS.map(([v, label]) => ({ v, label }));

export const QUESTIONS: ReadonlyArray<Question> = [
  { id: 'age', sec: 'SCREENING', title: 'What is your age?', sub: 'Peptide protocols are only available to adults.', opts: [{ v: 'u18', label: 'Under 18' }, { v: 'a18', label: '18–29' }, { v: 'a30', label: '30–39' }, { v: 'a40', label: '40–49' }, { v: 'a50', label: '50–59' }, { v: 'a60', label: '60 or older' }] },
  { id: 'pregnant', sec: 'SCREENING', title: 'Are you currently pregnant, breastfeeding, or planning pregnancy?', sub: 'Peptide therapies are not recommended during pregnancy or breastfeeding.', opts: [{ v: 'yes', label: 'Yes' }, { v: 'no', label: 'No' }, { v: 'na', label: 'Not applicable' }] },
  { id: 'thyroid', sec: 'SCREENING', title: 'Any personal or family history of medullary thyroid carcinoma or MEN2?', sub: 'This is an important contraindication for tirzepatide-based products.', opts: [{ v: 'yes', label: 'Yes' }, { v: 'no', label: 'No' }, { v: 'unsure', label: "I'm not sure" }] },
  { id: 'pancreatitis', sec: 'SCREENING', title: 'Have you ever been diagnosed with pancreatitis?', sub: '', opts: [{ v: 'yes', label: 'Yes' }, { v: 'no', label: 'No' }] },
  { id: 'conditions', sec: 'SCREENING', title: 'Do any of these conditions apply to you?', sub: 'Select all that apply.', multi: true, opts: [{ v: 't2d', label: 'Type 2 diabetes' }, { v: 'thy', label: 'Thyroid disorder' }, { v: 'kidney', label: 'Kidney or liver condition' }, { v: 'gall', label: 'Gallbladder disease' }, { v: 'bp', label: 'High blood pressure' }, { v: 'none', label: 'None of these' }] },
  { id: 'meds', sec: 'SCREENING', title: 'Are you currently taking any of the following?', sub: 'Select all that apply.', multi: true, opts: [{ v: 'insulin', label: 'Insulin or sulfonylureas' }, { v: 'thinners', label: 'Blood thinners' }, { v: 'hormones', label: 'Hormonal therapy' }, { v: 'none', label: 'None of these' }] },
  { id: 'primary', sec: 'YOUR GOALS', title: 'What is your primary goal?', sub: 'Your top recommendation will be weighted toward this.', opts: goalOpts },
  { id: 'secondary', sec: 'YOUR GOALS', title: 'Any secondary goals?', sub: 'Select all that apply.', multi: true, opts: goalOpts.concat([{ v: 'none', label: 'No secondary goals' }]) },
  { id: 'weightTarget', sec: 'YOUR GOALS', title: 'How much weight are you looking to lose?', sub: '', cond: 'weight', opts: [{ v: 'lt5', label: 'Less than 5 kg' }, { v: 'b515', label: '5–15 kg' }, { v: 'gt15', label: 'More than 15 kg' }, { v: 'app', label: 'Mainly appetite control' }] },
  { id: 'glp1', sec: 'EXPERIENCE', title: 'Have you used GLP-1 peptides before?', sub: 'For example tirzepatide or semaglutide.', cond: 'weight', opts: [{ v: 'never', label: 'Never used', note: "We'll suggest a starter-friendly strength" }, { v: 'current', label: 'Currently using' }, { v: 'prev', label: 'Used previously' }] },
  { id: 'peptideExp', sec: 'EXPERIENCE', title: 'How familiar are you with peptide therapies?', sub: '', opts: [{ v: 'first', label: 'This would be my first time' }, { v: 'some', label: 'I have some experience' }, { v: 'exp', label: 'Very experienced' }] },
  { id: 'activity', sec: 'LIFESTYLE', title: 'How active are you in a typical week?', sub: '', opts: [{ v: 'sed', label: 'Mostly sedentary' }, { v: 'light', label: 'Lightly active' }, { v: 'mod', label: 'Active 3–4× a week' }, { v: 'high', label: 'Very active' }] },
  { id: 'sleepq', sec: 'LIFESTYLE', title: 'How would you rate your sleep?', sub: '', opts: [{ v: 'poor', label: 'Poor — I rarely wake rested' }, { v: 'fair', label: 'Fair — could be better' }, { v: 'good', label: 'Good most nights' }] },
  { id: 'budget', sec: 'LIFESTYLE', title: 'What is your monthly budget for a protocol?', sub: 'We will prioritize products within your range.', opts: [{ v: 'u25', label: 'Under ₱2,500' }, { v: 'b25', label: '₱2,500 – ₱5,000' }, { v: 'b510', label: '₱5,000 – ₱10,000' }, { v: 'o10', label: 'Over ₱10,000' }] },
];

const asArray = (v: string | string[] | undefined): string[] =>
  Array.isArray(v) ? v : [];

/** Weight-specific questions only apply when weight is a primary or secondary goal. */
export function weightRelevant(a: AssessmentAnswers): boolean {
  return a.primary === 'weight' || asArray(a.secondary).indexOf('weight') >= 0;
}

/** Questions visible for the given answers, hiding conditional (weight) questions. */
export function visibleQuestions(a: AssessmentAnswers): Question[] {
  return QUESTIONS.filter(
    (q) => !q.cond || (q.cond === 'weight' && weightRelevant(a))
  );
}

/** A question is answered when a single value is set, or a multi has ≥1 pick. */
export function isAnswered(q: Question, a: AssessmentAnswers): boolean {
  const v = a[q.id];
  return q.multi ? Array.isArray(v) && v.length > 0 : v !== undefined;
}

export interface Recommendation {
  rank: number;
  id: string;
  name: string;
  sub: string;
  desc: string;
  tag: string;
  match: number;
  price: string;
  priceValue: number;
  why: string[];
}

export interface AssessmentResult {
  dq: boolean;
  dqReasons: string[];
  cautions: string[];
  recs: Recommendation[];
}

export interface ComputeOptions {
  /** When false, contraindications surface as cautions instead of blocking. */
  allowDisqualify?: boolean;
}

const BUDGET_MAX: Record<string, number> = {
  u25: 2500,
  b25: 5000,
  b510: 10000,
  o10: Infinity,
};

const MATCH_FLOOR = 55;
const MATCH_TOP = 97;
const MAX_RECS = 3;

const goalLabel = (id: GoalId): string =>
  GOALS.find(([v]) => v === id)?.[1] ?? id;

/**
 * Screen the applicant and produce a ranked, safety-aware recommendation set.
 * Mirrors the imported design's scoring exactly.
 */
export function computeAssessment(
  a: AssessmentAnswers,
  { allowDisqualify = true }: ComputeOptions = {}
): AssessmentResult {
  const conditions = asArray(a.conditions);
  const meds = asArray(a.meds);

  const dqReasons: string[] = [];
  if (a.age === 'u18') dqReasons.push('Peptide protocols are only available to adults 18 and older.');
  if (a.pregnant === 'yes') dqReasons.push('Peptide therapies are not recommended during pregnancy, breastfeeding, or when planning pregnancy.');
  const glpExcluded = a.thyroid === 'yes' || a.pancreatitis === 'yes';
  if (glpExcluded && a.primary === 'weight') {
    dqReasons.push('A history of medullary thyroid carcinoma, MEN2, or pancreatitis contraindicates tirzepatide-based weight management products.');
  }
  const dq = allowDisqualify && dqReasons.length > 0;

  // A disqualified applicant must not receive any product recommendations —
  // the screening result is terminal. (The imported design computed recs here
  // and merely hid them; withholding them entirely is safer.)
  if (dq) return { dq, dqReasons, cautions: [], recs: [] };

  const cautions: string[] = [];
  if (!dq) {
    if (!allowDisqualify && dqReasons.length) dqReasons.forEach((r) => cautions.push(r));
    if (meds.indexOf('insulin') >= 0 || conditions.indexOf('t2d') >= 0) cautions.push('You indicated diabetes or diabetes medication — coordinate any GLP-1 dosing with your physician to avoid hypoglycemia.');
    if (a.thyroid === 'unsure') cautions.push('Confirm your thyroid history with a physician before starting any tirzepatide-based product.');
    if (conditions.indexOf('gall') >= 0) cautions.push('Gallbladder disease can be aggravated by rapid weight loss — monitor closely with your physician.');
    if (conditions.indexOf('kidney') >= 0) cautions.push('Kidney or liver conditions require medical supervision during any peptide protocol.');
    if (meds.indexOf('thinners') >= 0) cautions.push('Inform your physician about blood thinner use before beginning injections or drips.');
    if (glpExcluded) cautions.push('Tirzepatide-based products (PLP-Slim line) were excluded from your results based on your screening answers.');
  }

  const budgetMax = BUDGET_MAX[a.budget as string] ?? Infinity;
  const primary = a.primary as GoalId | undefined;
  const secondary = asArray(a.secondary).filter(
    (s): s is GoalId => s !== 'none' && s !== primary
  );

  type Scored = { p: AssessmentProduct; s: number; why: string[] };

  const scored: Scored[] = ASSESSMENT_PRODUCTS
    .map((p): Scored | null => {
      if (glpExcluded && p.slim) return null;
      let s = (primary ? p.g[primary] ?? 0 : 0) * 3;
      secondary.forEach((g) => (s += p.g[g] ?? 0));
      if (s <= 0) return null;

      const why: string[] = [];
      if (primary && p.g[primary]) why.push('Matches: ' + goalLabel(primary));
      const secHit = secondary.find((g) => p.g[g]);
      if (secHit) why.push('Supports: ' + goalLabel(secHit));

      if (p.slim) {
        if (a.glp1 === 'never') {
          if (p.id === 'slim15') { s += 3; why.push('Starter-friendly strength'); }
          if (p.id === 'slim30') s -= 2;
          if (p.id === 'slim2') s -= 3;
        }
        if (a.glp1 === 'current' || a.glp1 === 'prev') {
          if (p.id === 'slim30') s += 2;
          if (p.id === 'slim2') { s += 3; why.push('Suited to prior GLP-1 experience'); }
        }
      }
      if (a.weightTarget === 'gt15') { if (p.id === 'slim2') s += 3; if (p.id === 'slim30') s += 2; }
      if (a.weightTarget === 'lt5') { if (p.id === 'appetite' || p.id === 'lipoc') s += 2; if (p.id === 'slim15') s += 1; }
      if (a.weightTarget === 'app' && p.id === 'appetite') { s += 4; why.push('Focused on appetite control'); }
      if (a.sleepq === 'poor' && p.id === 'youth') s += 2;
      if (p.price <= budgetMax) why.push('Within budget'); else s -= 3;

      return { p, s, why };
    })
    .filter((x): x is Scored => x !== null && x.s > 0);

  scored.sort((x, y) => y.s - x.s);
  const top = scored.slice(0, MAX_RECS);
  const max = top.length ? top[0].s : 1;

  const recs: Recommendation[] = top.map((x, i) => ({
    rank: i + 1,
    id: x.p.id,
    name: x.p.name,
    sub: x.p.sub,
    desc: x.p.desc,
    tag: x.p.tag,
    match: Math.max(MATCH_FLOOR, Math.round((MATCH_TOP * x.s) / max)),
    price: '₱' + x.p.price.toLocaleString('en-PH'),
    priceValue: x.p.price,
    why: x.why.slice(0, 3),
  }));

  return { dq, dqReasons, cautions, recs };
}
