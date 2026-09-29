/* Key-knowledge mastery: data model + migration. No React in here, so it can be
   run over a backup file from node to check what a migration would change.

   state.concepts  [{ id, sub, area, name, exam, order, retired }]
     id      hand-written and stable ("mm.diff.chain"); never derived from name
     area    the study design's area of study it sits under
   state.evidence  [{ id, concept, date, outcome, practiceId, source, exam,
                      marking, errorType, note }]
     one record per (attempt, concept); outcome "correct" | "partial" | "wrong"
     exam 1 (tech-free) | 2 (tech-active) | null
     marking "self" | "solutions" | "teacher" | "unmarked"
     errorType "concept" | "algebra" | "misread" | "time" | null
   state.kkOverride { [conceptId]: 0–3 }   your own rating, beats the computed one */

import { SEED_CONCEPTS } from "./syllabus";
import { mergePapers, VCAA_WEIGHTS, VCAA_EXAM_WEIGHTS, examSpec } from "./vcaa";

export { SEED_CONCEPTS };
export const SCHEMA_VERSION = 3;

/* Keep everything already in the blob, in its order; refresh the wording of seed
   concepts (so study-design corrections land) and append seed concepts that are new. */
export function mergeConcepts(existing, seed) {
  const bySeed = new Map(seed.map((c) => [c.id, c]));
  const kept = existing.map((c) => {
    const s = bySeed.get(c.id);
    return s ? { ...c, sub: s.sub, area: s.area, name: s.name, exam: s.exam, order: s.order } : c;
  });
  const have = new Set(kept.map((c) => c.id));
  return [...kept, ...seed.filter((c) => !have.has(c.id))];
}

/* Weights an older seed shipped for English, which didn't match the study design. */
const OLD_ENG = { "Protest": 8.3, "Commentary": 8.3, "Sunset Boulevard": 8.4,
                  "Argument Analysis": 6.25, "Oral Presentation": 6.25, "Memory Police": 6.25 };

/* Study-design weights, applied once (vce.vcaaWeights): every task named in the
   VCAA table takes its weight, replacing hand-typed ones, so no one has to find the
   "Load VCAA weights" button. Weights edited after that are left alone.
   Software Development also gains what its structure was missing: the SAT is out
   of 100, and Unit 4 has a SAC (Outcome 2, security case study, 10%). */
const VCAA_WEIGHTS_V = 1;
function applyVcaa(s) {
  const map = VCAA_WEIGHTS[s.id], emap = VCAA_EXAM_WEIGHTS[s.id] || {};
  if (!map) return s;
  const fix = (x) => (x.name in map ? { ...x, weight: map[x.name] } : x);
  let u3 = (s.units?.[3] || []).map(fix), u4 = (s.units?.[4] || []).map(fix);
  if (s.id === "sd") {
    const sat = (x) => /\bSAT\b/i.test(x.name || "");
    u3 = u3.map((x) => (sat(x) && !x.total ? { ...x, total: 100 } : x));
    u4 = u4.map((x) => (sat(x) && !x.total ? { ...x, total: 100 } : x));
    if (!u4.some((x) => !sat(x) && (x.weight || 0) > 0))
      u4 = [...u4, { id: "U4 SAC100", name: "U4 SAC", date: null, mark: null, total: 100, weight: map["U4 SAC"] }];
  }
  return {
    ...s,
    units: { ...s.units, 3: u3, 4: u4 },
    exams: (s.exams || []).map((x) => (x.name in emap ? { ...x, weight: emap[x.name] } : x)),
  };
}

/* Exams gain mark/total/weight; English weights still on the old defaults are
   corrected; the phantom "English SAC" an older seed added (never marked) goes. */
export function migrateVce(vce) {
  if (!vce?.subjects) return vce;
  if ((vce.vcaaWeights || 0) < VCAA_WEIGHTS_V)
    vce = { ...vce, vcaaWeights: VCAA_WEIGHTS_V, subjects: vce.subjects.map(applyVcaa) };
  return {
    ...vce,
    subjects: vce.subjects.map((s) => {
      const ew = VCAA_EXAM_WEIGHTS[s.id] || {};
      const exams = (s.exams || []).map((x) => ({
        ...x,
        mark: x.mark ?? null,
        total: x.total ?? examSpec(s.id, x.name)?.marks ?? null,
        weight: x.weight ?? ew[x.name] ?? null,
      }));
      let units = s.units || { 3: [], 4: [] };
      if (s.id === "eng") {
        const fix = (x) => (OLD_ENG[x.name] !== undefined && OLD_ENG[x.name] === x.weight
          ? { ...x, weight: VCAA_WEIGHTS.eng[x.name] } : x);
        const keep = (x) => !(x.name === "English SAC" && (x.mark === null || x.mark === undefined));
        units = { ...units, 3: (units[3] || []).filter(keep).map(fix), 4: (units[4] || []).filter(keep).map(fix) };
      }
      return { ...s, exams, units };
    }),
  };
}

/* Only ever adds or corrects. Throws rather than guess when the blob looks wrong,
   so the caller treats it as a failed load and blocks saving. */
export function migrate(state) {
  if (!state || typeof state !== "object") throw new Error("State is not an object");
  const v = Number(state.schemaVersion) || 1;
  if (v > SCHEMA_VERSION)
    throw new Error(`Data was saved by a newer version of the app (schema ${v}); refresh to update.`);
  for (const k of ["concepts", "evidence", "papers"])
    if (state[k] !== undefined && !Array.isArray(state[k]))
      throw new Error(`state.${k} is not a list; refusing to overwrite it`);

  return {
    ...state,
    vce: migrateVce(state.vce),
    papers: mergePapers(state.papers || []),
    concepts: mergeConcepts(state.concepts || [], SEED_CONCEPTS),
    evidence: state.evidence || [],
    kkOverride: state.kkOverride || {},
    schemaVersion: SCHEMA_VERSION,
  };
}
