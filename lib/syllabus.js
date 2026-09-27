/* Key knowledge for each subject, one entry per thing you can be tested on,
   grouped by the study design's areas of study. Wording is condensed from the
   VCAA study designs (Methods 2023–27, Physics 2024–27, English 2024–, Indonesian SL
   2020–, Applied Computing 2025–); the Methods list is docs/methods-concepts.md.

   IDs are permanent: evidence records point at them. Rename freely, never re-id.
   exam (Methods only): 1 tech-free, 2 tech-active, "1/2" both. */

const C = (sub, area) => (id, name, exam = null) => ({ id, sub, area, name, exam });

/* ---------------- Mathematical Methods ---------------- */
const mmF = C("mm", "AOS 1 · Functions & graphs");
const mmT = C("mm", "AOS 1 · Transformations");
const mmA = C("mm", "AOS 2 · Algebra, number & structure");
const mmD = C("mm", "AOS 3 · Differentiation");
const mmI = C("mm", "AOS 3 · Integration");
const mmR = C("mm", "AOS 4 · Discrete random variables");
const mmC = C("mm", "AOS 4 · Continuous random variables");
const mmS = C("mm", "AOS 4 · Statistical inference");
const mmX = C("mm", "Exam skills");
const MM = [
  mmF("mm.fn.domain", "Domain (maximal/implied), co-domain, range & notation", "1/2"),
  mmF("mm.fn.poly_graph", "Polynomial graphs up to degree 4 by hand", "1/2"),
  mmF("mm.fn.power", "Power functions xⁿ, n ∈ Q, with asymptotes", "1/2"),
  mmF("mm.fn.exp_log_graph", "Exponential & logarithmic graphs", "1/2"),
  mmF("mm.fn.circ_graph", "sin, cos & tan graphs: amplitude, period, asymptotes", "1/2"),
  mmF("mm.fn.hybrid", "Hybrid (piecewise) functions, continuity at joins", "1/2"),
  mmF("mm.fn.sum_product", "Sum, difference & product graphs", 2),
  mmF("mm.fn.modelling", "Modelling with functions; finding parameters", 2),
  mmT("mm.tr.apply", "Applying dilations, reflections & translations", "1/2"),
  mmT("mm.tr.find", "Finding a transformation / mapping (x,y)→(x′,y′) and its inverse", "1/2"),
  mmT("mm.tr.families", "Families of functions: one parameter, number of solutions", 2),
  mmA("mm.alg.poly_solve", "Polynomial equations: factor theorem, division", 1),
  mmA("mm.alg.laws", "Index & logarithm laws", 1),
  mmA("mm.alg.exp_log_eq", "Exponential & log equations (reject invalid roots)", 1),
  mmA("mm.alg.circ_eq", "Circular equations over an interval; general solutions", "1/2"),
  mmA("mm.alg.composite", "Composite functions: existence (ran g ⊆ dom f), rule & domain", "1/2"),
  mmA("mm.alg.inverse", "Inverse functions: existence, domain restriction, f = f⁻¹ points", "1/2"),
  mmA("mm.alg.literal", "Literal equations & general solutions with a parameter", "1/2"),
  mmA("mm.alg.sim_eq", "Simultaneous linear equations: unique, none, infinite", 2),
  mmA("mm.alg.func_eq", "Functional equations, e.g. f(x+y) = f(x)f(y)", "1/2"),
  mmA("mm.alg.newton", "Numerical solutions & Newton's method", 2),
  mmD("mm.diff.limits", "Limits, continuity & differentiability", "1/2"),
  mmD("mm.diff.standard", "Standard derivatives: xⁿ, eˣ, logₑx, sin, cos, tan", 1),
  mmD("mm.diff.chain", "Chain rule by hand", 1),
  mmD("mm.diff.product", "Product rule by hand", 1),
  mmD("mm.diff.quotient", "Quotient rule by hand", 1),
  mmD("mm.diff.tangent", "Tangents & normals", "1/2"),
  mmD("mm.diff.stationary", "Stationary points, inflection, strictly increasing/decreasing", "1/2"),
  mmD("mm.diff.graph_deriv", "Graph of f′ from f, and of an antiderivative from f", "1/2"),
  mmD("mm.diff.optimise", "Optimisation, including endpoint max/min", 2),
  mmD("mm.diff.rates", "Average & instantaneous rates of change", "1/2"),
  mmI("mm.int.standard", "Standard antiderivatives incl. (ax+b)ⁿ, e^kx, 1/(ax+b), sin, cos", 1),
  mmI("mm.int.recognition", "Antidifferentiation by recognition (\"hence find\")", 1),
  mmI("mm.int.definite", "Definite integrals, properties & the fundamental theorem", "1/2"),
  mmI("mm.int.area_axis", "Area under a curve (split at roots)", "1/2"),
  mmI("mm.int.area_between", "Area between curves", 2),
  mmI("mm.int.average", "Average value of a function", "1/2"),
  mmI("mm.int.numerical", "Trapezium rule approximation", "1/2"),
  mmI("mm.int.accumulate", "Function from a rate of change + boundary condition", 2),
  mmR("mm.dp.conditional", "Conditional probability & independence", "1/2"),
  mmR("mm.dp.pmf", "Discrete distributions: tables, pmfs, unknowns", "1/2"),
  mmR("mm.dp.expect", "Mean, variance & sd of a discrete RV (incl. aX+b)", "1/2"),
  mmR("mm.dp.binomial", "Bernoulli trials & the binomial distribution", "1/2"),
  mmR("mm.dp.binomial_n", "Binomial: finding n or p", 2),
  mmC("mm.cp.pdf", "Constructing & validating pdfs, finding constants", "1/2"),
  mmC("mm.cp.prob", "Probabilities from a pdf, incl. conditional", "1/2"),
  mmC("mm.cp.summary", "Mean, variance, median & percentiles from a pdf", 2),
  mmC("mm.cp.normal", "Normal distribution, standardising, 68–95–99.7", "1/2"),
  mmC("mm.cp.inv_normal", "Inverse normal: finding x, μ or σ", 2),
  mmC("mm.cp.normal_cond", "Normal conditional probability", 2),
  mmS("mm.st.param", "Population parameter vs sample statistic", "1/2"),
  mmS("mm.st.phat", "Sample proportion P̂: distribution, mean & sd", "1/2"),
  mmS("mm.st.phat_normal", "Normal approximation for P̂ (large samples)", 2),
  mmS("mm.st.ci", "Approximate confidence interval for p (incl. 95%, z ≈ 1.96)", 2),
  mmS("mm.st.margin", "Margin of error & sample size", 2),
  mmS("mm.st.interpret", "Interpreting intervals & variation between samples", "1/2"),
  mmS("mm.st.simulate", "Simulating random sampling", 2),
  mmX("mm.x.exact_values", "Exact values & the unit circle", 1),
  mmX("mm.x.algebra", "By-hand algebra fluency (no slips)", 1),
  mmX("mm.x.show_that", "\"Show that\" & \"hence\" working", 1),
  mmX("mm.x.cas", "CAS fluency: define, solve with domains, exact vs decimal", 2),
  mmX("mm.x.pseudocode", "Algorithms & pseudocode (sequencing, decisions, loops)", 2),
];

