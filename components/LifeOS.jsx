"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { loadRemote, saveRemote } from "../lib/store";
import Atlas from "./Atlas";
import { SEED_PROGRESS } from "../lib/atlas";
import {
  Flame, Dumbbell, BookOpen, Play, Square, Plus, Minus, Trophy, ChevronLeft,
  ChevronRight, Check, X, Timer, BarChart3, FileText, Activity, AlertTriangle, Download, Globe
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip,
  PieChart, Pie, LineChart, Line, CartesianGrid
} from "recharts";

/* ============================== TOKENS ============================== */
const C = {
  ink: "#10131A", plate: "#191E28", plate2: "#141922", rule: "#2A3140",
  bone: "#E6E2D6", dim: "#7C8698", signal: "#FF6B35", steel: "#5B8DEF",
  moss: "#4FB477", amber: "#F2B441", violet: "#9B7BEA",
};
const MONO = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace";
const SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/* ============================== CONFIG ============================== */
const TARGETS = { studyMin: 60, devMin: 45, gymPerWeek: 3, tennisPerWeek: 1, creatinePerWeek: 7 };
const TOGGLES = [
  { id: "gym", label: "Gym", icon: Dumbbell },
  { id: "tennis", label: "Tennis", icon: Activity },
  { id: "creatine", label: "Creatine", icon: Check },
  { id: "medDay", label: "Meds — day", icon: Check },
  { id: "medNight", label: "Meds — night", icon: Check },
];
const STREAK_TIERS = [
  { d: 30, name: "Ascendant" }, { d: 14, name: "Locked in" },
  { d: 7, name: "Rolling" }, { d: 3, name: "Warm" }, { d: 0, name: "Cold start" },
];
const BADGES = [
  { id: "week", name: "Week Warrior", desc: "7-day streak", test: (s, x) => x.bestStreak >= 7 },
  { id: "fortnight", name: "Iron Fortnight", desc: "14-day streak", test: (s, x) => x.bestStreak >= 14 },
  { id: "month", name: "Unbroken", desc: "30-day streak", test: (s, x) => x.bestStreak >= 30 },
  { id: "gym10", name: "Gym Rat", desc: "10 gym sessions", test: (s) => cnt(s, "gym") >= 10 },
  { id: "gym40", name: "Iron Habit", desc: "40 gym sessions", test: (s) => cnt(s, "gym") >= 40 },
  { id: "deep4", name: "Deep Diver", desc: "4h+ deep work in a day", test: (s) => Object.values(s.days).some((d) => (d.study || 0) + (d.dev || 0) >= 240) },
  { id: "deep100", name: "Century", desc: "100h total deep work", test: (s, x) => x.totalDeep >= 6000 },
  { id: "perfect", name: "Perfect Day", desc: "All habits + both targets", test: (s) => Object.values(s.days).some((d) => d.gym && d.tennis && d.creatine && d.medDay && d.medNight && (d.study || 0) >= TARGETS.studyMin && (d.dev || 0) >= TARGETS.devMin) },
  { id: "balance", name: "Balanced", desc: "A week where study ≥ dev", test: (s) => weeksOf(s).some((w) => { const st = w.reduce((a, d) => a + (d.study || 0), 0); const dv = w.reduce((a, d) => a + (d.dev || 0), 0); return st >= dv && st > 0; }) },
  { id: "scribe", name: "Scribe", desc: "Notes 10 days running", test: (s) => noteRun(s) >= 10 },
  { id: "pr", name: "Stronger", desc: "5 personal records", test: (s) => (s.prs || []).length >= 5 },
];
const EXERCISES = ["Bench Press", "Incline Dumbbell Press", "Overhead Press", "Dumbbell Fly", "Barbell Row", "Lat Pulldown", "Pull-up", "Seated Cable Row", "Squat", "Romanian Deadlift", "Leg Press", "Leg Curl", "Calf Raise", "Barbell Curl", "Hammer Curl", "Tricep Pushdown", "Skull Crusher", "Lateral Raise"];

/* ============================== VCE SEED ============================== */
const S = (name, mark, total, date) => ({ id: name + (date || "") + total, name, mark, total, date: date || null });
const E = (name, date, time, location) => ({ name, date, time, location: location || null });
/* Weightings: Software Dev confirmed by user. Others are standard VCE splits —
   editable in-app, and worth confirming against your study design. */
const SEED_VCE = {
  subjects: [
    {
      id: "eng", name: "English", isEnglish: true, completed: false, raw: 38, scaled: 36,
      weights: { u3: 25, u4: 25, exam: 50 },
      exams: [E("Exam", "2026-10-27", "9:00 am")],
      units: {
        3: [S("Protest", 29, 40), S("Commentary", 16, 20), S("Sunset Boulevard", 34, 40)],
        4: [S("Argument Analysis", 20, 40), S("Oral Presentation", 15, 20), S("Memory Police", 40, 40),
            S("English SAC", null, 40, "2026-08-31")],
      },
    },
    {
      id: "mm", name: "Maths Methods", completed: false, raw: 34, scaled: 39,
      weights: { u3: 20, u4: 14, exam: 66 },
      exams: [E("Exam 1", "2026-11-05", "9:00 am"), E("Exam 2", "2026-11-06", "11:45 am")],
      units: {
        3: [S("Functions (Part A)", 28, 42, "2026-03-20"), S("Application (Part B1)", 23, 33, "2026-05-28"), S("Application (Part B2)", 22, 32, "2026-06-03")],
        4: [S("Calculus (Part 1)", null, null, "2026-07-31"), S("Calculus (Part 2)", null, null, "2026-08-04"), S("Probability", null, null, "2026-09-03")],
      },
    },
    {
      id: "phy", name: "Physics", completed: false, raw: 32, scaled: 34,
      weights: { u3: 21, u4: 19, exam: 60 },
      exams: [E("Exam", "2026-11-12", "9:00 am")],
      units: {
        3: [S("Motion", 19, 39), S("Fields", 32, 45)],
        4: [S("SAC 3", null, null), S("SAC 4 (final SAC)", null, null, "2026-09-02")],
      },
    },
    {
      id: "ind", name: "Indonesian SL", completed: false, raw: 43, scaled: 49,
      weights: { u3: 25, u4: 25, exam: 50 },
      exams: [E("Oral", "2026-10-16", "1:25 pm", "Quality Hotel Manor, 669 Maroondah Hwy, Mitcham"), E("Written", "2026-11-17", "11:45 am")],
      units: {
        3: [S("O1 Interpersonal", 15, 20, "2026-04-21"), S("O2 Interpretive", 13, 15, "2026-06-05"), S("O3 Presentational", 14, 15, "2026-06-12")],
        4: [S("O1 Interpersonal", null, 20, "2026-07-31"), S("O2 Interpretive", null, 15, "2026-08-14"), S("O3 Presentational", null, 15, "2026-08-28")],
      },
    },
    {
      id: "sd", name: "Software Development", completed: false, raw: 33, scaled: 31,
      weights: { u3: 10, sat: 30, u4: 10, exam: 50 },
      exams: [E("Exam", "2026-11-13", "3:00 pm")],
      units: {
        3: [S("Mod 1", 12, 20), S("Mod 2", 19, 27), S("Mod 3", 17, 30), S("Mod 4", null, 40),
            S("AC1", 7, 10), S("AC2", 8, 10), S("AC3", 9, 10), S("AC4", 10, 10), S("AC5", null, 10)],
        4: [S("SAT submission (30%)", null, null, "2026-08-07")],
      },
    },
    { id: "eco", name: "Economics", completed: true, raw: 40, scaled: 42, weights: {}, exams: [], units: { 3: [], 4: [] } },
  ],
};

/* ATAR anchors — approximate, interpolated. Real table is published by VTAC each year. */
const ATAR_ANCHORS = [
  [0, 0], [65, 50], [80, 60], [97, 70], [117, 80], [143, 90],
  [163, 95], [181, 98], [190, 99], [211, 99.95],
];
function atarFor(agg) {
  const a = ATAR_ANCHORS;
  if (agg >= a[a.length - 1][0]) return 99.95;
  for (let i = 0; i < a.length - 1; i++) {
    if (agg >= a[i][0] && agg < a[i + 1][0]) {
      const t = (agg - a[i][0]) / (a[i + 1][0] - a[i][0]);
      return Math.round((a[i][1] + t * (a[i + 1][1] - a[i][1])) * 20) / 20;
    }
  }
  return 0;
}

/* --- School profile: McKinnon SC, from published 2025 results --- */
const SCHOOL = { name: "McKinnon SC", medianSS: 33, sd: 6 };

/* --- Scaling curves (raw study score -> scaled). VTAC scales on a curve,
   not a flat offset. These reproduce the numbers you'd already worked out.
   Scaling shifts every year, so treat them as last year's shape. --- */
const SCALE_POINTS = [20, 25, 30, 35, 40, 45, 50];
const SCALING = {
  eng: [19, 24, 28.5, 33, 38, 43.5, 50],
  mm: [22, 28, 34, 40, 45.5, 48, 50],
  phy: [20, 25.5, 31.5, 37, 42, 46.5, 50],
  sd: [18, 23, 28, 33, 38, 43.5, 50],
  ind: [26, 32, 37, 42, 46, 50, 50],
  eco: [21, 26.5, 32, 37, 42, 46.5, 50],
};
function scaleScore(subId, raw) {
  const curve = SCALING[subId];
  if (!curve || !raw) return 0;
  if (raw <= SCALE_POINTS[0]) return Math.round(curve[0] * (raw / SCALE_POINTS[0]) * 10) / 10;
  for (let i = 0; i < SCALE_POINTS.length - 1; i++) {
    if (raw >= SCALE_POINTS[i] && raw <= SCALE_POINTS[i + 1]) {
      const t = (raw - SCALE_POINTS[i]) / (SCALE_POINTS[i + 1] - SCALE_POINTS[i]);
      return Math.round((curve[i] + t * (curve[i + 1] - curve[i])) * 10) / 10;
    }
  }
  return curve[curve.length - 1];
}

