"use client";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { Plus, X, Camera, ScanLine } from "lucide-react";

const C = {
  ink: "#10131A", plate: "#191E28", plate2: "#141922", rule: "#2A3140",
  bone: "#E6E2D6", dim: "#7C8698", signal: "#FF6B35", steel: "#5B8DEF",
  moss: "#4FB477", amber: "#F2B441", violet: "#9B7BEA",
};
const MONO = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace";
const SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

const key = (d) => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); };
const parseKey = (k) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

const Card = ({ children, style }) => <div style={{ background: C.plate, border: `1px solid ${C.rule}`, borderRadius: 10, padding: 14, ...style }}>{children}</div>;
const Eyebrow = ({ children, right }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10, gap: 8 }}>
    <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1.4, color: C.dim, textTransform: "uppercase" }}>{children}</span>{right}
  </div>
);
const Btn = ({ children, onClick, active, style }) => (
  <button onClick={onClick} style={{
    background: active ? C.signal : C.plate2, color: active ? C.ink : C.bone,
    border: `1px solid ${active ? C.signal : C.rule}`, borderRadius: 7, padding: "7px 11px",
    fontSize: 13, fontFamily: SANS, cursor: "pointer", fontWeight: active ? 600 : 400, transition: "all .15s", ...style,
  }}>{children}</button>
);
const inp = { background: C.plate2, color: C.bone, border: `1px solid ${C.rule}`, borderRadius: 7, padding: "7px 9px", fontSize: 13.5, fontFamily: MONO, minWidth: 0 };

/* ============================== MUSCLE MAP ============================== */
export const MUSCLES = {
  chest: "Chest", front_delt: "Front delts", side_delt: "Side delts", rear_delt: "Rear delts",
  biceps: "Biceps", triceps: "Triceps", forearms: "Forearms", abs: "Abs",
  lats: "Lats", traps: "Traps", mid_back: "Mid back", lower_back: "Lower back",
  glutes: "Glutes", quads: "Quads", hamstrings: "Hamstrings", calves: "Calves",
};

/* which muscles each of Nathan's exercises loads — edit freely */
export const EXERCISE_MUSCLES = {
  "chest_press_machine": ["chest", "triceps", "front_delt"],
  "chest_press_free_weight": ["chest", "triceps", "front_delt"],
  "chest_press": ["chest", "triceps", "front_delt"],
  "pectoral_fly": ["chest"],
  "dumbbell_fly": ["chest"],
  "incline_dumbbell_press": ["chest", "front_delt", "triceps"],
  "shoulder_press_machine": ["front_delt", "side_delt", "triceps"],
  "shoulder_press_(dumbbell)": ["front_delt", "side_delt", "triceps"],
  "lat_pulldown": ["lats", "biceps", "rear_delt"],
  "lat_row": ["lats", "mid_back", "biceps"],
  "iso_lateral_row": ["lats", "mid_back", "biceps"],
  "tricep_pulldown_cable_(bar)": ["triceps"],
  "single_bar_bicep_curl": ["biceps", "forearms"],
  "overhead_bicep_pulldown": ["lats", "triceps"],
  "leg_press_stack": ["quads", "glutes"],
  "seated_leg_extension": ["quads"],
  "seated_leg_curl": ["hamstrings"],
  "calf_raises": ["calves"],
};

function setsOf(scheme) {
  const m = /(\d+)\s*x/i.exec(scheme || "");
  return m ? parseInt(m[1], 10) : 3;
}

export function muscleVolume(lifts, days = 7) {
  const since = key(addDays(new Date(), -days));
  const vol = {};
  for (const l of lifts || []) {
    const muscles = EXERCISE_MUSCLES[l.id] || [];
    const recent = (l.entries || []).filter((e) => e.date >= since).length;
    if (!recent) continue;
    for (const m of muscles) vol[m] = (vol[m] || 0) + recent * setsOf(l.scheme);
  }
  return vol;
}

