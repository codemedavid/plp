import { useMemo, useState } from 'react';
import {
  visibleQuestions,
  isAnswered,
  computeAssessment,
  type AssessmentAnswers,
  type AssessmentResult,
  type Question,
} from '../lib/assessment';

export type AssessmentView = 'home' | 'quiz' | 'results' | 'dq';

export interface UseAssessmentReturn {
  view: AssessmentView;
  step: number;
  answers: AssessmentAnswers;
  /** Questions visible for the current answers (weight questions are conditional). */
  questions: Question[];
  current: Question | undefined;
  total: number;
  /** Completion percentage of the quiz, 0–100. */
  progressPct: number;
  isCurrentAnswered: boolean;
  /** Computed result, present only on the 'results'/'dq' views. */
  result: AssessmentResult | null;
  start: () => void;
  goHome: () => void;
  restart: () => void;
  pick: (qid: string, value: string, multi: boolean) => void;
  advance: () => void;
  back: () => void;
}

const INITIAL = { view: 'home' as AssessmentView, step: 0, answers: {} as AssessmentAnswers };

// Immutable toggle for a multi-select value with "none of these" semantics:
// picking "none" clears everything else; picking anything else clears "none".
function toggleMulti(current: string[], value: string): string[] {
  if (value === 'none') {
    return current.indexOf('none') >= 0 ? [] : ['none'];
  }
  const next = current.indexOf(value) >= 0
    ? current.filter((v) => v !== value)
    : [...current, value];
  return next.filter((v) => v !== 'none');
}

/**
 * State machine for the Peptide Assessment wizard. Pure — no timers or side
 * effects — so the auto-advance UX delay lives in the presentation layer.
 */
export function useAssessment(): UseAssessmentReturn {
  const [view, setView] = useState<AssessmentView>(INITIAL.view);
  const [step, setStep] = useState(INITIAL.step);
  const [answers, setAnswers] = useState<AssessmentAnswers>(INITIAL.answers);

  const questions = useMemo(() => visibleQuestions(answers), [answers]);
  const total = questions.length;
  const safeStep = Math.min(step, Math.max(0, total - 1));
  const current = questions[safeStep];
  const isCurrentAnswered = current ? isAnswered(current, answers) : false;

  const result = useMemo(
    () => (view === 'results' || view === 'dq' ? computeAssessment(answers) : null),
    [view, answers]
  );

  const reset = (nextView: AssessmentView) => {
    setView(nextView);
    setStep(0);
    setAnswers({});
  };

  const start = () => reset('quiz');
  const goHome = () => reset('home');
  const restart = () => reset('quiz');

  const pick = (qid: string, value: string, multi: boolean) => {
    setAnswers((prev) => {
      if (multi) {
        const currentValues = Array.isArray(prev[qid]) ? (prev[qid] as string[]) : [];
        return { ...prev, [qid]: toggleMulti(currentValues, value) };
      }
      return { ...prev, [qid]: value };
    });
  };

  const finish = () => {
    const { dq } = computeAssessment(answers);
    setView(dq ? 'dq' : 'results');
  };

  const advance = () => {
    if (!current || !isAnswered(current, answers)) return;
    if (safeStep + 1 >= total) finish();
    else setStep(safeStep + 1);
  };

  const back = () => setStep((s) => Math.max(0, s - 1));

  return {
    view,
    step: safeStep,
    answers,
    questions,
    current,
    total,
    progressPct: total > 0 ? Math.round((safeStep / total) * 100) : 0,
    isCurrentAnswered,
    result,
    start,
    goHome,
    restart,
    pick,
    advance,
    back,
  };
}
