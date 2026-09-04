/* The atlas. Every territory has an area weight so the map is drawn to scale:
   VCE Methods really is Bali-sized against all of mathematics.
   w = relative land area. p = prerequisites (territory ids). */

const T = (id, name, continent, tier, w, p = [], note = "") =>
  ({ id, name, continent, tier, w, p, note });

export const WORLDS = {
  maths: {
    id: "maths",
    name: "Mathematics",
    blurb: "The planet you've barely landed on.",
    continents: {
      analysis: { name: "Analysis", hue: "#5B8DEF" },
      algebra: { name: "Algebra", hue: "#9B7BEA" },
      geometry: { name: "Geometry & Topology", hue: "#4FB477" },
      probability: { name: "Probability & Statistics", hue: "#F2B441" },
      discrete: { name: "Discrete & Computation", hue: "#E86A9A" },
      applied: { name: "Applied & Numerical", hue: "#3FBFB0" },
    },
    territories: [
      // Tier 0 — surface
      T("arith", "Arithmetic", "algebra", 0, 3, [], "Where everyone starts."),
      T("elem_alg", "Elementary algebra", "algebra", 0, 4, ["arith"]),
      T("euclid", "Euclidean geometry", "geometry", 0, 4, ["arith"]),
      T("trig", "Trigonometry", "geometry", 0, 4, ["elem_alg", "euclid"]),
      T("funcs", "Functions", "analysis", 0, 4, ["elem_alg"]),
      T("basic_prob", "Basic probability", "probability", 0, 3, ["arith"]),

      // Tier 1 — VCE Methods
      T("diff", "Differentiation", "analysis", 1, 5, ["funcs"], "Methods U3."),
      T("integ", "Integration", "analysis", 1, 5, ["diff"], "Methods U4 calculus."),
      T("optim_basic", "Optimisation (basic)", "applied", 1, 3, ["diff"]),
      T("binom", "Binomial distribution", "probability", 1, 3, ["basic_prob"]),
      T("normal", "Normal distribution", "probability", 1, 3, ["basic_prob"]),
      T("expect", "Expected value & variance", "probability", 1, 3, ["basic_prob"]),
      T("ci", "Confidence intervals", "probability", 1, 3, ["normal", "expect"], "Methods probability SAC."),

      // Tier 2 — the core toolkit. The whole game.
      T("linalg", "Linear algebra", "algebra", 2, 14, ["elem_alg"],
        "Highest-connectivity territory on the planet. Graphics, ML, FFT, quantum, all of it."),
      T("proofs", "Proof technique", "discrete", 2, 6, ["elem_alg"], "The passport for every Tier 3 country."),
      T("mvcalc", "Multivariable calculus", "analysis", 2, 12, ["integ", "linalg"]),
      T("ode", "Differential equations", "analysis", 2, 11, ["integ"]),
      T("probthy", "Probability theory", "probability", 2, 10, ["integ", "expect"]),
      T("stats", "Statistics & inference", "probability", 2, 10, ["probthy"]),
      T("discrete", "Discrete mathematics", "discrete", 2, 9, ["elem_alg"]),
      T("numerical", "Numerical methods", "applied", 2, 9, ["linalg", "diff"]),

      // Tier 3 — the big branches
      T("realan", "Real analysis", "analysis", 3, 14, ["proofs", "integ"]),
      T("complexan", "Complex analysis", "analysis", 3, 11, ["realan"]),
      T("abstract", "Abstract algebra", "algebra", 3, 14, ["proofs", "linalg"]),
      T("topology", "Topology", "geometry", 3, 12, ["realan"]),
      T("diffgeo", "Differential geometry", "geometry", 3, 12, ["mvcalc", "linalg"]),
      T("pde", "Partial differential equations", "analysis", 3, 12, ["ode", "mvcalc"]),
      T("optim", "Optimisation theory", "applied", 3, 10, ["mvcalc", "linalg"]),
      T("graph", "Graph theory", "discrete", 3, 9, ["discrete"]),
      T("numthy", "Number theory", "algebra", 3, 9, ["proofs"]),
      T("infothy", "Information theory", "discrete", 3, 8, ["probthy"]),
      T("algos", "Algorithms & complexity", "discrete", 3, 10, ["discrete", "proofs"]),

      // Tier 4 — specialist machinery
      T("fourier", "Fourier analysis", "applied", 4, 11, ["complexan", "linalg"],
        "You shipped an FFT ocean without holding this."),
      T("measure", "Measure theory", "analysis", 4, 11, ["realan"]),
      T("functional", "Functional analysis", "analysis", 4, 11, ["measure", "topology"]),
      T("stochastic", "Stochastic calculus", "probability", 4, 10, ["measure", "probthy"]),
      T("reptheory", "Representation theory", "algebra", 4, 10, ["abstract"]),
      T("numlinalg", "Numerical linear algebra", "applied", 4, 8, ["linalg", "numerical"]),
      T("convex", "Convex optimisation", "applied", 4, 8, ["optim"]),
      T("tensor", "Tensor calculus", "geometry", 4, 9, ["diffgeo"]),
      T("manifolds", "Manifolds", "geometry", 4, 10, ["topology", "diffgeo"]),
      T("mlmath", "Mathematics of ML", "applied", 4, 9, ["linalg", "probthy", "optim"]),

      // Tier 5 — deep pure. Named, mapped, unreachable.
      T("category", "Category theory", "algebra", 5, 9, ["abstract", "topology"]),
      T("algtop", "Algebraic topology", "geometry", 5, 10, ["topology", "abstract"]),
      T("alggeo", "Algebraic geometry", "geometry", 5, 11, ["abstract", "topology"]),
      T("homological", "Homological algebra", "algebra", 5, 8, ["category"]),
      T("modelthy", "Model theory", "discrete", 5, 7, ["proofs", "abstract"]),
      T("setthy", "Set theory", "discrete", 5, 7, ["proofs"]),
      T("ergodic", "Ergodic theory", "analysis", 5, 7, ["measure"]),
      T("analnum", "Analytic number theory", "algebra", 5, 8, ["complexan", "numthy"]),
    ],
  },

  physics: {
    id: "physics",
    name: "Physics",
    blurb: "Smaller planet. Sits directly offshore of mathematics.",
    continents: {
      classical: { name: "Classical", hue: "#5B8DEF" },
      em: { name: "Fields & Waves", hue: "#F2B441" },
      thermal: { name: "Thermal & Statistical", hue: "#E86A9A" },
      quantum: { name: "Quantum", hue: "#9B7BEA" },
      relativity: { name: "Relativity & Cosmos", hue: "#4FB477" },
    },
    territories: [
      T("kin", "Kinematics", "classical", 1, 5, [], "Physics U3 Motion."),
      T("dyn", "Newtonian dynamics", "classical", 1, 6, ["kin"]),
      T("momentum", "Momentum & energy", "classical", 1, 5, ["dyn"]),
      T("circular", "Circular & projectile motion", "classical", 1, 5, ["dyn"]),
      T("fields_vce", "Gravitational & electric fields", "em", 1, 6, ["dyn"], "Physics U3 Fields."),
      T("emag_vce", "Electromagnetism (VCE)", "em", 1, 6, ["fields_vce"]),
      T("waves_vce", "Waves & light", "em", 1, 5, ["kin"]),
      T("sr_vce", "Special relativity (VCE)", "relativity", 1, 4, ["momentum"]),
      T("quanta_vce", "Photons & matter waves", "quantum", 1, 4, ["waves_vce"]),

      T("lagrangian", "Lagrangian mechanics", "classical", 2, 11, ["dyn"]),
      T("hamiltonian", "Hamiltonian mechanics", "classical", 2, 10, ["lagrangian"]),
      T("maxwell", "Maxwell's equations", "em", 2, 13, ["emag_vce"]),
      T("optics", "Optics & wave physics", "em", 2, 8, ["waves_vce"]),
      T("thermo", "Thermodynamics", "thermal", 2, 9, ["momentum"]),
      T("statmech", "Statistical mechanics", "thermal", 2, 12, ["thermo"]),
      T("sr", "Special relativity", "relativity", 2, 9, ["sr_vce"]),
      T("qm", "Quantum mechanics", "quantum", 2, 15, ["quanta_vce", "lagrangian"]),

      T("gr", "General relativity", "relativity", 3, 14, ["sr"]),
      T("qft", "Quantum field theory", "quantum", 3, 16, ["qm", "sr"]),
      T("condensed", "Condensed matter", "quantum", 3, 12, ["qm", "statmech"]),
      T("nuclear", "Nuclear & particle", "quantum", 3, 12, ["qft"]),
      T("fluids", "Fluid mechanics", "classical", 3, 11, ["lagrangian"], "The real home of your ocean sim."),
      T("plasma", "Plasma physics", "em", 3, 9, ["maxwell", "statmech"]),
      T("astro", "Astrophysics", "relativity", 3, 11, ["gr", "statmech"]),
      T("cosmo", "Cosmology", "relativity", 3, 10, ["gr"]),
      T("qinfo", "Quantum information", "quantum", 3, 10, ["qm"]),
      T("standard", "The Standard Model", "quantum", 4, 13, ["qft", "nuclear"]),
    ],
  },

  strength: {
    id: "strength",
    name: "Strength",
    blurb: "A small planet. You could plausibly hold most of it.",
    continents: {
      push: { name: "Push", hue: "#FF6B35" },
      pull: { name: "Pull", hue: "#5B8DEF" },
      legs: { name: "Legs", hue: "#4FB477" },
      core: { name: "Core & Carry", hue: "#F2B441" },
      quality: { name: "Qualities", hue: "#9B7BEA" },
    },
    territories: [
      T("bench", "Bench press", "push", 1, 10, []),
      T("ohp", "Overhead press", "push", 1, 9, []),
      T("incline", "Incline press", "push", 1, 7, ["bench"]),
      T("dips", "Dips", "push", 2, 7, ["bench"]),
      T("row", "Barbell row", "pull", 1, 9, []),
      T("pullup", "Pull-up", "pull", 1, 9, []),
      T("weighted_pullup", "Weighted pull-up", "pull", 2, 8, ["pullup"]),
      T("deadlift", "Deadlift", "pull", 2, 12, ["row"]),
      T("squat", "Back squat", "legs", 1, 12, []),
      T("frontsquat", "Front squat", "legs", 2, 8, ["squat"]),
      T("rdl", "Romanian deadlift", "legs", 1, 7, []),
      T("lunge", "Split squat & lunges", "legs", 1, 6, []),
      T("plank", "Anti-extension core", "core", 1, 5, []),
      T("carry", "Loaded carries", "core", 1, 6, []),
      T("hanging", "Hanging leg raise", "core", 2, 5, ["pullup"]),
      T("hypertrophy", "Hypertrophy programming", "quality", 2, 10, ["bench", "squat", "row"]),
      T("strengthprog", "Strength programming", "quality", 3, 10, ["hypertrophy"]),
      T("periodisation", "Periodisation", "quality", 3, 9, ["strengthprog"]),
      T("mobility", "Mobility & positions", "quality", 1, 6, []),
      T("nutrition", "Nutrition for training", "quality", 2, 8, []),
    ],
  },
};

