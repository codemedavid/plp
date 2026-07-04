// Research blog article data for the Peptide Lifestyle Program.
// Ported from the reviewed `blog-data.js` design source. Prose bodies are
// authored as inline-styled, first-party HTML strings (no user input) so the
// article renderer can inject them directly; each carries a curated Sources
// list for E-E-A-T. Table placeholders (__TABLE_*__) are filled at render time
// from the typed `table*` fields by `buildBody` in researchHelpers.ts.

export interface TocItem {
  id: string;
  label: string;
  /** Populated at render time as `#${id}`. */
  href?: string;
}

export interface Faq {
  q: string;
  a: string;
}

export interface TableData {
  head: string[];
  rows: string[][];
}

export interface ProductTie {
  name: string;
  detail: string;
}

export interface Article {
  slug: string;
  category: string;
  title: string;
  dek: string;
  metaDescription: string;
  keywords: string;
  readMins: number;
  /** ISO date, e.g. "2026-06-18". */
  date: string;
  dateLabel: string;
  featured: boolean;
  toc: TocItem[];
  body: string;
  tableUses?: TableData;
  tableStorage?: TableData;
  tableMech?: TableData;
  tableResults?: TableData;
  tableDosing?: TableData;
  tableGlance?: TableData;
  tableWhich?: TableData;
  faqs: Faq[];
  sources: string[];
  related: string[];
  productTie: ProductTie;
}

export interface Author {
  name: string;
  role: string;
  bio: string;
}

export const AUTHOR: Author = {
  name: 'PLP Research Team',
  role: 'Clinical & Regulatory Research',
  bio: 'The PLP Research Team reviews peer-reviewed literature, FDA filings, and manufacturer trial data to produce educational summaries. Content is for informational purposes only and is not medical advice.',
};

export const REVIEWER = 'Medically reviewed against published clinical-trial data';

