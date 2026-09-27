/* VCAA data: study-design weights, exam specifications, the 2025 grade
   distributions, a study-score estimate built on them, and the past-paper list.
   Sources (all vcaa.vic.edu.au, checked September 2026):
     study designs      Methods 2023–27, Physics U3&4 2024–27, English U3&4 from 2024,
                        Indonesian SL U3&4 from 2020, Applied Computing U3&4 from 2025
     exam specs         <subject>-specs-w.docx on each subject's past-exams page
     grade distributions  "2025 Grade distributions for VCE graded assessments"
     past papers        each subject's "past examinations and reports" page */

/* McKinnon SC, from its published 2025 results. Moderation lines your SAC rank up
   against how your school's cohort does on the exam, so the school's standing matters. */
export const SCHOOL_DEFAULT = { name: "McKinnon SC", medianSS: 33, sd: 6 };

/* ============================== WEIGHTS ============================== */
/* % of the study score, keyed by subject + SAC name. Applied by "Load VCAA weights".
   Where a study design fixes marks per task, the weight is those marks scaled to the
   unit's share; splits inside a single outcome (Methods U3, SD modules) are school choices. */
export const VCAA_WEIGHTS = {
  /* Physics: U3 30% = three outcomes at 40/120; U4 20% = O1 and O2 at 40/80 (school splits O1 into 4a + 4b) */
  phy: { "SAC 1: Motion": 10, "SAC 2: Fields": 10, "SAC 3: Electricity": 10,
         "SAC 4a: Light & Matter": 5, "SAC 4b: Special Relativity": 5,
         "SAC 5: Scientific Investigation": 10,
         "Motion": 10, "Fields": 10, "SAC 3": 10, "SAC 4 (final SAC)": 10 },
  /* Methods: U3 application task 20%, U4 two modelling/problem-solving tasks 10% each */
  mm:  { "Functions (Part A)": 7.8, "Application (Part B1)": 6.2, "Application (Part B2)": 6,
         "Calculus (Part 1)": 5, "Calculus (Part 2)": 5, "Probability": 10 },
  /* English: U3 = text analysis 40 + creating text 40 + commentary 20 (of 100) → 10 / 10 / 5.
              U4 = text analysis 40 + argument analysis 40 + oral 20 → 10 / 10 / 5. */
  eng: { "Sunset Boulevard": 10, "Protest": 10, "Commentary": 5,
         "Memory Police": 10, "Argument Analysis": 10, "Oral Presentation": 5 },
  /* Indonesian SL: each unit 25% = O1 20 + O2 15 + O3 15 marks (of 50) */
  ind: { "O1 Interpersonal": 10, "O2 Interpretive": 7.5, "O3 Presentational": 7.5 },
  /* Software Development: U3 SAC 10, SAT 30, U4 SAC 10; module split is the school's */
  sd:  { "Mod 1": 1.6, "Mod 2": 2.2, "Mod 3": 2.4, "Mod 4": 3.8,
         "AC1": 0, "AC2": 0, "AC3": 0, "AC4": 0, "AC5": 0,
         "SAT submission": 30, "SAT submission (30%)": 30, "U4 SAC": 10 },
};

export const VCAA_EXAM_WEIGHTS = {
  eng: { "Exam": 50 },
  mm:  { "Exam 1": 20, "Exam 2": 40 },
  phy: { "Exam": 50 },
  ind: { "Oral": 12.5, "Written": 37.5 },
  sd:  { "Exam": 50 },
};

