"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { loadRemote, saveRemote } from "../lib/store";
import Atlas from "./Atlas";
import { MuscleMap, Goal, Fuel } from "./Body";
import { SEED_PROGRESS } from "../lib/atlas";
import {
  Flame, Dumbbell, BookOpen, Play, Square, Plus, Minus, Trophy, ChevronLeft,
  ChevronRight, Check, X, Timer, BarChart3, FileText, Activity, AlertTriangle, Download, Globe, ListChecks
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
const RANGES = [
  { id: "7", label: "7 days", days: 7 },
  { id: "30", label: "30 days", days: 30 },
  { id: "90", label: "90 days", days: 90 },
  { id: "all", label: "All time", days: null },
];

function Dashboard({ state, meta, viewDate }) {
  const [rangeId, setRangeId] = useState("30");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [hover, setHover] = useState(null);
  const days = state.days;

  /* ---- work out the window ---- */
  const { from, to, label, prevFrom, prevTo } = useMemo(() => {
    const today = new Date();
    if (customFrom && customTo) {
      const f = parseKey(customFrom), t = parseKey(customTo);
      const span = Math.max(1, Math.round((t - f) / 86400000) + 1);
      return {
        from: f, to: t, label: `${span} days`,
        prevFrom: addDays(f, -span), prevTo: addDays(f, -1),
      };
    }
    const r = RANGES.find((x) => x.id === rangeId) || RANGES[1];
    if (!r.days) {
      const keys = Object.keys(days).sort();
      const f = keys.length ? parseKey(keys[0]) : today;
      const span = Math.max(1, Math.round((today - f) / 86400000) + 1);
      return { from: f, to: today, label: `${span} days`, prevFrom: null, prevTo: null };
    }
    const f = addDays(today, -(r.days - 1));
    return {
      from: f, to: today, label: r.label,
      prevFrom: addDays(f, -r.days), prevTo: addDays(f, -1),
    };
  }, [rangeId, customFrom, customTo, days]);

  /* ---- totals for any window ---- */
  const sumRange = (f, t) => {
    if (!f || !t) return null;
    const out = { study: 0, dev: 0, gym: 0, tennis: 0, active: 0, n: 0, best: null, bestMin: 0 };
    let cur = new Date(f);
    while (cur <= t) {
      const k = key(cur);
      const d = days[k];
      out.n++;
      if (d) {
        out.study += d.study || 0;
        out.dev += d.dev || 0;
        if (d.gym) out.gym++;
        if (d.tennis) out.tennis++;
        const tot = (d.study || 0) + (d.dev || 0);
        if (tot > 0) out.active++;
        if (tot > out.bestMin) { out.bestMin = tot; out.best = k; }
      }
      cur = addDays(cur, 1);
    }
    out.total = out.study + out.dev;
    out.perDay = out.n ? out.total / out.n : 0;
    return out;
  };

  const cur = useMemo(() => sumRange(from, to), [from, to, days]);
  const prev = useMemo(() => sumRange(prevFrom, prevTo), [prevFrom, prevTo, days]);

  const delta = (a, b) => {
    if (b === null || b === undefined || !b) return null;
    return ((a - b) / b) * 100;
  };

  /* ---- daily series for the chart ---- */
  const series = useMemo(() => {
    const out = [];
    let cursor = new Date(from);
    while (cursor <= to) {
      const k = key(cursor);
      const d = days[k];
      out.push({
        k,
        label: parseKey(k).getDate(),
        study: Math.round(((d?.study || 0) / 60) * 10) / 10,
        dev: Math.round(((d?.dev || 0) / 60) * 10) / 10,
      });
      cursor = addDays(cursor, 1);
    }
    return out;
  }, [from, to, days]);

  /* ---- contribution grid: weeks as columns ---- */
  const grid = useMemo(() => {
    const start = addDays(from, -((from.getDay() + 6) % 7));
    const weeks = [];
    let cursor = new Date(start);
    while (cursor <= to) {
      const col = [];
      for (let i = 0; i < 7; i++) {
        const k = key(cursor);
        const inRange = cursor >= from && cursor <= to;
        col.push({ k, inRange, d: days[k] });
        cursor = addDays(cursor, 1);
      }
      weeks.push(col);
    }
    return weeks;
  }, [from, to, days]);

  const heat = (d) => {
    if (!d) return "#161B24";
    const t = (d.study || 0) + (d.dev || 0);
    if (t >= 240) return "#38D97E";
    if (t >= 150) return "#219E5C";
    if (t >= 75) return "#186B41";
    if (t > 0) return "#12452C";
    return "#161B24";
  };

  const hd = hover ? days[hover] : null;
  const splitPct = cur.total ? (cur.study / cur.total) * 100 : 50;

  const Stat = ({ label, value, unit, d, colour }) => (
    <div style={{ flex: "1 1 120px", minWidth: 108 }}>
      <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: 1.1, color: C.dim, marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
        <span style={{ fontFamily: MONO, fontSize: 23, color: colour || C.bone, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{value}</span>
        {unit && <span style={{ fontSize: 11.5, color: C.dim }}>{unit}</span>}
      </div>
      {d !== null && d !== undefined && isFinite(d) && (
        <div style={{ fontFamily: MONO, fontSize: 10.5, marginTop: 4, color: d >= 0 ? C.moss : C.signal }}>
          {d >= 0 ? "▲" : "▼"} {Math.abs(d).toFixed(0)}% <span style={{ color: C.dim }}>vs prev</span>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* range picker */}
      <Card style={{ padding: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {RANGES.map((r) => (
            <Btn key={r.id} active={!customFrom && rangeId === r.id}
              onClick={() => { setRangeId(r.id); setCustomFrom(""); setCustomTo(""); }}
              style={{ padding: "6px 11px", fontSize: 12.5 }}>{r.label}</Btn>
          ))}
          <span style={{ color: C.rule, margin: "0 2px" }}>|</span>
          <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
            style={{ ...inputStyle, flex: "0 0 138px", padding: "6px 8px", fontSize: 12.5 }} />
          <span style={{ color: C.dim, fontSize: 12 }}>to</span>
          <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
            style={{ ...inputStyle, flex: "0 0 138px", padding: "6px 8px", fontSize: 12.5 }} />
          {customFrom && customTo && (
            <Btn onClick={() => { setCustomFrom(""); setCustomTo(""); }} style={{ padding: "6px 9px", fontSize: 12 }}>Clear</Btn>
          )}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10.5, color: C.dim, marginTop: 9 }}>
          {from.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
          {" → "}
          {to.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
          {" · "}{label}
        </div>
      </Card>

      {/* headline numbers */}
      <Card>
        <Eyebrow right={prev ? <span style={{ fontFamily: MONO, fontSize: 9.5, color: C.dim }}>COMPARED WITH THE PREVIOUS {label.toUpperCase()}</span> : null}>
          Deep work in this window
        </Eyebrow>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          <Stat label="TOTAL" value={hrs(cur.total)} unit="h" d={prev ? delta(cur.total, prev.total) : null} />
          <Stat label="STUDY" value={hrs(cur.study)} unit="h" colour={C.steel} d={prev ? delta(cur.study, prev.study) : null} />
          <Stat label="DEVELOPMENT" value={hrs(cur.dev)} unit="h" colour={C.violet} d={prev ? delta(cur.dev, prev.dev) : null} />
          <Stat label="AVG PER DAY" value={fmtHM(cur.perDay)} d={prev ? delta(cur.perDay, prev.perDay) : null} />
          <Stat label="DAYS WORKED" value={`${cur.active}/${cur.n}`} d={prev ? delta(cur.active, prev.active) : null} />
          <Stat label="GYM" value={cur.gym} unit="sessions" colour={C.moss} d={prev ? delta(cur.gym, prev.gym) : null} />
        </div>
      </Card>

      {/* the split — the one number that matters most for you */}
      <Card>
        <Eyebrow right={
          <span style={{ fontFamily: MONO, fontSize: 11 }}>
            <span style={{ color: C.steel }}>{splitPct.toFixed(0)}% study</span>
            <span style={{ color: C.dim }}> / </span>
            <span style={{ color: C.violet }}>{(100 - splitPct).toFixed(0)}% dev</span>
          </span>
        }>Where the hours went</Eyebrow>
        <div style={{ display: "flex", height: 14, borderRadius: 4, overflow: "hidden", background: C.rule }}>
          <div style={{ width: `${splitPct}%`, background: C.steel, transition: "width .4s" }} />
          <div style={{ width: `${100 - splitPct}%`, background: C.violet, transition: "width .4s" }} />
        </div>
        <div style={{ fontSize: 12, color: C.dim, marginTop: 9, lineHeight: 1.5 }}>
          {cur.total === 0 ? "Nothing logged in this window."
            : splitPct >= 55 ? "Study is ahead of development in this window."
            : splitPct >= 45 ? "Roughly even split."
            : `Development is taking ${(cur.dev / Math.max(1, cur.study)).toFixed(1)}× the hours study is.`}
        </div>
      </Card>

      {/* daily bars */}
      <Card>
        <Eyebrow right={<span style={{ fontFamily: MONO, fontSize: 10 }}>
          <span style={{ color: C.steel }}>■ STUDY</span> <span style={{ color: C.violet }}>■ DEV</span>
        </span>}>Daily hours</Eyebrow>
        <div style={{ height: 180 }} onMouseLeave={() => setHover(null)}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} margin={{ top: 4, right: 0, left: -28, bottom: 0 }} barCategoryGap={series.length > 60 ? 0 : 2}>
              <CartesianGrid stroke={C.rule} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: C.dim, fontSize: 9, fontFamily: MONO }} axisLine={false} tickLine={false}
                interval={Math.max(0, Math.floor(series.length / 12))} />
              <YAxis tick={{ fill: C.dim, fontSize: 10, fontFamily: MONO }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "rgba(255,255,255,.05)" }}
                content={({ active, payload }) => {
                  if (active && payload?.length) setTimeout(() => setHover(payload[0].payload.k), 0);
                  return null;
                }} />
              <Bar dataKey="study" stackId="a" fill={C.steel} />
              <Bar dataKey="dev" stackId="a" fill={C.violet} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ borderTop: `1px solid ${C.rule}`, marginTop: 10, paddingTop: 10 }}>
          <DayDetail d={hd} dateKey={hover} />
        </div>
      </Card>

      {/* contribution grid */}
      <Card>
        <Eyebrow right={
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: MONO, fontSize: 9.5, color: C.dim }}>
            LESS
            {["#161B24", "#12452C", "#186B41", "#219E5C", "#38D97E"].map((c) => (
              <span key={c} style={{ width: 10, height: 10, background: c, borderRadius: 2, display: "inline-block" }} />
            ))}
            MORE
          </span>
        }>Every day in this window</Eyebrow>
        <div style={{ overflowX: "auto", paddingBottom: 4 }}>
          <div style={{ display: "flex", gap: 3, minWidth: "min-content" }}>
            {grid.map((week, wi) => (
              <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {week.map((cell) => (
                  <div key={cell.k}
                    onMouseEnter={() => cell.inRange && setHover(cell.k)}
                    title={cell.inRange ? parseKey(cell.k).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" }) : ""}
                    style={{
                      width: 13, height: 13, borderRadius: 3, flexShrink: 0,
                      background: cell.inRange ? heat(cell.d) : "transparent",
                      border: hover === cell.k ? `1px solid ${C.bone}` : "1px solid transparent",
                      cursor: cell.inRange ? "pointer" : "default",
                      transition: "border-color .12s",
                    }} />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: C.dim, marginTop: 9 }}>
          One column per week, Monday at the top. Hover to read the day back above.
        </div>
      </Card>

      {/* consistency + notable days */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <Card style={{ flex: "1 1 260px" }}>
          <Eyebrow>Habits in this window</Eyebrow>
          {[
            { l: "Gym", v: cur.gym, t: Math.round((cur.n / 7) * TARGETS.gymPerWeek) },
            { l: "Tennis", v: cur.tennis, t: Math.round((cur.n / 7) * TARGETS.tennisPerWeek) },
            { l: "Days worked", v: cur.active, t: cur.n },
          ].map((h) => {
            const p = h.t ? Math.min(1, h.v / h.t) : 0;
            return (
              <div key={h.l} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                  <span style={{ color: C.bone }}>{h.l}</span>
                  <span style={{ fontFamily: MONO, color: p >= 1 ? C.moss : C.dim }}>{h.v} / {h.t}</span>
                </div>
                <div style={{ height: 5, background: C.rule, borderRadius: 3 }}>
                  <div style={{ height: "100%", width: `${p * 100}%`, borderRadius: 3, background: p >= 1 ? C.moss : p >= .5 ? C.amber : C.signal, transition: "width .4s" }} />
                </div>
              </div>
            );
          })}
        </Card>

        <Card style={{ flex: "1 1 260px" }}>
          <Eyebrow>Notable</Eyebrow>
          <div style={{ fontSize: 13, lineHeight: 2, color: C.bone }}>
            <div>
              <span style={{ color: C.dim }}>Best day: </span>
              {cur.best
                ? <>{parseKey(cur.best).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}
                    <span style={{ fontFamily: MONO, color: C.moss }}> {fmtHM(cur.bestMin)}</span></>
                : "—"}
            </div>
            <div><span style={{ color: C.dim }}>Longest streak ever: </span><span style={{ fontFamily: MONO }}>{meta.bestStreak} days</span></div>
            <div><span style={{ color: C.dim }}>All-time deep work: </span><span style={{ fontFamily: MONO }}>{hrs(meta.totalDeep)}h</span></div>
            <div><span style={{ color: C.dim }}>Days on record: </span><span style={{ fontFamily: MONO }}>{Object.keys(days).length}</span></div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ============================== PRACTICE ============================== */
const MARKING = [
  { id: "unmarked", label: "Not marked", colour: "#7C8698", weight: 0 },
  { id: "self", label: "Self-marked", colour: "#F2B441", weight: 0.5 },
  { id: "solutions", label: "Against solutions", colour: "#5B8DEF", weight: 0.8 },
  { id: "teacher", label: "Teacher marked", colour: "#4FB477", weight: 1 },
];
const SOURCES = ["VCAA", "Heffernan", "Fundamental", "NEAP", "Checkpoints", "TSSM",
                 "Insight", "MAV", "School worksheet", "Textbook", "Other"];

const SEED_PRACTICE = [
  { id: "p1", sub: "sd",  source: "VCAA", paper: "2018 exam", date: null, mark: null, total: null, minutes: null, allowed: 120, marking: "self", note: "" },
  { id: "p2", sub: "sd",  source: "VCAA", paper: "2019 exam", date: null, mark: null, total: null, minutes: null, allowed: 120, marking: "self", note: "" },
  { id: "p3", sub: "mm",  source: "VCAA", paper: "2025 Exam 1", date: null, mark: null, total: 40, minutes: null, allowed: 60, marking: "solutions", note: "" },
  { id: "p4", sub: "mm",  source: "VCAA", paper: "2024 Exam 1", date: null, mark: null, total: 40, minutes: null, allowed: 60, marking: "solutions", note: "" },
  { id: "p5", sub: "mm",  source: "Heffernan", paper: "Exam 1 (which one?)", date: null, mark: null, total: 40, minutes: null, allowed: 60, marking: "solutions", note: "" },
  { id: "p6", sub: "mm",  source: "Fundamental", paper: "Exam 1 (which one?)", date: null, mark: null, total: 40, minutes: null, allowed: 60, marking: "solutions", note: "" },
  { id: "p7", sub: "mm",  source: "School worksheet", paper: "Worksheets — batch", date: null, mark: null, total: null, minutes: null, allowed: null, marking: "self", note: "" },
];

function Practice({ state, setState }) {
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(null);

  const subs = state.vce?.subjects?.filter((s) => !s.completed) || [];
  const nameOf = (id) => subs.find((s) => s.id === id)?.name || id;
  const rows = state.practice || [];

  const save = (next) => setState({ ...state, practice: next });
  const patch = (id, field, v) =>
    save(rows.map((r) => r.id !== id ? r : {
      ...r, [field]: (field === "mark" || field === "total" || field === "minutes" || field === "allowed")
        ? (v === "" ? null : Number(v)) : v,
    }));
  const addRow = () => {
    const id = "p" + Date.now();
    save([...rows, {
      id, sub: subs[0]?.id || "mm", source: "VCAA", paper: "New paper",
      date: key(new Date()), mark: null, total: null, minutes: null, allowed: null,
      marking: "unmarked", note: "",
    }]);
    setOpen(id);
  };
  const remove = (id) => { save(rows.filter((r) => r.id !== id)); setOpen(null); };

  const shown = filter === "all" ? rows : rows.filter((r) => r.sub === filter);
  const sorted = [...shown].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  /* ---- per-subject analysis ---- */
  const analysis = useMemo(() => {
    const out = {};
    for (const s of subs) {
      const mine = rows.filter((r) => r.sub === s.id);
      const scored = mine.filter((r) => r.mark !== null && r.total);
      if (!mine.length) continue;
      const pcts = scored.map((r) => ({ p: r.mark / r.total, d: r.date || "" }))
        .sort((a, b) => a.d.localeCompare(b.d));
      const avg = pcts.length ? pcts.reduce((a, x) => a + x.p, 0) / pcts.length : null;
      const recent = pcts.slice(-3), older = pcts.slice(-6, -3);
      const trend = (recent.length && older.length)
        ? (recent.reduce((a, x) => a + x.p, 0) / recent.length) - (older.reduce((a, x) => a + x.p, 0) / older.length)
        : null;
      const timed = mine.filter((r) => r.minutes && r.allowed);
      const timeRatio = timed.length
        ? timed.reduce((a, r) => a + r.minutes / r.allowed, 0) / timed.length : null;
      const conf = mine.length
        ? mine.reduce((a, r) => a + (MARKING.find((m) => m.id === r.marking)?.weight || 0), 0) / mine.length : 0;
      out[s.id] = {
        name: s.name, count: mine.length, scored: scored.length, avg, trend, timeRatio, conf,
        best: pcts.length ? Math.max(...pcts.map((x) => x.p)) : null,
        latest: pcts.length ? pcts[pcts.length - 1].p : null,
        bySource: Object.entries(mine.reduce((a, r) => { a[r.source] = (a[r.source] || 0) + 1; return a; }, {}))
          .sort((a, b) => b[1] - a[1]),
      };
    }
    return out;
  }, [rows, subs]);

  const weakest = useMemo(() => {
    const st = topicStats(state);
    return (state.topics || [])
      .map((tp) => ({ ...tp, ...(st[tp.id] || { seen: 0, errors: 0 }) }))
      .filter((tp) => tp.errors > 0)
      .sort((a, b) => b.errors - a.errors)
      .slice(0, 6);
  }, [state]);

  const small = { ...inputStyle, padding: "6px 8px", fontSize: 12.5 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {weakest.length > 0 && (
        <Card style={{ borderColor: C.signal }}>
          <Eyebrow>Where marks keep going</Eyebrow>
          {weakest.map((tp) => (
            <div key={tp.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "4px 0" }}>
              <span style={{ fontSize: 12.5, color: C.bone, minWidth: 0 }}>{tp.name}</span>
              <span style={{ fontFamily: MONO, fontSize: 11.5, color: C.signal, flexShrink: 0 }}>
                <strong>{tp.errors}</strong>× across {tp.seen} papers
              </span>
            </div>
          ))}
          <div style={{ fontSize: 11.5, color: C.dim, marginTop: 8, lineHeight: 1.5 }}>
            Built from your own marking, not from which papers you sat. This is the error log.
          </div>
        </Card>
      )}

      {/* analysis */}
      <div className="los-cols">
        {Object.entries(analysis).map(([id, a]) => (
          <Card key={id} style={{ padding: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 9 }}>
              <span style={{ fontSize: 14.5, fontWeight: 600 }}>{a.name}</span>
              <span style={{ fontFamily: MONO, fontSize: 22, color: a.avg === null ? C.dim : a.avg >= .8 ? C.moss : a.avg >= .6 ? C.amber : C.signal }}>
                {a.avg === null ? "—" : Math.round(a.avg * 100) + "%"}
              </span>
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.9, color: C.dim }}>
              <div><span style={{ fontFamily: MONO, color: C.bone }}>{a.count}</span> papers · <span style={{ fontFamily: MONO, color: C.bone }}>{a.scored}</span> with marks</div>
              {a.latest !== null && (
                <div>Latest <span style={{ fontFamily: MONO, color: C.bone }}>{Math.round(a.latest * 100)}%</span>
                  {a.best !== null && <> · best <span style={{ fontFamily: MONO, color: C.bone }}>{Math.round(a.best * 100)}%</span></>}
                </div>
              )}
              {a.trend !== null && (
                <div style={{ color: a.trend >= 0 ? C.moss : C.signal }}>
                  {a.trend >= 0 ? "▲" : "▼"} {Math.abs(a.trend * 100).toFixed(0)}% <span style={{ color: C.dim }}>last 3 vs previous 3</span>
                </div>
              )}
              {a.timeRatio !== null && (
                <div>Using <span style={{ fontFamily: MONO, color: a.timeRatio > 1 ? C.signal : C.bone }}>{Math.round(a.timeRatio * 100)}%</span> of exam time</div>
              )}
            </div>
            <div style={{ marginTop: 9, paddingTop: 9, borderTop: `1px solid ${C.rule}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 9.5, color: C.dim, letterSpacing: 1, marginBottom: 5 }}>
                <span>MARKING CONFIDENCE</span><span>{Math.round(a.conf * 100)}%</span>
              </div>
              <div style={{ height: 4, background: C.rule, borderRadius: 2 }}>
                <div style={{ height: "100%", width: `${a.conf * 100}%`, borderRadius: 2, transition: "width .4s", background: a.conf >= .8 ? C.moss : a.conf >= .5 ? C.amber : C.signal }} />
              </div>
              <div style={{ fontSize: 11, color: C.dim, marginTop: 6, lineHeight: 1.45 }}>
                {a.conf >= .8 ? "Marks are trustworthy."
                  : a.conf >= .5 ? "Partly self-marked — the average is probably optimistic."
                  : "Mostly unmarked or self-marked. Treat that percentage as rough."}
              </div>
              <div style={{ fontSize: 11, color: C.dim, marginTop: 6 }}>
                {a.bySource.map(([s, n]) => `${s} ×${n}`).join(" · ")}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* filter + add */}
      <Card style={{ padding: 12 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <Btn active={filter === "all"} onClick={() => setFilter("all")} style={{ padding: "6px 11px", fontSize: 12.5 }}>
            All · {rows.length}
          </Btn>
          {subs.map((s) => {
            const n = rows.filter((r) => r.sub === s.id).length;
            return (
              <Btn key={s.id} active={filter === s.id} onClick={() => setFilter(s.id)} style={{ padding: "6px 11px", fontSize: 12.5 }}>
                {s.name} · {n}
              </Btn>
            );
          })}
          <span style={{ flex: 1 }} />
          <Btn onClick={addRow} active style={{ padding: "6px 12px", fontSize: 12.5 }}>
            <Plus size={12} /> Log a paper
          </Btn>
        </div>
      </Card>

      {/* rows */}
      {sorted.length === 0 && (
        <Card><div style={{ fontSize: 13, color: C.dim }}>Nothing logged for that filter yet.</div></Card>
      )}
      {sorted.map((r) => {
        const isOpen = open === r.id;
        const pct = r.mark !== null && r.total ? r.mark / r.total : null;
        const mk = MARKING.find((m) => m.id === r.marking) || MARKING[0];
        return (
          <Card key={r.id} style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 13px" }}>
              <button onClick={() => setOpen(isOpen ? null : r.id)} style={{
                flex: 1, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0, minWidth: 0,
              }}>
                <div style={{ fontSize: 14, color: C.bone, fontWeight: 500 }}>
                  {r.source} — {r.paper}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 10.5, color: C.dim, marginTop: 3 }}>
                  {nameOf(r.sub).toUpperCase()}
                  {r.date && ` · ${parseKey(r.date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}`}
                  {r.minutes && ` · ${fmtHM(r.minutes)}`}
                  {r.allowed && r.minutes && ` of ${fmtHM(r.allowed)}`}
                  {(r.wrong || []).length > 0 && <span style={{ color: C.signal }}> · {r.wrong.length} weak {r.wrong.length === 1 ? "topic" : "topics"}</span>}
                </div>
              </button>
              <span style={{ fontFamily: MONO, fontSize: 9.5, color: mk.colour, border: `1px solid ${C.rule}`, borderRadius: 4, padding: "3px 7px", flexShrink: 0 }}>
                {mk.label}
              </span>
              <span style={{ fontFamily: MONO, fontSize: 19, flexShrink: 0, minWidth: 46, textAlign: "right",
                color: pct === null ? C.dim : pct >= .8 ? C.moss : pct >= .6 ? C.amber : C.signal }}>
                {pct === null ? "—" : Math.round(pct * 100)}
              </span>
            </div>

            {isOpen && (
              <div style={{ padding: "0 13px 13px", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  <select value={r.sub} onChange={(e) => patch(r.id, "sub", e.target.value)}
                    style={{ ...small, fontFamily: SANS, flex: "1 1 130px" }}>
                    {subs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <input list="src-list" value={r.source} onChange={(e) => patch(r.id, "source", e.target.value)}
                    placeholder="Source" style={{ ...small, fontFamily: SANS, flex: "1 1 120px" }} />
                  <datalist id="src-list">{SOURCES.map((s) => <option key={s} value={s} />)}</datalist>
                </div>
                <input value={r.paper} onChange={(e) => patch(r.id, "paper", e.target.value)}
                  placeholder="Which paper? e.g. 2024 Exam 1" style={{ ...small, fontFamily: SANS, width: "100%", boxSizing: "border-box" }} />

                <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
                  <input type="date" value={r.date || ""} onChange={(e) => patch(r.id, "date", e.target.value)}
                    style={{ ...small, flex: "0 0 138px" }} />
                  <input value={r.mark ?? ""} onChange={(e) => patch(r.id, "mark", e.target.value)}
                    placeholder="mark" inputMode="decimal" style={{ ...small, flex: "0 0 62px", textAlign: "center" }} />
                  <span style={{ color: C.dim, fontFamily: MONO }}>/</span>
                  <input value={r.total ?? ""} onChange={(e) => patch(r.id, "total", e.target.value)}
                    placeholder="out of" inputMode="decimal" style={{ ...small, flex: "0 0 62px", textAlign: "center" }} />
                  <span style={{ fontFamily: MONO, fontSize: 12.5, color: pct !== null && pct > 1 ? C.signal : C.dim, flex: "0 0 44px", textAlign: "right" }}>
                    {pct !== null ? Math.round(pct * 100) + "%" : ""}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: 11.5, color: C.dim }}>Took</span>
                  <input value={r.minutes ?? ""} onChange={(e) => patch(r.id, "minutes", e.target.value)}
                    placeholder="mins" inputMode="numeric" style={{ ...small, flex: "0 0 66px", textAlign: "center" }} />
                  <span style={{ fontSize: 11.5, color: C.dim }}>of an allowed</span>
                  <input value={r.allowed ?? ""} onChange={(e) => patch(r.id, "allowed", e.target.value)}
                    placeholder="mins" inputMode="numeric" style={{ ...small, flex: "0 0 66px", textAlign: "center" }} />
                </div>

                <div>
                  <div style={{ fontFamily: MONO, fontSize: 9.5, color: C.dim, letterSpacing: 1, marginBottom: 6 }}>HOW WAS IT MARKED?</div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {MARKING.map((m) => (
                      <button key={m.id} onClick={() => patch(r.id, "marking", m.id)} style={{
                        padding: "6px 10px", fontSize: 11.5, borderRadius: 6, cursor: "pointer", fontFamily: SANS,
                        background: r.marking === m.id ? m.colour : C.plate2,
                        color: r.marking === m.id ? C.ink : C.dim,
                        border: `1px solid ${r.marking === m.id ? m.colour : C.rule}`,
                        fontWeight: r.marking === m.id ? 600 : 400, transition: "all .14s",
                      }}>{m.label}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontFamily: MONO, fontSize: 9.5, color: C.dim, letterSpacing: 1, marginBottom: 6 }}>
                    WHICH TOPICS COST YOU MARKS?
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {(state.topics || []).filter((tp) => tp.sub === r.sub).map((tp) => {
                      const on = (r.wrong || []).includes(tp.id);
                      return (
                        <button key={tp.id} onClick={() => {
                          const cur = r.wrong || [];
                          patch(r.id, "wrong", on ? cur.filter((x) => x !== tp.id) : [...cur, tp.id]);
                        }} style={{
                          padding: "5px 9px", fontSize: 11.5, borderRadius: 6, cursor: "pointer", fontFamily: SANS,
                          background: on ? "rgba(255,107,53,.16)" : C.plate2,
                          color: on ? C.signal : C.dim,
                          border: `1px solid ${on ? C.signal : C.rule}`,
                          fontWeight: on ? 600 : 400, transition: "all .14s",
                        }}>{tp.name}</button>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 11, color: C.dim, marginTop: 6, lineHeight: 1.45 }}>
                    This is what drives the coverage bars. Leave it blank if you haven't marked the paper yet.
                  </div>
                </div>

                <textarea value={r.note} onChange={(e) => patch(r.id, "note", e.target.value)}
                  rows={3} placeholder="What actually happened? Which questions cost you, what you'd do differently, anything you only half-marked."
                  style={{ width: "100%", background: C.plate2, color: C.bone, border: `1px solid ${C.rule}`,
                    borderRadius: 7, padding: 9, fontSize: 13, fontFamily: SANS, lineHeight: 1.5,
                    resize: "vertical", boxSizing: "border-box" }} />

                <div>
                  <Btn onClick={() => remove(r.id)} style={{ padding: "5px 10px", fontSize: 12, borderColor: C.signal, color: C.signal }}>
                    <X size={11} /> Delete
                  </Btn>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

/* Exposure comes from ticked papers; the signal comes from where marks were lost.
   A paper you sat is not a topic you hold. */
function topicStats(state) {
  const out = {};
  const papers = state.papers || [];
  const prac = state.practice || [];
  const topics = state.topics || [];
  for (const t of topics) out[t.id] = { seen: 0, errors: 0, attempts: 0 };
  for (const p of papers) {
    if (!p.done) continue;
    const covers = p.covers || topics.filter((t) => t.sub === p.sub).map((t) => t.id);
    for (const id of covers) if (out[id]) out[id].seen++;
  }
  for (const a of prac) {
    const subTopics = topics.filter((t) => t.sub === a.sub).map((t) => t.id);
    for (const id of subTopics) if (out[id]) out[id].attempts++;
    for (const id of (a.wrong || [])) if (out[id]) out[id].errors++;
  }
  return out;
}

/* 0 Untouched · 1 Shaky · 2 Okay · 3 Solid */
function autoConf(s) {
  if (!s || s.seen === 0) return 0;
  if (s.attempts === 0) return 1;              // seen but never marked against
  const rate = s.errors / Math.max(1, s.attempts);
  if (s.errors === 0 && s.seen >= 3) return 3;
  if (rate <= 0.2) return 3;
  if (rate <= 0.5) return 2;
  return 1;
}

/* ============================== PAPER LIBRARY ============================== */
/* Study-design accreditation, checked against VCAA:
     Maths Methods      2023-2027  -> VCAA 2023+ current
     Physics            U3&4 from 2024 -> VCAA 2024+ current
     English            U3&4 from 2024 -> VCAA 2024+ current
     Indonesian SL      2023-2027  -> VCAA 2023+ current
     Software Dev       U3&4 from 2025 -> VCAA 2025 only
   Everything below is editable — verify against vcaa.vic.edu.au before relying on it. */

const P = (sub, provider, name, year, current) =>
  ({ id: `${sub}-${provider}-${name}`.replace(/\s+/g, "_").toLowerCase(), sub, provider, name, year, current, done: false });

const SEED_PAPERS = [
  // ---- Maths Methods : VCAA current from 2023
  ...[2025, 2024, 2023].flatMap((y) => [P("mm","VCAA",`${y} Exam 1`,y,true), P("mm","VCAA",`${y} Exam 2`,y,true)]),
  ...[2022, 2021, 2020, 2019].flatMap((y) => [P("mm","VCAA",`${y} Exam 1`,y,false), P("mm","VCAA",`${y} Exam 2`,y,false)]),
  P("mm","Heffernan","Exam 1 — Trial A",null,true), P("mm","Heffernan","Exam 2 — Trial A",null,true),
  P("mm","Heffernan","Exam 1 — Trial B",null,true), P("mm","Heffernan","Exam 2 — Trial B",null,true),
  P("mm","Fundamental","Exam 1 — Trial",null,true), P("mm","Fundamental","Exam 2 — Trial",null,true),
  P("mm","NEAP","Trial Exam 1",null,true), P("mm","NEAP","Trial Exam 2",null,true),
  P("mm","MAV","Trial Exam 1",null,true), P("mm","MAV","Trial Exam 2",null,true),
  P("mm","Checkpoints","Topic sets",null,true),

  // ---- Physics : VCAA current from 2024
  ...[2025, 2024].map((y) => P("phy","VCAA",`${y} exam`,y,true)),
  ...[2023, 2022, 2021, 2019].map((y) => P("phy","VCAA",`${y} exam`,y,false)),
  P("phy","Heffernan","Trial exam",null,true),
  P("phy","NEAP","Trial exam",null,true),
  P("phy","Checkpoints","Topic sets",null,true),
  P("phy","STAV","Trial exam",null,true),

  // ---- English : VCAA current from 2024
  ...[2025, 2024].map((y) => P("eng","VCAA",`${y} exam`,y,true)),
  ...[2023, 2022, 2021].map((y) => P("eng","VCAA",`${y} exam`,y,false)),
  P("eng","Insight","Trial exam",null,true),
  P("eng","NEAP","Trial exam",null,true),
  P("eng","School","Practice exam",null,true),

  // ---- Software Development : new study design, U3&4 from 2025
  P("sd","VCAA","2025 exam",2025,true),
  ...[2024, 2023, 2022, 2021, 2020, 2019, 2018].map((y) => P("sd","VCAA",`${y} exam (old design)`,y,false)),
  P("sd","NEAP","Trial exam",null,true),
  P("sd","TSSM","Trial exam",null,true),

  // ---- Indonesian Second Language : current from 2023
  ...[2025, 2024, 2023].map((y) => P("indo","VCAA",`${y} written exam`,y,true)),
  ...[2022, 2021, 2019].map((y) => P("indo","VCAA",`${y} written exam`,y,false)),
  P("indo","VCAA","Oral exam — sample topics",null,true),
  P("indo","VSL","Practice written",null,true),
  P("indo","VSL","Practice oral",null,true),
];

const T = (sub, name) => ({ id: `${sub}-${name}`.replace(/\s+/g,"_").toLowerCase(), sub, name, conf: 0 });
const SEED_TOPICS = [
  ...["Functions, relations & graphs","Algebra, number & structure","Calculus — differentiation",
      "Calculus — integration & applications","Discrete random variables","Continuous random variables",
      "Sampling & confidence intervals","Transformations","Exam 1 skills — by hand"].map((n) => T("mm", n)),
  ...["Newtonian motion","Special relativity","Gravitational fields","Electric & magnetic fields",
      "Electromagnetic induction","Wave properties","Light: wave vs particle","Matter as particles & waves",
      "Practical investigation & data analysis"].map((n) => T("phy", n)),
  ...["Text response — Memory Police","Text response — Sunset Boulevard","Crafting/creating texts",
      "Argument & persuasive language analysis","Vocabulary & expression"].map((n) => T("eng", n)),
  ...["Programming & data structures","Problem-solving methodology","Data & information",
      "Networks","Security & risk management","Legal obligations (Privacy Act)",
      "Project management & Gantt","Testing & evaluation criteria"].map((n) => T("sd", n)),
  ...["Interpersonal — spoken exchange","Interpretive — reading & listening","Presentational — writing",
      "Text types & register","Grammar & vocabulary range","Culture & prescribed sub-topics"].map((n) => T("indo", n)),
];

const CONF = ["Untouched", "Shaky", "Okay", "Solid"];
const CONF_COL = ["#252B36", "#C46830", "#F2B441", "#38D97E"];

function Papers({ state, setState }) {
  const [filter, setFilter] = useState("all");
  const [hideOld, setHideOld] = useState(true);

  const subs = state.vce?.subjects?.filter((s) => !s.completed) || [];
  const papers = state.papers || [];
  const topics = state.topics || [];
  const nameOf = (id) => subs.find((s) => s.id === id)?.name || id;

  const setPapers = (n) => setState({ ...state, papers: n });
  const toggle = (id) => setPapers(papers.map((p) => p.id === id ? { ...p, done: !p.done } : p));
  const rename = (id, v) => setPapers(papers.map((p) => p.id === id ? { ...p, name: v } : p));
  const removeP = (id) => setPapers(papers.filter((p) => p.id !== id));
  const addP = (sub) => setPapers([...papers, {
    id: "pp" + Date.now(), sub, provider: "Other", name: "New paper", year: null, current: true, done: false,
  }]);

  const stats = useMemo(() => topicStats(state), [state.papers, state.practice, state.topics]);
  const setConf = (id, v) => setState({
    ...state,
    topics: topics.map((t) => t.id === id ? { ...t, conf: v, manual: v !== null } : t),
  });
  const confOf = (t) => (t.manual && t.conf !== null && t.conf !== undefined) ? t.conf : autoConf(stats[t.id]);

  /* send a ticked paper straight into the practice log */
  const logIt = (p) => {
    const row = {
      id: "p" + Date.now(), sub: p.sub, source: p.provider, paper: p.name,
      date: key(new Date()), mark: null, total: null, minutes: null, allowed: null,
      marking: "unmarked", note: "",
    };
    setState({
      ...state,
      practice: [...(state.practice || []), row],
      papers: papers.map((x) => x.id === p.id ? { ...x, done: true } : x),
    });
  };

  const visibleSubs = filter === "all" ? subs : subs.filter((s) => s.id === filter);

  const statsFor = (subId) => {
    const all = papers.filter((p) => p.sub === subId);
    const cur = all.filter((p) => p.current);
    return {
      curDone: cur.filter((p) => p.done).length, curTotal: cur.length,
      allDone: all.filter((p) => p.done).length, allTotal: all.length,
    };
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card style={{ padding: 12 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <Btn active={filter === "all"} onClick={() => setFilter("all")} style={{ padding: "6px 11px", fontSize: 12.5 }}>All</Btn>
          {subs.map((s) => {
            const st = statsFor(s.id);
            return (
              <Btn key={s.id} active={filter === s.id} onClick={() => setFilter(s.id)} style={{ padding: "6px 11px", fontSize: 12.5 }}>
                {s.name} <strong style={{ fontFamily: MONO }}>{st.curDone}/{st.curTotal}</strong>
              </Btn>
            );
          })}
          <span style={{ flex: 1 }} />
          <Btn active={hideOld} onClick={() => setHideOld(!hideOld)} style={{ padding: "6px 11px", fontSize: 12.5 }}>
            {hideOld ? "Current design only" : "Showing all years"}
          </Btn>
        </div>
      </Card>

      {visibleSubs.map((s) => {
        const st = statsFor(s.id);
        const mine = papers.filter((p) => p.sub === s.id && (!hideOld || p.current));
        const byProv = mine.reduce((a, p) => { (a[p.provider] = a[p.provider] || []).push(p); return a; }, {});
        const myTopics = topics.filter((t) => t.sub === s.id);
        const covered = myTopics.filter((t) => confOf(t) >= 2).length;
        const pct = st.curTotal ? st.curDone / st.curTotal : 0;

        return (
          <Card key={s.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>{s.name}</span>
              <span style={{ fontFamily: MONO, fontSize: 12, color: C.dim }}>
                <strong style={{ color: pct >= .7 ? C.moss : pct >= .35 ? C.amber : C.signal, fontSize: 15 }}>
                  {st.curDone}/{st.curTotal}
                </strong> current-design papers
                {st.allTotal > st.curTotal && <> · {st.allDone}/{st.allTotal} including older</>}
              </span>
            </div>

            <div style={{ height: 8, background: C.rule, borderRadius: 4, marginBottom: 14, display: "flex", overflow: "hidden" }}>
              <div style={{ width: `${pct * 100}%`, background: pct >= .7 ? C.moss : pct >= .35 ? C.amber : C.signal, transition: "width .4s" }} />
            </div>

            {Object.entries(byProv).map(([prov, list]) => {
              const d = list.filter((p) => p.done).length;
              return (
                <div key={prov} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1.2, color: prov === "VCAA" ? C.bone : C.dim, fontWeight: prov === "VCAA" ? 700 : 400 }}>
                      {prov.toUpperCase()}
                    </span>
                    <span style={{ fontFamily: MONO, fontSize: 10.5, color: d === list.length && d > 0 ? C.moss : C.dim }}>
                      <strong>{d}</strong>/{list.length}
                    </span>
                  </div>
                  {list.map((p) => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 0" }}>
                      <button onClick={() => toggle(p.id)} style={{
                        width: 19, height: 19, flexShrink: 0, borderRadius: 5, cursor: "pointer",
                        background: p.done ? C.moss : C.plate2,
                        border: `1px solid ${p.done ? C.moss : C.rule}`,
                        display: "flex", alignItems: "center", justifyContent: "center", transition: "all .14s",
                      }}>{p.done && <Check size={12} color={C.ink} strokeWidth={3} />}</button>
                      <input value={p.name} onChange={(e) => rename(p.id, e.target.value)} style={{
                        flex: 1, minWidth: 0, background: "none", border: "none", padding: 0,
                        fontSize: 13, fontFamily: SANS, outline: "none",
                        color: p.done ? C.bone : C.dim, fontWeight: p.done ? 600 : 400,
                      }} />
                      {!p.current && (
                        <span style={{ fontFamily: MONO, fontSize: 9, color: C.amber, border: `1px solid ${C.rule}`, borderRadius: 4, padding: "2px 5px", flexShrink: 0 }}>
                          OLD DESIGN
                        </span>
                      )}
                      <button onClick={() => logIt(p)} title="Log it in Practice" style={{
                        background: "none", border: `1px solid ${C.rule}`, borderRadius: 5, color: C.dim,
                        cursor: "pointer", padding: "3px 7px", fontSize: 10.5, fontFamily: MONO, flexShrink: 0,
                      }}>LOG</button>
                      <button onClick={() => removeP(p.id)} style={{ background: "none", border: "none", color: C.rule, cursor: "pointer", padding: 2, flexShrink: 0 }}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}

            <Btn onClick={() => addP(s.id)} style={{ padding: "5px 10px", fontSize: 12, marginBottom: 14 }}>
              <Plus size={11} /> Add paper
            </Btn>

            {/* topic coverage */}
            <div style={{ borderTop: `1px solid ${C.rule}`, paddingTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 9 }}>
                <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1.2, color: C.dim }}>KEY KNOWLEDGE COVERAGE</span>
                <span style={{ fontFamily: MONO, fontSize: 11.5, color: C.dim }}>
                  <strong style={{ color: covered === myTopics.length ? C.moss : C.bone }}>{covered}</strong>/{myTopics.length} at okay or better
                </span>
              </div>
              {myTopics.map((t) => {
                const st = stats[t.id] || { seen: 0, errors: 0, attempts: 0 };
                const c = confOf(t);
                return (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 0" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, color: c >= 2 ? C.bone : C.dim, fontWeight: c >= 3 ? 600 : 400 }}>{t.name}</div>
                      <div style={{ fontFamily: MONO, fontSize: 9.5, color: C.dim, marginTop: 1 }}>
                        seen <strong style={{ color: st.seen ? C.bone : C.rule }}>{st.seen}</strong>
                        {st.errors > 0 && <> · cost marks <strong style={{ color: C.signal }}>{st.errors}</strong>×</>}
                        {!t.manual && <span style={{ color: C.steel }}> · auto</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                      {CONF.map((lbl, i) => (
                        <button key={i} onClick={() => setConf(t.id, i)} title={lbl} style={{
                          width: 22, height: 15, borderRadius: 3, cursor: "pointer",
                          background: c >= i && i > 0 ? CONF_COL[c] : C.plate2,
                          border: `1px solid ${c === i ? C.bone : C.rule}`, padding: 0, transition: "all .14s",
                        }} />
                      ))}
                    </div>
                    <span style={{ fontFamily: MONO, fontSize: 9.5, color: CONF_COL[c], flexShrink: 0, width: 58, textAlign: "right" }}>
                      {CONF[c].toUpperCase()}
                    </span>
                    {t.manual && (
                      <button onClick={() => setState({ ...state, topics: topics.map((x) => x.id === t.id ? { ...x, manual: false } : x) })}
                        title="Back to auto" style={{ background: "none", border: "none", color: C.rule, cursor: "pointer", padding: 0, flexShrink: 0 }}>
                        <X size={11} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}

      <Card style={{ borderColor: C.amber }}>
        <Eyebrow>Before you trust this list</Eyebrow>
        <div style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.65 }}>
          Study-design periods are checked against VCAA: <strong style={{ color: C.bone }}>Methods 2023–2027</strong>,
          <strong style={{ color: C.bone }}> Physics and English Units 3&4 from 2024</strong>,
          <strong style={{ color: C.bone }}> Indonesian 2023–2027</strong>, and
          <strong style={{ color: C.bone }}> Software Development Units 3&4 from 2025</strong> — which is why only the
          2025 Software paper is marked current.
          <br /><br />
          Older papers still build skills, they just won't match the current format. Commercial trial papers are listed
          generically because availability changes each year — rename them to whatever you actually have.
          Check the VCAA past exams page for the definitive list.
        </div>
      </Card>
    </div>
  );
}
/* ============================== PAPERS + PRACTICE ============================== */
function PaperWork({ state, setState }) {
  return (
    <div>
      <style>{`
        .pp-grid { display:grid; gap:16px; grid-template-columns:1fr; align-items:start; }
        @media (min-width:1150px){
          .pp-grid { grid-template-columns: minmax(0,1fr) minmax(0,1fr); }
          .pp-col  { max-height: calc(100vh - 176px); overflow-y:auto; padding-right:8px; }
          .pp-col::-webkit-scrollbar { width:7px; }
          .pp-col::-webkit-scrollbar-thumb { background:#2A3140; border-radius:4px; }
          .pp-col::-webkit-scrollbar-track { background:transparent; }
        }
        .pp-head { position:sticky; top:0; z-index:5; background:#10131A;
                   padding:2px 0 9px; margin-bottom:2px; }
      `}</style>
      <div className="pp-grid">
        <div className="pp-col">
          <div className="pp-head">
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1.6, color: C.signal }}>LIBRARY</div>
            <div style={{ fontSize: 12.5, color: C.dim, marginTop: 2 }}>What exists, and what you've ticked off.</div>
          </div>
          <Papers state={state} setState={setState} />
        </div>
        <div className="pp-col">
          <div className="pp-head">
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1.6, color: C.steel }}>ATTEMPTS</div>
            <div style={{ fontSize: 12.5, color: C.dim, marginTop: 2 }}>What you actually sat, scored and learned.</div>
          </div>
          <Practice state={state} setState={setState} />
        </div>
      </div>
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
/* Notation carried over from the phone notes:
     45 (3.75) + 3.75 inc   -> stack 45, add-on 3.75, step 3.75   => 48.75kg
     30 (15,15) + 10 inc    -> 30 total, 15 a side, step 10
     7, 8, 9, 10            -> dumbbell pyramid, one weight per set          */

const GE = (date, w, add = 0, inc = null, side = null, note = "") =>
  ({ id: date + "-" + w + "-" + Math.random().toString(36).slice(2, 6), date, w, add, inc, side, pyr: null, note });
const GP = (date, pyr, note = "") =>
  ({ id: date + "-p-" + Math.random().toString(36).slice(2, 6), date, w: null, add: 0, inc: null, side: null, pyr, note });

const GL = (name, scheme, routine, entries) => ({ id: name.replace(/\s+/g, "_").toLowerCase(), name, scheme, routine, entries });

const SEED_LIFTS = [
  GL("Chest Press Machine", "4x15", "Main", [
    GE("2025-09-01", 15, 0, 3.75), GE("2025-10-01", 22.5, 0, 3.75), GE("2025-11-01", 22.5, 3.75, 3.75),
    GE("2026-02-01", 30, 0, 3.75), GE("2026-03-17", 37.5, 0, 3.75), GE("2026-03-24", 45, 0, 3.75),
    GE("2026-08-15", 45, 3.75, 3.75), GE("2026-08-19", 52.5, 0, 3.75), GE("2026-09-04", 52.5, 3.75, 3.75),
  ]),
  GL("Chest Press Free Weight", "—", "Main", [
    GE("2025-09-01", 10, 0, 5, 5), GE("2025-10-01", 20, 0, 10, 10), GE("2026-09-04", 30, 0, 10, 15),
  ]),
  GL("Pectoral Fly", "4x15", "Main", [ GE("2026-06-13", 45, 0, 3.75) ]),
  GL("Dumbbell fly", "3x15", "Main", [ GP("2025-09-01", [4,5,6,7]), GP("2025-10-01", [5,6,7,8]) ]),
  GL("Incline Dumbbell Press", "4x10", "Main", [ GP("2025-09-01", [7,8,9,10]), GP("2025-10-01", [8,9,10,12.5]) ]),
  GL("Shoulder Press Machine", "—", "Main", [
    GE("2025-09-01", 15, 0, 3.75), GE("2025-10-01", 22.5, 0, 3.75), GE("2025-11-01", 22.5, 0, 3.75),
    GE("2026-09-04", 30, 3.75, 3.75), GE("2026-09-14", 30, 3.75, 3.75, null, "logged as 14/11 in notes — assumed Sept"),
  ]),
  GL("Shoulder Press (dumbbell)", "4x10", "Main", [
    GP("2025-09-01", [7,8,9,10]), GP("2025-10-01", [8,9,10,12.5]), GP("2025-11-01", [8], "incomplete entry"),
  ]),
  GL("Lat pulldown", "4x15", "Main", [
    GE("2025-09-01", 15, 0, 7.5), GE("2025-10-01", 20, 3.75, 7.5), GE("2026-08-22", 20, 0, 3.75),
    GE("2026-09-04", 27.5, 0, 7.5, null, "machine max 60"),
  ]),
  GL("Lat row", "4x12", "Main", [ GE("2026-08-04", 27.5, 0, 7.5) ]),
  GL("Iso lateral row", "—", "Main", [
    GE("2026-02-01", 10, 0, 5), GE("2026-02-02", 20, 0, 20, 10, "then dropped to 10 (5,5)"),
  ]),
  GL("Tricep pulldown cable (bar)", "—", "Main", [
    GE("2026-04-20", 12.5, 3.75, 2.5), GE("2026-09-04", 15, 0, 2.5), GE("2026-09-14", 17.5, 0, 3.75),
  ]),
  GL("Single Bar Bicep Curl", "4x15", "Main", [ GE("2025-11-01", 7.5, 0, 2.5) ]),
  GL("Overhead bicep pulldown", "4x15", "Main", [
    GE("2026-02-01", 10, 0, 5), GE("2026-03-01", 20, 0, 20, 10), GE("2026-09-11", 20, 0, 20, 10, "+10 on top"),
  ]),
  GL("Leg Press Stack", "4x15", "Main", [
    GE("2025-12-01", 37.5, 3.75, 7.5), GE("2025-12-02", 45, 0, 7.5), GE("2025-12-03", 52.5, 3.75, 7.5),
  ]),
  GL("Seated Leg Extension", "—", "Main", [ GE("2026-02-01", 30, 3.75, 7.5), GE("2026-03-01", 45, 0, 7.5) ]),
  GL("Seated Leg Curl", "—", "Main", [ GE("2026-02-01", 45, 0, 7.5) ]),
  GL("Calf raises", "—", "Main", [ GE("2026-02-01", 10, 0, 10) ]),
  GL("Chest Press", "—", "Bali", [ GE("2025-12-01", 39, 0, 9) ]),
];

const SEED_BODY = [
  { id: "b1", date: "2025-09-01", height: 183, weight: 70 },
  { id: "b2", date: "2025-10-01", height: 183, weight: 70 },
];

const totalOf = (e) => e.pyr ? Math.max(...e.pyr) : (e.w || 0) + (e.add || 0);
const notationOf = (e) => {
  if (e.pyr) return e.pyr.join(", ");
  let s = `${e.w} (${e.add || 0})`;
  if (e.side) s = `${e.w} (${e.side},${e.side})`;
  if (e.inc) s += ` + ${e.inc} inc`;
  return s;
};

function Gym({ state, setState, todayKey }) {
  const [openLift, setOpenLift] = useState(null);
  const [routine, setRoutine] = useState("Main");

  const lifts = state.lifts || [];
  const body = state.body || [];
  const routines = [...new Set(lifts.map((l) => l.routine))];

  const setLifts = (n) => setState({ ...state, lifts: n });
  const patchLift = (id, fn) => setLifts(lifts.map((l) => l.id === id ? fn({ ...l }) : l));

  const addEntry = (lift) => {
    const last = lift.entries[lift.entries.length - 1];
    const seed = last
      ? (last.pyr ? { ...last, id: "e" + Date.now(), date: todayKey, pyr: [...last.pyr] }
                  : { ...last, id: "e" + Date.now(), date: todayKey, note: "" })
      : { id: "e" + Date.now(), date: todayKey, w: 0, add: 0, inc: null, side: null, pyr: null, note: "" };
    patchLift(lift.id, (l) => ({ ...l, entries: [...l.entries, seed] }));
    setState((prev) => ({ ...prev, days: { ...prev.days, [todayKey]: { ...(prev.days[todayKey] || blank(todayKey)), gym: true } } }));
  };
  const patchEntry = (liftId, entId, field, v) =>
    patchLift(liftId, (l) => ({
      ...l,
      entries: l.entries.map((e) => e.id !== entId ? e : {
        ...e,
        [field]: field === "date" || field === "note" ? v
               : field === "pyr" ? v.split(",").map((x) => parseFloat(x.trim())).filter((x) => !isNaN(x))
               : (v === "" ? null : Number(v)),
      }),
    }));
  const delEntry = (liftId, entId) =>
    patchLift(liftId, (l) => ({ ...l, entries: l.entries.filter((e) => e.id !== entId) }));
  const addLift = () => {
    const id = "lift" + Date.now();
    setLifts([...lifts, { id, name: "New exercise", scheme: "4x10", routine, entries: [] }]);
    setOpenLift(id);
  };

  const shown = lifts.filter((l) => l.routine === routine);
  const small = { ...inputStyle, padding: "5px 7px", fontSize: 12.5 };

  /* body measurements */
  const addBody = () => setState({
    ...state,
    body: [...body, { id: "b" + Date.now(), date: todayKey, height: body.at(-1)?.height || null, weight: null }],
  });
  const patchBody = (id, f, v) => setState({
    ...state, body: body.map((b) => b.id === id ? { ...b, [f]: f === "date" ? v : (v === "" ? null : Number(v)) } : b),
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card style={{ padding: 12 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {routines.map((r) => (
            <Btn key={r} active={routine === r} onClick={() => setRoutine(r)} style={{ padding: "6px 12px", fontSize: 12.5 }}>
              {r} <strong style={{ fontFamily: MONO }}>{lifts.filter((l) => l.routine === r).length}</strong>
            </Btn>
          ))}
          <span style={{ flex: 1 }} />
          <Btn onClick={addLift} active style={{ padding: "6px 12px", fontSize: 12.5 }}>
            <Plus size={12} /> Exercise
          </Btn>
        </div>
      </Card>

      {shown.map((l) => {
        const ents = [...l.entries].sort((a, b) => a.date.localeCompare(b.date));
        const last = ents[ents.length - 1];
        const first = ents[0];
        const best = ents.length ? Math.max(...ents.map(totalOf)) : 0;
        const gain = ents.length > 1 ? totalOf(last) - totalOf(first) : 0;
        const isOpen = openLift === l.id;
        const nextUp = last && last.inc ? totalOf(last) + last.inc : null;
        const chart = ents.map((e) => ({
          k: e.date, label: parseKey(e.date).toLocaleDateString("en-AU", { month: "short", year: "2-digit" }),
          kg: totalOf(e),
        }));

        return (
          <Card key={l.id} style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 13px" }}>
              <button onClick={() => setOpenLift(isOpen ? null : l.id)} style={{
                flex: 1, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0, minWidth: 0,
              }}>
                <div style={{ fontSize: 14.5, color: C.bone, fontWeight: 600 }}>
                  {l.name} {l.scheme !== "—" && <span style={{ fontFamily: MONO, fontSize: 10.5, color: C.dim, fontWeight: 400 }}>{l.scheme}</span>}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 10.5, color: C.dim, marginTop: 3 }}>
                  {ents.length} entries
                  {last && <> · last {parseKey(last.date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</>}
                  {gain > 0 && <span style={{ color: C.moss }}> · +{gain}kg all time</span>}
                </div>
              </button>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontFamily: MONO, fontSize: 18, color: C.bone, lineHeight: 1.1 }}>
                  {last ? (last.pyr ? last.pyr.join("/") : totalOf(last)) : "—"}
                  {last && !last.pyr && <span style={{ fontSize: 11, color: C.dim }}>kg</span>}
                </div>
                {nextUp && <div style={{ fontFamily: MONO, fontSize: 9.5, color: C.signal }}>NEXT {nextUp}</div>}
              </div>
            </div>

            {isOpen && (
              <div style={{ padding: "0 13px 13px" }}>
                <div style={{ display: "flex", gap: 7, marginBottom: 10, flexWrap: "wrap" }}>
                  <input value={l.name} onChange={(e) => patchLift(l.id, (x) => ({ ...x, name: e.target.value }))}
                    style={{ ...small, fontFamily: SANS, flex: "2 1 150px" }} />
                  <input value={l.scheme} onChange={(e) => patchLift(l.id, (x) => ({ ...x, scheme: e.target.value }))}
                    placeholder="4x10" style={{ ...small, fontFamily: MONO, flex: "0 0 70px", textAlign: "center" }} />
                  <input value={l.routine} onChange={(e) => patchLift(l.id, (x) => ({ ...x, routine: e.target.value }))}
                    style={{ ...small, fontFamily: SANS, flex: "0 0 90px" }} />
                </div>

                {ents.length > 1 && (
                  <div style={{ height: 110, marginBottom: 12 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chart} margin={{ top: 4, right: 6, left: -28, bottom: 0 }}>
                        <CartesianGrid stroke={C.rule} vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: C.dim, fontSize: 9, fontFamily: MONO }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: C.dim, fontSize: 9, fontFamily: MONO }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: C.plate2, border: `1px solid ${C.rule}`, borderRadius: 7, fontSize: 12, fontFamily: MONO }} labelStyle={{ color: C.dim }} />
                        <Line type="monotone" dataKey="kg" stroke={C.moss} strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {ents.map((e) => (
                  <div key={e.id} style={{ marginBottom: 7, paddingBottom: 7, borderBottom: `1px solid ${C.rule}` }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <input type="date" value={e.date} onChange={(ev) => patchEntry(l.id, e.id, "date", ev.target.value)}
                        style={{ ...small, flex: "0 0 132px" }} />
                      {e.pyr ? (
                        <input value={e.pyr.join(", ")} onChange={(ev) => patchEntry(l.id, e.id, "pyr", ev.target.value)}
                          placeholder="7, 8, 9, 10" style={{ ...small, flex: "1 1 120px", fontFamily: MONO }} />
                      ) : (
                        <>
                          <input value={e.w ?? ""} onChange={(ev) => patchEntry(l.id, e.id, "w", ev.target.value)}
                            placeholder="kg" inputMode="decimal" style={{ ...small, flex: "0 0 58px", textAlign: "center" }} />
                          <input value={e.add ?? ""} onChange={(ev) => patchEntry(l.id, e.id, "add", ev.target.value)}
                            placeholder="add" inputMode="decimal" style={{ ...small, flex: "0 0 54px", textAlign: "center" }} />
                          <input value={e.inc ?? ""} onChange={(ev) => patchEntry(l.id, e.id, "inc", ev.target.value)}
                            placeholder="inc" inputMode="decimal" style={{ ...small, flex: "0 0 54px", textAlign: "center" }} />
                          <span style={{ fontFamily: MONO, fontSize: 13, color: C.moss, flex: "0 0 58px", textAlign: "right", fontWeight: 600 }}>
                            {totalOf(e)}kg
                          </span>
                        </>
                      )}
                      <button onClick={() => delEntry(l.id, e.id)} style={{ background: "none", border: "none", color: C.rule, cursor: "pointer", padding: 2 }}>
                        <X size={12} />
                      </button>
                    </div>
                    {e.note && <div style={{ fontSize: 11, color: C.amber, marginTop: 3 }}>{e.note}</div>}
                  </div>
                ))}

                <div style={{ display: "flex", gap: 7, marginTop: 9, flexWrap: "wrap" }}>
                  <Btn onClick={() => addEntry(l)} active style={{ padding: "6px 11px", fontSize: 12 }}>
                    <Plus size={11} /> Log today
                  </Btn>
                  <Btn onClick={() => patchLift(l.id, (x) => ({
                    ...x, entries: [...x.entries, { id: "e" + Date.now(), date: todayKey, w: null, add: 0, inc: null, side: null, pyr: [0,0,0,0], note: "" }],
                  }))} style={{ padding: "6px 11px", fontSize: 12 }}>
                    <Plus size={11} /> Pyramid row
                  </Btn>
                  <span style={{ flex: 1 }} />
                  <Btn onClick={() => setLifts(lifts.filter((x) => x.id !== l.id))}
                    style={{ padding: "6px 11px", fontSize: 12, borderColor: C.signal, color: C.signal }}>
                    Remove exercise
                  </Btn>
                </div>
                {best > 0 && (
                  <div style={{ fontFamily: MONO, fontSize: 10.5, color: C.dim, marginTop: 9 }}>
                    BEST <strong style={{ color: C.bone }}>{best}kg</strong>
                    {gain > 0 && <> · GAINED <strong style={{ color: C.moss }}>+{gain}kg</strong> SINCE {parseKey(first.date).toLocaleDateString("en-AU", { month: "short", year: "numeric" }).toUpperCase()}</>}
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}

      <Card>
        <Eyebrow right={<Btn onClick={addBody} style={{ padding: "4px 9px", fontSize: 11.5 }}><Plus size={10} /> Add</Btn>}>
          Body measurements
        </Eyebrow>
        {body.length === 0 && <div style={{ fontSize: 12.5, color: C.dim }}>Nothing recorded.</div>}
        {body.map((b) => (
          <div key={b.id} style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
            <input type="date" value={b.date} onChange={(e) => patchBody(b.id, "date", e.target.value)}
              style={{ ...small, flex: "0 0 132px" }} />
            <input value={b.height ?? ""} onChange={(e) => patchBody(b.id, "height", e.target.value)}
              placeholder="cm" inputMode="decimal" style={{ ...small, flex: "0 0 62px", textAlign: "center" }} />
            <span style={{ fontSize: 11.5, color: C.dim }}>cm</span>
            <input value={b.weight ?? ""} onChange={(e) => patchBody(b.id, "weight", e.target.value)}
              placeholder="kg" inputMode="decimal" style={{ ...small, flex: "0 0 62px", textAlign: "center" }} />
            <span style={{ fontSize: 11.5, color: C.dim }}>kg</span>
            <button onClick={() => setState({ ...state, body: body.filter((x) => x.id !== b.id) })}
              style={{ background: "none", border: "none", color: C.rule, cursor: "pointer", padding: 2 }}>
              <X size={12} />
            </button>
          </div>
        ))}
      </Card>
    </div>
  );
}
/* ============================== BODY ============================== */
function BodyTab({ state, setState, todayKey }) {
  const [view, setView] = useState("train");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card style={{ padding: 12 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[["train", "Train"], ["fuel", "Fuel"], ["goal", "Goal"]].map(([id, l]) => (
            <Btn key={id} active={view === id} onClick={() => setView(id)} style={{ padding: "6px 14px", fontSize: 12.5 }}>{l}</Btn>
          ))}
        </div>
      </Card>
      {view === "train" && (
        <>
          <MuscleMap lifts={state.lifts} />
          <Gym state={state} setState={setState} todayKey={todayKey} />
        </>
      )}
      {view === "fuel" && <Fuel state={state} setState={setState} todayKey={todayKey} />}
      {view === "goal" && <Goal state={state} setState={setState} />}
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
        if (!base.practice) base.practice = SEED_PRACTICE;
        if (!base.papers) base.papers = SEED_PAPERS;
        if (!base.lifts) base.lifts = SEED_LIFTS;
        if (!base.body) base.body = SEED_BODY;
        if (!base.profile) base.profile = { height: 183, weight: 70, sex: "m", activity: 1.55, goal: "lean" };
        if (!base.food) base.food = {};
        if (!base.topics) base.topics = SEED_TOPICS;
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
    { id: "papers", label: "Exams", icon: ListChecks },
    { id: "log", label: "Log", icon: FileText },
    { id: "gym", label: "Body", icon: Dumbbell },
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
        {tab === "papers" && <PaperWork state={state} setState={setState} />}
        {tab === "log" && <Log state={state} />}
        {tab === "gym" && <BodyTab state={state} setState={setState} todayKey={vk} />}
        {tab === "atlas" && <Atlas progress={state.atlas || SEED_PROGRESS} setProgress={(p) => setState({ ...state, atlas: p })} />}
        {tab === "backup" && <Backup state={state} setState={setState} storageOk={storageOk} saveStatus={saveStatus} exportData={exportData} />}
      </div>
    </div>
  );
}