export const ARTICLES: Article[] = [
  {
    slug: 'complete-peptide-guide',
    category: 'Peptide Science',
    title:
      'The Complete Peptide Guide: What They Are, How They Work, and What to Know Before Starting',
    dek: 'From GLP-1 drugs like Ozempic and Mounjaro to healing compounds like BPC-157, peptides have moved from niche forums to mainstream medicine. Here is the science, the safety, and the legal landscape — in plain English.',
    metaDescription:
      'A complete, evidence-based guide to peptides: what they are, how they work in the body, safety, legality, administration, storage, cost, and how to source responsibly.',
    keywords:
      'peptides, what are peptides, peptide therapy, GLP-1, BPC-157, peptide safety, peptide guide',
    readMins: 14,
    date: '2026-06-18',
    dateLabel: 'June 18, 2026',
    featured: true,
    toc: [
      { id: 'what-are-peptides', label: 'What are peptides?' },
      { id: 'how-they-work', label: 'How they work in the body' },
      { id: 'uses', label: 'What peptides are used for' },
      { id: 'safety', label: 'Are peptides safe?' },
      { id: 'legality', label: 'Legality & FDA status' },
      { id: 'administration', label: "How they're administered" },
      { id: 'storage', label: 'Storage & handling' },
      { id: 'choosing', label: 'Choosing the right peptide' },
      { id: 'sourcing', label: 'Sourcing responsibly' },
      { id: 'faq', label: 'Frequently asked questions' },
    ],
    body: `
<p><strong>Peptides are reshaping how we think about medicine, recovery, and weight loss.</strong> Whether you are curious about faster injury recovery, muscle growth, fat loss, or simply want to understand what these molecules actually do, this guide covers the science, the safety questions that matter, and how to navigate the legal landscape.</p>

<h2 id="what-are-peptides">What are peptides?</h2>
<p>Peptides are short chains of amino acids — the same building blocks that make up proteins in your body. Think of them as miniature messengers that tell your cells what to do. Naturally occurring peptides regulate countless processes, from controlling blood sugar and inflammation to signaling tissue repair. Insulin is a peptide. So is oxytocin. When your gut releases GLP-1 after a meal to signal fullness, that is a peptide doing its job.</p>
<p>Scientists have learned to create synthetic peptides that mimic or enhance these natural functions. These lab-made versions form the foundation of peptide therapy — a field that spans FDA-approved medications for diabetes and obesity, experimental compounds for tissue healing, and research chemicals sold online. The difference between an FDA-approved drug and an unregulated research chemical is enormous.</p>
<h3>Peptides vs. proteins</h3>
<p>Peptides typically contain 2–50 amino acids, while proteins comprise 50 or more, often folding into complex three-dimensional structures. Peptides are smaller and act more like targeted chemical messages than structural building blocks. Because they are smaller, they can be chemically synthesized rather than grown in living cells, and they tend to be more selective. Their shorter chains also make them less stable, which is why most therapeutic peptides require injection rather than oral dosing.</p>

<h2 id="how-they-work">How do peptides work in the body?</h2>
<p>Most peptides exert their effects through receptor binding. A peptide circulates through the bloodstream, finds its target receptor on a cell surface, and triggers an intracellular signaling cascade. A growth hormone secretagogue does not flood your body with synthetic growth hormone — it signals your pituitary to produce more of your own, in its natural pulsatile rhythm.</p>
<p>Not all peptides follow this single-receptor model. BPC-157 acts through multiple mechanisms simultaneously without a single defined receptor. GHK-Cu influences over 4,000 genes primarily through copper transport. Some peptides are precise receptor keys; others operate through broader signaling networks.</p>
<h3>Half-life and bioavailability</h3>
<p>Two factors determine how any peptide behaves: half-life and bioavailability. Native GLP-1 has a half-life of about 2 minutes; semaglutide, the engineered analog in Ozempic and Wegovy, lasts roughly 7 days. Half-life determines dosing frequency and the steadiness of effect. Bioavailability is the second factor — most peptides cannot survive the digestive system intact, which is why the vast majority are given by subcutaneous injection.</p>

<h2 id="uses">What are peptides used for?</h2>
<p>The therapeutic applications span a remarkably wide range. Understanding the major categories clarifies which peptides might be relevant for specific goals.</p>
__TABLE_USES__
<h3>The GLP-1 revolution</h3>
<p>The most visible peptide success story is the GLP-1 receptor agonist class. Tirzepatide, a dual GIP/GLP-1 agonist, produced mean weight loss of <strong>20.9% at 72 weeks</strong> in clinical trials. Retatrutide, a triple agonist adding glucagon receptor activation, achieved <strong>28.3% weight loss</strong> in Phase 3 trials. These results have fundamentally changed how medicine approaches metabolic disease.</p>

<h2 id="safety">Are peptides safe?</h2>
<p>Safety depends entirely on which peptide you are discussing and how it is sourced. FDA-approved peptide drugs, prescribed under medical supervision, have established safety profiles from extensive clinical trials. The most common adverse effects are gastrointestinal — nausea, vomiting, diarrhea, constipation — typically mild to moderate during dose escalation.</p>
<p>The picture changes dramatically for unregulated peptides purchased online. Independent testing of research-grade peptides has found purity levels ranging from below 50% to over 100% of the stated concentration, plus bacterial endotoxin contamination and incorrect sequences. A patient injecting a compound of unknown purity at an unknown concentration is running an uncontrolled experiment on their own tissue.</p>
<h3>Who should not use peptides?</h3>
<p>GLP-1 receptor agonists carry warnings for people with a personal or family history of medullary thyroid carcinoma or Multiple Endocrine Neoplasia syndrome type 2. Those with a pancreatitis history should avoid them. Pregnant or breastfeeding people should not use unregulated peptides. Anyone with active cancer should avoid growth-hormone-stimulating peptides. Peptide use should always be discussed with a healthcare provider.</p>

<h2 id="legality">Are peptides legal and FDA-approved?</h2>
<p>Some peptides are fully FDA-approved pharmaceutical drugs; others exist in regulatory gray zones; still others are explicitly illegal for human use. More than 80 peptide drugs are available clinically today, beginning with insulin in the 1920s. Recent approvals include semaglutide for type 2 diabetes (2017) and obesity (2021), and tirzepatide for diabetes (2022) and obesity (2023).</p>
<p>Most peptides discussed in fitness and wellness contexts — BPC-157, TB-500, MOTS-c, CJC-1295 — remain unapproved and are frequently sold as "research chemicals" labeled "not for human consumption." That phrase is a legal disclaimer, not a quality certification. Research-grade peptides are not manufactured to pharmaceutical standards and lack purity verification, sterility assurance, and quality control.</p>

<h2 id="administration">How are peptides administered?</h2>
<h3>Subcutaneous injection (most common)</h3>
<p>The vast majority of therapeutic peptides are administered via subcutaneous injection — small needles into the fatty tissue just beneath the skin, bypassing the digestive system. Common sites include the abdomen (avoiding one inch around the navel), the front of the thighs, and the upper outer arms. Rotating sites prevents irritation and ensures consistent absorption.</p>
<h3>Oral and other routes</h3>
<p>Oral delivery has historically been limited by digestive degradation, but oral semaglutide (Rybelsus) uses an absorption enhancer to overcome the gastrointestinal barrier. Some peptides work topically (GHK-Cu in serums); nasal sprays and transdermal patches are emerging routes for select compounds.</p>

<h2 id="storage">Peptide storage and handling</h2>
<p>Lyophilized (freeze-dried) peptides are relatively stable and should be stored in a freezer at -20°C for long-term preservation. Once reconstituted with bacteriostatic water, peptides become far more vulnerable to degradation. Reconstitution uses bacteriostatic water (0.9% benzyl alcohol) injected slowly against the vial wall — never shake a vial, as mechanical stress can denature the structure.</p>
__TABLE_STORAGE__

<h2 id="choosing">How to choose the right peptide for your goals</h2>
<p>Selecting a peptide requires matching specific, evidence-based goals with compounds that have documented mechanisms and safety data. Begin with one compound to assess your individual response before adding others — each additional peptide increases complexity, cost, and the difficulty of identifying which compound is responsible for any effect. FDA-approved peptides like semaglutide and tirzepatide are designed for continuous, long-term use rather than cycling.</p>

<h2 id="sourcing">How to verify quality and source responsibly</h2>
<p>Sourcing is arguably the most important decision you will make. Reputable sources should provide Certificates of Analysis (CoA) for every batch, verifying identity, purity (typically claimed at &gt;98–99%), and the absence of contaminants — via third-party HPLC and mass spectrometry, not in-house claims. Be wary of dramatic efficacy claims, prices that seem too good to be true, missing testing documentation, or names mimicking pharmaceutical brands.</p>
`,
    tableUses: {
      head: ['Category', 'Examples', 'Primary use', 'Status'],
      rows: [
        [
          'GLP-1 / GIP agonists',
          'Semaglutide, Tirzepatide, Retatrutide',
          'Weight loss, type 2 diabetes',
          'FDA-approved / Investigational',
        ],
        [
          'GH secretagogues',
          'CJC-1295, Ipamorelin, Sermorelin',
          'GH optimization, recovery',
          'Prescription; off-label',
        ],
        [
          'Healing peptides',
          'BPC-157, TB-500',
          'Tissue repair, tendon recovery',
          'Research / unregulated',
        ],
        ['Copper peptides', 'GHK-Cu', 'Skin repair, collagen, anti-aging', 'Topical skincare'],
        ['Mitochondrial peptides', 'MOTS-c', 'Metabolic health, longevity', 'Research only'],
      ],
    },
    tableStorage: {
      head: ['Storage condition', 'Lyophilized powder', 'Reconstituted solution'],
      rows: [
        ['Freezer (-20°C)', 'Stable for months to years', 'Not recommended'],
        ['Refrigerator (2–8°C)', 'Stable for weeks', '14–28 days'],
        ['Room temperature', 'Avoid', 'Avoid; degrades rapidly'],
      ],
    },
    faqs: [
      {
        q: 'Are peptide injections painful?',
        a: 'Subcutaneous injections using small-gauge needles (28–31 gauge) cause minimal discomfort for most people. The abdomen is generally the least sensitive site, and letting the medication reach room temperature reduces stinging.',
      },
      {
        q: 'Can beginners use peptides safely?',
        a: 'Beginners should start with FDA-approved peptides under medical supervision rather than experimental research compounds. Start with one compound, understand your response, and add complexity only when justified by clear goals.',
      },
      {
        q: 'How long does it take to see results?',
        a: 'It varies by peptide. GLP-1 weight-loss medications typically show appetite suppression within days, with measurable weight loss beginning in weeks 2–4 and accelerating through months 3–6.',
      },
      {
        q: 'Will I regain weight if I stop taking GLP-1 peptides?',
        a: 'Clinical data show weight commonly returns after stopping, typically about two-thirds of lost weight within a year. This reflects the chronic nature of obesity; sustainable management usually requires ongoing treatment plus lifestyle change.',
      },
    ],
    sources: [
      'U.S. Food & Drug Administration — Peptide drug products and compounding guidance',
      'New England Journal of Medicine — GLP-1 receptor agonist clinical trials',
      'Eli Lilly & Company — SURMOUNT trial program data',
    ],
    related: ['tirzepatide-faq', 'retatrutide-faq', 'tirzepatide-vs-retatrutide'],
    productTie: { name: 'PLP Slim 2.0', detail: 'Tirzepatide 30mg + Cagrilintide 5mg' },
  },

  {
    slug: 'tirzepatide-faq',
    category: 'GLP-1 Medications',
    title: 'Tirzepatide Complete FAQ: Dosage, Weight-Loss Results, Side Effects & More',
    dek: 'Sold as Mounjaro and Zepbound, this once-weekly injection has helped patients lose an average of up to 20.9% of body weight in clinical trials. Here is every aspect of tirzepatide therapy, from mechanism to real-world results.',
    metaDescription:
      'Complete tirzepatide FAQ: how it works, dosing and titration schedule, expected weight-loss results, side effects, cost, contraindications, and drug interactions.',
    keywords:
      'tirzepatide, Mounjaro, Zepbound, tirzepatide dosage, tirzepatide weight loss, tirzepatide side effects',
    readMins: 11,
    date: '2026-06-24',
    dateLabel: 'June 24, 2026',
    featured: false,
    toc: [
      { id: 'what-is', label: 'What is tirzepatide?' },
      { id: 'how-works', label: 'How does it work?' },
      { id: 'results', label: 'How much weight can I lose?' },
      { id: 'dosing', label: 'Dosing & administration' },
      { id: 'cost', label: 'How much does it cost?' },
      { id: 'contraindications', label: 'Who should not take it?' },
      { id: 'faq', label: 'Frequently asked questions' },
    ],
    body: `
<p><strong>Tirzepatide has emerged as one of the most effective weight-loss medications ever developed.</strong> Sold as Mounjaro for type 2 diabetes and Zepbound for weight management, this once-weekly injection has helped patients lose an average of up to 20.9% of body weight in clinical trials.</p>

<h2 id="what-is">What is tirzepatide?</h2>
<p>Tirzepatide is a dual-action peptide that activates two hormone receptors simultaneously: glucose-dependent insulinotropic polypeptide (GIP) and glucagon-like peptide-1 (GLP-1). Both are natural gut hormones released after eating that regulate blood sugar, insulin secretion, and appetite. By mimicking both, tirzepatide delivers more powerful metabolic effects than single-target medications like semaglutide.</p>
<p>Developed by Eli Lilly, it was first approved in May 2022 as <strong>Mounjaro</strong> for type 2 diabetes, then in November 2023 as <strong>Zepbound</strong> for chronic weight management. The active ingredient is identical; the brand names reflect distinct FDA-approved indications.</p>

<h2 id="how-works">How does tirzepatide work?</h2>
<p>The GLP-1 component slows gastric emptying — food stays in the stomach longer, creating physical fullness — and acts on brain appetite centers, dampening the "food noise" many people with obesity experience. The GIP component adds satiety signaling and enhances insulin sensitivity. It stimulates glucose-dependent insulin secretion (only when blood sugar is elevated, minimizing hypoglycemia risk) and suppresses glucagon.</p>
__TABLE_MECH__

<h2 id="results">How much weight can I lose?</h2>
<p>In the landmark SURMOUNT-1 trial, participants without type 2 diabetes achieved mean weight loss of 15.0% at 5 mg, 19.5% at 10 mg, and 20.9% at 15 mg over 72 weeks, versus 3.1% with placebo. The SURMOUNT-5 head-to-head trial found tirzepatide produced a mean <strong>20.2% weight loss versus 13.7% for semaglutide</strong>.</p>
__TABLE_RESULTS__
<p>Individual results vary with starting weight, adherence, diet, and activity. Weight loss typically begins within the first 2–4 weeks, accelerates through months 3–6, and continues gradually beyond month 12.</p>

<h2 id="dosing">Tirzepatide dosing and administration</h2>
<p>Tirzepatide follows a gradual titration protocol designed to minimize gastrointestinal side effects, increasing the dose every 4 weeks until reaching the maintenance dose.</p>
__TABLE_DOSING__

<h2 id="cost">How much does tirzepatide cost?</h2>
<p>The LillyDirect self-pay program is the most affordable cash-pay option, with vials starting at $299/month for the 2.5 mg dose and ranging to $499 for 15 mg. Manufacturer savings cards reduce copays to as low as $25 for commercially insured patients, though these programs exclude government insurance.</p>

<h2 id="contraindications">Who should not take tirzepatide?</h2>
<p>Tirzepatide is contraindicated in people with a personal or family history of medullary thyroid carcinoma, those with Multiple Endocrine Neoplasia syndrome type 2 (MEN2), anyone with a prior serious hypersensitivity reaction, and during pregnancy. Use caution with a history of pancreatitis, gallbladder disease, or severe kidney disease.</p>
`,
    tableMech: {
      head: ['Mechanism', 'Effect'],
      rows: [
        ['Slowed gastric emptying', 'Prolonged satiety, reduced meal frequency'],
        ['Central appetite suppression', 'Reduced cravings, lower caloric intake'],
        ['Enhanced insulin secretion', 'Improved glucose control (diabetes patients)'],
        ['Glucagon suppression', 'Reduced hepatic glucose production'],
        ['Blood pressure reduction', 'Decreased cardiovascular risk'],
      ],
    },
    tableResults: {
      head: ['Dose', 'Mean weight loss (72 wks)', 'Achieving ≥15% loss'],
      rows: [
        ['5 mg', '15.0%', '~35%'],
        ['10 mg', '19.5%', '~50%'],
        ['15 mg', '20.9%', '~56%'],
        ['Semaglutide 2.4 mg', '13.7%', '~45%'],
      ],
    },
    tableDosing: {
      head: ['Week', 'Dose', 'Purpose'],
      rows: [
        ['1–4', '2.5 mg', 'Initiation; acclimation'],
        ['5–8', '5 mg', 'Initial therapeutic dose'],
        ['9–12', '7.5 mg', 'Gradual escalation'],
        ['13–16', '10 mg', 'Intermediate dose'],
        ['17+', '12.5–15 mg', 'Target maintenance dose'],
      ],
    },
    faqs: [
      {
        q: 'How is tirzepatide different from Ozempic?',
        a: 'Semaglutide (Ozempic/Wegovy) targets only the GLP-1 receptor. Tirzepatide adds GIP receptor activation, which enhances insulin sensitivity and satiety — producing superior weight loss in head-to-head trials (20.2% vs 13.7%).',
      },
      {
        q: 'What happens if I miss a dose?',
        a: 'For once-weekly tirzepatide, if fewer than 4 days have passed, take it as soon as you remember. If 4 or more days have elapsed, skip it and resume your regular schedule. Never take two doses within 72 hours.',
      },
      {
        q: 'Can non-diabetics and diabetics both use it?',
        a: 'Yes. Zepbound is approved for weight management regardless of diabetes status; Mounjaro is approved for type 2 diabetes. Weight loss tends to be somewhat greater in non-diabetic patients.',
      },
      {
        q: 'Will I regain weight if I stop?',
        a: 'Patients typically regain about two-thirds of lost weight within a year of discontinuation. The medication works while you take it; long-term maintenance strategies should be planned with your provider.',
      },
    ],
    sources: [
      'SURMOUNT-1 and SURMOUNT-5 trial publications',
      'FDA prescribing information — Mounjaro & Zepbound',
      'Eli Lilly LillyDirect pricing program',
    ],
    related: ['retatrutide-faq', 'tirzepatide-vs-retatrutide', 'complete-peptide-guide'],
    productTie: { name: 'PLP Slim 2.0', detail: 'Tirzepatide 30mg + Cagrilintide 5mg' },
  },

  {
    slug: 'retatrutide-faq',
    category: 'GLP-1 Medications',
    title: 'Retatrutide: The Complete FAQ on the Triple-Agonist Weight-Loss Drug',
    dek: 'The most powerful weight-loss drug ever tested in large-scale trials. In TRIUMPH-1, participants lost an average of 28.3% of body weight — with nearly half achieving at least 30% loss, a threshold once associated only with bariatric surgery.',
    metaDescription:
      "Everything known about retatrutide, Eli Lilly's investigational triple-agonist: how it works, TRIUMPH trial results, side effects, expected FDA approval timeline, and storage.",
    keywords:
      'retatrutide, triple agonist, retatrutide weight loss, TRIUMPH-1, retatrutide FDA approval, LY3437943',
    readMins: 10,
    date: '2026-06-29',
    dateLabel: 'June 29, 2026',
    featured: false,
    toc: [
      { id: 'what-is', label: 'What is retatrutide?' },
      { id: 'how-works', label: 'How does it work?' },
      { id: 'results', label: 'Clinical trial results' },
      { id: 'timeline', label: 'FDA approval timeline' },
      { id: 'storage', label: 'How is it stored?' },
      { id: 'faq', label: 'Frequently asked questions' },
    ],
    body: `
<p><strong>Retatrutide is the most powerful weight-loss drug ever tested in large-scale clinical trials.</strong> In the pivotal TRIUMPH-1 Phase 3 study, participants lost an average of 28.3% of body weight, with nearly half achieving at least 30% loss — a threshold previously associated only with bariatric surgery.</p>

<h2 id="what-is">What is retatrutide?</h2>
<p>Retatrutide (development code LY3437943) is an investigational peptide from Eli Lilly. It is a <strong>triple hormone receptor agonist</strong>, simultaneously activating GLP-1, GIP, and glucagon receptors. Semaglutide targets only GLP-1; tirzepatide targets GLP-1 and GIP; retatrutide adds glucagon receptor activation, creating synergistic effects on appetite, energy expenditure, and fat metabolism. It is a once-weekly subcutaneous injection with a half-life of about 6 days.</p>

<h2 id="how-works">How does retatrutide work?</h2>
<p>The GLP-1 component suppresses appetite and slows gastric emptying. The GIP component enhances insulin sensitivity and amplifies satiety. The glucagon component is what truly differentiates it — glucagon receptor agonism increases <strong>energy expenditure</strong> and promotes <strong>hepatic fatty acid oxidation</strong>, meaning the liver burns stored fat for fuel, while reducing new fat synthesis. These effects operate independently of reduced caloric intake.</p>
__TABLE_MECH__

<h2 id="results">Retatrutide clinical trial results</h2>
<p>The Phase 2 trial (NEJM 2023) enrolled 338 adults with obesity. At the 12 mg dose, mean weight loss reached 24.2% at 48 weeks — and participants were still losing weight when the trial ended, with no plateau observed. The pivotal Phase 3 TRIUMPH-1 trial extended these findings in 2,339 adults over 80 weeks.</p>
__TABLE_RESULTS__
<p>Beyond weight, Phase 3 data showed roughly 73% improvement in knee osteoarthritis pain, 61% improvement in sleep apnea, and up to 86% liver-fat reduction.</p>

<h2 id="timeline">FDA approval timeline</h2>
<p>Retatrutide remains investigational and is <strong>18–24 months from potential FDA approval</strong>, with launch expected around 2027–2028. The active-comparator SURMOUNT-5 / TRIUMPH-5 head-to-head study against tirzepatide is expected to report in December 2026. For patients who need treatment today, semaglutide and tirzepatide remain excellent FDA-approved options.</p>

<h2 id="storage">How should retatrutide be stored?</h2>
<p>While final instructions await approval, retatrutide will almost certainly follow other GLP-1 peptides: refrigeration at 2–8°C, protection from light in original packaging, and no freezing. Based on precedent, room-temperature storage for up to 21 days during travel will likely be acceptable.</p>
`,
    tableMech: {
      head: ['Receptor', 'Primary effects', 'Contribution to weight loss'],
      rows: [
        [
          'GLP-1',
          'Appetite suppression, slowed gastric emptying',
          'Reduced caloric intake',
        ],
        ['GIP', 'Enhanced insulin sensitivity, amplified satiety', 'Metabolic optimization'],
        [
          'Glucagon',
          'Increased energy expenditure, hepatic fat oxidation',
          'Elevated calorie burn, direct fat loss',
        ],
      ],
    },
    tableResults: {
      head: ['Dose', 'Mean weight loss', 'Trial'],
      rows: [
        ['1 mg', '8.7%', 'Phase 2 (48 wks)'],
        ['4 mg', '17.1%', 'Phase 2 (48 wks)'],
        ['8 mg', '22.8%', 'Phase 2 (48 wks)'],
        ['12 mg', '24.2%', 'Phase 2 (48 wks)'],
        ['Max dose', '28.3%', 'TRIUMPH-1 (80 wks)'],
      ],
    },
    faqs: [
      {
        q: 'How is retatrutide different from tirzepatide?',
        a: 'Tirzepatide is a dual GLP-1/GIP agonist. Retatrutide adds a third target — glucagon — which increases energy expenditure and directly burns hepatic fat, driving greater average weight loss (28.3% vs 20.9%).',
      },
      {
        q: 'When will retatrutide be available?',
        a: 'It remains in Phase 3 trials and is roughly 18–24 months from potential FDA approval, with launch expected around 2027–2028.',
      },
      {
        q: 'Can you switch from tirzepatide to retatrutide?',
        a: 'No published studies examine the transition yet. Clinical judgment would suggest starting retatrutide at a lower dose regardless of prior tirzepatide tolerance, since glucagon activation introduces new pharmacology.',
      },
      {
        q: 'What are the main side effects?',
        a: 'Gastrointestinal effects (nausea, vomiting, diarrhea) are more frequent than with predecessor drugs. Trials also noted a novel dose-related dysesthesia signal and modest heart-rate increases that require further characterization.',
      },
    ],
    sources: [
      'Jastreboff et al., New England Journal of Medicine (2023) — Phase 2',
      'TRIUMPH-1 Phase 3 trial results (2026)',
      'Eli Lilly investigational pipeline disclosures',
    ],
    related: ['tirzepatide-vs-retatrutide', 'tirzepatide-faq', 'complete-peptide-guide'],
    productTie: { name: 'PLP Slim 2.0', detail: 'Tirzepatide 30mg + Cagrilintide 5mg' },
  },

  {
    slug: 'tirzepatide-vs-retatrutide',
    category: 'Comparisons',
    title: 'Tirzepatide vs Retatrutide: The Complete Comparison for Weight Loss',
    dek: "Both are made by Eli Lilly, both target multiple hormone receptors, and both produce results that seemed impossible a decade ago. But one is available today and the other won't reach pharmacies until 2027–2028. Here's how they compare.",
    metaDescription:
      'Tirzepatide vs retatrutide compared head to head: mechanism, weight-loss efficacy, side effects, cost, availability, and which is better for your goals.',
    keywords:
      'tirzepatide vs retatrutide, retatrutide vs tirzepatide, dual vs triple agonist, best weight loss peptide',
    readMins: 9,
    date: '2026-07-02',
    dateLabel: 'July 2, 2026',
    featured: false,
    toc: [
      { id: 'glance', label: 'At a glance' },
      { id: 'mechanism', label: 'Mechanism of action' },
      { id: 'efficacy', label: 'Weight-loss efficacy' },
      { id: 'which', label: 'Which is better for you?' },
      { id: 'faq', label: 'Frequently asked questions' },
    ],
    body: `
<p><strong>Choosing between tirzepatide and retatrutide is becoming one of the most important decisions in obesity treatment.</strong> Tirzepatide is FDA-approved and available today, backed by years of real-world safety data. Retatrutide is still in Phase 3 trials, produces even greater weight loss, but won't reach pharmacies until 2027 or 2028.</p>

<h2 id="glance">At a glance</h2>
__TABLE_GLANCE__

<h2 id="mechanism">Mechanism of action: two receptors vs three</h2>
<p>Tirzepatide activates GLP-1 and GIP receptors. Retatrutide adds a third — <strong>glucagon</strong> — which increases energy expenditure, stimulates hepatic fat oxidation, and reduces new fat synthesis. While tirzepatide primarily works by helping patients eat less, retatrutide helps patients eat less <em>and</em> burn more. This "metabolic advantage" explains the roughly 6–8 percentage-point gap in weight loss between the two drugs.</p>

<h2 id="efficacy">Weight-loss efficacy</h2>
<p>As of mid-2026, no published head-to-head randomized trial directly compares the two; the SURMOUNT-5 active-comparator study is expected to report in December 2026. Cross-trial comparison shows tirzepatide at roughly 20.9% and retatrutide at 28.3% mean weight loss — a directional difference large enough to appear robust despite methodological caveats.</p>

<h2 id="which">Which is better for your goals?</h2>
<p>The "better" drug depends entirely on individual circumstances, priorities, and constraints.</p>
__TABLE_WHICH__
`,
    tableGlance: {
      head: ['Feature', 'Tirzepatide', 'Retatrutide'],
      rows: [
        ['Mechanism', 'Dual: GLP-1 + GIP', 'Triple: GLP-1 + GIP + Glucagon'],
        ['FDA status', 'Approved (2022 / 2023)', 'Investigational; ~2027–2028'],
        ['Mean weight loss', '20.9% (72 wks)', '28.3% (80 wks)'],
        ['Pounds lost (avg)', '~56 lbs', '~70 lbs'],
        ['Dosing', 'Once weekly', 'Once weekly (trials)'],
        ['Monthly cost', '$299–$1,112', 'Not yet priced'],
      ],
    },
    tableWhich: {
      head: ['Your situation', 'Recommended', 'Rationale'],
      rows: [
        ['Need treatment now', 'Tirzepatide', 'Retatrutide not yet available'],
        ['Maximum weight loss', 'Retatrutide (when available)', '28.3% vs 20.9% average'],
        ['Prioritize tolerability', 'Tirzepatide', 'Lower GI discontinuation rates'],
        [
          'Severe fatty liver (MASLD)',
          'Retatrutide (when available)',
          '82–86% liver-fat reduction',
        ],
        ['Budget-conscious', 'Tirzepatide', 'LillyDirect $299/mo; savings cards'],
      ],
    },
    faqs: [
      {
        q: 'Is retatrutide better than tirzepatide?',
        a: 'Retatrutide produces greater average weight loss (28.3% vs 20.9%) but has a more challenging side-effect profile and is not yet approved. Tirzepatide is the proven, available option with excellent tolerability.',
      },
      {
        q: 'Can I switch from tirzepatide to retatrutide later?',
        a: "Starting tirzepatide now does not preclude switching later if retatrutide's approval proceeds. The drugs share enough mechanistic overlap that experience with one likely informs tolerance of the other.",
      },
      {
        q: 'Are both drugs made by the same company?',
        a: 'Yes — both tirzepatide and retatrutide are developed by Eli Lilly, which will likely position them for different clinical scenarios.',
      },
    ],
    sources: [
      'SURMOUNT and TRIUMPH trial programs',
      'FDA prescribing information — tirzepatide',
      'Eli Lilly comparative pipeline data',
    ],
    related: ['tirzepatide-faq', 'retatrutide-faq', 'complete-peptide-guide'],
    productTie: { name: 'PLP Slim 2.0', detail: 'Tirzepatide 30mg + Cagrilintide 5mg' },
  },
];
