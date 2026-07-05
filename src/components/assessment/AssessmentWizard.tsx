import type { AssessmentAnswers, Question } from '../../lib/assessment';

type Props = {
  question: Question;
  stepNum: number;
  stepTotal: number;
  progressPct: number;
  answers: AssessmentAnswers;
  isAnswered: boolean;
  isFirst: boolean;
  isLast: boolean;
  /** Single-select choice (auto-advances). */
  onSelect: (value: string) => void;
  /** Multi-select toggle (requires explicit Continue). */
  onToggle: (value: string) => void;
  onAdvance: () => void;
  onBack: () => void;
  onExit: () => void;
};

export function AssessmentWizard({
  question,
  stepNum,
  stepTotal,
  progressPct,
  answers,
  isAnswered,
  isFirst,
  isLast,
  onSelect,
  onToggle,
  onAdvance,
  onBack,
  onExit,
}: Props) {
  const selectedValues = answers[question.id];
  const isSelected = (value: string): boolean =>
    question.multi
      ? Array.isArray(selectedValues) && selectedValues.includes(value)
      : selectedValues === value;

  return (
    <section aria-labelledby="wizard-question" className="bg-cream-light">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-navy-900/10 bg-cream px-6 py-4">
        <span className="font-heading text-base tracking-[0.28em] text-gold-600">PEPTIDE</span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-navy-900">
          Peptide Assessment
        </span>
        <button
          type="button"
          onClick={onExit}
          className="text-[12px] font-semibold uppercase tracking-[0.18em] text-charcoal-400 transition-colors hover:text-navy-900"
        >
          Exit ✕
        </button>
      </div>

      {/* Progress */}
      <div className="h-[3px] w-full bg-navy-900/10" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-gold-500 transition-[width] duration-300" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="container mx-auto max-w-2xl px-6 py-16">
        <div className="flex items-baseline gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-gold-600">{question.sec}</span>
          <span className="text-[11px] uppercase tracking-[0.18em] text-charcoal-400">
            Question {stepNum} of {stepTotal}
          </span>
        </div>

        <h2 id="wizard-question" className="mt-4 font-heading text-3xl font-medium leading-snug text-navy-900">
          {question.title}
        </h2>
        {question.sub && <p className="mt-3 text-[15px] leading-relaxed text-charcoal-500">{question.sub}</p>}

        <div className="mt-8 flex flex-col gap-2.5">
          {question.opts.map((opt) => {
            const selected = isSelected(opt.v);
            return (
              <button
                key={opt.v}
                type="button"
                aria-pressed={selected}
                onClick={() => (question.multi ? onToggle(opt.v) : onSelect(opt.v))}
                className={`flex w-full items-center justify-between gap-4 border px-5 py-4 text-left transition-colors ${
                  selected
                    ? 'border-gold-500 bg-gold-50'
                    : 'border-navy-900/15 bg-white hover:border-gold-500'
                }`}
                style={{ borderRadius: '2px' }}
              >
                <span>
                  <span className="block text-[15px] font-medium text-navy-900">{opt.label}</span>
                  {opt.note && <span className="mt-0.5 block text-[13px] text-charcoal-400">{opt.note}</span>}
                </span>
                <span
                  className={`h-[18px] w-[18px] flex-none rounded-full border-2 ${
                    selected ? 'border-gold-500 bg-gold-500' : 'border-navy-900/25 bg-transparent'
                  }`}
                />
              </button>
            );
          })}
        </div>

        <div className="mt-9 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            disabled={isFirst}
            className={`text-[12px] font-semibold uppercase tracking-[0.18em] transition-colors ${
              isFirst ? 'cursor-default text-charcoal-300' : 'text-charcoal-400 hover:text-navy-900'
            }`}
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={onAdvance}
            disabled={!isAnswered}
            className="bg-navy-900 px-9 py-4 text-[12px] font-semibold uppercase tracking-[0.22em] text-white transition-colors hover:bg-gold-500 hover:text-navy-900 disabled:opacity-40 disabled:hover:bg-navy-900 disabled:hover:text-white"
            style={{ borderRadius: '2px' }}
          >
            {isLast ? 'See Results →' : 'Continue →'}
          </button>
        </div>
      </div>
    </section>
  );
}

export default AssessmentWizard;