/* ---------------- Physics ---------------- */
const pM = C("phy", "U3 AOS 1 · Motion");
const pF = C("phy", "U3 AOS 2 · Fields");
const pG = C("phy", "U3 AOS 3 · Electricity generation");
const pL = C("phy", "U4 AOS 1 · Light & matter");
const pR = C("phy", "U4 AOS 1 · Special relativity");
const pI = C("phy", "U4 AOS 2 · Scientific investigation");
const PHY = [
  pM("phy.mot.newton", "Newton's three laws, coplanar forces in 1D & 2D"),
  pM("phy.mot.circ_h", "Horizontal circular motion: roads, banked tracks, strings"),
  pM("phy.mot.circ_v", "Vertical circular motion (top & bottom only)"),
  pM("phy.mot.projectile", "Projectile motion; air resistance qualitatively"),
  pM("phy.mot.momentum", "Momentum conservation & impulse FΔt = mΔv"),
  pM("phy.mot.work", "Work = Fd and area under F–x graphs"),
  pM("phy.mot.energy", "Energy transformations; elastic vs inelastic collisions"),
  pM("phy.mot.spring", "Springs: Hooke's law, Es = ½kx²"),
  pM("phy.mot.gpe", "Gravitational PE: mgΔh and area under force/field graphs"),
  pF("phy.fld.models", "Field models compared: gravitational, electric, magnetic"),
  pF("phy.fld.point", "Point mass & charge fields: direction, shape, inverse square"),
  pF("phy.fld.magnetic", "Magnetic fields of magnets, wires, loops & solenoids"),
  pF("phy.fld.efield", "Electric fields: E = kQ/r², F = qE, W = qV, E = V/d"),
  pF("phy.fld.qvb", "Charges in magnetic fields: F = qvB, radius of path"),
  pF("phy.fld.gravity", "Gravitation: g = GM/r², F = Gm₁m₂/r²"),
  pF("phy.fld.satellites", "Satellites: a = v²/r = 4π²r/T², normal force & apparent weight"),
  pF("phy.fld.conductor", "Force on a current-carrying conductor: F = nIlB"),
  pF("phy.fld.motor", "DC motors: split-ring commutator, torque factors"),
  pF("phy.fld.accelerator", "Particle accelerators & synchrotrons"),
  pG("phy.gen.flux", "Magnetic flux Φ = B⊥A and angle effects"),
  pG("phy.gen.emf", "Induced emf ε = −NΔΦ/Δt and its direction (Lenz)"),
  pG("phy.gen.generators", "DC generators vs alternators: commutators vs slip rings"),
  pG("phy.gen.pv", "Photovoltaic cells & inverters"),
  pG("phy.gen.ac", "Sinusoidal AC: period, frequency, peak & peak-to-peak"),
  pG("phy.gen.rms", "RMS vs equivalent DC"),
  pG("phy.gen.transformer", "Ideal transformers: N₁/N₂ = V₁/V₂ = I₂/I₁"),
  pG("phy.gen.transmission", "Transmission losses & why lines step voltage up"),
  pL("phy.lm.em_wave", "Light as a transverse EM wave; c in a vacuum"),
  pL("phy.lm.standing", "Standing waves (nodes at both ends)"),
  pL("phy.lm.diffraction", "Diffraction & the λ/w ratio"),
  pL("phy.lm.young", "Young's double slit: path difference, Δx = λL/d"),
  pL("phy.lm.photon", "Photon energy E = hf = hc/λ, in J and eV"),
  pL("phy.lm.photoelectric", "Photoelectric effect: graphs, Ek max = hf − φ, intensity, wave-model limits"),
  pL("phy.lm.matter_waves", "Electron diffraction & de Broglie λ = h/p"),
  pL("phy.lm.momentum", "Photon vs matter momentum p = h/λ"),
  pL("phy.lm.spectra", "Emission & absorption spectra, energy levels"),
  pL("phy.lm.duality", "Quantisation & single photon/electron double slit"),
  pR("phy.sr.postulates", "Einstein's postulates & the limits of classical mechanics"),
  pR("phy.sr.mm", "Michelson–Morley null result"),
  pR("phy.sr.proper", "Proper time & proper length"),
  pR("phy.sr.dilation", "Time dilation & length contraction with γ"),
  pR("phy.sr.examples", "Muons, accelerators & GPS"),
  pR("phy.sr.energy", "E = γmc², Ek = (γ − 1)mc²; Sun, annihilation"),
  pI("phy.inv.design", "Investigation design: variables, methodology, safety & ethics"),
  pI("phy.inv.data", "Accuracy, precision, repeatability, reproducibility, resolution, validity; error vs uncertainty"),
  pI("phy.inv.analysis", "Linearising data, gradient meaning, uncertainty bars"),
  pI("phy.inv.evidence", "Evidence for or against a hypothesis, model or theory"),
  pI("phy.inv.comms", "Science communication: sig figs, units, poster conventions"),
];