/* Marks and writing time, from the VCAA examination specifications. */
export const EXAM_SPECS = {
  mm:  { "Exam 1": { marks: 40, mins: 60 }, "Exam 2": { marks: 80, mins: 120 } },
  phy: { "Exam": { marks: 120, mins: 150 } },
  eng: { "Exam": { marks: 60, mins: 180 } },
  sd:  { "Exam": { marks: 100, mins: 120 } },
  ind: { "Oral": { marks: 40, mins: 15 }, "Written": { marks: 75, mins: 120 } },
};
export const examSpec = (subId, examName) => {
  const specs = EXAM_SPECS[subId];
  if (!specs) return null;
  if (specs[examName]) return specs[examName];
  const n = (examName || "").toLowerCase();
  const hit = Object.keys(specs).find((k) => n.includes(k.toLowerCase()) || k.toLowerCase().includes(n));
  return hit ? specs[hit] : Object.keys(specs).length === 1 ? Object.values(specs)[0] : null;
};

/* ============================== GRADE DISTRIBUTIONS ============================== */
/* One entry per VCAA graded assessment (GA). `hi` is the top of each grade's score
   range (UG, E, E+, D, D+, C, C+, B, B+, A, A+) and `n` the number of students in it,
   on VCAA's GA scale out of `max`. `weight` is the GA's share of the study score.
   `from` says which of your marks feed it. */
export const GRADED = {
  mm: [
    { id: "sac", label: "Coursework", weight: 40, from: { units: [3, 4] }, max: 100,
      hi: [9, 20, 34, 42, 50, 59, 68, 76, 83, 90, 100], n: [93, 220, 1105, 1290, 1758, 2365, 2708, 2247, 1801, 1498, 1254] },
    { id: "e1", label: "Exam 1", weight: 20, from: { exam: /1/ }, max: 80,
      hi: [3, 7, 12, 18, 27, 35, 45, 55, 63, 71, 80], n: [331, 387, 683, 815, 1390, 1598, 2341, 2761, 2213, 2081, 1440] },
    { id: "e2", label: "Exam 2", weight: 40, from: { exam: /2/ }, max: 160,
      hi: [15, 23, 33, 44, 56, 71, 86, 103, 120, 139, 160], n: [205, 333, 670, 999, 1302, 1861, 2308, 2558, 2294, 2031, 1483] },
  ],
  phy: [
    { id: "u3", label: "Unit 3 SACs", weight: 30, from: { units: [3] }, max: 120,
      hi: [9, 19, 36, 47, 58, 69, 82, 93, 102, 110, 120], n: [22, 30, 297, 511, 809, 1021, 1359, 1297, 1083, 903, 608] },
    { id: "u4", label: "Unit 4 SACs", weight: 20, from: { units: [4] }, max: 80,
      hi: [7, 15, 18, 26, 34, 40, 47, 55, 64, 72, 80], n: [10, 20, 9, 87, 409, 590, 951, 1290, 1660, 1542, 1173] },
    { id: "ex", label: "Exam", weight: 50, from: { exam: /./ }, max: 240,
      hi: [15, 24, 42, 62, 88, 114, 142, 167, 188, 207, 240], n: [54, 86, 254, 471, 827, 1000, 1194, 1128, 1034, 899, 747] },
  ],
  eng: [
    { id: "u3", label: "Unit 3 SACs", weight: 25, from: { units: [3] }, max: 100,
      hi: [9, 16, 22, 31, 44, 53, 60, 67, 74, 83, 100], n: [41, 54, 83, 366, 2408, 5321, 7124, 8265, 7162, 6661, 5213] },
    { id: "u4", label: "Unit 4 SACs", weight: 25, from: { units: [4] }, max: 100,
      hi: [9, 16, 22, 34, 46, 53, 59, 65, 73, 83, 100], n: [16, 18, 48, 441, 2677, 4146, 5687, 6740, 8327, 7417, 5396] },
    { id: "ex", label: "Exam", weight: 50, from: { exam: /./ }, max: 60,
      hi: [2, 5, 8, 17, 23, 27, 31, 35, 39, 44, 60], n: [32, 34, 74, 939, 3291, 5475, 7990, 8106, 6606, 5076, 3145] },
  ],
  ind: [
    { id: "u3", label: "Unit 3 SACs", weight: 25, from: { units: [3] }, max: 50,
      hi: [2, 4, 9, 14, 19, 26, 30, 34, 40, 46, 50], n: [0, 0, 0, 0, 2, 16, 46, 72, 109, 102, 41] },
    { id: "u4", label: "Unit 4 SACs", weight: 25, from: { units: [4] }, max: 50,
      hi: [4, 9, 14, 19, 24, 28, 32, 35, 40, 46, 50], n: [0, 0, 0, 4, 7, 31, 51, 57, 93, 94, 46] },
    /* One GA for oral + written together; a single grade is awarded. */
    { id: "ex", label: "Oral + written", weight: 50, from: { exam: /./ }, max: 400,
      hi: [19, 39, 48, 77, 106, 129, 168, 210, 263, 318, 400], n: [0, 1, 1, 5, 8, 27, 54, 73, 93, 84, 39] },
  ],
  sd: [
    { id: "sac", label: "Coursework", weight: 20, from: { units: [3, 4], sat: false }, max: 200,
      hi: [19, 51, 78, 92, 106, 120, 133, 147, 164, 180, 200], n: [13, 24, 51, 69, 120, 196, 225, 281, 292, 266, 232] },
    { id: "sat", label: "SAT", weight: 30, from: { units: [3, 4], sat: true }, max: 100,
      hi: [9, 18, 28, 40, 50, 58, 65, 72, 81, 93, 100], n: [22, 18, 36, 96, 166, 198, 224, 235, 274, 313, 188] },
    { id: "ex", label: "Exam", weight: 50, from: { exam: /./ }, max: 200,
      hi: [19, 37, 54, 67, 81, 93, 106, 118, 131, 145, 200], n: [5, 32, 84, 128, 196, 235, 255, 233, 218, 187, 140] },
  ],
};
export const GRADED_YEAR = 2025;

