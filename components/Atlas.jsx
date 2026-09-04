"use client";
import React, { useState, useMemo } from "react";
import { WORLDS, DEPTHS, SEED_PROGRESS, reachable, coverage } from "../lib/atlas";

const C = {
  ink: "#10131A", plate: "#191E28", plate2: "#141922", rule: "#2A3140",
  bone: "#E6E2D6", dim: "#7C8698", signal: "#FF6B35", steel: "#5B8DEF",
  moss: "#4FB477", amber: "#F2B441",
};
const MONO = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace";
const SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/* ---------- deterministic noise so the world is the same every load ---------- */
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/* ---------- hex helpers (pointy-top, axial coords) ---------- */
const HEX_R = 9;
const hexW = Math.sqrt(3) * HEX_R;
const hexH = 1.5 * HEX_R;
const axialToXY = (q, r) => ({ x: hexW * (q + r / 2), y: hexH * r });
function hexPath(cx, cy) {
  let d = "";
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    const x = cx + HEX_R * Math.cos(a), y = cy + HEX_R * Math.sin(a);
    d += (i ? "L" : "M") + x.toFixed(2) + " " + y.toFixed(2);
  }
  return d + "Z";
}
const NEIGH = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

/* ---------- build the landmass and carve it into territories ---------- */
function buildWorld(world, seedNum) {
  const rand = rng(seedNum);
  const terr = world.territories;
  const totalW = terr.reduce((a, t) => a + t.w, 0);

  // 1. a rough continent-shaped blob of hexes
  const R = 26;
  const cells = [];
  for (let r = -R; r <= R; r++) {
    for (let q = -R; q <= R; q++) {
      const { x, y } = axialToXY(q, r);
      const nx = x / (R * hexW * 0.98), ny = y / (R * hexH * 1.25);
      const d = Math.sqrt(nx * nx + ny * ny);
      const wobble = 0.16 * Math.sin(Math.atan2(ny, nx) * 3 + seedNum) +
                     0.10 * Math.sin(Math.atan2(ny, nx) * 5 - seedNum);
      if (d < 0.92 + wobble && rand() > 0.02) cells.push({ q, r, x, y, t: null });
    }
  }
  const index = new Map(cells.map((c) => [c.q + "," + c.r, c]));
  const quota = terr.map((t) => Math.max(3, Math.round((t.w / totalW) * cells.length)));

  // 2. seed points — group by continent so related fields end up neighbours
  const contIds = Object.keys(world.continents);
  const byCont = {};
  contIds.forEach((c, i) => {
    const a = (i / contIds.length) * Math.PI * 2 + 0.6;
    byCont[c] = { ax: Math.cos(a) * R * hexW * 0.42, ay: Math.sin(a) * R * hexH * 0.5 };
  });

  const seeds = terr.map((t, i) => {
    const base = byCont[t.continent] || { ax: 0, ay: 0 };
    // lower tiers sit near the coast of their continent, higher tiers inland
    const inward = 1 - t.tier / 6;
    const jx = (rand() - 0.5) * R * hexW * 0.5;
    const jy = (rand() - 0.5) * R * hexH * 0.55;
    const tx = base.ax * (0.5 + inward * 0.9) + jx;
    const ty = base.ay * (0.5 + inward * 0.9) + jy;
    let best = null, bd = Infinity;
    for (const c of cells) {
      if (c.t !== null) continue;
      const d = (c.x - tx) ** 2 + (c.y - ty) ** 2;
      if (d < bd) { bd = d; best = c; }
    }
    if (best) best.t = i;
    return best;
  });

  // 3. grow each territory outward until it fills its quota
  const frontiers = seeds.map((s) => (s ? [s] : []));
  const sizes = terr.map((_, i) => (seeds[i] ? 1 : 0));
  let moved = true;
  while (moved) {
    moved = false;
    for (let i = 0; i < terr.length; i++) {
      if (sizes[i] >= quota[i] || !frontiers[i].length) continue;
      const next = [];
      for (const cell of frontiers[i]) {
        for (const [dq, dr] of NEIGH) {
          const n = index.get((cell.q + dq) + "," + (cell.r + dr));
          if (n && n.t === null) {
            n.t = i; sizes[i]++; next.push(n); moved = true;
            if (sizes[i] >= quota[i]) break;
          }
        }
        if (sizes[i] >= quota[i]) break;
      }
      frontiers[i] = next.length ? next : frontiers[i].filter((c) => {
        return NEIGH.some(([dq, dr]) => {
          const n = index.get((c.q + dq) + "," + (c.r + dr));
          return n && n.t === null;
        });
      });
    }
  }

  // 4. mop up stragglers so there are no holes
  for (const c of cells) {
    if (c.t !== null) continue;
    for (const [dq, dr] of NEIGH) {
      const n = index.get((c.q + dq) + "," + (c.r + dr));
      if (n && n.t !== null) { c.t = n.t; break; }
    }
  }

  // 5. one path per territory — 50 paths instead of 1200
  const paths = terr.map(() => "");
  const centroids = terr.map(() => ({ x: 0, y: 0, n: 0 }));
  for (const c of cells) {
    if (c.t === null) continue;
    paths[c.t] += hexPath(c.x, c.y);
    const cen = centroids[c.t];
    cen.x += c.x; cen.y += c.y; cen.n++;
  }
  return terr.map((t, i) => ({
    ...t,
    path: paths[i],
    cx: centroids[i].n ? centroids[i].x / centroids[i].n : 0,
    cy: centroids[i].n ? centroids[i].y / centroids[i].n : 0,
    cells: centroids[i].n,
  }));
}

