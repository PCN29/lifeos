"use client";
import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
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

/* Deliberately modest — coastlines are vector so they stay sharp, and this
   is what keeps the tab alive on a Chromebook. */
const TEX_W = 1024, TEX_H = 512;
const VOR_W = 360, VOR_H = 180;

export const PLANETS = {
  maths:    { label: "Earth",    flipX: false, flipY: false, rim: "#4E8CFF", shallow: "#12457F", deep: "#061225", ice: "rgba(226,240,255,.8)" },
  physics:  { label: "Mars",     flipX: true,  flipY: false, rim: "#FF7A45", shallow: "#6B2E14", deep: "#200C05", ice: "rgba(255,236,224,.75)" },
  strength: { label: "Ice moon", flipX: false, flipY: true,  rim: "#54CFF0", shallow: "#14495C", deep: "#061820", ice: "rgba(232,250,255,.85)" },
};

const ANCHORS = [
  { lat: 52, lon: 95 }, { lat: 4, lon: 21 }, { lat: 46, lon: -100 },
  { lat: -13, lon: -58 }, { lat: 50, lon: 14 }, { lat: -24, lon: 134 },
  { lat: 22, lon: 79 }, { lat: 62, lon: -42 },
];

const DEPTH_RGB = [null, [26, 104, 62], [33, 158, 92], [56, 217, 126], [130, 255, 184]];

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const toRad = (d) => (d * Math.PI) / 180;
function sph(lat, lon) {
  const la = toRad(lat), lo = toRad(lon);
  return [Math.cos(la) * Math.cos(lo), Math.sin(la), Math.cos(la) * Math.sin(lo)];
}

function placeWorld(world, seedNum) {
  const rand = rng(seedNum);
  const cc = {};
  Object.keys(world.continents).forEach((c, i) => { cc[c] = ANCHORS[i % ANCHORS.length]; });
  return world.territories.map((t) => {
    const a = cc[t.continent];
    const inland = 0.35 + (t.tier / 5) * 0.85;
    const ang = rand() * Math.PI * 2;
    const rad = 30 * inland * (0.35 + rand() * 0.85);
    const lat = Math.max(-70, Math.min(74, a.lat + Math.sin(ang) * rad * 0.72));
    const lon = a.lon + (Math.cos(ang) * rad) / Math.max(0.4, Math.cos(toRad(lat)));
    return { ...t, lat, lon, v: sph(lat, lon) };
  });
}

/* The expensive bit. Computed once per world, then cached. */
function buildOwnerMap(seeds) {
  const n = seeds.length;
  const sx = new Float64Array(n), sy = new Float64Array(n), sz = new Float64Array(n), iw = new Float64Array(n);
  seeds.forEach((t, i) => { sx[i] = t.v[0]; sy[i] = t.v[1]; sz[i] = t.v[2]; iw[i] = 1 / Math.sqrt(t.w); });
  const owner = new Int16Array(VOR_W * VOR_H);
  for (let y = 0; y < VOR_H; y++) {
    const lat = 90 - ((y + 0.5) / VOR_H) * 180;
    const cl = Math.cos(toRad(lat)), py = Math.sin(toRad(lat));
    for (let x = 0; x < VOR_W; x++) {
      const lo = toRad(((x + 0.5) / VOR_W) * 360 - 180);
      const px = cl * Math.cos(lo), pz = cl * Math.sin(lo);
      let best = 0, bd = Infinity;
      for (let i = 0; i < n; i++) {
        const c = px * sx[i] + py * sy[i] + pz * sz[i];
        const eff = (c >= 1 ? 0 : c <= -1 ? Math.PI : Math.acos(c)) * iw[i];
        if (eff < bd) { bd = eff; best = i; }
      }
      owner[y * VOR_W + x] = best;
    }
  }
  return owner;
}

/* One small noise tile, made once, then repeated. Not per-pixel fbm. */
let NOISE_TILE = null;
function noiseTile() {
  if (NOISE_TILE) return NOISE_TILE;
  const S = 256;
  const cv = document.createElement("canvas");
  cv.width = S; cv.height = S;
  const ctx = cv.getContext("2d");
  const im = ctx.createImageData(S, S);
  const d = im.data;
  const h = (a, b) => { let n = a * 374761393 + b * 668265263; n = (n ^ (n >> 13)) * 1274126177; return ((n ^ (n >> 16)) >>> 0) / 4294967296; };
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let v = 0, amp = 0.5, f = 1;
      for (let o = 0; o < 4; o++) {
        v += h(Math.floor((x * f) / 32), Math.floor((y * f) / 32)) * amp;
        amp *= 0.5; f *= 2;
      }
      const g = Math.round(96 + v * 140);
      const o = (y * S + x) * 4;
      d[o] = d[o + 1] = d[o + 2] = g; d[o + 3] = 54;
    }
  }
  ctx.putImageData(im, 0, 0);
  NOISE_TILE = cv;
  return cv;
}