const heat = (v, max) => {
  if (!v) return "#1E2430";
  const t = Math.min(1, v / Math.max(1, max));
  const r = Math.round(40 + t * (255 - 40)), g = Math.round(60 + t * (107 - 60)), b = Math.round(70 + t * (53 - 70));
  return `rgb(${r},${g},${b})`;
};

/* Stylised front/back figure. Each region is a path keyed to MUSCLES. */
function Figure({ side, vol, max, hover, setHover }) {
  const P = (id, d, extra = {}) => (
    <path key={id} d={d} fill={heat(vol[id], max)} stroke={hover === id ? C.bone : "#0E1117"} strokeWidth={hover === id ? 1.6 : 0.9}
      onMouseEnter={() => setHover(id)} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer", transition: "fill .3s" }} {...extra} />
  );
  const base = <path d="M60 6 a10 10 0 1 0 0.1 0 M50 30 L70 30 L84 44 L88 92 L80 96 L74 66 L74 120 L78 178 L68 180 L60 128 L52 180 L42 178 L46 120 L46 66 L40 96 L32 92 L36 44 Z"
    fill="#151A24" stroke="#0E1117" strokeWidth="1" />;
  const front = [
    P("chest", "M44 44 L60 40 L76 44 L74 62 L60 66 L46 62 Z"),
    P("front_delt", "M36 44 L46 40 L44 56 L37 60 Z"), P("front_delt2", "M84 44 L74 40 L76 56 L83 60 Z", { onMouseEnter: () => setHover("front_delt") }),
    P("side_delt", "M33 46 L37 44 L37 60 L34 62 Z"), P("side_delt2", "M87 46 L83 44 L83 60 L86 62 Z", { onMouseEnter: () => setHover("side_delt") }),
    P("biceps", "M35 62 L44 62 L42 82 L36 84 Z"), P("biceps2", "M85 62 L76 62 L78 82 L84 84 Z", { onMouseEnter: () => setHover("biceps") }),
    P("forearms", "M34 86 L42 84 L40 96 L33 96 Z"), P("forearms2", "M86 86 L78 84 L80 96 L87 96 Z", { onMouseEnter: () => setHover("forearms") }),
    P("abs", "M48 66 L72 66 L70 108 L60 114 L50 108 Z"),
    P("quads", "M47 122 L59 122 L58 160 L48 160 Z"), P("quads2", "M61 122 L73 122 L72 160 L62 160 Z", { onMouseEnter: () => setHover("quads") }),
    P("calves", "M47 162 L57 162 L55 178 L47 178 Z"), P("calves2", "M63 162 L73 162 L73 178 L65 178 Z", { onMouseEnter: () => setHover("calves") }),
  ];
  const back = [
    P("traps", "M48 32 L60 28 L72 32 L74 46 L60 50 L46 46 Z"),
    P("rear_delt", "M36 44 L46 42 L45 56 L37 58 Z"), P("rear_delt2", "M84 44 L74 42 L75 56 L83 58 Z", { onMouseEnter: () => setHover("rear_delt") }),
    P("lats", "M46 50 L60 52 L74 50 L72 84 L60 92 L48 84 Z"),
    P("mid_back", "M52 50 L60 48 L68 50 L66 66 L60 70 L54 66 Z"),
    P("triceps", "M35 60 L44 60 L42 82 L36 84 Z"), P("triceps2", "M85 60 L76 60 L78 82 L84 84 Z", { onMouseEnter: () => setHover("triceps") }),
    P("lower_back", "M50 86 L70 86 L69 106 L60 110 L51 106 Z"),
    P("glutes", "M47 108 L60 110 L73 108 L72 124 L60 128 L48 124 Z"),
    P("hamstrings", "M47 128 L59 128 L58 160 L48 160 Z"), P("hamstrings2", "M61 128 L73 128 L72 160 L62 160 Z", { onMouseEnter: () => setHover("hamstrings") }),
    P("calves", "M47 162 L57 162 L55 178 L47 178 Z"), P("calves2", "M63 162 L73 162 L73 178 L65 178 Z", { onMouseEnter: () => setHover("calves") }),
  ];
  return (
    <svg viewBox="0 0 120 186" style={{ width: "100%", maxWidth: 170, display: "block" }}>
      {base}
      {side === "front" ? front : back}
      <text x="60" y="184" textAnchor="middle" style={{ fontFamily: MONO, fontSize: 6.5, fill: C.dim, letterSpacing: 1 }}>{side.toUpperCase()}</text>
    </svg>
  );
}