/* ============================== MATHS ============================== */
/* Inverse normal CDF (Acklam): percentile -> z-score */
export function probit(p) {
  if (p <= 0) return -4; if (p >= 1) return 4;
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
  const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
  const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
  const pl = 0.02425; let q, r;
  if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - pl) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  q = p - 0.5; r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}
/* Normal CDF (Abramowitz & Stegun 7.1.26) */
export function phi(z) {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

/* Where a GA score sits in the state: share of students below it, spreading each
   grade band's students evenly across its score range. */
function percentileIn(ga, score) {
  const N = ga.n.reduce((a, x) => a + x, 0);
  let below = 0, lo = 0;
  for (let i = 0; i < ga.hi.length; i++) {
    const hi = ga.hi[i], width = hi - lo + 1;
    if (score <= hi) {
      const frac = Math.min(1, Math.max(0, (score - lo + 0.5) / width));
      const p = (below + ga.n[i] * frac) / N;
      return Math.min(1 - 0.5 / N, Math.max(0.5 / N, p));
    }
    below += ga.n[i]; lo = hi + 1;
  }
  return 1 - 0.5 / N;
}
/* The reverse: the GA score at a given state percentile. */
function scoreAt(ga, p) {
  const N = ga.n.reduce((a, x) => a + x, 0), target = p * N;
  let below = 0, lo = 0;
  for (let i = 0; i < ga.hi.length; i++) {
    const hi = ga.hi[i];
    if (ga.n[i] > 0 && below + ga.n[i] >= target) {
      const frac = (target - below) / ga.n[i];
      return Math.min(ga.max, Math.max(0, lo + frac * (hi - lo + 1) - 0.5));
    }
    below += ga.n[i]; lo = hi + 1;
  }
  return ga.max;
}

/* ============================== STUDY SCORE ESTIMATE ============================== */
/* How it works, per graded assessment:
     coursework  your school rank, pushed through the school's standing in the state
                 (that is what moderation does), or failing that your SAC % against the
                 state's moderated coursework distribution
     exam        your % against the state's exam distribution
   Each gives a z-score. Parts you don't have marks for yet are predicted from the
   parts you do, pulled towards average (RHO) because SAC standing doesn't carry
   fully into the exam. The weighted z's combine into a study score on the VCAA
   scale (mean 30, SD 7). */
export const RHO = 0.7;

const isMarked = (x) => x.mark !== null && x.mark !== undefined && x.total;
const isSat = (s) => /\bSAT\b/i.test(s.name || "") || (s.weight || 0) >= 20;

export function rankZ(rank, cohort, school = SCHOOL_DEFAULT) {
  if (!rank || !cohort || rank < 1 || rank > cohort) return null;
  const zSchool = probit(1 - (rank - 0.5) / cohort);
  return (school.medianSS - 30) / 7 + (school.sd / 7) * zSchool;
}
export const rankProblem = (s) =>
  (s.rank || s.cohort) && !(s.rank >= 1 && s.cohort >= 1 && s.rank <= s.cohort)
    ? (s.rank > s.cohort ? "rank is bigger than the cohort" : "needs both rank and cohort") : null;

/* Your % on one GA, from whatever is marked. null if nothing is. */
function gaPct(sub, ga) {
  const f = ga.from;
  if (f.units) {
    const sacs = f.units.flatMap((u) => sub.units?.[u] || [])
      .filter((s) => f.sat === undefined || isSat(s) === f.sat)
      .filter((s) => s.weight !== 0);
    const done = sacs.filter(isMarked);
    if (!done.length) return null;
    const useW = done.every((s) => s.weight);
    const w = (s) => (useW ? s.weight : s.total);
    const tw = done.reduce((a, s) => a + w(s), 0);
    const allW = sacs.every((s) => s.weight) ? sacs.reduce((a, s) => a + s.weight, 0) : null;
    return { pct: done.reduce((a, s) => a + w(s) * (s.mark / s.total), 0) / tw,
             done: done.length, of: sacs.length, share: allW ? tw / allW : done.length / sacs.length };
  }
  const exams = (sub.exams || []).filter((x) => f.exam.test(x.name || ""));
  const done = exams.filter(isMarked);
  if (!done.length) return null;
  const w = (x) => x.weight || examSpec(sub.id, x.name)?.marks || x.total;
  const tw = done.reduce((a, x) => a + w(x), 0);
  return { pct: done.reduce((a, x) => a + w(x) * (x.mark / x.total), 0) / tw,
           done: done.length, of: exams.length, share: done.length / exams.length };
}

export function estimateSS(sub, school = SCHOOL_DEFAULT) {
  const gas = GRADED[sub.id];
  if (!gas || sub.completed) return null;
  const rz = rankZ(sub.rank, sub.cohort, school);
  const parts = gas.map((ga) => {
    const w = ga.weight / 100, isExam = !ga.from.units;
    const mine = gaPct(sub, ga);
    if (!isExam && rz !== null)
      return { ...ga, w, z: rz, pct: mine?.pct ?? null, src: "rank", mine };
    if (mine) return { ...ga, w, z: probit(percentileIn(ga, mine.pct * ga.max)), pct: mine.pct, src: "marks", mine };
    return { ...ga, w, z: null, pct: null, src: "predicted", mine: null };
  });
  const known = parts.filter((p) => p.z !== null);
  if (!known.length) return null;
  const kw = known.reduce((a, p) => a + p.w, 0);
  const zBar = known.reduce((a, p) => a + p.w * p.z, 0) / kw;
  for (const p of parts) if (p.z === null) p.z = RHO * zBar;

  let D = 0;
  for (const a of parts) for (const b of parts) D += a.w * b.w * (a === b ? 1 : RHO);
  D = Math.sqrt(D);
  const Z = parts.reduce((a, p) => a + p.w * p.z, 0) / D;
  const ss = Math.max(0, Math.min(50, 30 + 7 * Z));

  /* What the still-unmarked exams need for a target study score (all at the same state percentile). */
  const open = parts.filter((p) => p.src === "predicted" && !p.from.units);
  const openCourse = parts.some((p) => p.src === "predicted" && p.from.units);
  const need = (target) => {
    if (!open.length || openCourse) return null;
    const A = parts.filter((p) => !open.includes(p)).reduce((a, p) => a + p.w * p.z, 0);
    const Wo = open.reduce((a, p) => a + p.w, 0);
    const ze = (((target - 30) / 7) * D - A) / Wo;
    const pz = phi(ze);
    return open.map((p) => ({
      label: p.label,
      pct: pz > 0.999 ? null : scoreAt(p, pz) / p.max,
      impossible: pz > 0.999,
    }));
  };

  return {
    ss: Math.round(ss * 10) / 10, parts, need,
    exams: parts.filter((p) => !p.from.units && p.src === "marks").length,
    basis: parts.map((p) => `${p.label}: ${p.src === "rank" ? "rank" : p.src === "marks" ? Math.round(p.pct * 100) + "%" : "predicted"}`).join(" · "),
  };
}

/* ============================== PAST PAPERS ============================== */
/* Every paper VCAA lists for each subject, split by study design. The ids are
   derived from subject + provider + name, so they must never change for a paper
   that already exists (ticks are stored against them). */
const P = (sub, provider, name, year, current, kind) => {
  const spec = kind ? EXAM_SPECS[sub]?.[kind] : null;
  return {
    id: `${sub}-${provider}-${name}`.replace(/\s+/g, "_").toLowerCase(),
    sub, provider, name, year, current, done: false,
    marks: spec?.marks ?? null, mins: spec?.mins ?? null,
  };
};
const pair = (sub, label, year, current) => [
  P(sub, "VCAA", `${label} Exam 1`, year, current, "Exam 1"),
  P(sub, "VCAA", `${label} Exam 2`, year, current, "Exam 2"),
];

export const SEED_PAPERS = [
  // ---- Maths Methods: study design 2023–2027. NHT papers are the Northern Hemisphere sittings.
  P("mm", "VCAA", "Sample Exam 1", null, true, "Exam 1"), P("mm", "VCAA", "Sample Exam 2", null, true, "Exam 2"),
  ...pair("mm", "2025", 2025, true), ...pair("mm", "2024", 2024, true), ...pair("mm", "2023", 2023, true),
  ...pair("mm", "2026 NHT", 2026, true), ...pair("mm", "2025 NHT", 2025, true),
  ...pair("mm", "2024 NHT", 2024, true), ...pair("mm", "2023 NHT", 2023, true),
  ...[2022, 2021, 2020, 2019, 2018].flatMap((y) => pair("mm", String(y), y, false)),
  ...[2022, 2021, 2019, 2018].flatMap((y) => pair("mm", `${y} NHT`, y, false)),
  P("mm", "Heffernan", "Exam 1 — Trial A", null, true, "Exam 1"), P("mm", "Heffernan", "Exam 2 — Trial A", null, true, "Exam 2"),
  P("mm", "Heffernan", "Exam 1 — Trial B", null, true, "Exam 1"), P("mm", "Heffernan", "Exam 2 — Trial B", null, true, "Exam 2"),
  P("mm", "Fundamental", "Exam 1 — Trial", null, true, "Exam 1"), P("mm", "Fundamental", "Exam 2 — Trial", null, true, "Exam 2"),
  P("mm", "NEAP", "Trial Exam 1", null, true, "Exam 1"), P("mm", "NEAP", "Trial Exam 2", null, true, "Exam 2"),
  P("mm", "MAV", "Trial Exam 1", null, true, "Exam 1"), P("mm", "MAV", "Trial Exam 2", null, true, "Exam 2"),
  P("mm", "Checkpoints", "Topic sets", null, true),

  // ---- Physics: Units 3&4 from 2024. VCAA files the 2024 NHT paper under the previous design.
  P("phy", "VCAA", "Sample exam", null, true, "Exam"),
  ...[2025, 2024].map((y) => P("phy", "VCAA", `${y} exam`, y, true, "Exam")),
  ...[2026, 2025].map((y) => P("phy", "VCAA", `${y} NHT exam`, y, true, "Exam")),
  P("phy", "VCAA", "2024 NHT exam", 2024, false, "Exam"),
  ...[2023, 2022, 2021, 2020, 2019].map((y) => P("phy", "VCAA", `${y} exam`, y, false, "Exam")),
  ...[2023, 2022, 2021, 2019].map((y) => P("phy", "VCAA", `${y} NHT exam`, y, false, "Exam")),
  P("phy", "Heffernan", "Trial exam", null, true, "Exam"),
  P("phy", "NEAP", "Trial exam", null, true, "Exam"),
  P("phy", "Checkpoints", "Topic sets", null, true),
  P("phy", "STAV", "Trial exam", null, true, "Exam"),

  // ---- English: Units 3&4 from 2024. NHT stopped after 2024 (filed under the previous design).
  P("eng", "VCAA", "Sample exam", null, true, "Exam"),
  ...[2025, 2024].map((y) => P("eng", "VCAA", `${y} exam`, y, true, "Exam")),
  P("eng", "VCAA", "2024 NHT exam", 2024, false, "Exam"),
  ...[2023, 2022, 2021].map((y) => P("eng", "VCAA", `${y} exam`, y, false, "Exam")),
  ...[2023, 2022, 2021].map((y) => P("eng", "VCAA", `${y} NHT exam`, y, false, "Exam")),
  P("eng", "Insight", "Trial exam", null, true, "Exam"),
  P("eng", "NEAP", "Trial exam", null, true, "Exam"),
  P("eng", "School", "Practice exam", null, true, "Exam"),

  // ---- Software Development: Applied Computing study design, Units 3&4 from 2025
  P("sd", "VCAA", "Sample questions", null, true, "Exam"),
  P("sd", "VCAA", "2025 exam", 2025, true, "Exam"),
  ...[2024, 2023, 2022, 2021, 2020, 2019, 2018].map((y) => P("sd", "VCAA", `${y} exam (old design)`, y, false, "Exam")),
  P("sd", "NEAP", "Trial exam", null, true, "Exam"),
  P("sd", "TSSM", "Trial exam", null, true, "Exam"),

  // ---- Indonesian Second Language: Units 3&4 from 2020. VCAA doesn't publish oral papers.
  P("ind", "VCAA", "Sample written exam", null, true, "Written"),
  ...[2025, 2024, 2023, 2022, 2021, 2020].map((y) => P("ind", "VCAA", `${y} written exam`, y, true, "Written")),
  ...[2019, 2018].map((y) => P("ind", "VCAA", `${y} written exam`, y, false, "Written")),
  P("ind", "VSL", "Practice written", null, true, "Written"),
  P("ind", "VSL", "Practice oral", null, true, "Oral"),
];

/* Keep every paper already saved (ticks and renames intact), correct the facts on
   seed papers (design period, marks, time), and add seed papers that are missing.
   Unticked papers filed under the old "indo" id are dropped; the "ind" seed replaces them. */
export function mergePapers(existing, seed = SEED_PAPERS) {
  const saved = new Map((existing || [])
    .filter((p) => !(p.sub === "indo" && !p.done))
    .map((p) => [p.id, p.sub === "indo" ? { ...p, sub: "ind" } : p]));
  const fromSeed = seed.map((s) => {
    const p = saved.get(s.id);
    return p ? { ...p, current: s.current, year: s.year, marks: s.marks, mins: s.mins } : s;
  });
  const seedIds = new Set(seed.map((s) => s.id));
  return [...fromSeed, ...[...saved.values()].filter((p) => !seedIds.has(p.id))];
}
