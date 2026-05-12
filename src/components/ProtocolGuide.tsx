import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Syringe, Thermometer, Clock, ChevronDown, ChevronUp, Flame, Dumbbell, Pill, Sparkles, Brain } from 'lucide-react';
import Header from './Header';
import Footer from './Footer';
import { useCart } from '../hooks/useCart';

interface PhaseRow {
    phase: string;
    period: string;
    columns: string[];
}

interface Stack {
    id: string;
    letter: string;
    title: string;
    icon: React.ReactNode;
    peptides: string[];
    synergy: string;
    duration: string;
    frequency: string[];
    timing: string;
    dosingConcept: string;
    cycle: string;
    tableHeaders: string[];
    phases: PhaseRow[];
    note: string;
}

const STACKS: Stack[] = [
    {
        id: 'fat-loss',
        letter: 'A',
        title: 'Fat Loss',
        icon: <Flame className="w-5 h-5" strokeWidth={1.5} />,
        peptides: ['Tirzepatide', 'Tesamorelin', 'MOTS-C'],
        synergy: 'Triple-threat approach — appetite control, targeted fat burning, and metabolic optimization. Designed for serious fat loss with sustainable, lasting results.',
        duration: '12–16 weeks (with 4-week assessment break)',
        frequency: [
            'Tirzepatide: Weekly SC injection',
            'Tesamorelin: Daily, 5 days on / 2 off',
            'MOTS-C: 2–3× per week',
        ],
        timing: 'Morning, fasted state preferred',
        dosingConcept: 'Start low, titrate slowly over 4–8 weeks. Let your body adjust first.',
        cycle: '12 weeks on → 4 weeks off → reassess',
        tableHeaders: ['Phase', 'Period', 'Tirzepatide', 'Tesamorelin', 'MOTS-C'],
        phases: [
            { phase: 'Phase 1', period: 'Weeks 1–4', columns: ['2.5 mg/week SC (starting dose)', '1 mg/day, 5 on / 2 off', '5 mg × 2×/week'] },
            { phase: 'Phase 2', period: 'Weeks 5–8', columns: ['5 mg/week SC (titrate if tolerated)', '1–2 mg/day, 5 on / 2 off', '5 mg × 3×/week'] },
            { phase: 'Phase 3', period: 'Weeks 9–12', columns: ['5–10 mg/week SC (maintenance)', '2 mg/day, 5 on / 2 off', '10 mg × 2–3×/week'] },
            { phase: 'Phase 4', period: 'Weeks 13–16', columns: ['Maintain or taper; reassess', 'Continue or reduce frequency', 'Based on metabolic response'] },
            { phase: 'Off-cycle', period: '4 Weeks', columns: ['Rest, labs check, reassess before next cycle', '—', '—'] },
        ],
        note: 'Start at the lowest dose — let your body adjust first. Never rush dose titration. If nausea or GI symptoms occur, hold the current dose until resolved before titrating.',
    },
    {
        id: 'muscle',
        letter: 'B',
        title: 'Muscle Building',
        icon: <Dumbbell className="w-5 h-5" strokeWidth={1.5} />,
        peptides: ['CJC-1295', 'Ipamorelin', 'BPC-157'],
        synergy: 'Build more, recover faster. This stack maximizes the anabolic window while keeping joints and tendons resilient.',
        duration: '8–12 weeks',
        frequency: [
            'CJC-1295 + Ipamorelin: 5 days on / 2 off',
            'BPC-157: Daily or 5×/week',
        ],
        timing: 'CJC / Ipamorelin: pre-sleep, aligned with natural GH pulse. BPC-157: morning or post-workout.',
        dosingConcept: 'Consistency is key. GH peptides need time — patience and consistency equal transformation.',
        cycle: '8 weeks on → 4 weeks off',
        tableHeaders: ['Phase', 'Period', 'CJC-1295 + Ipamorelin', 'BPC-157'],
        phases: [
            { phase: 'Phase 1', period: 'Weeks 1–4', columns: ['100 mcg + 100 mcg nightly (pre-sleep)', 'Low dose daily (250–500 mcg)'] },
            { phase: 'Phase 2', period: 'Weeks 5–8', columns: ['200 mcg + 200 mcg nightly', 'Maintenance daily or 5×/week'] },
            { phase: 'Phase 3', period: 'Weeks 9–12', columns: ['200–300 mcg + 200–300 mcg nightly', 'Daily; taper to 3×/week if no injury'] },
            { phase: 'Off-cycle', period: '4 Weeks', columns: ['Rest — assess IGF-1, body composition, sleep', '—'] },
        ],
        note: 'GH peptides require consistent use over weeks to show full effect. Inject pre-sleep to align with your natural GH pulse.',
    },
    {
        id: 'recovery',
        letter: 'C',
        title: 'Recovery',
        icon: <Pill className="w-5 h-5" strokeWidth={1.5} />,
        peptides: ['BPC-157', 'TB-500', 'GHK-CU'],
        synergy: 'A full-body repair system. Ideal for athletes with chronic injuries, post-surgery support, or anyone who trains hard.',
        duration: '4–8 weeks (acute) or 12 weeks (chronic)',
        frequency: [
            'BPC-157: Daily',
            'TB-500: 2×/week loading, then 1×/week maintenance',
            'GHK-CU: 3×/week',
        ],
        timing: 'BPC-157: morning · TB-500: any time · GHK-CU: evening',
        dosingConcept: 'You cannot rush healing — give your body the time it needs. Recovery is continuous.',
        cycle: 'Up to 16 weeks for chronic conditions',
        tableHeaders: ['Phase', 'Period', 'BPC-157', 'TB-500', 'GHK-CU'],
        phases: [
            { phase: 'Loading', period: 'Weeks 1–2', columns: ['Daily (higher frequency)', '2×/week (loading)', 'Every other day'] },
            { phase: 'Active', period: 'Weeks 3–6', columns: ['Daily (consistent healing)', '1×/week (maintenance)', '3×/week'] },
            { phase: 'Maintenance', period: 'Weeks 7–12', columns: ['5×/week (taper frequency)', '1×/week ongoing', '3×/week ongoing'] },
            { phase: 'Extended', period: 'Weeks 13–16', columns: ['Chronic only — physician supervision', '—', '—'] },
        ],
        note: 'Loading phase ensures tissue saturation. Taper frequency (not dose) as injury resolves. Always report changes to your physician.',
    },
    {
        id: 'longevity',
        letter: 'D',
        title: 'Longevity',
        icon: <Sparkles className="w-5 h-5" strokeWidth={1.5} />,
        peptides: ['NAD+', 'Epitalon', 'MOTS-C'],
        synergy: 'The ultimate anti-aging protocol. Target aging at the cellular, genetic, and metabolic level for vitality and resilience.',
        duration: 'Seasonal cycles · 12 weeks, 2–3× per year',
        frequency: [
            'NAD+: 2–3×/week',
            'Epitalon: Once daily × 10 days, twice yearly',
            'MOTS-C: 2–3×/week',
        ],
        timing: 'NAD+: morning · Epitalon: evening · MOTS-C: pre-workout or morning',
        dosingConcept: 'Longevity protocols are a long game. This is not a one-time thing — it is a lifestyle upgrade.',
        cycle: '10-day Epitalon blast 2×/year · NAD+ and MOTS-C quarterly cycles',
        tableHeaders: ['Phase', 'Period', 'NAD+', 'Epitalon', 'MOTS-C'],
        phases: [
            { phase: 'Phase 1', period: 'Weeks 1–4', columns: ['250 mg × 2×/week', '5 mg/day × 10 days (blast)', '5 mg × 2×/week'] },
            { phase: 'Phase 2', period: 'Weeks 5–8', columns: ['500 mg × 2×/week', 'Rest period', '5 mg × 3×/week'] },
            { phase: 'Phase 3', period: 'Weeks 9–12', columns: ['500–1,000 mg × 2–3×/week', '2nd blast at 6 months', '10 mg × 2–3×/week'] },
            { phase: 'Seasonal', period: 'Repeat 2–3×/year', columns: ['Quarterly cycles', '5 mg × 10 days, 2×/year', 'Quarterly cycles'] },
        ],
        note: 'Longevity stacks are long-game investments — a lifestyle upgrade for a longer, healthier, and more vibrant life.',
    },
    {
        id: 'brain',
        letter: 'E',
        title: 'Brain & Performance',
        icon: <Brain className="w-5 h-5" strokeWidth={1.5} />,
        peptides: ['Semax', 'Selank'],
        synergy: 'Think clearer, stress less. Made for executives, students, creatives, and anyone who needs their mind at its best.',
        duration: '4–8 weeks on, 4 weeks off',
        frequency: [
            'Semax: 1–2× per day, 5 on / 2 off',
            'Selank: 1–2× per day as needed',
        ],
        timing: 'Morning for focus · Selank situationally before stressful events',
        dosingConcept: 'Intranasal administration is common. Effects felt relatively quickly — designed to keep the mind sharp.',
        cycle: '4–6 week cycles',
        tableHeaders: ['Phase', 'Period', 'Semax', 'Selank'],
        phases: [
            { phase: 'Phase 1', period: 'Weeks 1–2', columns: ['1 spray (~100 mcg) once daily (AM)', 'As needed — 1 spray situationally'] },
            { phase: 'Phase 2', period: 'Weeks 3–4', columns: ['1 spray 2×/day (AM + midday), 5 on / 2 off', '1 spray daily or pre-stress'] },
            { phase: 'Phase 3', period: 'Weeks 5–6', columns: ['2 sprays 2×/day if tolerated, 5 on / 2 off', '1–2 sprays as needed; daily for mood'] },
            { phase: 'Off-cycle', period: '4 Weeks', columns: ['Rest — assess clarity, mood, stress response', '—'] },
        ],
        note: 'Start low to assess your individual response. Semax is activating — avoid late-day dosing if it affects sleep. Selank can be used situationally for acute stress.',
    },
];