export function MuscleMap({ lifts }) {
  const [hover, setHover] = useState(null);
  const [range, setRange] = useState(7);
  const vol = useMemo(() => muscleVolume(lifts, range), [lifts, range]);
  const max = Math.max(1, ...Object.values(vol));
  const trained = Object.keys(MUSCLES).filter((m) => vol[m]);
  const untrained = Object.keys(MUSCLES).filter((m) => !vol[m]);

  return (
    <Card>
      <Eyebrow right={
        <span style={{ display: "flex", gap: 4 }}>
          {[7, 14, 30].map((d) => <Btn key={d} active={range === d} onClick={() => setRange(d)} style={{ padding: "3px 8px", fontSize: 11 }}>{d}d</Btn>)}
        </span>
      }>Muscles hit — last {range} days</Eyebrow>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <Figure side="front" vol={vol} max={max} hover={hover} setHover={setHover} />
          <Figure side="back" vol={vol} max={max} hover={hover} setHover={setHover} />
        </div>
        <div style={{ flex: "1 1 180px", minWidth: 0 }}>
          <div style={{ minHeight: 40, marginBottom: 10 }}>
            {hover ? (
              <>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{MUSCLES[hover.replace(/2$/, "")]}</div>
                <div style={{ fontFamily: MONO, fontSize: 12, color: vol[hover.replace(/2$/, "")] ? C.moss : C.signal }}>
                  {vol[hover.replace(/2$/, "")] || 0} sets in {range} days
                </div>
              </>
            ) : <div style={{ fontSize: 12.5, color: C.dim }}>Hover a muscle.</div>}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim, letterSpacing: 1, marginBottom: 5 }}>TRAINED</div>
          {trained.length === 0 && <div style={{ fontSize: 12, color: C.dim }}>Nothing logged in this window.</div>}
          {trained.sort((a, b) => vol[b] - vol[a]).map((m) => (
            <div key={m} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "2px 0" }}>
              <span style={{ color: C.bone }}>{MUSCLES[m]}</span>
              <span style={{ fontFamily: MONO, color: C.moss }}>{vol[m]} sets</span>
            </div>
          ))}
          {untrained.length > 0 && (
            <>
              <div style={{ fontFamily: MONO, fontSize: 10, color: C.signal, letterSpacing: 1, margin: "10px 0 5px" }}>NOT TOUCHED</div>
              <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.6 }}>{untrained.map((m) => MUSCLES[m]).join(" · ")}</div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ============================== GOAL ============================== */
const ACTIVITY = [
  { id: 1.2, label: "Desk, no training" }, { id: 1.375, label: "1–2 sessions/wk" },
  { id: 1.55, label: "3–4 sessions/wk" }, { id: 1.725, label: "5–6 sessions/wk" },
];
const GOALS = [
  { id: "cut", label: "Lose fat", delta: -350 }, { id: "maintain", label: "Maintain", delta: 0 },
  { id: "lean", label: "Lean gain", delta: 250 }, { id: "bulk", label: "Build", delta: 400 },
];

export function targetsFor(p) {
  if (!p || !p.weight || !p.height || !p.age) return null;
  const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === "f" ? -161 : 5);
  const tdee = bmr * (p.activity || 1.55);
  const g = GOALS.find((x) => x.id === p.goal) || GOALS[1];
  const kcal = Math.round(tdee + g.delta);
  const protein = Math.round(p.weight * (g.id === "cut" ? 2.2 : 1.8));
  const fat = Math.round((kcal * 0.27) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), kcal, protein, fat, carbs, delta: g.delta };
}