/* ---------------- English ---------------- */
const eA = C("eng", "Section A · Analytical response to a text");
const eB = C("eng", "Section B · Creating a text");
const eC = C("eng", "Section C · Analysis of argument & language");
const eS = C("eng", "SAC-only skills");
const ENG = [
  eA("eng.a.sunset", "Sunset Boulevard: ideas, concerns & values"),
  eA("eng.a.memory", "The Memory Police: ideas, concerns & values"),
  eA("eng.a.dynamics", "Characters, relationships, settings, plot & point of view"),
  eA("eng.a.construction", "How the author builds meaning: vocabulary, structure, language/film features"),
  eA("eng.a.context", "Historical context and social & cultural values"),
  eA("eng.a.evidence", "Metalanguage and integrating evidence"),
  eA("eng.a.prompts", "Unpacking prompts (idea, character, \"how\", quote-based)"),
  eB("eng.b.idea", "Framework of Ideas: Writing about protest (mentor texts)"),
  eB("eng.b.purpose", "Purpose, context & audience shaping your writing"),
  eB("eng.b.form", "Text types & modes"),
  eB("eng.b.craft", "Vocabulary, structure & language features in your own writing"),
  eB("eng.b.stimulus", "Using the exam's stimulus material"),
  eC("eng.c.contention", "Contention, arguments & structure"),
  eC("eng.c.language", "Language & techniques used to position the audience"),
  eC("eng.c.visuals", "Visuals and other modes"),
  eC("eng.c.context", "Context, author identity & audience reaction"),
  eC("eng.c.rebuttal", "Rebuttal & counter-argument"),
  eC("eng.c.metalanguage", "Analytical metalanguage for persuasion"),
  eS("eng.x.sae", "Syntax, punctuation & spelling of Standard Australian English"),
  eS("eng.x.timing", "Three pieces in three hours"),
  eS("eng.s.commentary", "Commentary explaining writing decisions"),
  eS("eng.s.oral", "Point-of-view oral presentation"),
];