const ProtocolGuide: React.FC = () => {
    const { cartItems } = useCart();
    const [expandedStack, setExpandedStack] = useState<string | null>('fat-loss');

    const toggleStack = (id: string) => {
        setExpandedStack(expandedStack === id ? null : id);
    };

    const handleBackToHome = () => {
        window.location.href = '/';
    };

    return (
        <div className="min-h-screen bg-cream-light">
            <Header
                cartItemsCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                onCartClick={() => { }}
                onMenuClick={handleBackToHome}
            />

            {/* Hero band */}
            <section className="relative overflow-hidden bg-cream-light border-b border-gold-200">
                <div className="container mx-auto px-4 md:px-8 py-16 md:py-20 max-w-5xl">
                    <button
                        onClick={handleBackToHome}
                        className="group inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-charcoal-500 hover:text-navy-900 transition-colors mb-10"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" strokeWidth={1.8} />
                        Back to Home
                    </button>

                    <div className="max-w-2xl">
                        <span className="block text-[11px] uppercase tracking-[0.32em] text-gold-600 mb-5">
                            Stacks &amp; Protocols
                        </span>
                        <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-normal leading-[0.95] text-navy-900 tracking-tight mb-6">
                            Peptide<br />Protocols
                        </h1>
                        <div className="w-12 h-px bg-gold-500 mb-6" />
                        <p className="text-base md:text-lg text-charcoal-500 font-light leading-relaxed max-w-md">
                            Five goal-based stacks with progressive dosing. For educational purposes only — always consult a licensed physician before starting a protocol.
                        </p>
                    </div>
                </div>
            </section>

            <main className="container mx-auto px-4 md:px-8 py-16 max-w-5xl">

                {/* Guidelines row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-gold-200 border border-gold-200 mb-16">
                    <div className="bg-white p-8">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 border border-gold-300 flex items-center justify-center text-gold-600">
                                <Syringe className="w-4 h-4" strokeWidth={1.5} />
                            </div>
                            <h2 className="font-heading text-xl text-navy-900">Injection Guidelines</h2>
                        </div>
                        <ul className="space-y-3 text-sm text-charcoal-500 font-light leading-relaxed">
                            <li><span className="text-navy-900 font-medium">Reconstitution.</span> Use bacteriostatic water. Add slowly along the vial wall, do not shake.</li>
                            <li><span className="text-navy-900 font-medium">Injection sites.</span> Rotate between abdomen, thigh, and upper arm.</li>
                            <li><span className="text-navy-900 font-medium">Needle size.</span> 29–31 gauge insulin syringes for subcutaneous injections.</li>
                            <li><span className="text-navy-900 font-medium">Timing.</span> Most peptides are best taken on an empty stomach or before bed.</li>
                        </ul>
                    </div>

                    <div className="bg-white p-8">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 border border-gold-300 flex items-center justify-center text-gold-600">
                                <Thermometer className="w-4 h-4" strokeWidth={1.5} />
                            </div>
                            <h2 className="font-heading text-xl text-navy-900">Storage</h2>
                        </div>
                        <dl className="space-y-4 text-sm font-light text-charcoal-500 leading-relaxed">
                            <div>
                                <dt className="text-[11px] uppercase tracking-[0.22em] text-gold-600 mb-1">Lyophilized (Powder)</dt>
                                <dd>Store at −20°C for long-term. Stable at 2–8°C for weeks.</dd>
                            </div>
                            <div>
                                <dt className="text-[11px] uppercase tracking-[0.22em] text-gold-600 mb-1">Reconstituted</dt>
                                <dd>Refrigerate at 2–8°C. Use within 14–28 days depending on peptide.</dd>
                            </div>
                        </dl>
                    </div>
                </div>

                {/* Stacks section header */}
                <div className="text-center mb-12">
                    <span className="block text-[11px] uppercase tracking-[0.32em] text-gold-600 mb-4">The Collection</span>
                    <h2 className="font-heading text-4xl md:text-5xl font-normal text-navy-900 tracking-tight mb-4">
                        Goal-Based Stacks
                    </h2>
                    <div className="w-12 h-px bg-gold-500 mx-auto mb-5" />
                    <p className="text-sm text-charcoal-500 font-light max-w-xl mx-auto">
                        Five synergistic stacks designed for complete transformation. Select a stack to reveal its full protocol.
                    </p>
                </div>

                {/* Stack accordion list */}
                <div className="border border-gold-200 bg-white divide-y divide-gold-200">
                    {STACKS.map((stack) => {
                        const isOpen = expandedStack === stack.id;
                        return (
                            <article key={stack.id}>
                                <button
                                    onClick={() => toggleStack(stack.id)}
                                    className="w-full px-6 md:px-8 py-6 flex items-center justify-between text-left hover:bg-cream-light/60 transition-colors group"
                                >
                                    <div className="flex items-center gap-5 md:gap-6">
                                        <div className={`w-12 h-12 border ${isOpen ? 'border-gold-500 bg-gold-500 text-white' : 'border-gold-300 text-gold-600'} flex items-center justify-center transition-colors`}>
                                            {stack.icon}
                                        </div>
                                        <div>
                                            <span className="block text-[10px] uppercase tracking-[0.32em] text-gold-600 mb-1.5">
                                                Stack {stack.letter}
                                            </span>
                                            <h3 className="font-heading text-2xl md:text-3xl text-navy-900 leading-none mb-2">
                                                {stack.title}
                                            </h3>
                                            <p className="text-[11px] uppercase tracking-[0.22em] text-charcoal-500 font-medium">
                                                {stack.peptides.join(' · ')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="w-9 h-9 border border-navy-900 flex items-center justify-center text-navy-900 group-hover:bg-navy-900 group-hover:text-white transition-colors flex-shrink-0">
                                        {isOpen ? <ChevronUp className="w-4 h-4" strokeWidth={1.8} /> : <ChevronDown className="w-4 h-4" strokeWidth={1.8} />}
                                    </div>
                                </button>

                                {isOpen && (
                                    <div className="px-6 md:px-8 pb-10 pt-2 bg-cream-light/40 border-t border-gold-200">
                                        {/* Synergy callout */}
                                        <div className="my-8 max-w-3xl">
                                            <span className="block text-[10px] uppercase tracking-[0.32em] text-gold-600 mb-3">Stack Synergy</span>
                                            <p className="font-heading text-xl md:text-2xl text-navy-900 leading-snug font-normal italic">
                                                &ldquo;{stack.synergy}&rdquo;
                                            </p>
                                        </div>

                                        {/* Key metadata grid */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-gold-200 border border-gold-200 mb-8">
                                            <div className="bg-white p-5">
                                                <p className="text-[10px] uppercase tracking-[0.32em] text-gold-600 mb-2">Duration</p>
                                                <p className="text-sm text-navy-900 leading-snug">{stack.duration}</p>
                                            </div>
                                            <div className="bg-white p-5">
                                                <p className="text-[10px] uppercase tracking-[0.32em] text-gold-600 mb-2">Cycle</p>
                                                <p className="text-sm text-navy-900 leading-snug">{stack.cycle}</p>
                                            </div>
                                            <div className="bg-white p-5">
                                                <p className="text-[10px] uppercase tracking-[0.32em] text-gold-600 mb-2 flex items-center gap-1.5">
                                                    <Clock className="w-3 h-3" strokeWidth={1.8} /> Frequency
                                                </p>
                                                <ul className="text-sm text-navy-900 leading-snug space-y-1">
                                                    {stack.frequency.map((f, i) => <li key={i}>{f}</li>)}
                                                </ul>
                                            </div>
                                            <div className="bg-white p-5">
                                                <p className="text-[10px] uppercase tracking-[0.32em] text-gold-600 mb-2">Timing</p>
                                                <p className="text-sm text-navy-900 leading-snug">{stack.timing}</p>
                                            </div>
                                        </div>

                                        {/* Dosing concept */}
                                        <div className="mb-10 border-l-2 border-gold-500 pl-5 max-w-3xl">
                                            <p className="text-[10px] uppercase tracking-[0.32em] text-gold-600 mb-2">Dosing Concept</p>
                                            <p className="text-base text-charcoal-700 font-light leading-relaxed">{stack.dosingConcept}</p>
                                        </div>

                                        {/* Progressive dosing table */}
                                        <div className="mb-8">
                                            <div className="flex items-baseline justify-between mb-4">
                                                <p className="text-[11px] uppercase tracking-[0.32em] text-navy-900 font-semibold">Progressive Dosing</p>
                                                <p className="text-[10px] uppercase tracking-[0.22em] text-charcoal-500">{stack.phases.length} phases</p>
                                            </div>
                                            <div className="overflow-x-auto border border-gold-200 bg-white">
                                                <table className="min-w-full text-sm">
                                                    <thead className="bg-navy-900 text-white">
                                                        <tr>
                                                            {stack.tableHeaders.map((h, i) => (
                                                                <th key={i} className="px-4 py-3 text-left text-[10px] uppercase tracking-[0.22em] font-semibold whitespace-nowrap">{h}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gold-200">
                                                        {stack.phases.map((row, ri) => (
                                                            <tr key={ri} className="hover:bg-cream-light/50 transition-colors">
                                                                <td className="px-4 py-3 font-medium text-navy-900 whitespace-nowrap">{row.phase}</td>
                                                                <td className="px-4 py-3 text-charcoal-500 whitespace-nowrap font-light">{row.period}</td>
                                                                {row.columns.map((c, ci) => (
                                                                    <td key={ci} className="px-4 py-3 text-charcoal-700 font-light leading-snug">{c}</td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Note */}
                                        <div className="border border-gold-300 bg-gold-50/60 p-5 max-w-3xl">
                                            <p className="text-[10px] uppercase tracking-[0.32em] text-gold-700 font-semibold mb-2">Protocol Note</p>
                                            <p className="text-sm text-charcoal-700 font-light leading-relaxed">{stack.note}</p>
                                        </div>
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </div>

                {/* CTA */}
                <div className="text-center mt-20">
                    <span className="block text-[11px] uppercase tracking-[0.32em] text-gold-600 mb-4">Ready to Begin</span>
                    <h3 className="font-heading text-3xl md:text-4xl text-navy-900 mb-6">Calculate your dose</h3>
                    <a
                        href="/calculator"
                        className="group inline-flex items-center justify-between gap-6 px-8 py-4 bg-navy-900 text-white text-xs font-semibold tracking-[0.22em] uppercase hover:bg-navy-700 transition-all"
                        style={{ borderRadius: '2px' }}
                    >
                        Open Peptide Calculator
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={1.8} />
                    </a>
                </div>

                <p className="text-[11px] uppercase tracking-[0.22em] text-charcoal-400 text-center mt-16 max-w-2xl mx-auto leading-relaxed">
                    Educational purposes only · Dosing must be determined by your prescribing physician · Get baseline labs &amp; monitor every 8–12 weeks
                </p>
            </main>

            <Footer />
        </div>
    );
};

export default ProtocolGuide;
