"use client";
import React, { useState, useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { WORLDS, DEPTHS, SEED_PROGRESS, reachable, coverage } from "../lib/atlas";
import { coastRings } from "../lib/coastline";

const C = {
  ink: "#10131A", plate: "#191E28", plate2: "#141922", rule: "#2A3140",
  bone: "#E6E2D6", dim: "#7C8698", signal: "#FF6B35", steel: "#5B8DEF",
  moss: "#4FB477", amber: "#F2B441",
};
const MONO = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace";
const SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

const TEX_W = 2048, TEX_H = 1024;   // final texture
const VOR_W = 512, VOR_H = 256;     // territory field, upscaled smoothly

/* Each domain is a different planet, built on the same real landforms
   so the geography stays legible. */
export const PLANETS = {
  maths: {
    label: "Earth", flipX: false, flipY: false, rim: "#3D6FD4",
    shallow: "#17385E", deep: "#080F1E", ice: "#DCE8F2",
  },
  physics: {
    label: "Mars", flipX: true, flipY: false, rim: "#D4633D",
    shallow: "#4A2415", deep: "#1A0C07", ice: "#F0E4DC",
  },
  strength: {
    label: "Ice moon", flipX: false, flipY: true, rim: "#4FB4D4",
    shallow: "#1B3A48", deep: "#0A161D", ice: "#EAF6FA",
  },
};

const ANCHORS = [
  { lat: 52, lon: 95 }, { lat: 4, lon: 21 }, { lat: 46, lon: -100 },
  { lat: -13, lon: -58 }, { lat: 50, lon: 14 }, { lat: -24, lon: 134 },
  { lat: 22, lon: 79 }, { lat: 62, lon: -42 },
];

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

function placeWorld(world, seedNum) {
  const rand = rng(seedNum);
  const contIds = Object.keys(world.continents);
  const cc = {};
  contIds.forEach((c, i) => { cc[c] = ANCHORS[i % ANCHORS.length]; });
  const seeds = world.territories.map((t) => {
    const a = cc[t.continent];
    const inland = 0.35 + (t.tier / 5) * 0.85;
    const ang = rand() * Math.PI * 2;
    const rad = 30 * inland * (0.35 + rand() * 0.85);
    const lat = Math.max(-72, Math.min(78, a.lat + Math.sin(ang) * rad * 0.72));
    const lon = a.lon + (Math.cos(ang) * rad) / Math.max(0.4, Math.cos(toRad(lat)));
    return { ...t, lat, lon, v: sph(lat, lon) };
  });
  return { seeds };
}

/* value-noise fbm for terrain grain */
function fbm(x, y, rand) {
  let v = 0, amp = 0.5, fx = x, fy = y;
  for (let o = 0; o < 4; o++) {
    const xi = Math.floor(fx), yi = Math.floor(fy);
    const xf = fx - xi, yf = fy - yi;
    const h = (a, b) => {
      let n = a * 374761393 + b * 668265263;
      n = (n ^ (n >> 13)) * 1274126177;
      return ((n ^ (n >> 16)) >>> 0) / 4294967296;
    };
    const u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf);
    const n = h(xi, yi) * (1 - u) * (1 - w) + h(xi + 1, yi) * u * (1 - w)
            + h(xi, yi + 1) * (1 - u) * w + h(xi + 1, yi + 1) * u * w;
    v += n * amp; amp *= 0.5; fx *= 2; fy *= 2;
  }
  return v;
}

