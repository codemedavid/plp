import { ArrowRight } from 'lucide-react';

type Props = {
  questionCount: number;
  onStart: () => void;
};

const VALUE_PROPS = [
  {
    title: 'Safety screened',
    body: 'Contraindication checks before any product is recommended.',
  },
  {
    title: 'Goal-matched',
    body: 'A ranked stack of up to three products, matched to your goals.',
  },
  {
    title: 'Guided dosing',
    body: 'Strength suggestions based on your experience level.',
  },
];

export function AssessmentHome({ questionCount, onStart }: Props) {
  return (
    <section aria-labelledby="assessment-heading" className="bg-cream-light">
      <div className="container mx-auto max-w-3xl px-6 py-20 md:py-28 text-center">
        <p className="text-[12px] font-semibold uppercase tracking-[0.32em] text-gold-600">
          Personalized Recommendations
        </p>
        <h1
          id="assessment-heading"
          className="mt-6 font-heading text-4xl md:text-6xl font-medium leading-[1.12] text-navy-900"
        >
          Which peptide protocol
          <br className="hidden sm:block" /> is right for you?
        </h1>
        <div className="mx-auto mt-7 h-0.5 w-16 bg-gold-500" />
        <p className="mx-auto mt-9 max-w-xl text-base md:text-lg leading-relaxed text-charcoal-500">
          Answer a short set of screening and lifestyle questions and receive a ranked
          protocol matched to your goals — including a suitability check before you begin.
        </p>

        <div className="mt-11">
          <button
            type="button"
            onClick={onStart}
            className="group inline-flex items-center gap-5 bg-navy-900 px-12 py-5 text-[13px] font-semibold uppercase tracking-[0.28em] text-white transition-colors hover:bg-gold-500 hover:text-navy-900"
            style={{ borderRadius: '2px' }}
          >
            Begin Assessment
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={1.8} />
          </button>
          <p className="mt-6 text-sm tracking-wide text-charcoal-400">
            {questionCount} questions · about 3 minutes · includes safety screening
          </p>
        </div>
      </div>

      <div className="border-t border-navy-900/10 bg-cream">
        <div className="container mx-auto grid max-w-4xl gap-8 px-6 py-12 text-center sm:grid-cols-3">
          {VALUE_PROPS.map((v) => (
            <div key={v.title}>
              <h2 className="font-heading text-xl text-navy-900">{v.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-charcoal-500">{v.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default AssessmentHome;
