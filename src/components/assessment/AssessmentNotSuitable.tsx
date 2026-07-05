type Props = {
  reasons: string[];
  onHome: () => void;
  onRestart: () => void;
};

export function AssessmentNotSuitable({ reasons, onHome, onRestart }: Props) {
  return (
    <section
      aria-labelledby="dq-heading"
      className="flex min-h-[70vh] items-center justify-center bg-cream-light px-6 py-16"
    >
      <div
        className="max-w-xl border border-navy-900/12 bg-white px-10 py-14 text-center"
        style={{ borderRadius: '2px' }}
      >
        <div
          className="mx-auto flex items-center justify-center rounded-full border border-gold-500/60 font-heading text-2xl text-gold-600"
          style={{ height: '58px', width: '58px' }}
          aria-hidden
        >
          !
        </div>
        <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.32em] text-gold-600">Screening Result</p>
        <h2 id="dq-heading" className="mt-4 font-heading text-3xl font-medium leading-snug text-navy-900">
          Our protocols aren&apos;t suitable for you right now
        </h2>

        {reasons.length > 0 && (
          <div
            className="mt-6 border border-gold-500/40 bg-gold-50 px-6 py-5 text-left"
            style={{ borderRadius: '2px' }}
          >
            <ul className="space-y-1.5">
              {reasons.map((d) => (
                <li key={d} className="flex gap-2.5 text-sm leading-relaxed text-charcoal-600">
                  <span className="flex-none text-gold-600">◆</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-7 text-[15px] leading-relaxed text-charcoal-500">
          Your safety comes first. Based on your screening answers, we recommend speaking with a
          licensed physician before considering any peptide therapy.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onHome}
            className="bg-navy-900 px-8 py-4 text-[12px] font-semibold uppercase tracking-[0.22em] text-white transition-colors hover:bg-gold-500 hover:text-navy-900"
            style={{ borderRadius: '2px' }}
          >
            Return Home
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="border border-navy-900/25 px-8 py-4 text-[12px] font-semibold uppercase tracking-[0.22em] text-navy-900 transition-colors hover:border-gold-500"
            style={{ borderRadius: '2px' }}
          >
            Retake
          </button>
        </div>
      </div>
    </section>
  );
}

export default AssessmentNotSuitable;