/* ---------------- Software Development ---------------- */
const sP = C("sd", "U3 AOS 1 · Programming");
const sA = C("sd", "U3 AOS 2 · Analysis & design");
const sD = C("sd", "U4 AOS 1 · Development & evaluation");
const sC = C("sd", "U4 AOS 2 · Cyber security");
const SD = [
  sP("sd.p.ai", "AI in programming: prompts, automated debugging, optimisation, ethics"),
  sP("sd.p.requirements", "Functional & non-functional requirements, constraints, scope"),
  sP("sd.p.design_tools", "Design tools: data dictionaries, mock-ups, object descriptions, IPO charts, pseudocode"),
  sP("sd.p.types", "Data types: text, numeric, Boolean"),
  sP("sd.p.structures", "Data structures: 1D & 2D arrays, records"),
  sP("sd.p.sources", "Data sources: TXT, CSV, XML"),
  sP("sd.p.oop", "OOP: abstraction, encapsulation, generalisation, inheritance"),
  sP("sd.p.language", "Language features: scope, constants, control structures, operators, GUIs, methods, classes"),
  sP("sd.p.naming", "Naming conventions: Hungarian, camel, snake"),
  sP("sd.p.validation", "Validation: existence, type, range"),
  sP("sd.p.docs", "Internal documentation & stubs"),
  sP("sd.p.sort", "Sorting: selection sort, quick sort"),
  sP("sd.p.search", "Searching: linear & binary"),
  sP("sd.p.errors", "Errors: syntax, logic, runtime"),
  sP("sd.p.testing", "Debugging & testing: breakpoints, test data, testing tables"),
  sA("sd.a.reasons", "Why organisations develop software"),
  sA("sd.a.brief", "Features of a brief"),
  sA("sd.a.gantt", "Gantt charts: dependencies, milestones, critical path"),
  sA("sd.a.collect", "Data collection: interviews, observations, surveys, reports"),
  sA("sd.a.constraints", "Constraints (economic, legal, social, technical) & scope"),
  sA("sd.a.diagrams", "Context diagrams, Level 1 DFDs, use case diagrams"),
  sA("sd.a.srs", "Software requirements specifications"),
  sA("sd.a.law", "Copyright Act, Privacy Act APPs, PDP Act IPPs"),
  sA("sd.a.files", "File management: naming, version control, backups, security, disposal"),
  sA("sd.a.ideation", "Ideation: mood boards, brainstorming, mind maps, sketches"),
  sA("sd.a.criteria", "Evaluation criteria; efficiency vs effectiveness"),
  sA("sd.a.ux", "UX: affordance, interoperability, security, usability"),
  sA("sd.a.ui", "UI design principles: alignment, balance, contrast, space, navigation"),
  sD("sd.d.efficient", "Efficient & effective solutions"),
  sD("sd.d.access", "Access modifiers: public, protected, private"),
  sD("sd.d.approaches", "Code repositories, APIs & libraries, AI assistants"),
  sD("sd.d.alpha", "Alpha testing techniques"),
  sD("sd.d.beta", "Beta testing: plans, scenarios, recording results"),
  sD("sd.d.evaluation", "Evaluation strategies: criteria, time frame, responsibility"),
  sD("sd.d.project", "Project plans: scope creep, adjustments, assessing effectiveness"),
  sC("sd.c.goals", "Organisational goals; in-house vs external development"),
  sC("sd.c.vulns", "Vulnerabilities: APIs, malware, patching, IAM, MITM, insiders, third parties"),
  sC("sd.c.controls", "Security controls: repos, IAM, encryption, code review, separate environments"),
  sC("sd.c.threat", "Threat modelling"),
  sC("sd.c.law", "Essential Eight, ISM, Privacy Act, PDP Act, Copyright Act"),
  sC("sd.c.ethics", "Ethical issues: security practices, AI, IP & copyright"),
  sC("sd.c.mitigation", "Mitigation, developer training & risk management plans"),
  sC("sd.c.criteria", "Criteria for evaluating secure development practices"),
];