/* Depth of holding — area alone would reward skimming everything. */
export const DEPTHS = [
  { v: 0, label: "Unexplored", short: "—" },
  { v: 1, label: "Skimmed", short: "SKIM" },
  { v: 2, label: "Worked", short: "WORK" },
  { v: 3, label: "Fluent", short: "FLUE" },
  { v: 4, label: "Generative", short: "GEN" },
];

/* Where you actually are, seeded from what this app already knows. */
export const SEED_PROGRESS = {
  arith: 4, elem_alg: 4, euclid: 3, trig: 3, funcs: 4, basic_prob: 3,
  diff: 3, integ: 3, optim_basic: 2, binom: 3, normal: 3, expect: 3, ci: 2,
  fourier: 1, linalg: 1,
  kin: 3, dyn: 3, momentum: 3, circular: 3, fields_vce: 3,
  emag_vce: 2, waves_vce: 2, sr_vce: 2, quanta_vce: 2,
  bench: 3, squat: 3, row: 3, ohp: 2, rdl: 2, pullup: 2, incline: 2,
  plank: 2, lunge: 2, hypertrophy: 2, mobility: 1, nutrition: 2,
};

/* Reachable = every prerequisite held at Worked or better, not yet held itself. */
export function reachable(world, progress) {
  return world.territories.filter((t) => {
    if ((progress[t.id] || 0) > 0) return false;
    return t.p.every((pre) => (progress[pre] || 0) >= 2);
  });
}

export function coverage(world, progress) {
  const total = world.territories.reduce((a, t) => a + t.w, 0);
  const held = world.territories.reduce((a, t) => a + (progress[t.id] > 0 ? t.w : 0), 0);
  const deep = world.territories.reduce((a, t) => a + ((progress[t.id] || 0) >= 3 ? t.w : 0), 0);
  const reach = reachable(world, progress).reduce((a, t) => a + t.w, 0);
  return {
    total,
    heldPct: (held / total) * 100,
    deepPct: (deep / total) * 100,
    reachPct: (reach / total) * 100,
    heldCount: world.territories.filter((t) => (progress[t.id] || 0) > 0).length,
    count: world.territories.length,
  };
}
