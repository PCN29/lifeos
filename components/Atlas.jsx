"use client";
import React, { useState, useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { WORLDS, DEPTHS, SEED_PROGRESS, reachable, coverage } from "../lib/atlas";

const C = {
  ink: "#10131A", plate: "#191E28", plate2: "#141922", rule: "#2A3140",
  bone: "#E6E2D6", dim: "#7C8698", signal: "#FF6B35", steel: "#5B8DEF",
  moss: "#4FB477", amber: "#F2B441",
};
const MONO = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace";
const SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

const TEX_W = 1024, TEX_H = 512;
const CUT = 0.30; // how far from a seed before it becomes ocean

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const toRad = (d) => (d * Math.PI) / 180;

function sph(latDeg, lonDeg) {
  const la = toRad(latDeg), lo = toRad(lonDeg);
  return [Math.cos(la) * Math.cos(lo), Math.sin(la), Math.cos(la) * Math.sin(lo)];
}
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/* ---------- lay the territories out on the sphere ---------- */
function placeWorld(world, seedNum) {
  const rand = rng(seedNum);
  const contIds = Object.keys(world.continents);

  const contCenter = {};
  contIds.forEach((c, i) => {
    const frac = contIds.length > 1 ? i / (contIds.length - 1) : 0.5;
    const lat = (0.72 - frac * 1.44) * 62 + (rand() - 0.5) * 14;
    const lon = ((i * 137.5) + seedNum * 29) % 360 - 180;
    contCenter[c] = { lat, lon };
  });

  const seeds = world.territories.map((t) => {
    const cc = contCenter[t.continent] || { lat: 0, lon: 0 };
    const inland = 0.3 + (t.tier / 5) * 0.8;
    const ang = rand() * Math.PI * 2;
    const rad = 25 * inland * (0.4 + rand() * 0.8);
    const lat = Math.max(-76, Math.min(76, cc.lat + Math.sin(ang) * rad * 0.8));
    const lon = cc.lon + (Math.cos(ang) * rad) / Math.max(0.35, Math.cos(toRad(lat)));
    return { ...t, lat, lon, v: sph(lat, lon) };
  });
  return { seeds, contCenter };
}

/* ---------- paint the equirectangular map ---------- */
function paintTexture(seeds, world, prog, reachIds, selId) {
  const cv = document.createElement("canvas");
  cv.width = TEX_W; cv.height = TEX_H;
  const ctx = cv.getContext("2d");
  const img = ctx.createImageData(TEX_W, TEX_H);
  const d = img.data;

  const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const colorFor = (t) => {
    const depth = prog[t.id] || 0;
    if (depth >= 4) return [127, 232, 168];
    if (depth === 3) return [79, 180, 119];
    if (depth === 2) return [56, 130, 88];
    if (depth === 1) return [40, 88, 62];
    if (reachIds.has(t.id)) return [104, 56, 36];
    const [r, g, b] = rgb(world.continents[t.continent]?.hue || "#2A3140");
    return [Math.round(r * 0.19 + 15), Math.round(g * 0.19 + 17), Math.round(b * 0.19 + 23)];
  };
  const colors = seeds.map(colorFor);
  const invW = seeds.map((t) => 1 / Math.sqrt(t.w));
  const n = seeds.length;
  const sx = new Float64Array(n), sy = new Float64Array(n), sz = new Float64Array(n);
  seeds.forEach((t, i) => { sx[i] = t.v[0]; sy[i] = t.v[1]; sz[i] = t.v[2]; });

  for (let y = 0; y < TEX_H; y++) {
    const lat = 90 - ((y + 0.5) / TEX_H) * 180;
    const cl = Math.cos(toRad(lat)), py = Math.sin(toRad(lat));
    for (let x = 0; x < TEX_W; x++) {
      const lo = toRad(((x + 0.5) / TEX_W) * 360 - 180);
      const px = cl * Math.cos(lo), pz = cl * Math.sin(lo);
      let best = 0, bd = Infinity, second = Infinity;
      for (let i = 0; i < n; i++) {
        let c = px * sx[i] + py * sy[i] + pz * sz[i];
        c = c > 1 ? 1 : c < -1 ? -1 : c;
        const eff = Math.acos(c) * invW[i];
        if (eff < bd) { second = bd; bd = eff; best = i; }
        else if (eff < second) second = eff;
      }
      const o = (y * TEX_W + x) * 4;
      let col;
      if (bd >= CUT) {
        const t = Math.min(1, (bd - CUT) / 0.15);
        col = [10 - 3 * t, 14 - 4 * t, 22 - 6 * t];
      } else {
        col = colors[best].slice();
        if (second - bd < 0.007) col = [col[0] * 0.42 + 32, col[1] * 0.42 + 36, col[2] * 0.42 + 44];
        if (CUT - bd < 0.013) col = [col[0] * 0.66 + 26, col[1] * 0.66 + 30, col[2] * 0.66 + 40];
        if (seeds[best].id === selId) col = [col[0] * 0.5 + 118, col[1] * 0.5 + 114, col[2] * 0.5 + 104];
      }
      d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

function pick(seeds, lat, lon) {
  const p = sph(lat, lon);
  let best = null, bd = Infinity;
  for (const t of seeds) {
    let c = dot3(p, t.v); c = c > 1 ? 1 : c < -1 ? -1 : c;
    const eff = Math.acos(c) / Math.sqrt(t.w);
    if (eff < bd) { bd = eff; best = t; }
  }
  return bd < CUT ? best : null;
}

export default function Atlas({ progress, setProgress }) {
  const [worldId, setWorldId] = useState("maths");
  const [sel, setSel] = useState(null);
  const [spin, setSpin] = useState(true);
  const [ready, setReady] = useState(false);

  const mount = useRef(null);
  const three = useRef({});
  const drag = useRef({ on: false, x: 0, y: 0, moved: 0 });

  const world = WORLDS[worldId];
  const seedNum = worldId === "maths" ? 7 : worldId === "physics" ? 23 : 41;
  const { seeds } = useMemo(() => placeWorld(world, seedNum), [worldId]);

  const prog = progress || {};
  const reach = useMemo(() => reachable(world, prog), [world, prog]);
  const reachIds = useMemo(() => new Set(reach.map((t) => t.id)), [reach]);
  const cov = useMemo(() => coverage(world, prog), [world, prog]);
  const byId = useMemo(() => Object.fromEntries(seeds.map((t) => [t.id, t])), [seeds]);

  useEffect(() => {
    const el = mount.current;
    if (!el || typeof window === "undefined") return;
    const size = el.clientWidth || 400;

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    cam.position.set(0, 0, 3.1);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size);
    el.appendChild(renderer.domElement);

    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(1, 96, 64),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    scene.add(globe);

    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(1.17, 64, 48),
      new THREE.ShaderMaterial({
        transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
        uniforms: { uColor: { value: new THREE.Color("#3D6FD4") } },
        vertexShader: "varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
        fragmentShader: "varying vec3 vN; uniform vec3 uColor; void main(){ float i = pow(0.70 - dot(vN, vec3(0.0,0.0,1.0)), 2.6); gl_FragColor = vec4(uColor,1.0) * clamp(i,0.0,1.0); }",
      })
    );
    scene.add(atmo);

    const sg = new THREE.BufferGeometry();
    const pts = new Float32Array(900 * 3);
    for (let i = 0; i < 900; i++) {
      const r = 24 + Math.random() * 22, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      pts[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pts[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      pts[i * 3 + 2] = r * Math.cos(ph);
    }
    sg.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0x8898b4, size: 0.13, sizeAttenuation: true, transparent: true, opacity: 0.7 })));

    three.current = { scene, cam, renderer, globe, rot: { x: 0, y: 0 }, spin: true };
    setReady(true);

    let raf;
    const loop = () => {
      const t = three.current;
      if (t.spin && !drag.current.on) t.rot.y += 0.0015;
      t.globe.rotation.y = t.rot.y; t.globe.rotation.x = t.rot.x;
      t.renderer.render(t.scene, t.cam);
      raf = requestAnimationFrame(loop);
    };
    loop();

    const onResize = () => {
      const s = el.clientWidth || 400;
      renderer.setSize(s, s); cam.aspect = 1; cam.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => { if (three.current) three.current.spin = spin; }, [spin]);

  useEffect(() => {
    const t = three.current;
    if (!ready || !t.globe) return;
    const cv = paintTexture(seeds, world, prog, reachIds, sel);
    const tex = new THREE.CanvasTexture(cv);
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    if (t.globe.material.map) t.globe.material.map.dispose();
    t.globe.material.map = tex;
    t.globe.material.needsUpdate = true;
  }, [ready, seeds, world, progress, reachIds, sel]);

  const onDown = (e) => {
    const p = e.touches ? e.touches[0] : e;
    drag.current = { on: true, x: p.clientX, y: p.clientY, moved: 0 };
  };
  const onMove = (e) => {
    if (!drag.current.on) return;
    const p = e.touches ? e.touches[0] : e;
    const dx = p.clientX - drag.current.x, dy = p.clientY - drag.current.y;
    drag.current.moved += Math.abs(dx) + Math.abs(dy);
    drag.current.x = p.clientX; drag.current.y = p.clientY;
    const t = three.current;
    t.rot.y += dx * 0.006;
    t.rot.x = Math.max(-1.1, Math.min(1.1, t.rot.x + dy * 0.006));
  };
  const onUp = (e) => {
    const wasDrag = drag.current.moved > 6;
    drag.current.on = false;
    if (wasDrag) return;
    const el = mount.current, t = three.current;
    if (!el || !t.globe) return;
    const rect = el.getBoundingClientRect();
    const p = e.changedTouches ? e.changedTouches[0] : e;
    const ndc = new THREE.Vector2(
      ((p.clientX - rect.left) / rect.width) * 2 - 1,
      -((p.clientY - rect.top) / rect.height) * 2 + 1
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, t.cam);
    const hit = ray.intersectObject(t.globe)[0];
    if (!hit) { setSel(null); return; }
    const local = t.globe.worldToLocal(hit.point.clone()).normalize();
    const lat = Math.asin(local.y) * (180 / Math.PI);
    const lon = Math.atan2(local.z, local.x) * (180 / Math.PI);
    const found = pick(seeds, lat, lon);
    setSel(found ? found.id : null);
  };

  const flyTo = (id) => {
    const t = byId[id]; if (!t) return;
    setSel(id); setSpin(false);
    const r = three.current.rot;
    r.y = -toRad(t.lon) - Math.PI / 2;
    r.x = toRad(t.lat) * 0.85;
  };

  const selT = sel ? byId[sel] : null;
  const selDepth = sel ? (prog[sel] || 0) : 0;
  const setDepth = (id, v) => setProgress({ ...prog, [id]: v });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, color: C.bone, fontFamily: SANS }}>
      <style>{`
        .atlas-grid { display:grid; grid-template-columns:1fr; gap:12px; align-items:start; }
        @media (min-width:960px){ .atlas-grid { grid-template-columns:minmax(0,1fr) 300px; } }
      `}</style>

      <div style={{ background: C.plate, border: `1px solid ${C.rule}`, borderRadius: 10, padding: "10px 13px" }}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 2, color: C.signal }}>ATLAS</div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "baseline", marginTop: 3 }}>
          <span style={{ fontSize: 17, fontWeight: 600 }}>{world.name}</span>
          <span style={{ fontFamily: MONO, fontSize: 11.5, color: C.moss }}>HELD {cov.heldPct.toFixed(1)}%</span>
          <span style={{ fontFamily: MONO, fontSize: 11.5, color: C.steel }}>FLUENT+ {cov.deepPct.toFixed(1)}%</span>
          <span style={{ fontFamily: MONO, fontSize: 11.5, color: C.signal }}>REACHABLE {cov.reachPct.toFixed(1)}%</span>
        </div>
        <div style={{ fontSize: 12, color: C.dim, marginTop: 5 }}>{world.blurb}</div>
      </div>

      <div className="atlas-grid">
        <div style={{ background: "#070A0F", border: `1px solid ${C.rule}`, borderRadius: 10, position: "relative", overflow: "hidden" }}>
          <div ref={mount}
            onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={() => { drag.current.on = false; }}
            onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
            style={{ width: "100%", aspectRatio: "1", cursor: "grab", touchAction: "none" }} />

          <div style={{ position: "absolute", left: 11, top: 11, fontFamily: MONO, fontSize: 10, color: C.dim, letterSpacing: 1, pointerEvents: "none" }}>
            {world.name.toUpperCase()} · {cov.heldCount}/{cov.count} TERRITORIES
          </div>

          <button onClick={() => setSpin(!spin)} style={{
            position: "absolute", right: 10, bottom: 10, background: "rgba(25,30,40,.9)",
            color: spin ? C.signal : C.dim, border: `1px solid ${C.rule}`, borderRadius: 6,
            padding: "6px 11px", cursor: "pointer", fontFamily: MONO, fontSize: 10, letterSpacing: 1,
          }}>{spin ? "SPINNING" : "PAUSED"}</button>

          <div style={{ position: "absolute", left: 11, bottom: 11, fontFamily: MONO, fontSize: 9.5, color: "rgba(124,134,152,.65)", pointerEvents: "none" }}>
            DRAG TO ROTATE · TAP LAND TO INSPECT
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Panel title="Worlds">
            {Object.values(WORLDS).map((w, i) => {
              const on = w.id === worldId;
              const c = coverage(w, prog);
              return (
                <button key={w.id} onClick={() => { setWorldId(w.id); setSel(null); }} style={{
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

          <Panel title={selT ? "Territory" : `Next hop · ${reach.length} open`}>
            {selT ? (
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{selT.name}</div>
                <div style={{ fontFamily: MONO, fontSize: 10.5, color: C.dim, marginBottom: 9 }}>
                  {world.continents[selT.continent]?.name.toUpperCase()} · TIER {selT.tier} · {selT.w} AREA
                </div>
                {selT.note && <div style={{ fontSize: 12.5, color: C.amber, lineHeight: 1.5, marginBottom: 9 }}>{selT.note}</div>}
                {selT.p.length > 0 && (
                  <div style={{ fontSize: 12, color: C.dim, marginBottom: 9, lineHeight: 1.7 }}>
                    Needs:{" "}
                    {selT.p.map((p, i) => {
                      const ok = (prog[p] || 0) >= 2;
                      return (
                        <span key={p}>
                          {i > 0 && ", "}
                          <button onClick={() => flyTo(p)} style={{
                            background: "none", border: "none", padding: 0, cursor: "pointer",
                            color: ok ? C.moss : C.signal, fontSize: 12, fontFamily: SANS, textDecoration: "underline",
                          }}>{byId[p]?.name || p}</button>
                        </span>
                      );
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
                Nothing reachable. Take a territory to Worked to open routes.
              </div>
            ) : (
              <>
                <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.5, marginBottom: 9 }}>
                  Prerequisites met. Tap to fly there.
                </div>
                {[...reach].sort((a, b) => b.w - a.w).slice(0, 8).map((t) => (
                  <button key={t.id} onClick={() => flyTo(t.id)} style={{
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

          <Panel title="Held">
            {seeds.filter((t) => (prog[t.id] || 0) > 0)
              .sort((a, b) => (prog[b.id] || 0) - (prog[a.id] || 0)).slice(0, 12).map((t) => (
              <button key={t.id} onClick={() => flyTo(t.id)} style={{
                width: "100%", display: "flex", justifyContent: "space-between", gap: 8,
                padding: "5px 0", background: "none", border: "none", cursor: "pointer", textAlign: "left",
              }}>
                <span style={{ fontSize: 12, color: C.bone }}>{t.name}</span>
                <span style={{ fontFamily: MONO, fontSize: 10, color: C.moss }}>{DEPTHS[prog[t.id]].short}</span>
              </button>
            ))}
          </Panel>

          <Panel title="Legend">
            {[["Generative", "#7FE8A8"], ["Fluent", "#4FB477"], ["Worked", "#388258"],
              ["Skimmed", "#28583E"], ["Reachable", "#683824"], ["Unexplored", "#1A1F29"], ["Ocean", "#0A0E16"]].map(([l, c]) => (
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
