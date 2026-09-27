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

/* Exams gain mark/total/weight; English weights still on the old defaults are
   corrected; the phantom "English SAC" an older seed added (never marked) goes. */
export function migrateVce(vce) {
  if (!vce?.subjects) return vce;
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