/* --- Inverse normal CDF (Acklam): percentile -> z-score --- */
function probit(p) {
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

/* Rank in your cohort -> estimated study score. */
function ssFromRank(rank, cohort, median = SCHOOL.medianSS, sd = SCHOOL.sd) {
  if (!rank || !cohort || rank < 1 || rank > cohort) return null;
  const z = probit(1 - (rank - 0.5) / cohort);
  return Math.max(0, Math.min(50, Math.round(median + sd * z)));
}

/* ============================== HABIT SEED ============================== */
const D = (date, study, dev, gym, tennis, creatine, medDay, medNight, split) =>
  ({ date, study, dev, gym, tennis, creatine, medDay, medNight, split: split || null, note: "", studyRating: 0, devRating: 0 });
const SEED_DAYS = [
  D("2026-08-10", 0, 0, true, false, false, true, true), D("2026-08-11", 0, 0, false, false, false, true, true),
  D("2026-08-12", 52, 52, false, true, false, true, true), D("2026-08-13", 0, 85, true, false, true, true, true, "Chest + Back"),
  D("2026-08-14", 94, 144, true, false, true, true, true, "Back + Biceps + Triceps"), D("2026-08-15", 60, 227, true, false, false, true, true, "Chest + Legs"),
  D("2026-08-16", 139, 23, false, false, false, true, true), D("2026-08-17", 96, 47, false, false, true, true, true),
  D("2026-08-18", 47, 84, false, false, false, true, true), D("2026-08-19", 25, 85, true, false, false, true, true, "Push"),
  D("2026-08-20", 168, 95, false, false, true, true, true), D("2026-08-21", 135, 186, true, false, true, true, true, "Pull"),
  D("2026-08-22", 0, 4, true, false, true, true, false, "Legs"),
];
const SEED = { days: Object.fromEntries(SEED_DAYS.map((d) => [d.date, d])), workouts: {}, prs: [], vce: SEED_VCE };

/* ============================== HELPERS ============================== */
const key = (d) => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); };
const parseKey = (k) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const mondayOf = (d) => addDays(d, -((d.getDay() + 6) % 7));
const fmt = (min) => {
  const t = Math.max(0, Math.round(min * 60));
  return `${String(Math.floor(t / 3600)).padStart(2, "0")}:${String(Math.floor((t % 3600) / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};
const hrs = (m) => Math.round(m / 6) / 10;
const fmtHM = (m) => { const h = Math.floor(m / 60), mm = Math.round(m % 60); return h ? `${h}h ${mm}m` : `${mm}m`; };
const blank = (date) => ({ date, study: 0, dev: 0, gym: false, tennis: false, creatine: false, medDay: false, medNight: false, split: null, note: "", studyRating: 0, devRating: 0 });
const cnt = (s, f) => Object.values(s.days).filter((d) => d[f]).length;
const isActive = (d) => !!d && ((d.study || 0) + (d.dev || 0) >= 30 || d.gym || d.tennis);
function weeksOf(s) { const m = {}; Object.values(s.days).forEach((d) => { const k = key(mondayOf(parseKey(d.date))); (m[k] = m[k] || []).push(d); }); return Object.values(m); }
function noteRun(s) { let b = 0, r = 0; Object.keys(s.days).sort().forEach((k) => { r = (s.days[k].note || "").trim() ? r + 1 : 0; b = Math.max(b, r); }); return b; }
function streakAt(days, endKey) {
  let n = 0, cur = parseKey(endKey);
  if (!isActive(days[key(cur)])) cur = addDays(cur, -1);
  while (isActive(days[key(cur)])) { n++; cur = addDays(cur, -1); }
  return n;
}
const tierFor = (n) => STREAK_TIERS.find((t) => n >= t.d);
function dayScore(d) {
  if (!d) return 0;
  let h = 0;
  if ((d.study || 0) >= TARGETS.studyMin) h++;
  if ((d.dev || 0) >= TARGETS.devMin) h++;
  if (d.creatine) h++; if (d.medDay) h++; if (d.medNight) h++;
  if (d.gym || d.tennis) h++;
  return h / 6;
}
function weekStats(days, monKey) {
  const mon = parseKey(monKey), out = [];
  for (let i = 0; i < 7; i++) { const d = days[key(addDays(mon, i))]; if (d) out.push(d); }
  const study = out.reduce((a, d) => a + (d.study || 0), 0), dev = out.reduce((a, d) => a + (d.dev || 0), 0);
  const rows = [
    { l: "Study", a: study / 60, t: 7 }, { l: "Development", a: dev / 60, t: 5.25 },
    { l: "Gym", a: out.filter((d) => d.gym).length, t: TARGETS.gymPerWeek },
    { l: "Tennis", a: out.filter((d) => d.tennis).length, t: TARGETS.tennisPerWeek },
    { l: "Creatine", a: out.filter((d) => d.creatine).length, t: TARGETS.creatinePerWeek },
  ];
  return { study, dev, rows, score: rows.reduce((a, r) => a + Math.min(1, r.a / r.t), 0) / rows.length, days: out };
}
function computeMeta(state) {
  let best = 0;
  Object.keys(state.days).sort().forEach((k) => { best = Math.max(best, streakAt(state.days, k)); });
  return { bestStreak: best, totalDeep: Object.values(state.days).reduce((a, d) => a + (d.study || 0) + (d.dev || 0), 0) };
}
const e1rm = (w, r) => Math.round(w * (1 + r / 30) * 10) / 10;

/* --- VCE maths: ONLY count SACs that have a mark. This is the fix. --- */
function unitAvg(sacs) {
  const done = (sacs || []).filter((s) => s.mark !== null && s.mark !== undefined && s.total);
  if (!done.length) return null;
  const m = done.reduce((a, s) => a + s.mark, 0), t = done.reduce((a, s) => a + s.total, 0);
  return { pct: m / t, mark: m, total: t, n: done.length, pending: (sacs || []).length - done.length };
}
function subjectAvg(sub) {
  const all = [...(sub.units[3] || []), ...(sub.units[4] || [])];
  return unitAvg(all);
}

/* How much of the final grade is already decided, and how you're doing on it. */
function standing(sub) {
  const w = sub.weights || {};
  if (!w.exam) return null;
  let assessed = 0, earned = 0;
  [3, 4].forEach((u) => {
    const weight = w["u" + u] || 0;
    const sacs = sub.units[u] || [];
    if (!weight || !sacs.length) return;
    const done = sacs.filter((s) => s.mark !== null && s.mark !== undefined && s.total);
    if (!done.length) return;
    // fraction of the unit's assessment that has been sat
    const knownTotal = sacs.reduce((a, s) => a + (s.total || 0), 0);
    const doneTotal = done.reduce((a, s) => a + s.total, 0);
    const frac = knownTotal ? doneTotal / knownTotal : done.length / sacs.length;
    const pct = done.reduce((a, s) => a + s.mark, 0) / doneTotal;
    assessed += weight * frac;
    earned += weight * frac * pct;
  });
  return {
    assessed: Math.round(assessed),
    remaining: Math.round(100 - assessed),
    pct: assessed > 0 ? earned / assessed : null,
    examWeight: w.exam + (w.sat || 0),
  };
}
function aggregate(subjects) {
  const scored = subjects.map((s) => ({ ...s, sc: Number(s.scaled) || 0 })).filter((s) => s.sc > 0);
  const eng = scored.filter((s) => s.isEnglish).sort((a, b) => b.sc - a.sc)[0];
  if (!eng) return null;
  const rest = scored.filter((s) => s.id !== eng.id).sort((a, b) => b.sc - a.sc);
  const top3 = rest.slice(0, 3);
  const inc = rest.slice(3, 5);
  const primary = eng.sc + top3.reduce((a, s) => a + s.sc, 0);
  const increments = inc.reduce((a, s) => a + s.sc * 0.1, 0);
  return { eng, top3, inc, primary, increments, total: Math.round((primary + increments) * 10) / 10 };
}

/* ============================== STORAGE ============================== */
/* Persistence now lives in Supabase, keyed to your account.
   Same data on phone, Chromebook, PC, and any device you sign in on. */
/* ============================== UI BITS ============================== */
const Card = ({ children, style }) => <div style={{ background: C.plate, border: `1px solid ${C.rule}`, borderRadius: 10, padding: 14, ...style }}>{children}</div>;
const Eyebrow = ({ children, right }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10, gap: 8 }}>
    <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1.4, color: C.dim, textTransform: "uppercase" }}>{children}</span>
    {right}
  </div>
);
const Btn = ({ children, onClick, active, style, title }) => (
  <button onClick={onClick} title={title} style={{
    background: active ? C.signal : C.plate2, color: active ? C.ink : C.bone,
    border: `1px solid ${active ? C.signal : C.rule}`, borderRadius: 7, padding: "7px 11px",
    fontSize: 13, fontFamily: SANS, cursor: "pointer", fontWeight: active ? 600 : 400, transition: "all .15s", ...style,
  }}>{children}</button>
);
const inputStyle = { flex: 1, background: C.plate2, color: C.bone, border: `1px solid ${C.rule}`, borderRadius: 7, padding: "9px 10px", fontSize: 15, fontFamily: MONO, minWidth: 0 };

function Rating({ value, onChange, color }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={() => onChange(value === n ? 0 : n)} style={{
          width: 26, height: 26, borderRadius: 6, cursor: "pointer", fontFamily: MONO, fontSize: 11,
          background: value >= n ? color : C.plate2, color: value >= n ? C.ink : C.dim,
          border: `1px solid ${value >= n ? color : C.rule}`, fontWeight: 600, transition: "all .12s",
        }}>{n}</button>
      ))}
    </div>
  );
}
function DayDetail({ d, dateKey }) {
  if (!d) return <div style={{ fontSize: 12, color: C.dim, fontStyle: "italic", minHeight: 62, display: "flex", alignItems: "center" }}>Hover any bar or square to read that day back.</div>;
  const done = TOGGLES.filter((t) => d[t.id]).map((t) => t.label);
  return (
    <div style={{ minHeight: 62 }}>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "baseline", marginBottom: 5 }}>
        <span style={{ fontFamily: MONO, fontSize: 12, color: C.bone }}>{parseKey(dateKey).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}</span>
        <span style={{ fontFamily: MONO, fontSize: 12, color: C.steel }}>Study {hrs(d.study || 0)}h{d.studyRating ? ` · ${d.studyRating}/5` : ""}</span>
        <span style={{ fontFamily: MONO, fontSize: 12, color: C.violet }}>Dev {hrs(d.dev || 0)}h{d.devRating ? ` · ${d.devRating}/5` : ""}</span>
        {done.length > 0 && <span style={{ fontFamily: MONO, fontSize: 11, color: C.moss }}>{done.join(" · ")}</span>}
      </div>
      <div style={{ fontSize: 13, color: (d.note || "").trim() ? C.bone : C.dim, lineHeight: 1.5, fontStyle: (d.note || "").trim() ? "normal" : "italic" }}>
        {(d.note || "").trim() || "No note written for this day."}
      </div>
    </div>
  );
}

/* ============================== QUICK ADD ============================== */
function QuickAdd({ state, onApply }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);

  const subjectList = state.vce.subjects.map((s) => `${s.id} = ${s.name}`).join(", ");
  const todayKey = key(new Date());
  const todayName = new Date().toLocaleDateString("en-AU", { weekday: "long" });

  const send = async () => {
    if (!text.trim() || busy) return;
    setBusy(true); setErr(null); setResult(null);
    const prompt = `You turn a VCE student's shorthand into structured actions. Respond with ONLY raw JSON, no markdown fences, no commentary.

Today is ${todayKey} (${todayName}). Subjects: ${subjectList}.
Habits available: gym, tennis, creatine, medDay, medNight.

Schema:
{"actions":[ ... ],"summary":"one short sentence"}

Each action is one of:
{"type":"add_assessment","subjectId":"sd","unit":3,"name":"SAC 4","date":"2026-08-28","weight":10,"total":null}
{"type":"add_exam","subjectId":"phy","name":"Exam","date":"2026-11-12","time":"9:00 am","location":null}
{"type":"set_mark","subjectId":"mm","unit":4,"name":"Calculus (Part 1)","mark":28,"total":40}
{"type":"log_time","field":"study","minutes":90}
{"type":"set_habit","habit":"gym","value":true}
{"type":"add_note","text":"..."}

Rules:
- unit is 3 or 4. If unclear for a Unit 3&4 student in August 2026, use 4.
- Resolve relative dates ("this Friday", "next Tuesday") against today's date. Output ISO YYYY-MM-DD.
- weight is a percentage number if the user states one, else null.
- For set_mark, match "name" to an existing SAC name as closely as you can.
- If you cannot interpret the input, return {"actions":[],"summary":"Didn't understand that."}

Input: ${text}`;

    try {
      const r = await fetch("/api/quickadd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await r.json();
      if (data.error) { setErr(data.error); setBusy(false); return; }
      const raw = (data.text || "").replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(raw);
      if (!parsed.actions || !parsed.actions.length) { setErr(parsed.summary || "Couldn't read that. Try naming the subject and the date."); }
      else { onApply(parsed.actions); setResult(parsed.summary); setText(""); }
    } catch (e) {
      setErr("That didn't go through. Check your connection and try again.");
    }
    setBusy(false);
  };

  return (
    <Card>
      <Eyebrow>Tell it what changed</Eyebrow>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          placeholder="Software Dev SAC worth 10% this Friday"
          style={{ ...inputStyle, fontFamily: SANS, fontSize: 14 }} />
        <Btn onClick={send} active={!busy} style={{ padding: "9px 15px", opacity: busy ? .5 : 1 }}>
          {busy ? "…" : <Plus size={14} />}
        </Btn>
      </div>
      {result && <div style={{ fontSize: 12.5, color: C.moss, marginTop: 9, lineHeight: 1.5 }}>{result}</div>}
      {err && <div style={{ fontSize: 12.5, color: C.signal, marginTop: 9, lineHeight: 1.5 }}>{err}</div>}
      {!result && !err && (
        <div style={{ fontSize: 11.5, color: C.dim, marginTop: 9, lineHeight: 1.5 }}>
          Also works for: "got 31/40 on Motion", "did 90 mins of methods", "gym done", "physics exam moved to Nov 13".
        </div>
      )}
    </Card>
  );
}

/* ============================== STATUS RAIL ============================== */
function StatusRail({ day, streak, upcoming, state }) {
  const score = dayScore(day);
  const tier = tierFor(streak);
  const studyM = day.study || 0, devM = day.dev || 0;
  const wk = weekStats(state.days, key(mondayOf(new Date())));

  const line = (label, value, colour) => (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "3px 0" }}>
      <span style={{ color: C.dim }}>{label}</span>
      <span style={{ fontFamily: MONO, color: colour || C.bone }}>{value}</span>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card style={{ padding: 13 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <Flame size={19} color={streak > 0 ? C.signal : C.dim} />
            <span style={{ fontFamily: MONO, fontSize: 22, color: C.bone, lineHeight: 1 }}>{streak}</span>
            <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim, letterSpacing: .8 }}>{tier.name.toUpperCase()}</span>
          </div>
          <span style={{ fontFamily: MONO, fontSize: 20, color: score >= .8 ? C.moss : score >= .5 ? C.amber : C.signal }}>
            {Math.round(score * 100)}%
          </span>
        </div>
        <div style={{ height: 5, background: C.rule, borderRadius: 3, marginBottom: 11 }}>
          <div style={{ height: "100%", width: `${score * 100}%`, background: score >= .8 ? C.moss : score >= .5 ? C.amber : C.signal, borderRadius: 3, transition: "width .4s" }} />
        </div>
        {line("Study", `${fmtHM(studyM)} / 1h`, studyM >= TARGETS.studyMin ? C.moss : C.steel)}
        {line("Development", `${fmtHM(devM)} / 45m`, devM >= TARGETS.devMin ? C.moss : C.violet)}
        {line("Deep work", fmtHM(studyM + devM))}
      </Card>

      <Card style={{ padding: 13 }}>
        <Eyebrow>Checklist</Eyebrow>
        {TOGGLES.map((t) => (
          <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, padding: "3px 0" }}>
            <span style={{ color: day[t.id] ? C.bone : C.dim }}>{t.label}</span>
            {day[t.id]
              ? <Check size={14} color={C.moss} />
              : <span style={{ fontFamily: MONO, fontSize: 12, color: C.rule }}>—</span>}
          </div>
        ))}
      </Card>

      <Card style={{ padding: 13 }}>
        <Eyebrow>What's coming</Eyebrow>
        {upcoming.length === 0
          ? <div style={{ fontSize: 12.5, color: C.dim }}>Nothing scheduled ahead.</div>
          : upcoming.slice(0, 7).map((u, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "4px 0", borderBottom: i < Math.min(6, upcoming.length - 1) ? `1px solid ${C.rule}` : "none" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: u.days <= 7 ? C.bone : C.dim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {u.subject}
                </div>
                <div style={{ fontSize: 11, color: C.dim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.name}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontFamily: MONO, fontSize: 15, lineHeight: 1.1, color: u.days <= 7 ? C.signal : u.days <= 21 ? C.amber : C.dim }}>{u.days}d</div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: C.rule }}>{u.kind === "exam" ? "EXAM" : "SAC"}</div>
              </div>
            </div>
          ))}
      </Card>

      <Card style={{ padding: 13 }}>
        <Eyebrow>Week so far</Eyebrow>
        {wk.rows.map((r) => {
          const p = Math.min(1, r.a / r.t);
          return (
            <div key={r.l} style={{ marginBottom: 7 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 3 }}>
                <span style={{ color: C.dim }}>{r.l}</span>
                <span style={{ fontFamily: MONO, color: p >= 1 ? C.moss : C.bone }}>
                  {r.l === "Study" || r.l === "Development" ? r.a.toFixed(1) + "h" : r.a}/{r.t}
                </span>
              </div>
              <div style={{ height: 3, background: C.rule, borderRadius: 2 }}>
                <div style={{ height: "100%", width: `${p * 100}%`, background: p >= 1 ? C.moss : C.steel, borderRadius: 2 }} />
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

/* ============================== TODAY ============================== */
function Today({ day, setDay, streak, upcoming, state, onApply }) {
  const [runStudy, setRunStudy] = useState(false);
  const [runDev, setRunDev] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(null);

  useEffect(() => {
    if (!runStudy && !runDev) return;
    startRef.current = Date.now();
    const i = setInterval(() => setElapsed(Date.now() - startRef.current), 1000);
    return () => clearInterval(i);
  }, [runStudy, runDev]);

  const stopInto = (f) => { setDay({ ...day, [f]: (day[f] || 0) + (Date.now() - startRef.current) / 60000 }); setElapsed(0); };

  const block = (label, field, ratingField, target, accent, running, setRunning, setOther) => {
    const mins = day[field] || 0, met = mins >= target;
    return (
      <Card style={{ flex: 1, minWidth: 250 }}>
        <Eyebrow right={<span style={{ fontFamily: MONO, fontSize: 10, color: met ? C.moss : C.dim }}>{met ? "TARGET MET" : `${Math.round(target - mins)}m TO GO`}</span>}>{label}</Eyebrow>
        <div style={{ fontFamily: MONO, fontSize: 34, color: running ? C.signal : C.bone, letterSpacing: -1, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
          {fmt(mins + (running ? elapsed / 60000 : 0))}
        </div>
        <div style={{ height: 4, background: C.rule, borderRadius: 2, margin: "12px 0 10px" }}>
          <div style={{ height: "100%", width: `${Math.min(1, mins / target) * 100}%`, background: met ? C.moss : accent, borderRadius: 2, transition: "width .4s" }} />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          <Btn active={running} style={{ display: "flex", alignItems: "center", gap: 5 }}
            onClick={() => { if (running) { stopInto(field); setRunning(false); } else { setOther(false); setRunning(true); } }}>
            {running ? <Square size={12} /> : <Play size={12} />}{running ? "Stop" : "Start"}
          </Btn>
          {[15, 30, 60].map((m) => <Btn key={m} onClick={() => setDay({ ...day, [field]: Math.max(0, mins + m) })}>+{m}m</Btn>)}
          <Btn onClick={() => setDay({ ...day, [field]: Math.max(0, mins - 15) })}><Minus size={12} /></Btn>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim, letterSpacing: 1, marginBottom: 7 }}>HOW MUCH DID YOU ACTUALLY GET DONE?</div>
        <Rating value={day[ratingField] || 0} color={accent} onChange={(v) => setDay({ ...day, [ratingField]: v })} />
      </Card>
    );
  };

  const tier = tierFor(streak), score = dayScore(day);
  return (
    <div className="los-split">
      <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
        <QuickAdd state={state} onApply={onApply} />
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {block("Study", "study", "studyRating", TARGETS.studyMin, C.steel, runStudy, setRunStudy, setRunDev)}
          {block("Development", "dev", "devRating", TARGETS.devMin, C.violet, runDev, setRunDev, setRunStudy)}
        </div>

        <Card>
          <Eyebrow>Daily checks</Eyebrow>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {TOGGLES.map((t) => {
              const on = !!day[t.id], Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setDay({ ...day, [t.id]: !on })} style={{
                  display: "flex", alignItems: "center", gap: 7, padding: "9px 13px",
                  background: on ? "rgba(79,180,119,.12)" : C.plate2, border: `1px solid ${on ? C.moss : C.rule}`,
                  borderRadius: 8, color: on ? C.moss : C.dim, cursor: "pointer", fontSize: 13,
                  fontFamily: SANS, fontWeight: on ? 600 : 400, transition: "all .15s",
                }}><Icon size={14} />{t.label}</button>
              );
            })}
          </div>
        </Card>

        <Card>
          <Eyebrow>What did you actually do today?</Eyebrow>
          <textarea value={day.note || ""} onChange={(e) => setDay({ ...day, note: e.target.value })}
            placeholder="Fixed the conveyor spawner race condition. Methods — probability revision, still shaky on conditional. Legs, PB on squat."
            rows={5} style={{ width: "100%", background: C.plate2, color: C.bone, border: `1px solid ${C.rule}`, borderRadius: 8, padding: 11, fontSize: 14, fontFamily: SANS, lineHeight: 1.55, resize: "vertical", boxSizing: "border-box" }} />
        </Card>
      </div>

      <StatusRail day={day} streak={streak} upcoming={upcoming} state={state} />
    </div>
  );
}

/* ============================== VCE ============================== */
function VCE({ state, setState }) {
  const vce = state.vce;
  const [open, setOpen] = useState(vce.subjects[0]?.id);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const patchSubject = (subId, fn) => setState({
    ...state,
    vce: { ...vce, subjects: vce.subjects.map((s) => (s.id === subId ? fn({ ...s }) : s)) },
  });

  const update = (subId, unit, sacId, field, value) =>
    patchSubject(subId, (s) => ({
      ...s,
      units: {
        ...s.units,
        [unit]: s.units[unit].map((x) =>
          x.id !== sacId ? x : { ...x, [field]: value === "" ? null : (field === "name" || field === "date" ? value : Number(value)) }),
      },
    }));

  const addSac = (subId, unit) =>
    patchSubject(subId, (s) => ({
      ...s,
      units: {
        ...s.units,
        [unit]: [...(s.units[unit] || []), { id: "sac_" + Date.now(), name: "New SAC", mark: null, total: null, date: null, weight: null }],
      },
    }));

  const removeSac = (subId, unit, sacId) => {
    patchSubject(subId, (s) => ({ ...s, units: { ...s.units, [unit]: s.units[unit].filter((x) => x.id !== sacId) } }));
    setConfirmDel(null);
  };

  const moveSac = (subId, unit, idx, dir) =>
    patchSubject(subId, (s) => {
      const arr = [...s.units[unit]], j = idx + dir;
      if (j < 0 || j >= arr.length) return s;
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      return { ...s, units: { ...s.units, [unit]: arr } };
    });

  const addExam = (subId) =>
    patchSubject(subId, (s) => ({ ...s, exams: [...(s.exams || []), { name: "New exam", date: key(new Date()), time: "", location: null }] }));

  const updateExam = (subId, i, field, value) =>
    patchSubject(subId, (s) => ({ ...s, exams: s.exams.map((x, k) => (k === i ? { ...x, [field]: value } : x)) }));

  const removeExam = (subId, i) =>
    patchSubject(subId, (s) => ({ ...s, exams: s.exams.filter((_, k) => k !== i) }));

  const setField = (id, field, v) => patchSubject(id, (s) => ({ ...s, [field]: v === "" ? null : (field === "name" ? v : Number(v)) }));

  const addSubject = () => {
    const id = "sub_" + Date.now();
    setState({
      ...state,
      vce: {
        ...vce,
        subjects: [...vce.subjects, {
          id, name: "New subject", completed: false, raw: null, rank: null, cohort: null,
          weights: { u3: 25, u4: 25, exam: 50 }, exams: [], units: { 3: [], 4: [] },
        }],
      },
    });
    setOpen(id); setEditing(id);
  };

  const removeSubject = (subId) => {
    setState({ ...state, vce: { ...vce, subjects: vce.subjects.filter((s) => s.id !== subId) } });
    setConfirmDel(null);
  };

  const projected = vce.subjects.map((s) => {
    const est = ssFromRank(s.rank, s.cohort);
    const raw = est ?? s.raw ?? 0;
    return { ...s, estFromRank: est, effRaw: raw, sc: scaleScore(s.id, raw) };
  });
  const agg = aggregate(projected.map((s) => ({ ...s, scaled: s.sc })));
  const est = agg ? atarFor(agg.total) : 0;

  const smallInput = { ...inputStyle, padding: "5px 7px", fontSize: 12.5 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="los-split">
        <Card style={{ padding: 18 }}>
          <Eyebrow right={<span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>AGG {agg ? agg.total : "—"}</span>}>Estimated ATAR</Eyebrow>
          <div style={{ fontFamily: MONO, fontSize: 48, color: C.signal, lineHeight: 1.05, fontVariantNumeric: "tabular-nums" }}>{est.toFixed(2)}</div>
          {agg && (
            <div style={{ fontFamily: MONO, fontSize: 12.5, lineHeight: 1.85, color: C.bone, marginTop: 12, borderTop: `1px solid ${C.rule}`, paddingTop: 10 }}>
              <div><span style={{ color: C.steel }}>{agg.eng.name}</span> {agg.eng.sc} <span style={{ color: C.dim }}>· English, compulsory</span></div>
              {agg.top3.map((s) => <div key={s.id}>{s.name} {s.sc}</div>)}
              <div style={{ color: C.moss, marginTop: 4 }}>Primary four = {Math.round(agg.primary * 10) / 10}</div>
              {agg.inc.map((s) => <div key={s.id} style={{ color: C.dim }}>{s.name} {s.sc} × 10% = {(s.sc * 0.1).toFixed(1)}</div>)}
            </div>
          )}
        </Card>

        <Card style={{ padding: 14 }}>
          <Eyebrow>How this is worked out</Eyebrow>
          <div style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.65 }}>
            <p style={{ margin: "0 0 9px" }}>
              <strong style={{ color: C.bone }}>Rank → study score.</strong> Your percentile goes through an
              inverse-normal onto {SCHOOL.name}'s distribution (median {SCHOOL.medianSS}, SD {SCHOOL.sd}).
            </p>
            <p style={{ margin: "0 0 9px" }}>
              <strong style={{ color: C.bone }}>Study score → scaled.</strong> Applied as a curve across seven
              anchor points, not a flat offset.
            </p>
            <p style={{ margin: 0 }}>
              <strong style={{ color: C.bone }}>Scaled → ATAR.</strong> English + next three + 10% of the fifth and sixth.
            </p>
          </div>
        </Card>
      </div>

      <Card style={{ padding: 14 }}>
        <Eyebrow right={<span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>RANK / COHORT → SS → SCALED</span>}>Projections</Eyebrow>
        {projected.map((s) => (
          <div key={s.id} style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 7, flexWrap: "wrap" }}>
            <span style={{ flex: "1 1 140px", fontSize: 13.5, color: C.bone, minWidth: 0 }}>
              {s.name}{s.isEnglish && <span style={{ fontFamily: MONO, fontSize: 9, color: C.steel, marginLeft: 5 }}>ENG</span>}
            </span>
            <input value={s.rank ?? ""} onChange={(e) => setField(s.id, "rank", e.target.value)} placeholder="rank" inputMode="numeric"
              style={{ ...smallInput, flex: "0 0 54px", textAlign: "center" }} />
            <span style={{ color: C.dim, fontSize: 12 }}>/</span>
            <input value={s.cohort ?? ""} onChange={(e) => setField(s.id, "cohort", e.target.value)} placeholder="of" inputMode="numeric"
              style={{ ...smallInput, flex: "0 0 54px", textAlign: "center" }} />
            <span style={{ color: C.dim, fontSize: 12 }}>→</span>
            <input value={s.estFromRank ?? s.raw ?? ""} onChange={(e) => setField(s.id, "raw", e.target.value)}
              disabled={s.estFromRank !== null} inputMode="numeric"
              style={{ ...smallInput, flex: "0 0 54px", textAlign: "center", opacity: s.estFromRank !== null ? .6 : 1 }} />
            <span style={{ color: C.dim, fontSize: 12 }}>→</span>
            <span style={{ fontFamily: MONO, fontSize: 15, color: C.moss, flex: "0 0 46px", textAlign: "right" }}>{s.sc}</span>
          </div>
        ))}
        <div style={{ fontSize: 11.5, color: C.dim, lineHeight: 1.55, borderTop: `1px solid ${C.rule}`, paddingTop: 9, marginTop: 4 }}>
          Leave rank blank to type a study score by hand. Filling in rank overrides it.
        </div>
      </Card>

      <div className="los-cols">
        {vce.subjects.map((sub) => {
          const avg = subjectAvg(sub);
          const u3 = unitAvg(sub.units[3]), u4 = unitAvg(sub.units[4]);
          const isOpen = open === sub.id;
          const isEditing = editing === sub.id;
          return (
            <Card key={sub.id} style={{ padding: 0, overflow: "hidden", alignSelf: "start" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 14px" }}>
                <button onClick={() => setOpen(isOpen ? null : sub.id)} style={{
                  flex: 1, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0, minWidth: 0,
                }}>
                  <div style={{ fontSize: 15, color: C.bone, fontWeight: 600 }}>
                    {sub.name}{sub.completed && <span style={{ fontFamily: MONO, fontSize: 10, color: C.moss, marginLeft: 8 }}>DONE · SS {sub.raw}</span>}
                  </div>
                  {!sub.completed && (
                    <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim, marginTop: 3 }}>
                      U3 {u3 ? Math.round(u3.pct * 100) + "%" : "—"} · U4 {u4 ? Math.round(u4.pct * 100) + "%" : "—"}
                      {avg && avg.pending > 0 && <span style={{ color: C.amber }}> · {avg.pending} pending</span>}
                    </div>
                  )}
                </button>
                <button onClick={() => { setEditing(isEditing ? null : sub.id); setOpen(sub.id); setConfirmDel(null); }}
                  style={{
                    background: isEditing ? C.signal : "none", color: isEditing ? C.ink : C.dim,
                    border: `1px solid ${isEditing ? C.signal : C.rule}`, borderRadius: 6,
                    padding: "4px 9px", fontSize: 11.5, cursor: "pointer", fontFamily: SANS, flexShrink: 0,
                  }}>{isEditing ? "Done" : "Edit"}</button>
                <span style={{ fontFamily: MONO, fontSize: 22, flexShrink: 0, minWidth: 34, textAlign: "right", color: avg ? (avg.pct >= .8 ? C.moss : avg.pct >= .6 ? C.amber : C.signal) : C.dim }}>
                  {avg ? Math.round(avg.pct * 100) : "—"}
                </span>
              </div>

              {isOpen && (
                <div style={{ padding: "0 14px 14px" }}>
                  {isEditing && (
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
                      <input value={sub.name} onChange={(e) => setField(sub.id, "name", e.target.value)}
                        style={{ ...smallInput, fontFamily: SANS, flex: "1 1 140px" }} />
                      {confirmDel === "sub:" + sub.id ? (
                        <>
                          <Btn onClick={() => removeSubject(sub.id)} style={{ borderColor: C.signal, color: C.signal, padding: "5px 9px", fontSize: 12 }}>Delete subject</Btn>
                          <Btn onClick={() => setConfirmDel(null)} style={{ padding: "5px 9px", fontSize: 12 }}>Cancel</Btn>
                        </>
                      ) : (
                        <Btn onClick={() => setConfirmDel("sub:" + sub.id)} style={{ padding: "5px 9px", fontSize: 12 }}>Remove subject</Btn>
                      )}
                    </div>
                  )}

                  {[3, 4].map((u) => (
                    <div key={u} style={{ marginBottom: 12 }}>
                      <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim, letterSpacing: 1.2, marginBottom: 7 }}>UNIT {u}</div>
                      {(sub.units[u] || []).map((s, idx) => {
                        const d = s.date ? Math.ceil((parseKey(s.date) - new Date()) / 86400000) : null;
                        const future = d !== null && d >= 0;
                        const delKey = `sac:${sub.id}:${u}:${s.id}`;
                        return (
                          <div key={s.id} style={{ marginBottom: isEditing ? 10 : 6 }}>
                            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                              {isEditing ? (
                                <input value={s.name} onChange={(e) => update(sub.id, u, s.id, "name", e.target.value)}
                                  style={{ ...smallInput, fontFamily: SANS, flex: "1 1 120px" }} />
                              ) : (
                                <span style={{ flex: "1 1 130px", fontSize: 13, color: s.mark === null ? C.dim : C.bone, minWidth: 0 }}>
                                  {s.name}
                                  {s.weight ? <span style={{ fontFamily: MONO, fontSize: 10, color: C.violet, marginLeft: 6 }}>{s.weight}%</span> : null}
                                  {future && <span style={{ fontFamily: MONO, fontSize: 10, color: d <= 7 ? C.signal : C.amber, marginLeft: 6 }}>in {d}d</span>}
                                </span>
                              )}
                              <input value={s.mark ?? ""} onChange={(e) => update(sub.id, u, s.id, "mark", e.target.value)}
                                placeholder="—" inputMode="decimal" style={{ ...smallInput, flex: "0 0 54px", textAlign: "center" }} />
                              <span style={{ color: C.dim, fontFamily: MONO, fontSize: 13 }}>/</span>
                              <input value={s.total ?? ""} onChange={(e) => update(sub.id, u, s.id, "total", e.target.value)}
                                placeholder="—" inputMode="decimal" style={{ ...smallInput, flex: "0 0 54px", textAlign: "center" }} />
                              <span style={{ fontFamily: MONO, fontSize: 12, color: s.mark > s.total ? C.signal : C.dim, flex: "0 0 40px", textAlign: "right" }}>
                                {s.mark !== null && s.total ? Math.round((s.mark / s.total) * 100) + "%" : ""}
                              </span>
                            </div>

                            {isEditing && (
                              <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 5, flexWrap: "wrap" }}>
                                <input type="date" value={s.date || ""} onChange={(e) => update(sub.id, u, s.id, "date", e.target.value)}
                                  style={{ ...smallInput, flex: "0 0 140px" }} />
                                <input value={s.weight ?? ""} onChange={(e) => update(sub.id, u, s.id, "weight", e.target.value)}
                                  placeholder="% of SS" inputMode="decimal" style={{ ...smallInput, flex: "0 0 80px", textAlign: "center" }} />
                                <Btn onClick={() => moveSac(sub.id, u, idx, -1)} style={{ padding: "4px 8px", fontSize: 12 }}>↑</Btn>
                                <Btn onClick={() => moveSac(sub.id, u, idx, 1)} style={{ padding: "4px 8px", fontSize: 12 }}>↓</Btn>
                                {confirmDel === delKey ? (
                                  <>
                                    <Btn onClick={() => removeSac(sub.id, u, s.id)} style={{ borderColor: C.signal, color: C.signal, padding: "4px 9px", fontSize: 12 }}>Confirm</Btn>
                                    <Btn onClick={() => setConfirmDel(null)} style={{ padding: "4px 9px", fontSize: 12 }}>Cancel</Btn>
                                  </>
                                ) : (
                                  <Btn onClick={() => setConfirmDel(delKey)} style={{ padding: "4px 8px", fontSize: 12 }}><X size={12} /></Btn>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {isEditing && (
                        <Btn onClick={() => addSac(sub.id, u)} style={{ padding: "5px 10px", fontSize: 12, marginTop: 4 }}>
                          <Plus size={11} /> Add SAC to Unit {u}
                        </Btn>
                      )}
                    </div>
                  ))}

                  {((sub.exams || []).length > 0 || isEditing) && (
                    <div style={{ borderTop: `1px solid ${C.rule}`, paddingTop: 10, marginBottom: 10 }}>
                      <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim, letterSpacing: 1.2, marginBottom: 7 }}>EXAMS</div>
                      {(sub.exams || []).map((x, i) => {
                        const d = Math.ceil((parseKey(x.date) - new Date()) / 86400000);
                        return isEditing ? (
                          <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                            <input value={x.name} onChange={(e) => updateExam(sub.id, i, "name", e.target.value)}
                              style={{ ...smallInput, fontFamily: SANS, flex: "1 1 90px" }} />
                            <input type="date" value={x.date || ""} onChange={(e) => updateExam(sub.id, i, "date", e.target.value)}
                              style={{ ...smallInput, flex: "0 0 140px" }} />
                            <input value={x.time || ""} onChange={(e) => updateExam(sub.id, i, "time", e.target.value)}
                              placeholder="time" style={{ ...smallInput, flex: "0 0 80px" }} />
                            <Btn onClick={() => removeExam(sub.id, i)} style={{ padding: "4px 8px", fontSize: 12 }}><X size={12} /></Btn>
                          </div>
                        ) : (
                          <div key={i} style={{ marginBottom: 6 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, gap: 8 }}>
                              <span style={{ color: C.bone }}>{x.name}</span>
                              <span style={{ fontFamily: MONO, fontSize: 12, color: C.dim, textAlign: "right" }}>
                                {parseKey(x.date).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}
                                {x.time ? ` · ${x.time}` : ""}<span style={{ color: C.steel }}> · {d}d</span>
                              </span>
                            </div>
                            {x.location && <div style={{ fontSize: 11.5, color: C.amber, marginTop: 2, lineHeight: 1.4 }}>{x.location}</div>}
                          </div>
                        );
                      })}
                      {isEditing && (
                        <Btn onClick={() => addExam(sub.id)} style={{ padding: "5px 10px", fontSize: 12, marginTop: 4 }}>
                          <Plus size={11} /> Add exam
                        </Btn>
                      )}
                    </div>
                  )}

                  {(() => {
                    const st = standing(sub);
                    if (!st) return null;
                    return (
                      <div style={{ borderTop: `1px solid ${C.rule}`, paddingTop: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 10, color: C.dim, letterSpacing: 1.2, marginBottom: 6 }}>
                          <span>LOCKED IN {st.assessed}%</span><span>STILL AHEAD {st.remaining}%</span>
                        </div>
                        <div style={{ height: 6, background: C.rule, borderRadius: 3, display: "flex", overflow: "hidden" }}>
                          <div style={{ width: `${st.assessed}%`, background: st.pct >= .75 ? C.moss : st.pct >= .6 ? C.amber : C.signal }} />
                          <div style={{ width: `${st.remaining}%`, background: C.plate2 }} />
                        </div>
                        <div style={{ fontSize: 12, color: C.dim, marginTop: 7, lineHeight: 1.5 }}>
                          {st.pct !== null && <>Sitting at <span style={{ color: C.bone, fontFamily: MONO }}>{Math.round(st.pct * 100)}%</span> on what's been assessed. </>}
                          The exam alone is <span style={{ color: C.bone, fontFamily: MONO }}>{st.examWeight}%</span> of this subject.
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Btn onClick={addSubject} style={{ alignSelf: "start" }}><Plus size={13} /> Add subject</Btn>

      <Card style={{ borderColor: C.amber, padding: 14 }}>
        <Eyebrow>Where this gets shaky</Eyebrow>
        <div style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.65 }}>
          The aggregate arithmetic is exact. Everything feeding it is an estimate.
          Your rank only sets your <em>moderated SAC</em> component — the exam is scored against the whole state and is
          50–66% of every subject. Scaling is last year's curve, and the ATAR conversion is interpolated, so ±2.
          Indonesian runs through VSL, not {SCHOOL.name}, so it's a different cohort entirely.
        </div>
      </Card>
    </div>
  );
}
/* ============================== DASHBOARD ============================== */
function Dashboard({ state, meta, viewDate }) {
  const [hover, setHover] = useState(null);
  const days = state.days;

  const daily = useMemo(() => {
    const out = [];
    for (let i = 29; i >= 0; i--) {
      const k = key(addDays(new Date(), -i)), d = days[k];
      out.push({ k, label: parseKey(k).getDate(), study: hrs(d?.study || 0), dev: hrs(d?.dev || 0) });
    }
    return out;
  }, [days]);

  const weekly = useMemo(() => {
    const out = [];
    for (let i = 5; i >= 0; i--) {
      const mk = key(mondayOf(addDays(new Date(), -i * 7))), w = weekStats(days, mk);
      out.push({ k: mk, label: parseKey(mk).toLocaleDateString("en-AU", { day: "numeric", month: "short" }), pct: Math.round(w.score * 100), study: hrs(w.study), dev: hrs(w.dev) });
    }
    return out;
  }, [days]);

  const thisWeek = useMemo(() => weekStats(days, key(mondayOf(new Date()))), [days]);
  const donut = [
    { name: "Done", value: Math.round(thisWeek.score * 100), fill: C.moss },
    { name: "Left", value: 100 - Math.round(thisWeek.score * 100), fill: C.rule },
  ];
  const month = useMemo(() => {
    const y = viewDate.getFullYear(), m = viewDate.getMonth();
    const firstDow = (new Date(y, m, 1).getDay() + 6) % 7, n = new Date(y, m + 1, 0).getDate();
    const cells = Array(firstDow).fill(null);
    for (let i = 1; i <= n; i++) cells.push(key(new Date(y, m, i)));
    return cells;
  }, [viewDate]);

  const habitBars = useMemo(() => {
    const n = Object.keys(days).length || 1, all = Object.values(days);
    return [
      { l: "Study target", v: all.filter((d) => (d.study || 0) >= TARGETS.studyMin).length, n },
      { l: "Dev target", v: all.filter((d) => (d.dev || 0) >= TARGETS.devMin).length, n },
      { l: "Gym", v: cnt(state, "gym"), n }, { l: "Tennis", v: cnt(state, "tennis"), n },
      { l: "Creatine", v: cnt(state, "creatine"), n },
      { l: "Meds — day", v: cnt(state, "medDay"), n }, { l: "Meds — night", v: cnt(state, "medNight"), n },
    ].sort((a, b) => b.v / b.n - a.v / a.n);
  }, [days, state]);

  const yieldInsight = useMemo(() => {
    const rated = Object.values(days).filter((d) => d.studyRating > 0 && (d.study || 0) > 0);
    if (rated.length < 4) return null;
    const hi = rated.filter((d) => d.studyRating >= 4), lo = rated.filter((d) => d.studyRating <= 2);
    if (!hi.length || !lo.length) return null;
    const avg = (a) => Math.round(a.reduce((x, d) => x + d.study, 0) / a.length);
    return { hi: avg(hi), lo: avg(lo), hiN: hi.length, loN: lo.length };
  }, [days]);

  const heat = (k) => {
    const d = days[k];
    if (!d) return C.plate2;
    const t = (d.study || 0) + (d.dev || 0);
    return t >= 240 ? C.moss : t >= 120 ? "rgba(79,180,119,.62)" : t >= 45 ? "rgba(79,180,119,.34)" : t > 0 ? "rgba(79,180,119,.16)" : C.plate2;
  };
  const ChartTip = ({ active, payload }) => { if (active && payload?.length) setTimeout(() => setHover(payload[0].payload.k), 0); return null; };
  const earned = BADGES.filter((b) => b.test(state, meta));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <Card style={{ flex: "1 1 200px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 92, height: 92, position: "relative" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donut} dataKey="value" innerRadius={30} outerRadius={44} startAngle={90} endAngle={-270} stroke="none">
                  {donut.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 18, color: C.bone }}>
              {Math.round(thisWeek.score * 100)}%
            </div>
          </div>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim, letterSpacing: 1.2 }}>THIS WEEK</div>
            <div style={{ fontSize: 13, color: C.bone, marginTop: 5, lineHeight: 1.7 }}>
              <div><span style={{ fontFamily: MONO, color: C.steel }}>{hrs(thisWeek.study)}h</span> study</div>
              <div><span style={{ fontFamily: MONO, color: C.violet }}>{hrs(thisWeek.dev)}h</span> development</div>
              <div><span style={{ fontFamily: MONO }}>{hrs(thisWeek.study + thisWeek.dev)}h</span> deep work</div>
            </div>
          </div>
        </Card>
        <Card style={{ flex: "1 1 200px" }}>
          <Eyebrow>All time</Eyebrow>
          <div style={{ fontSize: 13, lineHeight: 1.8, color: C.bone }}>
            <div><span style={{ fontFamily: MONO, fontSize: 17 }}>{hrs(meta.totalDeep)}h</span> deep work logged</div>
            <div><span style={{ fontFamily: MONO, fontSize: 17 }}>{Object.keys(days).length}</span> days tracked</div>
            <div><span style={{ fontFamily: MONO, fontSize: 17 }}>{meta.bestStreak}</span> day best streak</div>
          </div>
        </Card>
      </div>

      <Card>
        <Eyebrow right={<span style={{ fontFamily: MONO, fontSize: 10 }}><span style={{ color: C.steel }}>■ STUDY</span> <span style={{ color: C.violet }}>■ DEV</span></span>}>Daily progress — 30 days (hours)</Eyebrow>
        <div style={{ height: 165 }} onMouseLeave={() => setHover(null)}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily} margin={{ top: 4, right: 0, left: -28, bottom: 0 }} barCategoryGap={2}>
              <XAxis dataKey="label" tick={{ fill: C.dim, fontSize: 9, fontFamily: MONO }} axisLine={false} tickLine={false} interval={2} />
              <YAxis tick={{ fill: C.dim, fontSize: 10, fontFamily: MONO }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(255,255,255,.05)" }} />
              <Bar dataKey="study" stackId="a" fill={C.steel} />
              <Bar dataKey="dev" stackId="a" fill={C.violet} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ borderTop: `1px solid ${C.rule}`, marginTop: 10, paddingTop: 10 }}>
          <DayDetail d={hover ? days[hover] : null} dateKey={hover} />
        </div>
      </Card>

      <Card>
        <Eyebrow>Weekly completion — last 6 weeks</Eyebrow>
        <div style={{ height: 145 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekly} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
              <CartesianGrid stroke={C.rule} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: C.dim, fontSize: 10, fontFamily: MONO }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: C.dim, fontSize: 10, fontFamily: MONO }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: C.plate2, border: `1px solid ${C.rule}`, borderRadius: 7, fontSize: 12, fontFamily: MONO }} labelStyle={{ color: C.dim }} cursor={{ fill: "rgba(255,255,255,.05)" }} />
              <Bar dataKey="pct" name="completion %" radius={[3, 3, 0, 0]}>
                {weekly.map((w, i) => <Cell key={i} fill={w.pct >= 80 ? C.moss : w.pct >= 50 ? C.amber : C.signal} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <Eyebrow>Study vs development — where the hours went</Eyebrow>
        <div style={{ height: 145 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weekly} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <CartesianGrid stroke={C.rule} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: C.dim, fontSize: 10, fontFamily: MONO }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.dim, fontSize: 10, fontFamily: MONO }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: C.plate2, border: `1px solid ${C.rule}`, borderRadius: 7, fontSize: 12, fontFamily: MONO }} labelStyle={{ color: C.dim }} />
              <Line type="monotone" dataKey="study" stroke={C.steel} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="dev" stroke={C.violet} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <Eyebrow right={<span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{viewDate.toLocaleDateString("en-AU", { month: "long", year: "numeric" }).toUpperCase()}</span>}>Month at a glance</Eyebrow>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }} onMouseLeave={() => setHover(null)}>
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <div key={i} style={{ fontFamily: MONO, fontSize: 9, color: C.dim, textAlign: "center", marginBottom: 2 }}>{d}</div>)}
          {month.map((k, i) => k === null ? <div key={i} /> : (
            <div key={i} onMouseEnter={() => setHover(k)} onClick={() => setHover(k)} style={{
              aspectRatio: "1", background: heat(k), borderRadius: 5, border: `1px solid ${hover === k ? C.signal : C.rule}`,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: MONO, fontSize: 10, color: days[k] ? C.ink : C.dim, transition: "border-color .12s",
            }}>{parseKey(k).getDate()}</div>
          ))}
        </div>
        <div style={{ borderTop: `1px solid ${C.rule}`, marginTop: 12, paddingTop: 10 }}>
          <DayDetail d={hover ? days[hover] : null} dateKey={hover} />
        </div>
      </Card>

      <Card>
        <Eyebrow>Habit analysis — all tracked days</Eyebrow>
        {habitBars.map((h) => {
          const p = h.v / h.n;
          return (
            <div key={h.l} style={{ marginBottom: 9 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: C.bone }}>{h.l}</span>
                <span style={{ fontFamily: MONO, color: C.dim }}>{h.v}/{h.n} · {Math.round(p * 100)}%</span>
              </div>
              <div style={{ height: 5, background: C.rule, borderRadius: 3 }}>
                <div style={{ height: "100%", width: `${p * 100}%`, borderRadius: 3, transition: "width .4s", background: p >= .8 ? C.moss : p >= .4 ? C.amber : C.signal }} />
              </div>
            </div>
          );
        })}
      </Card>

      {yieldInsight && (
        <Card style={{ borderColor: C.amber }}>
          <Eyebrow>Time vs yield</Eyebrow>
          <div style={{ fontSize: 13.5, color: C.bone, lineHeight: 1.65 }}>
            Your <strong>4–5 star</strong> study days averaged <span style={{ fontFamily: MONO, color: C.moss }}>{yieldInsight.hi}m</span> ({yieldInsight.hiN} days).
            Your <strong>1–2 star</strong> days averaged <span style={{ fontFamily: MONO, color: C.signal }}>{yieldInsight.lo}m</span> ({yieldInsight.loN} days).
          </div>
          <div style={{ fontSize: 12, color: C.dim, marginTop: 7, lineHeight: 1.5 }}>
            {yieldInsight.lo >= yieldInsight.hi
              ? "Longer sessions are scoring worse. Length isn't the problem — read the notes on the low days."
              : "Longer sessions are scoring better, so protecting block length is worth it."}
          </div>
        </Card>
      )}

      <Card>
        <Eyebrow>Achievements — {earned.length} / {BADGES.length}</Eyebrow>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 8 }}>
          {BADGES.map((b) => {
            const got = earned.includes(b);
            return (
              <div key={b.id} style={{ background: got ? "rgba(242,180,65,.08)" : C.plate2, border: `1px solid ${got ? C.amber : C.rule}`, borderRadius: 8, padding: 10, opacity: got ? 1 : .45 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <Trophy size={13} color={got ? C.amber : C.dim} />
                  <span style={{ fontSize: 12.5, color: got ? C.bone : C.dim, fontWeight: 600 }}>{b.name}</span>
                </div>
                <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.4 }}>{b.desc}</div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* ============================== LOG ============================== */
function Log({ state }) {
  const [q, setQ] = useState("");
  const rows = useMemo(() => Object.keys(state.days).sort().reverse().map((k) => ({ k, d: state.days[k] }))
    .filter(({ d }) => !q.trim() || (d.note || "").toLowerCase().includes(q.toLowerCase().trim())), [state.days, q]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <Card>
        <Eyebrow>Search your notes</Eyebrow>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. spawner, probability, squat"
          style={{ ...inputStyle, fontFamily: SANS, width: "100%", boxSizing: "border-box" }} />
      </Card>
      {rows.length === 0 && <Card><div style={{ fontSize: 13, color: C.dim }}>Nothing matches that. Try a shorter word.</div></Card>}
      {rows.map(({ k, d }) => {
        const total = (d.study || 0) + (d.dev || 0);
        return (
          <Card key={k} style={{ padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
              <span style={{ fontFamily: MONO, fontSize: 12.5, color: C.bone }}>{parseKey(k).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}</span>
              <span style={{ fontFamily: MONO, fontSize: 11.5 }}>
                <span style={{ color: C.steel }}>{hrs(d.study || 0)}h</span><span style={{ color: C.dim }}> · </span>
                <span style={{ color: C.violet }}>{hrs(d.dev || 0)}h</span><span style={{ color: C.dim }}> · </span>
                <span style={{ color: total >= 180 ? C.moss : C.dim }}>{hrs(total)}h total</span>
              </span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: (d.note || "").trim() ? 8 : 0 }}>
              {TOGGLES.filter((t) => d[t.id]).map((t) => <span key={t.id} style={{ fontFamily: MONO, fontSize: 10, color: C.moss, border: `1px solid ${C.rule}`, borderRadius: 4, padding: "2px 6px" }}>{t.label}</span>)}
              {d.studyRating > 0 && <span style={{ fontFamily: MONO, fontSize: 10, color: C.steel, border: `1px solid ${C.rule}`, borderRadius: 4, padding: "2px 6px" }}>study {d.studyRating}/5</span>}
              {d.devRating > 0 && <span style={{ fontFamily: MONO, fontSize: 10, color: C.violet, border: `1px solid ${C.rule}`, borderRadius: 4, padding: "2px 6px" }}>dev {d.devRating}/5</span>}
            </div>
            {(d.note || "").trim() && <div style={{ fontSize: 13.5, color: C.bone, lineHeight: 1.55 }}>{d.note}</div>}
          </Card>
        );
      })}
    </div>
  );
}

/* ============================== GYM ============================== */
function Gym({ state, setState, todayKey }) {
  const w = state.workouts[todayKey] || null;
  const [ex, setEx] = useState(EXERCISES[0]);
  const [wt, setWt] = useState(""); const [reps, setReps] = useState("");
  const history = useMemo(() => {
    const h = {};
    Object.entries(state.workouts).forEach(([dk, wo]) => (wo.exercises || []).forEach((e) => { (h[e.name] = h[e.name] || []).push(...e.sets.map((s) => ({ ...s, date: dk }))); }));
    return h;
  }, [state.workouts]);
  const best = (n) => { const s = history[n] || []; return s.length ? s.reduce((a, x) => (e1rm(x.weight, x.reps) > e1rm(a.weight, a.reps) ? x : a)) : null; };
  const addSet = () => {
    const W = parseFloat(wt), R = parseInt(reps, 10);
    if (!W || !R) return;
    const prev = best(ex), isPR = !prev || e1rm(W, R) > e1rm(prev.weight, prev.reps);
    const wo = state.workouts[todayKey] || { split: null, exercises: [] };
    const list = [...wo.exercises], i = list.findIndex((e) => e.name === ex);
    if (i >= 0) list[i] = { ...list[i], sets: [...list[i].sets, { weight: W, reps: R }] };
    else list.push({ name: ex, sets: [{ weight: W, reps: R }] });
    setState({
      ...state, workouts: { ...state.workouts, [todayKey]: { ...wo, exercises: list } },
      days: { ...state.days, [todayKey]: { ...(state.days[todayKey] || blank(todayKey)), gym: true } },
      prs: isPR ? [...(state.prs || []), { name: ex, weight: W, reps: R, date: todayKey }] : state.prs,
    });
    setWt(""); setReps("");
  };
  const cur = best(ex);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card>
        <Eyebrow>Log a set</Eyebrow>
        <select value={ex} onChange={(e) => setEx(e.target.value)} style={{ width: "100%", background: C.plate2, color: C.bone, border: `1px solid ${C.rule}`, borderRadius: 7, padding: "9px 10px", fontSize: 14, fontFamily: SANS, marginBottom: 10, boxSizing: "border-box" }}>
          {EXERCISES.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        {cur ? (
          <div style={{ background: C.plate2, border: `1px solid ${C.rule}`, borderRadius: 7, padding: 10, marginBottom: 10, display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim, letterSpacing: 1 }}>BEST SO FAR</div>
              <div style={{ fontFamily: MONO, fontSize: 18, color: C.bone }}>{cur.weight}kg × {cur.reps}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim, letterSpacing: 1 }}>BEAT IT WITH</div>
              <div style={{ fontFamily: MONO, fontSize: 18, color: C.signal }}>{cur.weight}kg × {cur.reps + 1}</div>
            </div>
          </div>
        ) : <div style={{ fontSize: 13, color: C.dim, marginBottom: 10 }}>No history for this lift yet. Your first set sets the benchmark.</div>}
        <div style={{ display: "flex", gap: 8 }}>
          <input value={wt} onChange={(e) => setWt(e.target.value)} placeholder="kg" inputMode="decimal" style={inputStyle} />
          <input value={reps} onChange={(e) => setReps(e.target.value)} placeholder="reps" inputMode="numeric" style={inputStyle} />
          <Btn onClick={addSet} active style={{ padding: "9px 16px" }}><Plus size={14} /></Btn>
        </div>
      </Card>
      <Card>
        <Eyebrow>Today's session</Eyebrow>
        {w && w.exercises.length ? w.exercises.map((e) => (
          <div key={e.name} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 14, color: C.bone, marginBottom: 5, fontWeight: 500 }}>{e.name}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {e.sets.map((s, i) => <span key={i} style={{ fontFamily: MONO, fontSize: 12, background: C.plate2, border: `1px solid ${C.rule}`, borderRadius: 5, padding: "4px 8px", color: C.bone }}>{s.weight}×{s.reps}</span>)}
            </div>
          </div>
        )) : <div style={{ fontSize: 13, color: C.dim }}>Nothing logged. Add a set above to start the session.</div>}
      </Card>
      {(state.prs || []).length > 0 && (
        <Card>
          <Eyebrow>Recent records</Eyebrow>
          {[...state.prs].reverse().slice(0, 6).map((p, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: i < 5 ? `1px solid ${C.rule}` : "none" }}>
              <span style={{ fontSize: 13, color: C.bone }}>{p.name}</span>
              <span style={{ fontFamily: MONO, fontSize: 13, color: C.signal }}>{p.weight}kg × {p.reps}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

/* ============================== BACKUP ============================== */
function Backup({ state, setState, storageOk, saveStatus, exportData }) {
  const [paste, setPaste] = useState("");
  const [msg, setMsg] = useState(null);
  const json = useMemo(() => JSON.stringify(state), [state]);

  const restore = () => {
    try {
      const parsed = JSON.parse(paste);
      if (!parsed.days) throw new Error("no days");
      if (!parsed.vce) parsed.vce = SEED_VCE;
      setState(parsed);
      setMsg({ ok: true, text: `Restored ${Object.keys(parsed.days).length} days.` });
      setPaste("");
    } catch { setMsg({ ok: false, text: "That isn't valid backup JSON." }); }
  };

  const copyOut = async () => {
    try { await navigator.clipboard.writeText(json); setMsg({ ok: true, text: "Copied to clipboard." }); }
    catch { setMsg({ ok: false, text: "Couldn't copy — select the text below manually." }); }
  };

  const loadFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { setPaste(String(r.result)); setMsg({ ok: true, text: "File loaded — press Restore." }); };
    r.readAsText(f);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 700 }}>
      <Card style={{ borderColor: storageOk ? C.moss : C.signal }}>
        <Eyebrow>Persistence check</Eyebrow>
        <div style={{ fontSize: 14, color: storageOk ? C.moss : C.signal, fontWeight: 600, marginBottom: 6 }}>
          {storageOk === null ? "Connecting…" : storageOk ? "Synced to your account" : "Not syncing — check your connection"}
        </div>
        <div style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.6 }}>
          {storageOk
            ? `Last action: ${saveStatus}. Saved against your account, so every signed-in device sees the same data. Export monthly anyway.`
            : "Changes are staying on this device only. Export a backup before closing, then check your connection."}
        </div>
      </Card>

      <Card>
        <Eyebrow>Export</Eyebrow>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <Btn onClick={exportData} active>Download backup file</Btn>
          <Btn onClick={copyOut}>Copy as text</Btn>
        </div>
        <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.55 }}>
          Downloads a .json file. Keep it in Drive. On phone, "Copy as text" then paste it into a note works better.
        </div>
        <textarea readOnly value={json} rows={4} onFocus={(e) => e.target.select()}
          style={{ width: "100%", marginTop: 10, background: C.plate2, color: C.dim, border: `1px solid ${C.rule}`, borderRadius: 7, padding: 9, fontSize: 10.5, fontFamily: MONO, resize: "vertical", boxSizing: "border-box" }} />
      </Card>

      <Card>
        <Eyebrow>Restore</Eyebrow>
        <input type="file" accept="application/json,.json" onChange={loadFile}
          style={{ fontSize: 12.5, color: C.dim, marginBottom: 10, width: "100%" }} />
        <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={4}
          placeholder="…or paste your backup JSON here"
          style={{ width: "100%", background: C.plate2, color: C.bone, border: `1px solid ${C.rule}`, borderRadius: 7, padding: 9, fontSize: 11, fontFamily: MONO, resize: "vertical", boxSizing: "border-box" }} />
        <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Btn onClick={restore} active={!!paste.trim()}>Restore</Btn>
          {msg && <span style={{ fontSize: 12.5, color: msg.ok ? C.moss : C.signal }}>{msg.text}</span>}
        </div>
        <div style={{ fontSize: 12, color: C.signal, marginTop: 10, lineHeight: 1.55 }}>
          Restoring replaces everything currently in the app.
        </div>
      </Card>
    </div>
  );
}

/* ============================== ROOT ============================== */
export default function LifeOS({ user }) {
  const [state, setState] = useState(null);
  const [tab, setTab] = useState("today");
  const [offset, setOffset] = useState(0);
  const [storageOk, setStorageOk] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle");
  const first = useRef(true);

  useEffect(() => {
    (async () => {
      try {
        const remote = await loadRemote(user.id);
        const base = remote || SEED;
        if (!base.vce) base.vce = SEED_VCE;
        if (!base.atlas) base.atlas = SEED_PROGRESS;
        setState(base);
        setStorageOk(true);
      } catch (e) {
        setState(SEED);
        setStorageOk(false);
      }
    })();
  }, [user.id]);

  useEffect(() => {
    if (!state || storageOk === null) return;
    if (first.current) { first.current = false; return; }
    setSaveStatus("saving");
    const t = setTimeout(async () => {
      try { await saveRemote(user.id, state); setSaveStatus("saved"); setStorageOk(true); }
      catch { setSaveStatus("failed"); setStorageOk(false); }
    }, 700);
    return () => clearTimeout(t);
  }, [state, storageOk, user.id]);

  const exportData = () => {
    try {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `lifeos-backup-${key(new Date())}.json`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (e) { alert("Export failed. Copy the JSON from the Backup tab instead."); }
  };

  const viewDate = useMemo(() => addDays(new Date(), offset), [offset]);
  const vk = key(viewDate);
  const meta = useMemo(() => (state ? computeMeta(state) : { bestStreak: 0, totalDeep: 0 }), [state]);
  const streak = useMemo(() => (state ? streakAt(state.days, key(new Date())) : 0), [state]);

  const upcoming = useMemo(() => {
    if (!state?.vce) return [];
    const out = [];
    state.vce.subjects.forEach((s) => {
      [3, 4].forEach((u) => (s.units[u] || []).forEach((x) => {
        if (!x.date || x.mark !== null) return;
        const d = Math.ceil((parseKey(x.date) - new Date()) / 86400000);
        if (d >= 0) out.push({ subject: s.name, name: x.name, days: d, date: x.date, kind: "sac" });
      }));
      (s.exams || []).forEach((x) => {
        const d = Math.ceil((parseKey(x.date) - new Date()) / 86400000);
        if (d >= 0) out.push({ subject: s.name, name: x.name, days: d, date: x.date, kind: "exam" });
      });
    });
    return out.sort((a, b) => a.days - b.days);
  }, [state]);

  const applyActions = (actions) => {
    setState((prev) => {
      let s = { ...prev, days: { ...prev.days }, vce: { ...prev.vce, subjects: prev.vce.subjects.map((x) => ({ ...x, units: { 3: [...(x.units[3] || [])], 4: [...(x.units[4] || [])] }, exams: [...(x.exams || [])] })) } };
      const tk = key(new Date());
      const today = () => (s.days[tk] = { ...(s.days[tk] || blank(tk)) });
      const sub = (id) => s.vce.subjects.find((x) => x.id === id);

      actions.forEach((a) => {
        if (a.type === "add_assessment") {
          const su = sub(a.subjectId); if (!su) return;
          const u = a.unit === 3 ? 3 : 4;
          su.units[u] = [...su.units[u], { ...S(a.name || "New SAC", null, a.total ?? null, a.date || null), weight: a.weight ?? null }];
        } else if (a.type === "add_exam") {
          const su = sub(a.subjectId); if (!su) return;
          su.exams = [...su.exams, E(a.name || "Exam", a.date, a.time || "", a.location)];
        } else if (a.type === "set_mark") {
          const su = sub(a.subjectId); if (!su) return;
          [3, 4].forEach((u) => {
            su.units[u] = su.units[u].map((x) =>
              x.name.toLowerCase().includes((a.name || "").toLowerCase()) && (a.name || "").length > 2
                ? { ...x, mark: a.mark ?? x.mark, total: a.total ?? x.total } : x);
          });
        } else if (a.type === "log_time") {
          const d = today();
          const f = a.field === "dev" ? "dev" : "study";
          d[f] = (d[f] || 0) + (Number(a.minutes) || 0);
        } else if (a.type === "set_habit") {
          const d = today();
          if (["gym", "tennis", "creatine", "medDay", "medNight"].includes(a.habit)) d[a.habit] = a.value !== false;
        } else if (a.type === "add_note") {
          const d = today();
          d.note = (d.note ? d.note + "\n" : "") + (a.text || "");
        }
      });
      return s;
    });
  };

  if (!state) return <div style={{ background: C.ink, color: C.dim, minHeight: 380, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 13 }}>Loading your log…</div>;

  const day = state.days[vk] || blank(vk);
  const setDay = (d) => setState({ ...state, days: { ...state.days, [vk]: d } });

  const TABS = [
    { id: "today", label: "Today", icon: Timer },
    { id: "dash", label: "Dashboard", icon: BarChart3 },
    { id: "vce", label: "VCE", icon: BookOpen },
    { id: "log", label: "Log", icon: FileText },
    { id: "gym", label: "Gym", icon: Dumbbell },
    { id: "atlas", label: "Atlas", icon: Globe },
    { id: "backup", label: "Backup", icon: Download },
  ];

  return (
    <div style={{ background: C.ink, minHeight: "100vh", padding: "14px 16px 28px", fontFamily: SANS, color: C.bone }}>
      <style>{`
        .los-wrap { max-width: 1500px; margin: 0 auto; }
        .los-split { display: grid; grid-template-columns: 1fr; gap: 14px; align-items: start; }
        .los-cols { display: grid; grid-template-columns: 1fr; gap: 14px; align-items: start; }
        @media (min-width: 900px) {
          .los-split { grid-template-columns: minmax(0,1fr) 300px; }
        }
        @media (min-width: 1250px) {
          .los-split { grid-template-columns: minmax(0,1fr) 340px; }
          .los-cols { grid-template-columns: 1fr 1fr; }
        }
        .los-wrap *:focus-visible { outline: 2px solid ${C.signal}; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { .los-wrap * { transition: none !important; } }
      `}</style>
      <div className="los-wrap">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 2.5, color: C.signal }}>TRAINING LOG</div>
            <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: -.4 }}>
              {viewDate.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span onClick={() => setTab("backup")} title="Storage status" style={{
              fontFamily: MONO, fontSize: 9.5, letterSpacing: .8, cursor: "pointer", marginRight: 6,
              padding: "4px 8px", borderRadius: 6, border: `1px solid ${storageOk === false ? C.signal : C.rule}`,
              color: storageOk === false ? C.signal : saveStatus === "saved" ? C.moss : C.dim,
            }}>{storageOk === false ? "NOT SAVING" : saveStatus === "saving" ? "SAVING…" : saveStatus === "saved" ? "SAVED" : "READY"}</span>
            <Btn onClick={() => setOffset(offset - 1)}><ChevronLeft size={15} /></Btn>
            <Btn onClick={() => setOffset(0)} active={offset === 0}>Today</Btn>
            <Btn onClick={() => setOffset(Math.min(0, offset + 1))} style={{ opacity: offset >= 0 ? .35 : 1 }}><ChevronRight size={15} /></Btn>
          </div>
        </div>

        <div style={{ display: "flex", gap: 2, marginBottom: 14, borderBottom: `1px solid ${C.rule}`, overflowX: "auto" }}>
          {TABS.map((t) => {
            const on = tab === t.id, Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "9px 12px", background: "none", border: "none",
                borderBottom: `2px solid ${on ? C.signal : "transparent"}`, color: on ? C.bone : C.dim, cursor: "pointer",
                fontSize: 13, fontWeight: on ? 600 : 400, fontFamily: SANS, whiteSpace: "nowrap", flexShrink: 0,
              }}><Icon size={14} />{t.label}</button>
            );
          })}
        </div>

        {tab === "today" && <Today day={day} setDay={setDay} streak={streak} upcoming={upcoming} state={state} onApply={applyActions} />}
        {tab === "dash" && <Dashboard state={state} meta={meta} viewDate={viewDate} />}
        {tab === "vce" && <VCE state={state} setState={setState} />}
        {tab === "log" && <Log state={state} />}
        {tab === "gym" && <Gym state={state} setState={setState} todayKey={vk} />}
        {tab === "atlas" && <Atlas progress={state.atlas || SEED_PROGRESS} setProgress={(p) => setState({ ...state, atlas: p })} />}
        {tab === "backup" && <Backup state={state} setState={setState} storageOk={storageOk} saveStatus={saveStatus} exportData={exportData} />}
      </div>
    </div>
  );
}