function buildTexture(seeds, world, prog, reachIds, selId, planet) {
  const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const colorFor = (t) => {
    const depth = prog[t.id] || 0;
    if (depth >= 4) return [142, 245, 180];
    if (depth === 3) return [83, 186, 124];
    if (depth === 2) return [56, 130, 88];
    if (depth === 1) return [40, 88, 62];
    if (reachIds.has(t.id)) return [128, 70, 42];
    const [r, g, b] = rgb(world.continents[t.continent]?.hue || "#2A3140");
    return [Math.round(r * 0.30 + 26), Math.round(g * 0.30 + 28), Math.round(b * 0.30 + 33)];
  };

  /* --- territory field at low res --- */
  const n = seeds.length;
  const colors = seeds.map(colorFor);
  const invW = seeds.map((t) => 1 / Math.sqrt(t.w));
  const sx = new Float64Array(n), sy = new Float64Array(n), sz = new Float64Array(n);
  seeds.forEach((t, i) => { sx[i] = t.v[0]; sy[i] = t.v[1]; sz[i] = t.v[2]; });

  const small = document.createElement("canvas");
  small.width = VOR_W; small.height = VOR_H;
  const sctx = small.getContext("2d");
  const sim = sctx.createImageData(VOR_W, VOR_H);
  const sd = sim.data;
  for (let y = 0; y < VOR_H; y++) {
    const lat = 90 - ((y + 0.5) / VOR_H) * 180;
    const cl = Math.cos(toRad(lat)), py = Math.sin(toRad(lat));
    for (let x = 0; x < VOR_W; x++) {
      const lo = toRad(((x + 0.5) / VOR_W) * 360 - 180);
      const px = cl * Math.cos(lo), pz = cl * Math.sin(lo);
      let best = 0, bd = Infinity;
      for (let i = 0; i < n; i++) {
        let c = px * sx[i] + py * sy[i] + pz * sz[i];
        c = c > 1 ? 1 : c < -1 ? -1 : c;
        const eff = Math.acos(c) * invW[i];
        if (eff < bd) { bd = eff; best = i; }
      }
      const col = colors[best];
      const o = (y * VOR_W + x) * 4;
      sd[o] = col[0]; sd[o + 1] = col[1]; sd[o + 2] = col[2]; sd[o + 3] = 255;
    }
  }
  sctx.putImageData(sim, 0, 0);

  /* --- compose the real map --- */
  const cv = document.createElement("canvas");
  cv.width = TEX_W; cv.height = TEX_H;
  const ctx = cv.getContext("2d");

  // ocean with a depth gradient
  const og = ctx.createLinearGradient(0, 0, 0, TEX_H);
  og.addColorStop(0, planet.deep);
  og.addColorStop(0.5, planet.shallow);
  og.addColorStop(1, planet.deep);
  ctx.fillStyle = og;
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  // land path from real coastlines
  const rings = coastRings();
  const path = new Path2D();
  for (const r of rings) {
    for (let i = 0; i < r.length; i++) {
      let lon = r[i][0], lat = r[i][1];
      if (planet.flipX) lon = -lon;
      if (planet.flipY) lat = -lat;
      const x = ((lon + 180) / 360) * TEX_W;
      const y = ((90 - lat) / 180) * TEX_H;
      if (i === 0) path.moveTo(x, y); else path.lineTo(x, y);
    }
    path.closePath();
  }

  ctx.save();
  ctx.clip(path, "evenodd");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(small, 0, 0, TEX_W, TEX_H);

  // terrain grain so land isn't flat colour
  const grain = ctx.getImageData(0, 0, TEX_W, TEX_H);
  const gd = grain.data;
  for (let y = 0; y < TEX_H; y += 1) {
    for (let x = 0; x < TEX_W; x += 1) {
      const o = (y * TEX_W + x) * 4;
      if (gd[o + 3] === 0) continue;
      const nv = fbm(x / 26, y / 26) - 0.42;
      const k = 1 + nv * 0.55;
      gd[o] = Math.max(0, Math.min(255, gd[o] * k));
      gd[o + 1] = Math.max(0, Math.min(255, gd[o + 1] * k));
      gd[o + 2] = Math.max(0, Math.min(255, gd[o + 2] * k));
    }
  }
  ctx.putImageData(grain, 0, 0);
  ctx.restore();

  // crisp coastline
  ctx.save();
  ctx.strokeStyle = "rgba(196,214,232,.5)";
  ctx.lineWidth = 1.6;
  ctx.lineJoin = "round";
  ctx.stroke(path);
  ctx.restore();

  // polar ice
  const cap = (from, to, y0, y1) => {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, from); g.addColorStop(1, to);
    ctx.fillStyle = g;
    ctx.fillRect(0, Math.min(y0, y1), TEX_W, Math.abs(y1 - y0));
  };
  cap(planet.ice, "rgba(255,255,255,0)", 0, TEX_H * 0.075);
  cap("rgba(255,255,255,0)", planet.ice, TEX_H * 0.915, TEX_H);

  // selected territory outline, drawn from the low-res field
  if (selId) {
    const si = seeds.findIndex((t) => t.id === selId);
    if (si >= 0) {
      ctx.save();
      ctx.clip(path, "evenodd");
      const d2 = sctx.getImageData(0, 0, VOR_W, VOR_H).data;
      const target = colors[si];
      ctx.fillStyle = "rgba(255,255,255,.30)";
      for (let y = 0; y < VOR_H; y++) {
        for (let x = 0; x < VOR_W; x++) {
          const o = (y * VOR_W + x) * 4;
          if (d2[o] === target[0] && d2[o + 1] === target[1] && d2[o + 2] === target[2]) {
            ctx.fillRect((x / VOR_W) * TEX_W, (y / VOR_H) * TEX_H, TEX_W / VOR_W, TEX_H / VOR_H);
          }
        }
      }
      ctx.restore();
    }
  }
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
  return best;
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
  const planet = PLANETS[worldId] || PLANETS.maths;
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
    const size = el.clientWidth || 420;

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    cam.position.set(0, 0, 3.15);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size);
    el.appendChild(renderer.domElement);

    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(1, 128, 96),
      new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 9, specular: 0x223044 })
    );
    scene.add(globe);

    scene.add(new THREE.AmbientLight(0xffffff, 0.62));
    const sun = new THREE.DirectionalLight(0xfff4e6, 1.05);
    sun.position.set(-1.5, 0.85, 2.4);
    scene.add(sun);

    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(1.13, 64, 48),
      new THREE.ShaderMaterial({
        transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
        uniforms: { uColor: { value: new THREE.Color(planet.rim) } },
        vertexShader: "varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
        fragmentShader: "varying vec3 vN; uniform vec3 uColor; void main(){ float i = pow(0.60 - dot(vN, vec3(0.0,0.0,1.0)), 3.2) * 0.9; gl_FragColor = vec4(uColor,1.0) * clamp(i,0.0,1.0); }",
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
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0x9aa8c0, size: 0.12, sizeAttenuation: true, transparent: true, opacity: 0.66 })));

    three.current = { scene, cam, renderer, globe, atmo, rot: { x: 0, y: 0 }, spin: true };
    setReady(true);

    let raf;
    const loop = () => {
      const t = three.current;
      if (t.spin && !drag.current.on) t.rot.y += 0.0013;
      t.globe.rotation.y = t.rot.y; t.globe.rotation.x = t.rot.x;
      t.renderer.render(t.scene, t.cam);
      raf = requestAnimationFrame(loop);
    };
    loop();

    const onResize = () => {
      const s = el.clientWidth || 420;
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
    if (t && t.atmo) t.atmo.material.uniforms.uColor.value.set(planet.rim);
  }, [planet]);

  useEffect(() => {
    const t = three.current;
    if (!ready || !t.globe) return;
    const cv = buildTexture(seeds, world, prog, reachIds, sel, planet);
    const tex = new THREE.CanvasTexture(cv);
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    if (t.globe.material.map) t.globe.material.map.dispose();
    t.globe.material.map = tex;
    t.globe.material.needsUpdate = true;
  }, [ready, seeds, world, progress, reachIds, sel, planet]);

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
        <div style={{ background: "#05070B", border: `1px solid ${C.rule}`, borderRadius: 10, position: "relative", overflow: "hidden" }}>
          <div ref={mount}
            onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={() => { drag.current.on = false; }}
            onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
            style={{ width: "100%", aspectRatio: "1", cursor: "grab", touchAction: "none" }} />

          <div style={{ position: "absolute", left: 11, top: 11, fontFamily: MONO, fontSize: 10, color: C.dim, letterSpacing: 1, pointerEvents: "none" }}>
            {planet.label.toUpperCase()} · {world.name.toUpperCase()} · {cov.heldCount}/{cov.count} TERRITORIES
          </div>

          <button onClick={() => setSpin(!spin)} style={{
            position: "absolute", right: 10, bottom: 10, background: "rgba(20,25,34,.9)",
            color: spin ? C.signal : C.dim, border: `1px solid ${C.rule}`, borderRadius: 6,
            padding: "6px 11px", cursor: "pointer", fontFamily: MONO, fontSize: 10, letterSpacing: 1,
          }}>{spin ? "SPINNING" : "PAUSED"}</button>

          <div style={{ position: "absolute", left: 11, bottom: 11, fontFamily: MONO, fontSize: 9.5, color: "rgba(124,134,152,.6)", pointerEvents: "none" }}>
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
                  <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{PLANETS[w.id]?.label}</span>
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
            {[["Generative", "#8EF5B4"], ["Fluent", "#53BA7C"], ["Worked", "#387E58"],
              ["Skimmed", "#26543C"], ["Reachable", "#80462A"], ["Unexplored", "#1E232C"], ["Ocean", "#17385E"]].map(([l, c]) => (
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