export function Goal({ state, setState }) {
  const p = state.profile || {};
  const set = (f, v) => setState({ ...state, profile: { ...p, [f]: v } });
  const num = (f, v) => set(f, v === "" ? null : Number(v));
  const t = targetsFor(p);
  const body = [...(state.body || [])].sort((a, b) => a.date.localeCompare(b.date));
  const latest = body.filter((b) => b.weight).at(-1);
  const weeksToGoal = (t && p.goalWeight && latest?.weight && t.delta)
    ? Math.abs((p.goalWeight - latest.weight) * 7700 / (t.delta * 7)) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card>
        <Eyebrow>You</Eyebrow>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 8 }}>
          {[["height", "Height", "cm"], ["weight", "Weight now", "kg"], ["goalWeight", "Goal weight", "kg"], ["age", "Age", "yrs"]].map(([f, l, u]) => (
            <label key={f} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontFamily: MONO, fontSize: 9.5, color: C.dim, letterSpacing: 1 }}>{l.toUpperCase()}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <input value={p[f] ?? ""} onChange={(e) => num(f, e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} />
                <span style={{ fontSize: 11, color: C.dim }}>{u}</span>
              </div>
            </label>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontFamily: MONO, fontSize: 9.5, color: C.dim, letterSpacing: 1, marginRight: 4 }}>SEX</span>
          {[["m", "Male"], ["f", "Female"]].map(([v, l]) => <Btn key={v} active={p.sex === v} onClick={() => set("sex", v)} style={{ padding: "5px 10px", fontSize: 12 }}>{l}</Btn>)}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontFamily: MONO, fontSize: 9.5, color: C.dim, letterSpacing: 1, marginRight: 4 }}>ACTIVITY</span>
          {ACTIVITY.map((a) => <Btn key={a.id} active={p.activity === a.id} onClick={() => set("activity", a.id)} style={{ padding: "5px 10px", fontSize: 12 }}>{a.label}</Btn>)}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontFamily: MONO, fontSize: 9.5, color: C.dim, letterSpacing: 1, marginRight: 4 }}>GOAL</span>
          {GOALS.map((g) => <Btn key={g.id} active={p.goal === g.id} onClick={() => set("goal", g.id)} style={{ padding: "5px 10px", fontSize: 12 }}>{g.label}</Btn>)}
        </div>
      </Card>

      {t ? (
        <Card>
          <Eyebrow>Daily targets</Eyebrow>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            {[["Calories", t.kcal, "kcal", C.bone], ["Protein", t.protein, "g", C.moss], ["Carbs", t.carbs, "g", C.steel], ["Fat", t.fat, "g", C.amber]].map(([l, v, u, col]) => (
              <div key={l} style={{ flex: "1 1 90px" }}>
                <div style={{ fontFamily: MONO, fontSize: 9.5, color: C.dim, letterSpacing: 1 }}>{l.toUpperCase()}</div>
                <div style={{ fontFamily: MONO, fontSize: 24, color: col, lineHeight: 1.1 }}>{v}<span style={{ fontSize: 11, color: C.dim }}>{u}</span></div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: C.dim, marginTop: 10, lineHeight: 1.6 }}>
            Maintenance is about <strong style={{ color: C.bone }}>{t.tdee} kcal</strong>. You're set {t.delta === 0 ? "at maintenance" : `${t.delta > 0 ? "+" : ""}${t.delta} kcal from it`}.
            {weeksToGoal && <> At that rate, {p.goalWeight}kg is roughly <strong style={{ color: C.bone }}>{Math.round(weeksToGoal)} weeks</strong> away.</>}
          </div>
          <div style={{ fontSize: 11.5, color: C.dim, marginTop: 8, lineHeight: 1.5 }}>
            These are estimates from a standard formula. Real intake needed varies by ±15%. Adjust after two weeks of actual weigh-ins, not before.
          </div>
        </Card>
      ) : (
        <Card><div style={{ fontSize: 13, color: C.dim }}>Fill in height, weight, age and sex to get targets.</div></Card>
      )}

      {body.length > 1 && (
        <Card>
          <Eyebrow>Weight trend</Eyebrow>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 60 }}>
            {body.filter((b) => b.weight).map((b) => {
              const ws = body.filter((x) => x.weight).map((x) => x.weight);
              const lo = Math.min(...ws) - 1, hi = Math.max(...ws) + 1;
              return <div key={b.id} title={`${b.date}: ${b.weight}kg`} style={{ flex: 1, height: `${((b.weight - lo) / (hi - lo)) * 100}%`, background: C.steel, borderRadius: 2, minWidth: 6 }} />;
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ============================== FUEL ============================== */
export function Fuel({ state, setState, todayKey }) {
  const [tab, setTab] = useState("manual");
  const [draft, setDraft] = useState({ name: "", grams: "", kcal: "", protein: "", carbs: "", fat: "" });
  const [scanMsg, setScanMsg] = useState("");
  const [scanning, setScanning] = useState(false);
  const [product, setProduct] = useState(null);
  const [grams, setGrams] = useState(100);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoItems, setPhotoItems] = useState(null);
  const scannerRef = useRef(null);
  const fileRef = useRef(null);

  const food = state.food || {};
  const today = food[todayKey] || [];
  const t = targetsFor(state.profile);
  const sum = today.reduce((a, f) => ({ kcal: a.kcal + (f.kcal || 0), protein: a.protein + (f.protein || 0), carbs: a.carbs + (f.carbs || 0), fat: a.fat + (f.fat || 0) }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 });

  const addFood = (item) => setState({ ...state, food: { ...food, [todayKey]: [...today, { id: "f" + Date.now() + Math.random().toString(36).slice(2, 5), ...item }] } });
  const remove = (id) => setState({ ...state, food: { ...food, [todayKey]: today.filter((f) => f.id !== id) } });

  /* ---- barcode ---- */
  const startScan = async () => {
    setScanMsg(""); setProduct(null);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const sc = new Html5Qrcode("scan-box");
      scannerRef.current = sc;
      setScanning(true);
      await sc.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 240, height: 140 } },
        async (code) => {
          await sc.stop(); setScanning(false);
          setScanMsg("Looking up " + code + "…");
          try {
            const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}?fields=product_name,brands,nutriments,serving_size`);
            const j = await r.json();
            if (j.status !== 1) { setScanMsg("Not in the database — enter it manually."); return; }
            const n = j.product.nutriments || {};
            setProduct({
              name: [j.product.brands, j.product.product_name].filter(Boolean).join(" — "),
              kcal: n["energy-kcal_100g"] ?? (n["energy_100g"] ? n["energy_100g"] / 4.184 : 0),
              protein: n.proteins_100g || 0, carbs: n.carbohydrates_100g || 0, fat: n.fat_100g || 0,
              serving: j.product.serving_size,
            });
            setScanMsg("");
          } catch { setScanMsg("Lookup failed. Check your connection."); }
        }, () => {});
    } catch (e) {
      setScanning(false);
      setScanMsg("Camera unavailable. On iPhone this needs Safari and HTTPS.");
    }
  };
  const stopScan = async () => { try { await scannerRef.current?.stop(); } catch {} setScanning(false); };
  useEffect(() => () => { scannerRef.current?.stop?.().catch(() => {}); }, []);

  /* ---- photo ---- */
  const onPhoto = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setPhotoBusy(true); setPhotoItems(null); setScanMsg("");
    try {
      const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(f); });
      const r = await fetch("/api/food-photo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: b64, mime: f.type }) });
      const j = await r.json();
      if (j.error) { setScanMsg(j.error); return; }
      setPhotoItems(j.items || []);
    } catch { setScanMsg("Photo analysis failed."); }
    setPhotoBusy(false);
    e.target.value = "";
  };

  const Bar = ({ label, v, max, col }) => (
    <div style={{ flex: "1 1 110px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 4 }}>
        <span style={{ color: C.dim }}>{label}</span>
        <span style={{ fontFamily: MONO, color: max && v > max * 1.1 ? C.signal : C.bone }}>{Math.round(v)}{max ? ` / ${max}` : ""}</span>
      </div>
      <div style={{ height: 6, background: C.rule, borderRadius: 3 }}>
        <div style={{ height: "100%", width: `${max ? Math.min(100, (v / max) * 100) : 0}%`, background: col, borderRadius: 3, transition: "width .3s" }} />
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card>
        <Eyebrow right={!t && <span style={{ fontSize: 11, color: C.amber }}>Set your goal for targets</span>}>Today</Eyebrow>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <Bar label="Calories" v={sum.kcal} max={t?.kcal} col={C.bone} />
          <Bar label="Protein" v={sum.protein} max={t?.protein} col={C.moss} />
          <Bar label="Carbs" v={sum.carbs} max={t?.carbs} col={C.steel} />
          <Bar label="Fat" v={sum.fat} max={t?.fat} col={C.amber} />
        </div>
        {today.length > 0 && (
          <div style={{ marginTop: 12, borderTop: `1px solid ${C.rule}`, paddingTop: 8 }}>
            {today.map((f) => (
              <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 12.5 }}>
                <span style={{ color: C.bone, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}{f.grams ? <span style={{ color: C.dim }}> · {f.grams}g</span> : null}</span>
                <span style={{ fontFamily: MONO, fontSize: 11.5, color: C.dim, flexShrink: 0 }}>
                  {Math.round(f.kcal)} · <span style={{ color: C.moss }}>{Math.round(f.protein)}p</span> <span style={{ color: C.steel }}>{Math.round(f.carbs)}c</span> <span style={{ color: C.amber }}>{Math.round(f.fat)}f</span>
                </span>
                <button onClick={() => remove(f.id)} style={{ background: "none", border: "none", color: C.rule, cursor: "pointer", padding: 2 }}><X size={12} /></button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card style={{ padding: 12 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[["manual", "Type it"], ["scan", "Scan barcode"], ["photo", "Photo"]].map(([id, l]) => (
            <Btn key={id} active={tab === id} onClick={() => { setTab(id); setScanMsg(""); }} style={{ padding: "6px 12px", fontSize: 12.5 }}>
              {id === "scan" && <ScanLine size={12} style={{ marginRight: 5, verticalAlign: -1 }} />}
              {id === "photo" && <Camera size={12} style={{ marginRight: 5, verticalAlign: -1 }} />}{l}
            </Btn>
          ))}
        </div>
      </Card>

      {tab === "manual" && (
        <Card>
          <Eyebrow>Add food</Eyebrow>
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="What"
            style={{ ...inp, fontFamily: SANS, width: "100%", boxSizing: "border-box", marginBottom: 8 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6 }}>
            {[["grams", "g"], ["kcal", "kcal"], ["protein", "P"], ["carbs", "C"], ["fat", "F"]].map(([f, l]) => (
              <input key={f} value={draft[f]} onChange={(e) => setDraft({ ...draft, [f]: e.target.value })} placeholder={l} inputMode="decimal" style={{ ...inp, textAlign: "center", padding: "7px 4px" }} />
            ))}
          </div>
          <Btn active onClick={() => {
            if (!draft.name) return;
            addFood({ name: draft.name, grams: Number(draft.grams) || null, kcal: Number(draft.kcal) || 0, protein: Number(draft.protein) || 0, carbs: Number(draft.carbs) || 0, fat: Number(draft.fat) || 0 });
            setDraft({ name: "", grams: "", kcal: "", protein: "", carbs: "", fat: "" });
          }} style={{ marginTop: 10, padding: "8px 14px" }}><Plus size={12} /> Add</Btn>
        </Card>
      )}

      {tab === "scan" && (
        <Card>
          <Eyebrow>Barcode</Eyebrow>
          <div id="scan-box" style={{ width: "100%", maxWidth: 360, borderRadius: 8, overflow: "hidden", background: C.plate2, minHeight: scanning ? 200 : 0 }} />
          <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
            {!scanning ? <Btn active onClick={startScan}><ScanLine size={13} /> Start camera</Btn> : <Btn onClick={stopScan}>Stop</Btn>}
            {scanMsg && <span style={{ fontSize: 12.5, color: C.amber }}>{scanMsg}</span>}
          </div>
          {product && (
            <div style={{ marginTop: 12, borderTop: `1px solid ${C.rule}`, paddingTop: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{product.name || "Unnamed product"}</div>
              <div style={{ fontFamily: MONO, fontSize: 11.5, color: C.dim, marginBottom: 8 }}>
                per 100g · {Math.round(product.kcal)} kcal · {product.protein}p · {product.carbs}c · {product.fat}f
                {product.serving && <> · serving {product.serving}</>}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input value={grams} onChange={(e) => setGrams(Number(e.target.value) || 0)} inputMode="decimal" style={{ ...inp, width: 80, textAlign: "center" }} />
                <span style={{ fontSize: 12, color: C.dim }}>grams</span>
                <Btn active onClick={() => {
                  const k = grams / 100;
                  addFood({ name: product.name, grams, kcal: product.kcal * k, protein: product.protein * k, carbs: product.carbs * k, fat: product.fat * k });
                  setProduct(null);
                }}><Plus size={12} /> Add {Math.round(product.kcal * grams / 100)} kcal</Btn>
              </div>
            </div>
          )}
          <div style={{ fontSize: 11.5, color: C.dim, marginTop: 10, lineHeight: 1.5 }}>
            Uses Open Food Facts — covers most Woolworths and Coles products, not all. Needs camera permission and HTTPS, so it works on your Vercel URL but not localhost on a phone.
          </div>
        </Card>
      )}

      {tab === "photo" && (
        <Card>
          <Eyebrow>Photo</Eyebrow>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPhoto} style={{ display: "none" }} />
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Btn active onClick={() => fileRef.current?.click()} style={{ opacity: photoBusy ? .5 : 1 }}>
              <Camera size={13} /> {photoBusy ? "Analysing…" : "Take a photo"}
            </Btn>
            {scanMsg && <span style={{ fontSize: 12.5, color: C.amber }}>{scanMsg}</span>}
          </div>
          {photoItems && (
            <div style={{ marginTop: 12, borderTop: `1px solid ${C.rule}`, paddingTop: 10 }}>
              {photoItems.length === 0 && <div style={{ fontSize: 12.5, color: C.dim }}>Couldn't identify food in that photo.</div>}
              {photoItems.map((it, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "5px 0" }}>
                  <span style={{ fontSize: 13, color: C.bone }}>{it.name} <span style={{ color: C.dim }}>~{it.grams}g</span></span>
                  <span style={{ fontFamily: MONO, fontSize: 11.5, color: C.dim }}>{Math.round(it.kcal)} · {Math.round(it.protein)}p {Math.round(it.carbs)}c {Math.round(it.fat)}f</span>
                  <Btn onClick={() => { addFood(it); setPhotoItems(photoItems.filter((_, k) => k !== i)); }} style={{ padding: "4px 9px", fontSize: 11.5 }}>Add</Btn>
                </div>
              ))}
              <div style={{ fontSize: 11.5, color: C.amber, marginTop: 8, lineHeight: 1.5 }}>These are estimates from a photo. Expect ±25%.</div>
            </div>
          )}
          <div style={{ fontSize: 11.5, color: C.dim, marginTop: 10, lineHeight: 1.5 }}>
            Needs your Anthropic API key in Vercel. Without it this returns an error and nothing else breaks.
          </div>
        </Card>
      )}
    </div>
  );
}