const LAND_PATHS = {};
function landPath(planet) {
  const key = `${planet.flipX}_${planet.flipY}`;
  if (LAND_PATHS[key]) return LAND_PATHS[key];
  const p = new Path2D();
  for (const r of coastRings()) {
    for (let i = 0; i < r.length; i++) {
      let lon = r[i][0], lat = r[i][1];
      if (planet.flipX) lon = -lon;
      if (planet.flipY) lat = -lat;
      const x = ((lon + 180) / 360) * TEX_W, y = ((90 - lat) / 180) * TEX_H;
      if (i === 0) p.moveTo(x, y); else p.lineTo(x, y);
    }
    p.closePath();
  }
  LAND_PATHS[key] = p;
  return p;
}

export default function Atlas({ progress, setProgress }) {
  const [worldId, setWorldId] = useState("maths");
  const [sel, setSel] = useState(null);
  const [hover, setHover] = useState(null);
  const [tip, setTip] = useState({ x: 0, y: 0 });
  const [spin, setSpin] = useState(true);
  const [ready, setReady] = useState(false);

  const mount = useRef(null);
  const three = useRef({});
  const drag = useRef({ on: false, x: 0, y: 0, moved: 0 });
  const rafPending = useRef(false);
  const canvases = useRef({});

  const world = WORLDS[worldId];
  const planet = PLANETS[worldId] || PLANETS.maths;
  const seedNum = worldId === "maths" ? 7 : worldId === "physics" ? 23 : 41;

  const seeds = useMemo(() => placeWorld(world, seedNum), [worldId]);
  const owner = useMemo(() => buildOwnerMap(seeds), [seeds]);

  const prog = progress || {};
  const reach = useMemo(() => reachable(world, prog), [world, prog]);
  const reachIds = useMemo(() => new Set(reach.map((t) => t.id)), [reach]);
  const cov = useMemo(() => coverage(world, prog), [world, prog]);
  const byId = useMemo(() => Object.fromEntries(seeds.map((t) => [t.id, t])), [seeds]);

  const routeTo = useCallback((id) => {
    const out = [], seen = new Set();
    const walk = (tid) => {
      const t = byId[tid];
      if (!t || seen.has(tid)) return;
      seen.add(tid);
      for (const p of t.p) if ((prog[p] || 0) < 2) walk(p);
      if ((prog[tid] || 0) < 2) out.push(t);
    };
    walk(id);
    return out;
  }, [byId, prog]);

  /* ---------------- scene ---------------- */
  useEffect(() => {
    const el = mount.current;
    if (!el || typeof window === "undefined") return;
    const size = el.clientWidth || 420;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch (err) { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(size, size);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    cam.position.set(0, 0, 3.15);

    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(1, 96, 64),
      new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 12, specular: 0x2b3d55 })
    );
    scene.add(globe);

    scene.add(new THREE.AmbientLight(0xffffff, 0.74));
    const sun = new THREE.DirectionalLight(0xfff6ec, 0.92);
    sun.position.set(-1.4, 0.8, 2.5);
    scene.add(sun);

    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(1.12, 48, 32),
      new THREE.ShaderMaterial({
        transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
        uniforms: { uColor: { value: new THREE.Color(PLANETS.maths.rim) } },
        vertexShader: "varying vec3 vN; void main(){ vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
        fragmentShader: "varying vec3 vN; uniform vec3 uColor; void main(){ float i = pow(0.58 - dot(vN, vec3(0.0,0.0,1.0)), 3.4)*0.9; gl_FragColor = vec4(uColor,1.0)*clamp(i,0.0,1.0); }",
      })
    );
    scene.add(atmo);

    const marker = new THREE.Mesh(
      new THREE.RingGeometry(0.03, 0.048, 24),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.92, depthTest: false })
    );
    marker.visible = false;
    globe.add(marker);

    const sg = new THREE.BufferGeometry();
    const pts = new Float32Array(700 * 3);
    for (let i = 0; i < 700; i++) {
      const r = 26 + Math.random() * 20, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      pts[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pts[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      pts[i * 3 + 2] = r * Math.cos(ph);
    }
    sg.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xa8b6cc, size: 0.11, sizeAttenuation: true, transparent: true, opacity: 0.6 });
    scene.add(new THREE.Points(sg, starMat));

    three.current = { scene, cam, renderer, globe, atmo, marker, rot: { x: 0, y: 0 }, spin: true, alive: true };
    setReady(true);

    let id;
    const loop = () => {
      const t = three.current;
      if (!t.alive) return;
      if (t.spin && !drag.current.on) t.rot.y += 0.0012;
      t.globe.rotation.y = t.rot.y;
      t.globe.rotation.x = t.rot.x;
      t.renderer.render(t.scene, t.cam);
      id = requestAnimationFrame(loop);
    };
    loop();

    const onResize = () => {
      const s = el.clientWidth || 420;
      renderer.setSize(s, s); cam.aspect = 1; cam.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    return () => {
      if (three.current) three.current.alive = false;
      cancelAnimationFrame(id);
      window.removeEventListener("resize", onResize);
      globe.geometry.dispose();
      if (globe.material.map) globe.material.map.dispose();
      globe.material.dispose();
      atmo.geometry.dispose(); atmo.material.dispose();
      marker.geometry.dispose(); marker.material.dispose();
      sg.dispose(); starMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
      three.current = {};
    };
  }, []);

  useEffect(() => { if (three.current.globe) three.current.spin = spin; }, [spin]);
  useEffect(() => {
    const t = three.current;
    if (t && t.atmo) t.atmo.material.uniforms.uColor.value.set(planet.rim);
  }, [planet]);

  /* ---------------- texture ---------------- */
  useEffect(() => {
    const t = three.current;
    if (!ready || !t.globe || !owner) return;

    if (!canvases.current.small) {
      const s = document.createElement("canvas"); s.width = VOR_W; s.height = VOR_H;
      const b = document.createElement("canvas"); b.width = TEX_W; b.height = TEX_H;
      canvases.current = { small: s, big: b };
    }
    const { small, big } = canvases.current;
    const sctx = small.getContext("2d"), ctx = big.getContext("2d");

    const rgbOf = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const pal = seeds.map((tt) => {
      const d = prog[tt.id] || 0;
      if (d > 0) return DEPTH_RGB[d];
      if (reachIds.has(tt.id)) return [196, 104, 48];
      const [r, g, b] = rgbOf(world.continents[tt.continent]?.hue || "#2A3140");
      return [Math.round(r * 0.46 + 24), Math.round(g * 0.46 + 26), Math.round(b * 0.46 + 32)];
    });

    const im = sctx.createImageData(VOR_W, VOR_H);
    const d = im.data;
    for (let i = 0; i < owner.length; i++) {
      const idx = owner[i], o = i * 4;
      let c = pal[idx];
      if (seeds[idx].id === sel) c = [Math.min(255, c[0] + 96), Math.min(255, c[1] + 96), Math.min(255, c[2] + 88)];
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
    }
    sctx.putImageData(im, 0, 0);

    const og = ctx.createLinearGradient(0, 0, 0, TEX_H);
    og.addColorStop(0, planet.deep); og.addColorStop(0.5, planet.shallow); og.addColorStop(1, planet.deep);
    ctx.fillStyle = og; ctx.fillRect(0, 0, TEX_W, TEX_H);

    const path = landPath(planet);
    ctx.save();
    ctx.clip(path, "evenodd");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(small, 0, 0, TEX_W, TEX_H);
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = ctx.createPattern(noiseTile(), "repeat");
    ctx.fillRect(0, 0, TEX_W, TEX_H);
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(190,214,238,.55)";
    ctx.lineWidth = 1;
    ctx.lineJoin = "round";
    ctx.stroke(path);
    ctx.restore();

    /* Small polar fade only. Anything larger smears into a white disc,
       because every longitude collapses to one point at the pole. */
    const capH = TEX_H * 0.03;
    let g = ctx.createLinearGradient(0, 0, 0, capH);
    g.addColorStop(0, planet.ice); g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, TEX_W, capH);
    g = ctx.createLinearGradient(0, TEX_H - capH, 0, TEX_H);
    g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(1, planet.ice);
    ctx.fillStyle = g; ctx.fillRect(0, TEX_H - capH, TEX_W, capH);

    const tex = new THREE.CanvasTexture(big);
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const old = t.globe.material.map;
    t.globe.material.map = tex;
    t.globe.material.needsUpdate = true;
    if (old) old.dispose();
  }, [ready, owner, seeds, world, progress, reachIds, sel, planet]);

  useEffect(() => {
    const t = three.current;
    if (!t || !t.marker) return;
    const id = hover || sel;
    const terr = id ? byId[id] : null;
    if (!terr) { t.marker.visible = false; return; }
    const [x, y, z] = sph(terr.lat, terr.lon);
    t.marker.position.set(x * 1.006, y * 1.006, z * 1.006);
    t.marker.lookAt(0, 0, 0);
    t.marker.visible = true;
  }, [hover, sel, byId]);

  /* ---------------- input ---------------- */
  const latLonAt = (cx, cy) => {
    const el = mount.current, t = three.current;
    if (!el || !t.globe) return null;
    const rect = el.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((cx - rect.left) / rect.width) * 2 - 1,
      -((cy - rect.top) / rect.height) * 2 + 1
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, t.cam);
    const hit = ray.intersectObject(t.globe)[0];
    if (!hit) return null;
    const p = t.globe.worldToLocal(hit.point.clone()).normalize();
    return { lat: Math.asin(p.y) * (180 / Math.PI), lon: Math.atan2(p.z, p.x) * (180 / Math.PI) };
  };

  const pickAt = (lat, lon) => {
    const p = sph(lat, lon);
    let best = null, bd = Infinity;
    for (const t of seeds) {
      const c = p[0] * t.v[0] + p[1] * t.v[1] + p[2] * t.v[2];
      const eff = (c >= 1 ? 0 : c <= -1 ? Math.PI : Math.acos(c)) / Math.sqrt(t.w);
      if (eff < bd) { bd = eff; best = t; }
    }
    return best;
  };

  const onDown = (e) => {
    const p = e.touches ? e.touches[0] : e;
    drag.current = { on: true, x: p.clientX, y: p.clientY, moved: 0 };
  };
  const onMove = (e) => {
    const p = e.touches ? e.touches[0] : e;
    if (drag.current.on) {
      const dx = p.clientX - drag.current.x, dy = p.clientY - drag.current.y;
      drag.current.moved += Math.abs(dx) + Math.abs(dy);
      drag.current.x = p.clientX; drag.current.y = p.clientY;
      const t = three.current;
      if (!t.rot) return;
      t.rot.y += dx * 0.006;
      t.rot.x = Math.max(-1.1, Math.min(1.1, t.rot.x + dy * 0.006));
      return;
    }
    if (e.touches || rafPending.current) return;
    rafPending.current = true;
    const cx = p.clientX, cy = p.clientY;
    requestAnimationFrame(() => {
      rafPending.current = false;
      const ll = latLonAt(cx, cy);
      if (!ll) { setHover(null); return; }
      const t = pickAt(ll.lat, ll.lon);
      setHover(t ? t.id : null);
      setTip({ x: cx, y: cy });
    });
  };
  const onUp = (e) => {
    const wasDrag = drag.current.moved > 6;
    drag.current.on = false;
    if (wasDrag) return;
    const p = e.changedTouches ? e.changedTouches[0] : e;
    const ll = latLonAt(p.clientX, p.clientY);
    if (!ll) { setSel(null); return; }
    const t = pickAt(ll.lat, ll.lon);
    setSel(t ? t.id : null);
  };

  const flyTo = (id) => {
    const t = byId[id]; if (!t) return;
    setSel(id); setSpin(false);
    const r = three.current.rot;
    if (!r) return;
    r.y = -toRad(t.lon) - Math.PI / 2;
    r.x = toRad(t.lat) * 0.85;
  };

  const selT = sel ? byId[sel] : null;
  const hovT = hover ? byId[hover] : null;
  const selDepth = sel ? (prog[sel] || 0) : 0;
  const setDepth = (id, v) => setProgress({ ...prog, [id]: v });
  const pctOf = (t) => ((t.w / cov.total) * 100).toFixed(2);
  const route = selT && selDepth < 2 ? routeTo(selT.id) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, color: C.bone, fontFamily: SANS }}>
      <style>{`
        .atlas-grid { display:grid; grid-template-columns:1fr; gap:12px; align-items:start; }
        @media (min-width:960px){ .atlas-grid { grid-template-columns:minmax(0,1fr) 306px; } }
        .row-btn { transition: background .16s ease; }
        .row-btn:hover { background: rgba(255,255,255,.05); }
        .fade-in { animation: fin .2s ease both; }
        @keyframes fin { from { opacity:0; transform: translateY(4px);} to { opacity:1; transform:none;} }
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
        <div style={{ background: "#04060A", border: `1px solid ${C.rule}`, borderRadius: 10, position: "relative", overflow: "hidden" }}>
          <div ref={mount}
            onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}
            onMouseLeave={() => { drag.current.on = false; setHover(null); }}
            onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
            style={{ width: "100%", aspectRatio: "1", cursor: hovT ? "pointer" : "grab", touchAction: "none" }} />

          {hovT && (
            <div className="fade-in" style={{
              position: "fixed", left: tip.x + 15, top: tip.y + 15, zIndex: 60, pointerEvents: "none",
              background: "rgba(16,20,28,.97)", border: `1px solid ${C.rule}`, borderRadius: 9,
              padding: "10px 12px", maxWidth: 230, boxShadow: "0 10px 30px rgba(0,0,0,.6)",
            }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 3 }}>{hovT.name}</div>
              <div style={{ fontFamily: MONO, fontSize: 9.5, color: C.dim, letterSpacing: .7, marginBottom: 7 }}>
                {world.continents[hovT.continent]?.name.toUpperCase()} · TIER {hovT.tier}
              </div>
              <Row k="Land area" v={`${pctOf(hovT)}%`} />
              <Row k="Status"
                v={(prog[hovT.id] || 0) > 0 ? DEPTHS[prog[hovT.id]].label : reachIds.has(hovT.id) ? "Reachable now" : "Locked"}
                c={(prog[hovT.id] || 0) > 0 ? C.moss : reachIds.has(hovT.id) ? C.signal : C.dim} />
              {(prog[hovT.id] || 0) === 0 && hovT.p.length > 0 && (
                <Row k="Needs" v={hovT.p.map((p) => byId[p]?.name).filter(Boolean).join(", ")} />
              )}
            </div>
          )}

          <div style={{ position: "absolute", left: 11, top: 11, fontFamily: MONO, fontSize: 10, color: C.dim, letterSpacing: 1, pointerEvents: "none" }}>
            {planet.label.toUpperCase()} · {cov.heldCount}/{cov.count} TERRITORIES
          </div>

          <button onClick={() => setSpin(!spin)} style={{
            position: "absolute", right: 10, bottom: 10, background: "rgba(20,25,34,.9)",
            color: spin ? C.signal : C.dim, border: `1px solid ${C.rule}`, borderRadius: 6,
            padding: "6px 11px", cursor: "pointer", fontFamily: MONO, fontSize: 10, letterSpacing: 1,
          }}>{spin ? "SPINNING" : "PAUSED"}</button>

          <div style={{ position: "absolute", left: 11, bottom: 11, fontFamily: MONO, fontSize: 9.5, color: "rgba(124,134,152,.6)", pointerEvents: "none" }}>
            DRAG TO ROTATE · HOVER TO INSPECT · TAP TO SELECT
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Panel title="Worlds">
            {Object.values(WORLDS).map((w, i) => {
              const on = w.id === worldId;
              const c = coverage(w, prog);
              return (
                <button key={w.id} className="row-btn"
                  onClick={() => { setWorldId(w.id); setSel(null); setHover(null); }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 9px",
                    background: on ? "rgba(255,107,53,.12)" : "transparent",
                    border: `1px solid ${on ? C.signal : "transparent"}`, borderRadius: 7,
                    cursor: "pointer", marginBottom: 4, textAlign: "left",
                  }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 13, color: on ? C.bone : C.dim }}>{w.name}</span>
                  <span style={{ fontFamily: MONO, fontSize: 9.5, color: C.dim }}>{PLANETS[w.id]?.label}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: on ? C.moss : C.dim }}>{c.heldPct.toFixed(0)}%</span>
                </button>
              );
            })}
          </Panel>

          {selT ? (
            <Panel title="Territory">
              <div className="fade-in">
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{selT.name}</div>
                <div style={{ fontFamily: MONO, fontSize: 10.5, color: C.dim, marginBottom: 10 }}>
                  {world.continents[selT.continent]?.name.toUpperCase()} · TIER {selT.tier} · {pctOf(selT)}% OF WORLD
                </div>
                {selT.note && <div style={{ fontSize: 12.5, color: C.amber, lineHeight: 1.5, marginBottom: 10 }}>{selT.note}</div>}

                <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim, letterSpacing: 1, marginBottom: 6 }}>HOW WELL DO YOU HOLD IT?</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
                  {DEPTHS.map((d) => (
                    <button key={d.v} onClick={() => setDepth(selT.id, d.v)} style={{
                      padding: "6px 9px", fontSize: 11, fontFamily: MONO, borderRadius: 6, cursor: "pointer",
                      background: selDepth === d.v ? C.moss : C.plate2,
                      color: selDepth === d.v ? C.ink : C.dim,
                      border: `1px solid ${selDepth === d.v ? C.moss : C.rule}`,
                      fontWeight: selDepth === d.v ? 700 : 400, transition: "all .14s",
                    }}>{d.label}</button>
                  ))}
                </div>

                {route.length > 0 && (
                  <div style={{ borderTop: `1px solid ${C.rule}`, paddingTop: 9 }}>
                    <div style={{ fontFamily: MONO, fontSize: 10, color: C.signal, letterSpacing: 1, marginBottom: 7 }}>
                      ROUTE · {route.length} STEP{route.length > 1 ? "S" : ""}
                    </div>
                    {route.map((r, i) => (
                      <div key={r.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0" }}>
                        <span style={{
                          fontFamily: MONO, fontSize: 9.5, width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                          background: i === 0 ? C.signal : C.plate2, color: i === 0 ? C.ink : C.dim,
                          display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700,
                        }}>{i + 1}</span>
                        <button onClick={() => flyTo(r.id)} style={{
                          flex: 1, background: "none", border: "none", padding: 0, cursor: "pointer",
                          textAlign: "left", fontSize: 12.5, color: i === 0 ? C.bone : C.dim, fontFamily: SANS,
                        }}>{r.name}</button>
                      </div>
                    ))}
                    <div style={{ fontSize: 11.5, color: C.dim, marginTop: 7, lineHeight: 1.5 }}>
                      Take each to <strong style={{ color: C.bone }}>Worked</strong> and the next unlocks.
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          ) : (
            <Panel title={`Start here · ${reach.length} open`}>
              <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.55, marginBottom: 10 }}>
                Prerequisites already met. Largest first — that's the most map per hour.
              </div>
              {[...reach].sort((a, b) => b.w - a.w).slice(0, 8).map((t) => (
                <button key={t.id} className="row-btn" onClick={() => flyTo(t.id)} style={{
                  width: "100%", display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center",
                  padding: "8px 6px", background: "none", border: "none", borderRadius: 6,
                  borderBottom: `1px solid ${C.rule}`, cursor: "pointer", textAlign: "left",
                }}>
                  <span style={{ fontSize: 12.5, color: C.bone }}>{t.name}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10.5, color: C.signal }}>{pctOf(t)}%</span>
                </button>
              ))}
            </Panel>
          )}

          <Panel title="Held">
            {seeds.filter((t) => (prog[t.id] || 0) > 0)
              .sort((a, b) => (prog[b.id] || 0) - (prog[a.id] || 0)).slice(0, 12).map((t) => (
                <button key={t.id} className="row-btn" onClick={() => flyTo(t.id)} style={{
                  width: "100%", display: "flex", justifyContent: "space-between", gap: 8,
                  padding: "5px 6px", background: "none", border: "none", borderRadius: 5,
                  cursor: "pointer", textAlign: "left",
                }}>
                  <span style={{ fontSize: 12, color: C.bone }}>{t.name}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: C.moss }}>{DEPTHS[prog[t.id]].short}</span>
                </button>
              ))}
          </Panel>

          <Panel title="Legend">
            {[["Generative", "#82FFB8"], ["Fluent", "#38D97E"], ["Worked", "#219E5C"],
              ["Skimmed", "#1A683E"], ["Reachable", "#C46830"], ["Unexplored", "#252B36"], ["Ocean", "#12457F"]].map(([l, c]) => (
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

function Row({ k, v, c }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "2px 0" }}>
      <span style={{ fontSize: 11.5, color: C.dim, flexShrink: 0 }}>{k}</span>
      <span style={{ fontSize: 11.5, color: c || C.bone, textAlign: "right" }}>{v}</span>
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