/* ---------------- Indonesian Second Language ---------------- */
const iO = C("ind", "Oral exam");
const iW = C("ind", "Written exam");
const iS = C("ind", "SAC outcomes");
const iL = C("ind", "Language");
const IND = [
  iO("ind.o.conversation", "Section 1: Conversation (~7 min)"),
  iO("ind.o.discussion", "Section 2: Discussion (~8 min)"),
  iO("ind.o.delivery", "Pronunciation, intonation, stress & turn-taking"),
  iW("ind.w.listening", "Section 1: Listening & responding"),
  iW("ind.w.reading", "Section 2: Reading (and listening) & responding"),
  iW("ind.w.writing", "Section 3: Writing in Indonesian"),
  iS("ind.s.negotiate", "U3 O1: role-play negotiating a personal issue"),
  iS("ind.s.interpret", "Interpreting texts & writing responses (U3 O2, U4 O2)"),
  iS("ind.s.creative", "U3 O3: personal, informative or imaginative writing"),
  iS("ind.s.interview", "U4 O1: interview on a cultural product or practice"),
  iS("ind.s.persuasive", "U4 O3: evaluative or persuasive writing"),
  iL("ind.l.vocab", "Vocabulary across the three themes"),
  iL("ind.l.grammar", "Grammar: affixes, passive & object-focus, time markers"),
  iL("ind.l.register", "Register & forms of address"),
  iL("ind.l.texttypes", "Text types & their conventions"),
  iL("ind.l.speech", "Direct & reported speech"),
  iL("ind.l.culture", "Cultural products, practices & perspectives"),
];

export const SEED_CONCEPTS = [...MM, ...PHY, ...ENG, ...SD, ...IND].map((c, i) => ({ ...c, order: i, retired: false }));

/* ============================== STATUS ============================== */
/* 0 Untouched · 1 Shaky · 2 Okay · 3 Solid.
   Solid needs all of: 3+ correct attempts, from 2+ sources, the latest attempt
   correct, the last correct within 28 days, and (Methods Exam-1 content) one
   correct attempt done tech-free. Everything else is graded from the evidence,
   weighted by how it was marked. `missing` says exactly what's in the way of Solid. */
export const LEVELS = ["Untouched", "Shaky", "Okay", "Solid"];
const MARK_W = { teacher: 1, solutions: 0.8, self: 0.5, unmarked: 0.3 };
const OUT_V = { correct: 1, partial: 0.5, wrong: 0 };
export const SOLID_RULE = { correct: 3, sources: 2, days: 28 };

export function conceptStatus(concept, evidence, today = new Date()) {
  const evs = [...evidence].sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.id || "").localeCompare(b.id || ""));
  if (!evs.length) return { level: 0, n: 0, correct: 0, partial: 0, wrong: 0, missing: ["no attempts yet"] };
  const correct = evs.filter((e) => e.outcome === "correct");
  const last = evs[evs.length - 1];
  const lastCorrect = correct[correct.length - 1];
  const ageDays = (d) => (d ? Math.floor((today - new Date(d + "T00:00:00")) / 86400000) : Infinity);
  let tw = 0, tv = 0;
  for (const e of evs) { const w = MARK_W[e.marking] ?? 0.3; tw += w; tv += w * (OUT_V[e.outcome] ?? 0); }
  const score = tv / tw;

  const missing = [];
  if (correct.length < SOLID_RULE.correct) missing.push(`${SOLID_RULE.correct - correct.length} more correct`);
  const sources = new Set(correct.map((e) => e.source || "?"));
  if (sources.size < SOLID_RULE.sources) missing.push("a correct attempt from a second source");
  if (last.outcome !== "correct") missing.push("the latest attempt was " + last.outcome);
  const age = lastCorrect ? ageDays(lastCorrect.date) : Infinity;
  if (lastCorrect && age > SOLID_RULE.days) missing.push(`last correct ${age} days ago`);
  const needsTechFree = concept.exam === 1 || concept.exam === "1/2";
  if (needsTechFree && !correct.some((e) => e.exam === 1)) missing.push("a correct tech-free (Exam 1) attempt");

  const level = missing.length === 0 ? 3
    : last.outcome !== "wrong" && score >= 0.6 ? 2
    : 1;
  return {
    level, n: evs.length, score, missing, last, age: ageDays(last.date),
    correct: correct.length,
    partial: evs.filter((e) => e.outcome === "partial").length,
    wrong: evs.filter((e) => e.outcome === "wrong").length,
  };
}