/* ---------- colours ---------- */
function fillFor(t, depth, isReach, hue) {
  if (depth >= 4) return "#7FE8A8";
  if (depth === 3) return C.moss;
  if (depth === 2) return "rgba(79,180,119,.55)";
  if (depth === 1) return "rgba(79,180,119,.26)";
  if (isReach) return "rgba(255,107,53,.16)";
  return hue ? hue + "14" : "#1A1F29";
}

export default function Atlas({ progress, setProgress }) {
  const [worldId, setWorldId] = useState("maths");
  const [sel, setSel] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showRoutes, setShowRoutes] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [dimLocked, setDimLocked] = useState(true);

  const world = WORLDS[worldId];
  const seedNum = worldId === "maths" ? 7 : worldId === "physics" ? 23 : 41;
  const built = useMemo(() => buildWorld(world, seedNum), [worldId]);

  const prog = progress || {};
  const reach = useMemo(() => reachable(world, prog), [world, prog]);
  const reachIds = useMemo(() => new Set(reach.map((t) => t.id)), [reach]);
  const cov = useMemo(() => coverage(world, prog), [world, prog]);
  const byId = useMemo(() => Object.fromEntries(built.map((t) => [t.id, t])), [built]);

  const setDepth = (id, v) => setProgress({ ...prog, [id]: v });

  const selT = sel ? byId[sel] : null;
  const selDepth = sel ? (prog[sel] || 0) : 0;

  const VB = 560;
  const viewBox = `${-VB / 2 / zoom + pan.x} ${-VB / 2 / zoom + pan.y} ${VB / zoom} ${VB / zoom}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, color: C.bone, fontFamily: SANS }}>
      <style>{`
        .atlas-grid { display:grid; grid-template-columns:1fr; gap:12px; align-items:start; }
        @media (min-width:960px){ .atlas-grid { grid-template-columns:minmax(0,1fr) 296px; } }
        .terr { cursor:pointer; transition:fill .25s, stroke .2s; }
        .terr:hover { stroke:${C.bone}; stroke-width:1.2; }
      `}</style>

      {/* header strip, Earth View style */}
      <div style={{ background: C.plate, border: `1px solid ${C.rule}`, borderRadius: 10, padding: "10px 13px" }}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 2, color: C.signal }}>ATLAS</div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "baseline", marginTop: 3 }}>
          <span style={{ fontSize: 17, fontWeight: 600 }}>{world.name}</span>
          <span style={{ fontFamily: MONO, fontSize: 11.5, color: C.moss }}>
            HELD {cov.heldPct.toFixed(1)}%
          </span>
          <span style={{ fontFamily: MONO, fontSize: 11.5, color: C.steel }}>
            FLUENT+ {cov.deepPct.toFixed(1)}%
          </span>
          <span style={{ fontFamily: MONO, fontSize: 11.5, color: C.signal }}>
            REACHABLE {cov.reachPct.toFixed(1)}%
          </span>
          <span style={{ fontFamily: MONO, fontSize: 11.5, color: C.dim }}>
            {cov.heldCount}/{cov.count} TERRITORIES
          </span>
        </div>
        <div style={{ fontSize: 12, color: C.dim, marginTop: 5 }}>{world.blurb}</div>
      </div>

      <div className="atlas-grid">
        {/* the map */}
        <div style={{ background: C.plate2, border: `1px solid ${C.rule}`, borderRadius: 10, overflow: "hidden", position: "relative" }}>
          <svg viewBox={viewBox} style={{ width: "100%", display: "block", aspectRatio: "1", background: "radial-gradient(circle at 50% 45%, #151B26 0%, #0C0F15 70%)" }}>
            <defs>
              <filter id="glow"><feGaussianBlur stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>

            {/* prerequisite routes */}
            {showRoutes && built.map((t) =>
              t.p.map((pre) => {
                const a = byId[pre]; if (!a) return null;
                const open = (prog[pre] || 0) >= 2;
                const held = (prog[t.id] || 0) > 0;
                if (!open && dimLocked) return null;
                return (
                  <line key={t.id + pre} x1={a.cx} y1={a.cy} x2={t.cx} y2={t.cy}
                    stroke={held ? "rgba(79,180,119,.45)" : reachIds.has(t.id) ? C.signal : "rgba(124,134,152,.2)"}
                    strokeWidth={reachIds.has(t.id) ? 1.4 : 0.7}
                    strokeDasharray={reachIds.has(t.id) ? "3 3" : "none"} />
                );
              })
            )}

            {/* territories */}
            {built.map((t) => {
              const depth = prog[t.id] || 0;
              const isReach = reachIds.has(t.id);
              const hue = world.continents[t.continent]?.hue;
              return (
                <path key={t.id} d={t.path} className="terr"
                  fill={fillFor(t, depth, isReach, hue)}
                  stroke={sel === t.id ? C.bone : isReach ? C.signal : depth > 0 ? "rgba(79,180,119,.5)" : "rgba(42,49,64,.9)"}
                  strokeWidth={sel === t.id ? 1.6 : isReach ? 1 : 0.5}
                  filter={depth >= 3 ? "url(#glow)" : undefined}
                  onClick={() => setSel(t.id === sel ? null : t.id)} />
              );
            })}

            {/* labels only where there's room */}
            {showLabels && built.filter((t) => t.cells > 12 || (prog[t.id] || 0) > 0 || reachIds.has(t.id)).map((t) => (
              <text key={t.id} x={t.cx} y={t.cy} textAnchor="middle" dominantBaseline="middle"
                pointerEvents="none"
                style={{
                  fontFamily: MONO, fontSize: Math.max(4.6, Math.min(8, 3 + t.cells / 9)),
                  fill: (prog[t.id] || 0) > 0 ? C.ink : reachIds.has(t.id) ? C.signal : "rgba(230,226,214,.42)",
                  fontWeight: (prog[t.id] || 0) > 0 ? 700 : 400,
                }}>
                {t.name.length > 22 ? t.name.slice(0, 20) + "…" : t.name}
              </text>
            ))}
          </svg>

          <div style={{ position: "absolute", right: 9, bottom: 9, display: "flex", gap: 5 }}>
            {[["−", () => setZoom((z) => Math.max(1, z / 1.4))],
              ["+", () => setZoom((z) => Math.min(5, z * 1.4))],
              ["⌖", () => { setZoom(1); setPan({ x: 0, y: 0 }); }]].map(([l, fn], i) => (
              <button key={i} onClick={fn} style={{
                background: "rgba(25,30,40,.9)", color: C.bone, border: `1px solid ${C.rule}`,
                borderRadius: 6, width: 28, height: 28, cursor: "pointer", fontSize: 14, fontFamily: MONO,
              }}>{l}</button>
            ))}
          </div>
          {zoom > 1 && (
            <div style={{ position: "absolute", left: 9, bottom: 9, display: "flex", gap: 4 }}>
              {[["←", -1, 0], ["→", 1, 0], ["↑", 0, -1], ["↓", 0, 1]].map(([l, dx, dy]) => (
                <button key={l} onClick={() => setPan((p) => ({ x: p.x + dx * 40 / zoom, y: p.y + dy * 40 / zoom }))}
                  style={{ background: "rgba(25,30,40,.9)", color: C.dim, border: `1px solid ${C.rule}`, borderRadius: 6, width: 26, height: 26, cursor: "pointer", fontSize: 12 }}>{l}</button>
              ))}
            </div>
          )}
        </div>

        {/* right panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Panel title="Worlds">
            {Object.values(WORLDS).map((w, i) => {
              const on = w.id === worldId;
              const c = coverage(w, prog);
              return (
                <button key={w.id} onClick={() => { setWorldId(w.id); setSel(null); setZoom(1); setPan({ x: 0, y: 0 }); }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 9px",
                    background: on ? "rgba(255,107,53,.11)" : "transparent",
                    border: `1px solid ${on ? C.signal : "transparent"}`, borderRadius: 7,
                    cursor: "pointer", marginBottom: 4, textAlign: "left",
                  }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 13, color: on ? C.bone : C.dim }}>{w.name}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: on ? C.moss : C.dim }}>{c.heldPct.toFixed(0)}%</span>
                </button>
              );
            })}
          </Panel>

          <Panel title="Overlays">
            {[["Prerequisite routes", showRoutes, setShowRoutes],
              ["Territory names", showLabels, setShowLabels],
              ["Hide locked routes", dimLocked, setDimLocked]].map(([label, val, set]) => (
              <button key={label} onClick={() => set(!val)} style={{
                width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "7px 9px", background: "transparent", border: `1px solid ${val ? C.rule : "transparent"}`,
                borderRadius: 7, cursor: "pointer", marginBottom: 3,
              }}>
                <span style={{ fontSize: 12.5, color: val ? C.bone : C.dim }}>{label}</span>
                <span style={{ fontFamily: MONO, fontSize: 10, color: val ? C.moss : C.rule }}>{val ? "ON" : "OFF"}</span>
              </button>
            ))}
          </Panel>

          <Panel title={selT ? "Territory" : `Next hop · ${reach.length} open`}>
            {selT ? (
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{selT.name}</div>
                <div style={{ fontFamily: MONO, fontSize: 10.5, color: C.dim, marginBottom: 9 }}>
                  {world.continents[selT.continent]?.name.toUpperCase()} · TIER {selT.tier} · {selT.w} AREA
                </div>
                {selT.note && <div style={{ fontSize: 12.5, color: C.amber, lineHeight: 1.5, marginBottom: 9 }}>{selT.note}</div>}
                {selT.p.length > 0 && (
                  <div style={{ fontSize: 12, color: C.dim, marginBottom: 9, lineHeight: 1.5 }}>
                    Needs: {selT.p.map((p) => {
                      const ok = (prog[p] || 0) >= 2;
                      return <span key={p} style={{ color: ok ? C.moss : C.signal }}>{byId[p]?.name || p}{" "}</span>;
                    })}
                  </div>
                )}
                <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim, letterSpacing: 1, marginBottom: 6 }}>HOW WELL DO YOU HOLD IT?</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {DEPTHS.map((d) => (
                    <button key={d.v} onClick={() => setDepth(selT.id, d.v)} style={{
                      padding: "6px 9px", fontSize: 11, fontFamily: MONO, borderRadius: 6, cursor: "pointer",
                      background: selDepth === d.v ? C.moss : C.plate2,
                      color: selDepth === d.v ? C.ink : C.dim,
                      border: `1px solid ${selDepth === d.v ? C.moss : C.rule}`,
                      fontWeight: selDepth === d.v ? 700 : 400,
                    }}>{d.label}</button>
                  ))}
                </div>
              </div>
            ) : reach.length === 0 ? (
              <div style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.5 }}>
                Nothing reachable. Take an existing territory to Worked to open routes.
              </div>
            ) : (
              <>
                <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.5, marginBottom: 9 }}>
                  Prerequisites met. You could start any of these tomorrow.
                </div>
                {reach.sort((a, b) => b.w - a.w).slice(0, 7).map((t) => (
                  <button key={t.id} onClick={() => setSel(t.id)} style={{
                    width: "100%", display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center",
                    padding: "7px 0", background: "none", border: "none", borderBottom: `1px solid ${C.rule}`,
                    cursor: "pointer", textAlign: "left",
                  }}>
                    <span style={{ fontSize: 12.5, color: C.bone }}>{t.name}</span>
                    <span style={{ fontFamily: MONO, fontSize: 10.5, color: C.signal }}>{t.w}</span>
                  </button>
                ))}
              </>
            )}
          </Panel>

          <Panel title="Legend">
            {[["Generative", "#7FE8A8"], ["Fluent", C.moss], ["Worked", "rgba(79,180,119,.55)"],
              ["Skimmed", "rgba(79,180,119,.26)"], ["Reachable", "rgba(255,107,53,.35)"], ["Unexplored", "#1A1F29"]].map(([l, c]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
                <span style={{ width: 13, height: 13, background: c, border: `1px solid ${C.rule}`, borderRadius: 3, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: C.dim }}>{l}</span>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div style={{ background: C.plate, border: `1px solid ${C.rule}`, borderRadius: 10, padding: 12 }}>
      <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1.4, color: C.dim, textTransform: "uppercase", marginBottom: 9 }}>{title}</div>
      {children}
    </div>
  );
}

export { SEED_PROGRESS };
