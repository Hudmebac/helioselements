/* ============================================================
   HELIOS ELEMENTS — ENGINE
   Renderer, solar arena, cinematic camera, quality control.
   ============================================================ */

import { ARENAS, CAMERA_VIEWS } from './data.js';

const TAU = Math.PI * 2;

export let ARENA_RADIUS = ARENAS.sanctum.radius;
export let ARENA_ID = 'sanctum';

function polygonRadius(angle, sides, circum) {
  const apothem = circum * Math.cos(Math.PI / sides);
  const seg = TAU / sides;
  const phase = ((angle % seg) + seg) % seg - seg / 2;
  return apothem / Math.cos(phase);
}

export function shapeRadius(shape, radius, angle) {
  switch (shape) {
    case 'square': return polygonRadius(angle, 4, radius);
    case 'hexagon': return polygonRadius(angle, 6, radius);
    case 'octagon': return polygonRadius(angle, 8, radius);
    case 'oval': {
      const a = radius * 1.22;
      const b = radius * 0.84;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      return (a * b) / Math.sqrt((b * c) * (b * c) + (a * s) * (a * s));
    }
    default: return radius;
  }
}

export function arenaRadiusAt(angle) {
  const spec = ARENAS[ARENA_ID] || ARENAS.sanctum;
  return shapeRadius(spec.shape, spec.radius, angle);
}

export function arenaClamp(v, inset = 0) {
  const r = Math.hypot(v.x, v.z);
  if (r < 1e-4) return false;
  const lim = Math.max(3, arenaRadiusAt(Math.atan2(v.z, v.x)) - inset);
  if (r <= lim) return false;
  v.x = (v.x / r) * lim;
  v.z = (v.z / r) * lim;
  return true;
}

const glowTextures = new Map();

export function glowTexture(inner = 'rgba(255,255,255,1)', mid = 'rgba(255,190,110,.55)', outer = 'rgba(255,120,40,0)') {
  const key = inner + mid + outer;
  if (glowTextures.has(key)) return glowTextures.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner);
  g.addColorStop(0.32, mid);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  glowTextures.set(key, t);
  return t;
}

const sigilTextures = new Map();

/* A glyph (plus an optional name) drawn on a canvas — used above the player and
   the horde so an element is readable at a glance instead of a guess at a hue. */
export function sigilTexture(glyph = '✦', color = '#ffd98a', label = '') {
  const key = glyph + '|' + color + '|' + label;
  if (sigilTextures.has(key)) return sigilTextures.get(key);
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = label ? 112 : 128;
  const ctx = c.getContext('2d');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.shadowBlur = 30;
  ctx.fillStyle = color;
  ctx.font = '700 62px "Cinzel", Georgia, serif';
  ctx.fillText(glyph, 128, label ? 42 : 64);
  if (label) {
    ctx.shadowBlur = 16;
    ctx.font = '700 25px "Inter", system-ui, sans-serif';
    ctx.fillText(label, 128, 92);
  }
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  sigilTextures.set(key, t);
  return t;
}

let _shadowTex = null;
export function shadowTexture() {
  if (_shadowTex) return _shadowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  g.addColorStop(0, 'rgba(0,0,0,0.7)');
  g.addColorStop(0.5, 'rgba(0,0,0,0.34)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  _shadowTex = new THREE.CanvasTexture(c);
  return _shadowTex;
}

function cssColor(color) {
  const c = new THREE.Color(color);
  return `rgb(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)})`;
}

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, alpha: false, powerPreference: 'high-performance', stencil: false,
    });
    const r = this.renderer;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    if (THREE.ACESFilmicToneMapping) r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.1;
    if ('outputColorSpace' in r && THREE.SRGBColorSpace) r.outputColorSpace = THREE.SRGBColorSpace;
    else if (THREE.sRGBEncoding) r.outputEncoding = THREE.sRGBEncoding;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060812);
    this.scene.fog = new THREE.FogExp2(0x0a0e1e, 0.0105);

    this.camera = new THREE.PerspectiveCamera(46, window.innerWidth / Math.max(1, window.innerHeight), 0.1, 340);
    this.camera.position.set(0, 30, 40);
    this.camera.lookAt(0, 2, 0);

    this.clock = new THREE.Clock();
    this.shake = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.flashExposure = 0;
    this.quality = 'high';
    this.baseFov = 46;
    this.fovPunch = 0;
    this.accent = new THREE.Color(0xf5c26b);
    this.themeTarget = new THREE.Color(0xf5c26b);
    this.time = 0;
    this.titleTime = 0;

    this.arenaGroup = new THREE.Group();
    this.scene.add(this.arenaGroup);
    this.arenaId = null;
    this.monoliths = [];
    this.islands = [];
    this.sigilRings = [];
    this.camHeight = 27.5;
    this.camBack = 23.5;
    this.viewMode = 'distant';
    this._buildSky();
    this._buildLights();
    this.setArena('sanctum', { instant: true });

    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
  }

  /* ---------------- SKY ---------------- */
  _buildSky() {
    const geo = new THREE.SphereGeometry(240, 32, 20);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {
        uTop: { value: new THREE.Color(0x03050e) },
        uMid: { value: new THREE.Color(0x151a3a) },
        uBot: { value: new THREE.Color(0x2a1526) },
        uSun: { value: new THREE.Vector3(-0.55, 0.16, -0.82).normalize() },
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uBot; uniform vec3 uSun;
        uniform float uTime;
        varying vec3 vDir;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
        }
        void main() {
          float h = clamp(vDir.y, -1.0, 1.0);
          vec3 dir = normalize(vDir);
          vec3 col = mix(uBot, uMid, smoothstep(-0.06, 0.34, h));
          col = mix(col, uTop, smoothstep(0.22, 0.92, h));

          // slow nebula drift + an aurora veil above the arena
          float az = atan(dir.z, dir.x);
          float neb = noise(vec2(az * 2.4 + uTime * 0.008, h * 5.5));
          neb = pow(neb, 3.0) * smoothstep(0.02, 0.55, h) * 0.065;
          col += mix(vec3(0.24, 0.16, 0.5), vec3(0.62, 0.24, 0.4), noise(vec2(az * 1.3, h * 2.0))) * neb;
          float band = sin(h * 24.0 + az * 2.4 + uTime * 0.05) * 0.5 + 0.5;
          float aur = smoothstep(-0.02, 0.24, h) * (1.0 - smoothstep(0.44, 0.72, h));
          col += mix(vec3(0.16, 0.44, 0.56), vec3(0.38, 0.18, 0.56), sin(az * 0.7) * 0.5 + 0.5) * pow(band, 5.0) * aur * 0.06;

          vec3 sd = normalize(uSun);
          float d = max(dot(dir, sd), 0.0);
          col += vec3(1.0, 0.46, 0.18) * pow(d, 220.0) * 1.6;
          col += vec3(1.0, 0.38, 0.14) * pow(d, 16.0) * 0.16;
          col += vec3(0.62, 0.34, 0.9) * pow(max(0.0, -d), 3.0) * 0.035;
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.sky = new THREE.Mesh(geo, mat);
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);

    // Starfield
    const count = 1400;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const y = Math.pow(Math.random(), 0.7) * 0.96;
      const rr = Math.sqrt(Math.max(0, 1 - y * y));
      pos[i * 3] = Math.cos(a) * rr * 210;
      pos[i * 3 + 1] = y * 200 + 6;
      pos[i * 3 + 2] = Math.sin(a) * rr * 210;
      const b = 0.3 + Math.random() * 0.7;
      const warm = Math.random() > 0.82;
      col[i * 3] = b * (warm ? 1 : 0.82);
      col[i * 3 + 1] = b * 0.88;
      col[i * 3 + 2] = b * (warm ? 0.78 : 1);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const sm = new THREE.PointsMaterial({
      size: 1.6, sizeAttenuation: false, vertexColors: true,
      transparent: true, opacity: 0.85, depthWrite: false, fog: false,
      blending: THREE.AdditiveBlending,
    });
    this.stars = new THREE.Points(sg, sm);
    this.stars.frustumCulled = false;
    this.scene.add(this.stars);

    // Sun disc low on the horizon
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture('rgba(255,250,235,1)', 'rgba(255,190,110,.8)', 'rgba(255,110,40,0)'),
      color: 0xffffff, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    sun.position.set(-70, 26, -150);
    sun.scale.set(74, 74, 1);
    this.scene.add(sun);
    this.sun = sun;

    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture('rgba(255,210,150,.5)', 'rgba(255,140,60,.25)', 'rgba(255,90,30,0)'),
      transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    halo.position.copy(sun.position);
    halo.scale.set(170, 170, 1);
    this.scene.add(halo);

    // long, soft god-rays
    const rayTex = glowTexture('rgba(255,235,205,.55)', 'rgba(255,170,80,.16)', 'rgba(255,120,40,0)');
    for (let i = 0; i < 6; i++) {
      const ray = new THREE.Sprite(new THREE.SpriteMaterial({
        map: rayTex, color: 0xffc58a, transparent: true, opacity: 0.05 + Math.random() * 0.035,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
      }));
      ray.position.copy(sun.position).add(new THREE.Vector3((i - 2.5) * 7, (i % 2 ? 5 : -3), 3));
      ray.scale.set(120 + i * 14, 2.4 + i * 1.1, 1);
      ray.material.rotation = (i / 6) * Math.PI;
      this.scene.add(ray);
    }

    // distant rift moon
    const rift = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture('rgba(245,238,255,.95)', 'rgba(160,120,255,.28)', 'rgba(90,60,220,0)'),
      color: 0xc9b8ff, transparent: true, opacity: 0.65,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    rift.position.set(96, 62, -128);
    rift.scale.set(42, 42, 1);
    this.scene.add(rift);
    const riftCore = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture('rgba(250,248,255,1)', 'rgba(210,195,255,.35)', 'rgba(100,70,255,0)'),
      color: 0xe8ddff, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    riftCore.position.copy(rift.position);
    riftCore.scale.set(13, 13, 1);
    this.scene.add(riftCore);
  }

  /* ---------------- ARENA ---------------- */
  setArena(id, opts = {}) {
    const spec = ARENAS[id] || ARENAS.sanctum;
    if (!opts.instant && this.arenaId === spec.id) return;
    this._arenaSpec = spec;
    this.arenaId = spec.id;
    ARENA_ID = spec.id;
    ARENA_RADIUS = spec.radius;
    this._clearArena();
    this._buildFloor(spec);
    this._buildWalls(spec);
    this._buildDressing(spec);
    this._buildAmbient(spec);
    this._applyTheme(spec);
  }

  _clearArena() {
    if (this._floorDispose) { this._floorDispose(); this._floorDispose = null; }
    const dispose = (obj) => {
      obj.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
        for (const mat of mats) mat.dispose();
      });
    };
    while (this.arenaGroup.children.length) {
      const child = this.arenaGroup.children[0];
      this.arenaGroup.remove(child);
      dispose(child);
    }
    this.monoliths = [];
    this.islands = [];
    this.sigilRings = [];
    this.ground = null;
    this.rim = null;
    this.rimGlow = null;
    this.dust = null;
  }

  _edgePoint(spec, angle) {
    const r = shapeRadius(spec.shape, spec.radius, angle);
    return { x: Math.cos(angle) * r, z: Math.sin(angle) * r };
  }

  _perimeter(spec) {
    let sum = 0;
    let prev = null;
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * TAU;
      const p = this._edgePoint(spec, a);
      if (prev) sum += Math.hypot(p.x - prev.x, p.z - prev.z);
      prev = p;
    }
    return sum;
  }

  _shapeGeometry(spec, segments = 220) {
    const shape = new THREE.Shape();
    let ext = 0.001;
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * TAU;
      const r = shapeRadius(spec.shape, spec.radius, a);
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i) shape.lineTo(x, y); else shape.moveTo(x, y);
      ext = Math.max(ext, Math.abs(x), Math.abs(y));
    }
    shape.closePath();
    const geo = new THREE.ShapeGeometry(shape);
    const pos = geo.attributes.position;
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = pos.getX(i) / (2 * ext) + 0.5;
      uv[i * 2 + 1] = pos.getY(i) / (2 * ext) + 0.5;
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.computeVertexNormals();
    return geo;
  }

  /* ---------------- FLOOR ---------------- */
  _buildFloor(spec) {
    const canvases = this._floorTextures(spec);
    const aniso = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    const tex = new THREE.CanvasTexture(canvases.map);
    if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    else if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = aniso;
    const emiTex = new THREE.CanvasTexture(canvases.emissive);
    if ('colorSpace' in emiTex && THREE.SRGBColorSpace) emiTex.colorSpace = THREE.SRGBColorSpace;
    const bumpTex = new THREE.CanvasTexture(canvases.bump);
    bumpTex.anisotropy = aniso;

    const mat = new THREE.MeshStandardMaterial({
      map: tex, color: 0xffffff,
      roughness: spec.floor.rough ?? 0.68,
      metalness: spec.floor.metal ?? 0.34,
      emissive: spec.accent, emissiveMap: emiTex,
      emissiveIntensity: spec.floor.emissive ?? 0.8,
      bumpMap: bumpTex, bumpScale: spec.floor.bump ?? 0.5,
    });
    this._floorDispose = () => { tex.dispose(); emiTex.dispose(); bumpTex.dispose(); };
    this.ground = new THREE.Mesh(this._shapeGeometry(spec), mat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.arenaGroup.add(this.ground);
  }

  _floorTextures(spec) {
    const S = 1024;
    const make = () => { const c = document.createElement('canvas'); c.width = c.height = S; return c; };
    const c = make();
    const ec = make();
    const bc = make();
    const ctx = c.getContext('2d');
    const ectx = ec.getContext('2d');
    const bctx = bc.getContext('2d');
    const f = spec.floor;

    ectx.fillStyle = '#000000';
    ectx.fillRect(0, 0, S, S);
    bctx.fillStyle = '#1a1a1a';
    bctx.fillRect(0, 0, S, S);

    const g = ctx.createRadialGradient(512, 512, 24, 512, 512, 512);
    g.addColorStop(0, f.base[0]);
    g.addColorStop(0.45, f.base[1]);
    g.addColorStop(0.8, f.base[2]);
    g.addColorStop(1, f.base[3]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);

    this._paintFloor(f.pattern, { ctx, ectx, bctx, f });
    return { map: c, emissive: ec, bump: bc };
  }

  _paintFloor(pattern, o) {
    const { ctx, ectx, bctx, f } = o;
    const S = 1024;
    const C = 512;

    const polyAt = (target, cx, cy, r, n, rot = 0) => {
      target.beginPath();
      for (let i = 0; i < n; i++) {
        const a = rot + (i / n) * TAU;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i) target.lineTo(x, y); else target.moveTo(x, y);
      }
      target.closePath();
    };
    const circle = (target, r, cx = C, cy = C) => {
      target.beginPath();
      target.arc(cx, cy, r, 0, TAU);
    };
    const ticks = (n, rIn, rOut, col, w) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        ctx.beginPath();
        ctx.moveTo(C + Math.cos(a) * rIn, C + Math.sin(a) * rIn);
        ctx.lineTo(C + Math.cos(a) * rOut, C + Math.sin(a) * rOut);
        ctx.strokeStyle = col;
        ctx.lineWidth = w;
        ctx.stroke();
      }
    };
    const speckle = (count, alpha, maxR = 500) => {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * TAU;
        const d = Math.sqrt(Math.random()) * maxR;
        ctx.fillStyle = 'rgba(255,255,255,' + (Math.random() * alpha).toFixed(3) + ')';
        ctx.fillRect(C + Math.cos(a) * d, C + Math.sin(a) * d, 2, 2);
      }
    };
    const veins = (count, steps, mapW, glowW) => {
      for (let v = 0; v < count; v++) {
        let a = Math.random() * TAU;
        let x = C + Math.cos(a) * (70 + Math.random() * 140);
        let y = C + Math.sin(a) * (70 + Math.random() * 140);
        ctx.beginPath(); ctx.moveTo(x, y);
        ectx.beginPath(); ectx.moveTo(x, y);
        bctx.beginPath(); bctx.moveTo(x, y);
        for (let j = 0; j < steps; j++) {
          a += (Math.random() - 0.5) * 0.55;
          const len = 20 + Math.random() * 34;
          x += Math.cos(a) * len;
          y += Math.sin(a) * len;
          ctx.lineTo(x, y);
          ectx.lineTo(x, y);
          bctx.lineTo(x, y);
          if (Math.hypot(x - C, y - C) > 482) break;
        }
        ctx.strokeStyle = f.line;
        ctx.lineWidth = mapW;
        ctx.stroke();
        ectx.strokeStyle = f.glow;
        ectx.lineWidth = glowW;
        ectx.stroke();
        bctx.strokeStyle = 'rgba(180,180,180,.5)';
        bctx.lineWidth = 2;
        bctx.stroke();
      }
    };

    if (pattern === 'hex') {
      const hexR = 21;
      const hexW = hexR * Math.sqrt(3);
      const hexH = hexR * 1.5;
      for (let row = 0; row < S / hexH + 2; row++) {
        for (let col = 0; col < S / hexW + 2; col++) {
          const cx = col * hexW + (row % 2 ? hexW / 2 : 0);
          const cy = row * hexH;
          polyAt(ctx, cx, cy, hexR - 1.6, 6, Math.PI / 6);
          ctx.strokeStyle = f.line;
          ctx.lineWidth = 1;
          ctx.stroke();
          polyAt(bctx, cx, cy, hexR - 1.6, 6, Math.PI / 6);
          bctx.strokeStyle = 'rgba(120,120,120,.5)';
          bctx.lineWidth = 1.4;
          bctx.stroke();
        }
      }
      [150, 260, 370, 468].forEach((r, i) => {
        circle(ctx, r);
        ctx.strokeStyle = f.line;
        ctx.lineWidth = i === 0 ? 2 : 1;
        ctx.stroke();
      });
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * TAU;
        ctx.beginPath();
        ctx.moveTo(C + Math.cos(a) * 105, C + Math.sin(a) * 105);
        ctx.lineTo(C + Math.cos(a) * 468, C + Math.sin(a) * 468);
        ctx.strokeStyle = f.line;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.save();
      ctx.translate(C, C);
      ctx.strokeStyle = f.glow;
      ctx.lineWidth = 2;
      for (let k = 0; k < 2; k++) {
        polyAt(ctx, 0, 0, 96, 6, k * Math.PI / 6);
        ctx.stroke();
      }
      circle(ctx, 120, 0, 0);
      ctx.stroke();
      ctx.restore();
      ticks(72, 440, 468, f.line, 1);
      veins(12, 9, 2, 1.8);
      speckle(1800, 0.035);

    } else if (pattern === 'grid') {
      const T = 64;
      for (let x = 0; x <= S; x += T) {
        const major = (x / T) % 4 === 0;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, S);
        ctx.strokeStyle = major ? f.line : 'rgba(255,255,255,.028)';
        ctx.lineWidth = major ? 1.8 : 1;
        ctx.stroke();
        bctx.beginPath(); bctx.moveTo(x, 0); bctx.lineTo(x, S);
        bctx.strokeStyle = 'rgba(120,120,120,.45)';
        bctx.lineWidth = 1.2;
        bctx.stroke();
      }
      for (let y = 0; y <= S; y += T) {
        const major = (y / T) % 4 === 0;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(S, y);
        ctx.strokeStyle = major ? f.line : 'rgba(255,255,255,.028)';
        ctx.lineWidth = major ? 1.8 : 1;
        ctx.stroke();
        bctx.beginPath(); bctx.moveTo(0, y); bctx.lineTo(S, y);
        bctx.strokeStyle = 'rgba(120,120,120,.45)';
        bctx.lineWidth = 1.2;
        bctx.stroke();
      }
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + 0.26;
        const x = C + Math.cos(a) * 500;
        const y = C + Math.sin(a) * 500;
        ctx.beginPath(); ctx.moveTo(C, C); ctx.lineTo(x, y);
        ctx.strokeStyle = f.line;
        ctx.lineWidth = 3;
        ctx.stroke();
        ectx.beginPath(); ectx.moveTo(C, C); ectx.lineTo(x, y);
        ectx.strokeStyle = f.glow;
        ectx.lineWidth = 3;
        ectx.stroke();
      }
      circle(ctx, 300);
      ctx.setLineDash([14, 18]);
      ctx.strokeStyle = f.line;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
      polyAt(ctx, C, C, 96, 6, Math.PI / 6);
      ctx.strokeStyle = f.glow;
      ctx.lineWidth = 2;
      ctx.stroke();
      ectx.beginPath(); ectx.arc(C, C, 96, 0, TAU);
      ectx.strokeStyle = f.glow;
      ectx.lineWidth = 2;
      ectx.stroke();
      ticks(48, 452, 468, f.line, 1);
      speckle(1200, 0.02);

    } else if (pattern === 'rings') {
      let i = 0;
      for (let r = 42; r < 500; r += 46, i++) {
        if (i % 2 === 0) {
          circle(ctx, r - 23);
          ctx.fillStyle = 'rgba(255,255,255,.014)';
          ctx.fill();
        }
        circle(ctx, r);
        ctx.strokeStyle = f.line;
        ctx.lineWidth = i % 3 === 0 ? 2 : 1;
        ctx.stroke();
        circle(bctx, r);
        bctx.strokeStyle = 'rgba(120,120,120,.5)';
        bctx.lineWidth = 1.3;
        bctx.stroke();
      }
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * TAU;
        ctx.beginPath();
        ctx.moveTo(C + Math.cos(a) * 60, C + Math.sin(a) * 60);
        ctx.lineTo(C + Math.cos(a) * 470, C + Math.sin(a) * 470);
        ctx.strokeStyle = f.line;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      polyAt(ctx, C, C, 110, 7, Math.PI / 2);
      ctx.strokeStyle = f.glow;
      ctx.lineWidth = 2;
      ctx.stroke();
      polyAt(ctx, C, C, 84, 7, Math.PI / 2);
      ctx.stroke();
      ectx.beginPath(); ectx.arc(C, C, 110, 0, TAU);
      ectx.strokeStyle = f.glow;
      ectx.lineWidth = 2;
      ectx.stroke();
      ticks(96, 448, 470, f.line, 1);
      veins(10, 8, 1.6, 1.6);

    } else if (pattern === 'cracks') {
      for (let i = 0; i < 140; i++) {
        const a = Math.random() * TAU;
        const d = Math.sqrt(Math.random()) * 500;
        ctx.beginPath();
        ctx.arc(C + Math.cos(a) * d, C + Math.sin(a) * d, 8 + Math.random() * 34, 0, TAU);
        ctx.fillStyle = 'rgba(0,0,0,' + (0.05 + Math.random() * 0.12).toFixed(3) + ')';
        ctx.fill();
      }
      for (let v = 0; v < 34; v++) {
        let a = Math.random() * TAU;
        let x = C + Math.cos(a) * (Math.random() * 300);
        let y = C + Math.sin(a) * (Math.random() * 300);
        ctx.beginPath(); ctx.moveTo(x, y);
        ectx.beginPath(); ectx.moveTo(x, y);
        bctx.beginPath(); bctx.moveTo(x, y);
        for (let j = 0; j < 18; j++) {
          a += (Math.random() - 0.5) * 0.9;
          const len = 14 + Math.random() * 30;
          x += Math.cos(a) * len;
          y += Math.sin(a) * len;
          ctx.lineTo(x, y);
          ectx.lineTo(x, y);
          bctx.lineTo(x, y);
          if (Math.hypot(x - C, y - C) > 486) break;
        }
        ctx.strokeStyle = 'rgba(14,6,4,.85)';
        ctx.lineWidth = 5;
        ctx.stroke();
        ectx.strokeStyle = f.glow;
        ectx.lineWidth = 2.4;
        ectx.stroke();
        bctx.strokeStyle = 'rgba(80,80,80,.6)';
        bctx.lineWidth = 3;
        bctx.stroke();
      }
      for (let i = 0; i < 9; i++) {
        const a = Math.random() * TAU;
        const d = 90 + Math.random() * 340;
        const x = C + Math.cos(a) * d;
        const y = C + Math.sin(a) * d;
        const r = 26 + Math.random() * 40;
        circle(ctx, r, x, y);
        ctx.strokeStyle = f.line;
        ctx.lineWidth = 2;
        ctx.stroke();
        circle(ctx, r * 0.7, x, y);
        ctx.fillStyle = 'rgba(0,0,0,.25)';
        ctx.fill();
      }
      polyAt(ctx, C, C, 120, 3, -Math.PI / 2);
      ctx.strokeStyle = f.glow;
      ctx.lineWidth = 2.4;
      ctx.stroke();
      ectx.beginPath(); ectx.arc(C, C, 120, 0, TAU);
      ectx.strokeStyle = f.glow;
      ectx.lineWidth = 2;
      ectx.stroke();
      speckle(1500, 0.03);

    } else if (pattern === 'road') {
      const half = 120;
      ctx.fillStyle = 'rgba(255,255,255,.022)';
      ctx.fillRect(0, C - half, S, half * 2);
      for (let row = -half; row < half; row += 26) {
        const offset = Math.abs(row / 26) % 2 ? 20 : 0;
        for (let x = offset; x < S; x += 42) {
          ctx.strokeStyle = 'rgba(200,255,220,.05)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, C + row, 38, 22);
        }
      }
      ectx.fillStyle = f.glow;
      ectx.fillRect(0, C - half, S, 3);
      ectx.fillRect(0, C + half - 3, S, 3);
      for (let x = 0; x < S; x += 64) {
        ctx.fillStyle = f.line;
        ctx.fillRect(x, C - 2, 34, 4);
      }
      for (let x = 128; x < S; x += 160) {
        circle(ctx, 26, x, C);
        ctx.strokeStyle = f.glow;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        circle(ctx, 7, x, C);
        ctx.fillStyle = f.glow;
        ctx.fill();
      }
      for (let i = 0; i < 120; i++) {
        const x = Math.random() * S;
        const y = Math.random() < 0.5 ? C - half - 10 - Math.random() * 90 : C + half + 10 + Math.random() * 90;
        ctx.beginPath();
        ctx.arc(x, y, 3 + Math.random() * 9, 0, TAU);
        ctx.fillStyle = 'rgba(0,0,0,.14)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.05)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      speckle(1600, 0.03);
      ticks(40, 460, 470, f.line, 1);

    } else if (pattern === 'mosaic') {
      for (let y = 0; y <= S; y += 52) {
        for (let x = 0; x <= S; x += 52) {
          const cx = x + ((y / 52) % 2 ? 26 : 0);
          polyAt(ctx, cx, y, 25, 4, Math.PI / 4);
          ctx.fillStyle = ((x + y) / 52) % 2 ? 'rgba(255,255,255,.016)' : 'rgba(0,0,0,.06)';
          ctx.fill();
          ctx.strokeStyle = f.line;
          ctx.lineWidth = 1;
          ctx.stroke();
          polyAt(bctx, cx, y, 25, 4, Math.PI / 4);
          bctx.strokeStyle = 'rgba(120,120,120,.5)';
          bctx.lineWidth = 1.2;
          bctx.stroke();
        }
      }
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        circle(ctx, 40, C + Math.cos(a) * 116, C + Math.sin(a) * 116);
        ctx.strokeStyle = f.glow;
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }
      circle(ctx, 190);
      ctx.strokeStyle = f.line;
      ctx.lineWidth = 2;
      ctx.stroke();
      circle(ctx, 300);
      ctx.setLineDash([10, 16]);
      ctx.stroke();
      ctx.setLineDash([]);
      ticks(16, 430, 470, f.line, 1);
      speckle(900, 0.02);

    } else if (pattern === 'scorch') {
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * TAU + Math.random() * 0.1;
        ctx.beginPath();
        ctx.moveTo(C + Math.cos(a) * 40, C + Math.sin(a) * 40);
        ctx.lineTo(C + Math.cos(a + 0.05) * 500, C + Math.sin(a + 0.05) * 500);
        ctx.strokeStyle = 'rgba(0,0,0,' + (0.05 + Math.random() * 0.1).toFixed(3) + ')';
        ctx.lineWidth = 6 + Math.random() * 18;
        ctx.stroke();
      }
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU - Math.PI / 2;
        const x0 = C + Math.cos(a) * 400;
        const y0 = C + Math.sin(a) * 400;
        const x1 = C + Math.cos(a) * 470;
        const y1 = C + Math.sin(a) * 470;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
        ctx.strokeStyle = f.glow;
        ctx.lineWidth = i % 3 === 0 ? 7 : 3;
        ctx.stroke();
        ectx.beginPath(); ectx.moveTo(x0, y0); ectx.lineTo(x1, y1);
        ectx.strokeStyle = f.glow;
        ectx.lineWidth = 4;
        ectx.stroke();
      }
      ticks(60, 448, 468, f.line, 1);
      circle(ctx, 300);
      ctx.strokeStyle = f.line;
      ctx.lineWidth = 2;
      ctx.stroke();
      const grd = ctx.createRadialGradient(C, C, 20, C, C, 130);
      grd.addColorStop(0, 'rgba(0,0,0,.88)');
      grd.addColorStop(0.72, 'rgba(0,0,0,.55)');
      grd.addColorStop(1, 'rgba(255,80,60,0)');
      ctx.beginPath(); ctx.arc(C, C, 130, 0, TAU);
      ctx.fillStyle = grd;
      ctx.fill();
      circle(ctx, 130);
      ctx.strokeStyle = f.glow;
      ctx.lineWidth = 2.4;
      ctx.stroke();
      veins(16, 7, 1.6, 1.6);
      speckle(1200, 0.025);

    } else {
      // 'duel' — polished slabs and a duelling circle
      const slab = 168;
      for (let y = 0; y <= S; y += slab) {
        for (let x = 0; x <= S; x += slab) {
          ctx.strokeStyle = f.line;
          ctx.lineWidth = 1.6;
          ctx.strokeRect(x + 4, y + 4, slab - 8, slab - 8);
          bctx.strokeStyle = 'rgba(120,120,120,.5)';
          bctx.lineWidth = 1.4;
          bctx.strokeRect(x + 4, y + 4, slab - 8, slab - 8);
        }
      }
      veins(14, 6, 1.2, 1.2);
      circle(ctx, 330);
      ctx.strokeStyle = f.glow;
      ctx.lineWidth = 3;
      ctx.stroke();
      ectx.beginPath(); ectx.arc(C, C, 330, 0, TAU);
      ectx.strokeStyle = f.glow;
      ectx.lineWidth = 4;
      ectx.stroke();
      circle(ctx, 300);
      ctx.strokeStyle = f.line;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU;
        ctx.beginPath();
        ctx.moveTo(C + Math.cos(a) * 300, C + Math.sin(a) * 300);
        ctx.lineTo(C + Math.cos(a) * 470, C + Math.sin(a) * 470);
        ctx.strokeStyle = f.line;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
      polyAt(ctx, C, C, 92, 8, Math.PI / 8);
      ctx.strokeStyle = f.glow;
      ctx.lineWidth = 2.2;
      ctx.stroke();
      polyAt(ctx, C, C, 62, 8, Math.PI / 8);
      ctx.strokeStyle = f.line;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ticks(64, 456, 470, f.line, 1);
      speckle(1000, 0.02);
    }
  }

  /* ---------------- WALLS ---------------- */
  _buildWalls(spec) {
    const w = spec.wall;
    const sides = { square: 4, hexagon: 6, octagon: 8 }[spec.shape] || 72;
    const step = TAU / sides;
    const thick = w.thick ?? 0.55;

    const panelGeo = new THREE.BoxGeometry(1, 1, 1);
    const panelMat = new THREE.MeshStandardMaterial({
      color: w.color, roughness: w.rough ?? 0.68, metalness: w.metal ?? 0.4,
      emissive: spec.accent, emissiveIntensity: 0.05,
    });
    const trimGeo = new THREE.BoxGeometry(1, 1, 1);
    const capMat = new THREE.MeshBasicMaterial({ color: spec.accent, transparent: true, opacity: 0.85 });
    const baseMat = new THREE.MeshBasicMaterial({
      color: spec.accent, transparent: true, opacity: 0.26,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });

    const panels = new THREE.InstancedMesh(panelGeo, panelMat, sides);
    const caps = new THREE.InstancedMesh(trimGeo, capMat, sides);
    const bases = new THREE.InstancedMesh(trimGeo, baseMat, sides);
    panels.castShadow = true;
    panels.receiveShadow = true;

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const sc = new THREE.Vector3();

    for (let i = 0; i < sides; i++) {
      const p0 = this._edgePoint(spec, i * step);
      const p1 = this._edgePoint(spec, (i + 1) * step);
      const dx = p1.x - p0.x;
      const dz = p1.z - p0.z;
      const width = Math.hypot(dx, dz) * 1.03;
      const mx = (p0.x + p1.x) / 2;
      const mz = (p0.z + p1.z) / 2;
      const nl = Math.hypot(mx, mz) || 1;
      const nx = mx / nl;
      const nz = mz / nl;
      const h = Math.max(1.1, w.height + Math.sin(i * 1.73 + 0.7) * (w.vary ?? 0.6));
      e.set(0, Math.atan2(-dz, dx), 0);
      q.setFromEuler(e);

      p.set(mx + nx * 0.34, h / 2 - 0.14, mz + nz * 0.34);
      sc.set(width, h, thick);
      m.compose(p, q, sc);
      panels.setMatrixAt(i, m);

      p.set(mx + nx * 0.34, h - 0.06, mz + nz * 0.34);
      sc.set(width * 0.97, 0.12, thick + 0.2);
      m.compose(p, q, sc);
      caps.setMatrixAt(i, m);

      p.set(mx + nx * 0.34, 0.1, mz + nz * 0.34);
      sc.set(width * 0.99, 0.1, thick + 0.34);
      m.compose(p, q, sc);
      bases.setMatrixAt(i, m);
    }
    panels.instanceMatrix.needsUpdate = true;
    caps.instanceMatrix.needsUpdate = true;
    bases.instanceMatrix.needsUpdate = true;
    panels.frustumCulled = false;
    caps.frustumCulled = false;
    bases.frustumCulled = false;
    this.arenaGroup.add(panels, caps, bases);

    // pylons at the vertices / around the rim
    const posts = { square: 4, hexagon: 6, octagon: 8 }[spec.shape] || 8;
    const postGeo = new THREE.CylinderGeometry(0.32, 0.62, 1, 6);
    const postMat = new THREE.MeshStandardMaterial({ color: w.stone ?? w.color, roughness: 0.55, metalness: 0.5 });
    const postMesh = new THREE.InstancedMesh(postGeo, postMat, posts);
    const gemGeo = new THREE.OctahedronGeometry(0.34, 0);
    const gemMat = new THREE.MeshBasicMaterial({ color: spec.accent });
    const gemMesh = new THREE.InstancedMesh(gemGeo, gemMat, posts);
    postMesh.castShadow = true;
    postMesh.frustumCulled = false;
    gemMesh.frustumCulled = false;

    for (let i = 0; i < posts; i++) {
      const a = spec.shape === 'circle' || spec.shape === 'oval'
        ? (i / posts) * TAU + 0.19
        : (i / posts) * TAU;
      const pt = this._edgePoint(spec, a);
      const ph = Math.max(2.2, w.height * 1.42 + Math.sin(i * 2.1) * 0.4);
      q.identity();
      p.set(pt.x * 1.02, ph / 2, pt.z * 1.02);
      sc.set(1.2, ph, 1.2);
      m.compose(p, q, sc);
      postMesh.setMatrixAt(i, m);
      p.set(pt.x * 1.02, ph + 0.34, pt.z * 1.02);
      sc.set(1, 1, 1);
      m.compose(p, q, sc);
      gemMesh.setMatrixAt(i, m);
    }
    postMesh.instanceMatrix.needsUpdate = true;
    gemMesh.instanceMatrix.needsUpdate = true;
    this.arenaGroup.add(postMesh, gemMesh);
  }

  /* ---------------- DRESSING ---------------- */
  _buildDressing(spec) {
    this.monoliths = [];
    const stoneMat = new THREE.MeshStandardMaterial({ color: spec.wall.stone ?? 0x131a2c, roughness: 0.62, metalness: 0.45 });
    const count = Math.max(6, Math.min(18, Math.round(this._perimeter(spec) / 17)));
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU + 0.12;
      const dist = shapeRadius(spec.shape, spec.radius, a) + 3.2;
      const h = 4.5 + Math.random() * 5;
      const group = new THREE.Group();
      group.position.set(Math.cos(a) * dist, 0, Math.sin(a) * dist);

      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.66, h, 5), stoneMat);
      body.position.y = h / 2 - 0.4;
      body.castShadow = true;
      body.receiveShadow = true;
      group.add(body);

      const capMat = new THREE.MeshBasicMaterial({ color: spec.accent, transparent: true, opacity: 0.9 });
      const cap = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), capMat);
      cap.position.y = h + 0.25;
      group.add(cap);

      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture('rgba(255,240,210,.9)', 'rgba(255,190,110,.3)', 'rgba(255,120,40,0)'),
        transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      halo.position.copy(cap.position);
      halo.scale.set(2.4, 2.4, 1);
      group.add(halo);

      this.arenaGroup.add(group);
      this.monoliths.push({ group, cap, halo, capMat, phase: Math.random() * 6.28, baseY: cap.position.y, spd: 0.4 + Math.random() * 0.5 });
    }

    // distant floating stone
    this.islands = [];
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x0d1322, roughness: 0.95, metalness: 0.1 });
    for (let i = 0; i < 7; i++) {
      const a = Math.random() * TAU;
      const dist = 58 + Math.random() * 34;
      const g = new THREE.Group();
      const pieces = 3 + Math.floor(Math.random() * 3);
      for (let k = 0; k < pieces; k++) {
        const s = 1.6 + Math.random() * 3.2;
        const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockMat);
        mesh.position.set((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 5);
        mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
        g.add(mesh);
      }
      g.position.set(Math.cos(a) * dist, -6 + Math.random() * 20, Math.sin(a) * dist);
      this.arenaGroup.add(g);
      this.islands.push({ g, phase: Math.random() * 6.28, baseY: g.position.y });
    }
  }

  /* ---------------- AMBIENT ---------------- */
  _buildAmbient(spec) {
    this.sigilRings = [];
    const R = spec.radius;
    const defs = [
      { r: R * 0.20, op: 0.16, spd: 0.05 },
      { r: R * 0.31, op: 0.10, spd: -0.035 },
    ];
    for (const def of defs) {
      const mesh = new THREE.Mesh(
        new THREE.RingGeometry(def.r * 0.985, def.r, 96, 1, 0, Math.PI * 1.72),
        new THREE.MeshBasicMaterial({
          color: spec.accent, transparent: true, opacity: def.op,
          side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
        })
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.025;
      mesh.userData.spd = def.spd;
      this.arenaGroup.add(mesh);
      this.sigilRings.push(mesh);
    }

    const disc = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture('rgba(255,220,160,.45)', 'rgba(255,170,80,.14)', 'rgba(255,120,40,0)'),
      transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    disc.position.set(0, 0.4, 0);
    disc.scale.set(R * 0.78, R * 0.78, 1);
    this.arenaGroup.add(disc);

    // shape-true rim lines
    const outer = [];
    const inner = [];
    for (let i = 0; i < 220; i++) {
      const a = (i / 220) * TAU;
      const r = shapeRadius(spec.shape, spec.radius, a);
      outer.push(new THREE.Vector3(Math.cos(a) * r, 0.05, Math.sin(a) * r));
      inner.push(new THREE.Vector3(Math.cos(a) * (r + 0.55), 0.03, Math.sin(a) * (r + 0.55)));
    }
    this.rimMat = new THREE.LineBasicMaterial({ color: spec.accent, transparent: true, opacity: 0.8 });
    this.rim = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(outer), this.rimMat);
    this.arenaGroup.add(this.rim);
    this.rimGlowMat = new THREE.LineBasicMaterial({
      color: spec.accent, transparent: true, opacity: 0.3,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.rimGlow = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(inner), this.rimGlowMat);
    this.arenaGroup.add(this.rimGlow);

    // ambient dust
    const N = 420;
    const dp = new Float32Array(N * 3);
    this.dustData = [];
    for (let i = 0; i < N; i++) {
      const a = Math.random() * TAU;
      const d = Math.sqrt(Math.random()) * (shapeRadius(spec.shape, spec.radius, a) + 8);
      dp[i * 3] = Math.cos(a) * d;
      dp[i * 3 + 1] = Math.random() * 14;
      dp[i * 3 + 2] = Math.sin(a) * d;
      this.dustData.push({ vy: 0.18 + Math.random() * 0.5, ph: Math.random() * 10 });
    }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    this.dustMat = new THREE.PointsMaterial({
      color: spec.accent, size: 0.11, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.dust = new THREE.Points(dg, this.dustMat);
    this.arenaGroup.add(this.dust);
  }

  /* ---------------- THEME ---------------- */
  _applyTheme(spec) {
    this.themeTarget.setHex(spec.accent);
    this.arenaAccent = this.arenaAccent || new THREE.Color();
    this.arenaAccent.setHex(spec.accent);
    this.accent.setHex(spec.accent);
    if (this.scene.fog) {
      this.scene.fog.color.setHex(spec.fog.color);
      this.scene.fog.density = spec.fog.density;
    }
    if (this.scene.background?.setHex) this.scene.background.setHex(spec.fog.color);
    const u = this.sky?.material?.uniforms;
    if (u) {
      u.uTop.value.setHex(spec.sky.top);
      u.uMid.value.setHex(spec.sky.mid);
      u.uBot.value.setHex(spec.sky.bot);
      u.uSun.value.set(spec.sky.sun[0], spec.sky.sun[1], spec.sky.sun[2]).normalize();
    }
    if (this.sun?.material) this.sun.material.color.setHex(spec.sky.sunColor ?? 0xffffff);
    if (this.hemi) {
      this.hemi.color.setHex(spec.light.hemi);
      this.hemi.groundColor.setHex(spec.light.ground);
    }
    if (this.key) this.key.color.setHex(spec.light.key);
    if (this.rimLight) this.rimLight.color.setHex(spec.light.rim);
    if (this.fill) this.fill.color.setHex(spec.accent);
    if (this.orbitA) this.orbitA.color.setHex(spec.light.orbitA ?? spec.accent);
    if (this.orbitB) this.orbitB.color.setHex(spec.light.orbitB ?? 0x7194ff);
    this.fitCamera();
  }

  /* A tall, narrow phone sees less of the ring: lift the camera and pull it
     back a little so the horde does not arrive from behind the HUD. */
  fitCamera() {
    const spec = this._arenaSpec || ARENAS[ARENA_ID] || ARENAS.sanctum;
    const portrait = window.innerHeight > window.innerWidth * 1.08;
    const k = portrait ? 1.16 : 1;
    this.camHeight = (24 + spec.radius * 0.11) * k;
    this.camBack = (20 + spec.radius * 0.1) * k;
  }

  _buildLights() {
    this.hemi = new THREE.HemisphereLight(0x6a86d8, 0x2a1a22, 0.55);
    this.scene.add(this.hemi);

    this.key = new THREE.DirectionalLight(0xffd7a8, 1.5);
    this.key.position.set(-26, 34, 18);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    this.key.shadow.camera.near = 1;
    this.key.shadow.camera.far = 110;
    this.key.shadow.camera.left = -40;
    this.key.shadow.camera.right = 40;
    this.key.shadow.camera.top = 40;
    this.key.shadow.camera.bottom = -40;
    this.key.shadow.bias = -0.0008;
    this.key.shadow.normalBias = 0.02;
    this.scene.add(this.key);

    this.rimLight = new THREE.DirectionalLight(0x7a5bff, 0.55);
    this.rimLight.position.set(30, 14, -26);
    this.scene.add(this.rimLight);

    this.fill = new THREE.PointLight(0xffb066, 0.5, 60, 2);
    this.fill.position.set(0, 6, 0);
    this.scene.add(this.fill);

    // slow orbiting practicals add moving highlights to stone and glass
    this.orbitA = new THREE.PointLight(0xffa85a, 0.6, 52, 2);
    this.orbitA.position.set(20, 8, 12);
    this.scene.add(this.orbitA);
    this.orbitB = new THREE.PointLight(0x7194ff, 0.42, 56, 2);
    this.orbitB.position.set(-22, 11, -16);
    this.scene.add(this.orbitB);
  }

  /* ---------------- PUBLIC ---------------- */
  setAccent(hex) {
    this.themeTarget.set(hex);
  }

  /* Distant, Close or First person. The game owns the preference; the engine
     only smooths the camera toward whichever stop was chosen. */
  setView(mode) {
    if (!CAMERA_VIEWS.some(v => v.id === mode)) return false;
    this.viewMode = mode;
    return true;
  }

  setQuality(q) {
    this.quality = q;
    const r = this.renderer;
    if (q === 'low') {
      r.setPixelRatio(1);
      r.shadowMap.enabled = false;
    } else if (q === 'medium') {
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
      r.shadowMap.enabled = false;
    } else {
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      r.shadowMap.enabled = true;
    }
    this.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
    this.resize();
  }

  addShake(amount) {
    this.shake = Math.min(2.2, this.shake + amount);
  }

  punchFov(amount = 5) {
    this.fovPunch = Math.max(this.fovPunch, amount);
  }

  pulseExposure(amount = 0.3) {
    this.flashExposure = Math.max(this.flashExposure, amount);
  }

  resize() {
    const w = window.innerWidth;
    const h = Math.max(1, window.innerHeight);
    this.camera.aspect = w / h;
    this.baseFov = w / h < 0.9 ? 58 : 46;
    this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
    this.fitCamera();
    this.renderer.setSize(w, h, false);
  }

  project(v3) {
    const p = _pv.copy(v3).project(this.camera);
    return {
      x: (p.x * 0.5 + 0.5) * window.innerWidth,
      y: (-p.y * 0.5 + 0.5) * window.innerHeight,
      visible: p.z < 1 && p.z > -1,
    };
  }

  update(dt, opts = {}) {
    this.time += dt;
    const t = this.time;
    const mode = opts.mode || 'game';
    if (this.sky?.material?.uniforms?.uTime) this.sky.material.uniforms.uTime.value = t;
    if (this.orbitA) {
      this.orbitA.position.set(Math.cos(t * 0.12) * 26, 7 + Math.sin(t * 0.4) * 2.2, Math.sin(t * 0.12) * 26);
      this.orbitB.position.set(Math.cos(-t * 0.08 + 2.1) * 30, 10 + Math.sin(t * 0.3 + 1) * 2, Math.sin(-t * 0.08 + 2.1) * 30);
    }
    if (this.stars) this.stars.material.opacity = 0.78 + Math.sin(t * 0.7) * 0.07;

    // accent lerp
    this.accent.lerp(this.themeTarget, Math.min(1, dt * 2.2));
    const acc = this.arenaAccent || this.accent;

    if (this.rimMat) this.rimMat.color.copy(acc);
    if (this.rimGlowMat) this.rimGlowMat.color.copy(acc);
    if (this.dustMat) this.dustMat.color.copy(acc);
    for (const m of this.monoliths) {
      m.capMat.color.copy(acc);
      m.halo.material.color.copy(acc);
    }
    if (this.sigilRings) for (const s of this.sigilRings) s.material.color.copy(acc);

    // ambient animation
    if (this.sigilRings) {
      for (const s of this.sigilRings) s.rotation.z += s.userData.spd * dt;
    }
    for (const m of this.monoliths) {
      const p = Math.sin(t * 1.1 + m.phase) * 0.5 + 0.5;
      m.cap.position.y = m.baseY + Math.sin(t * m.spd + m.phase) * 0.22;
      m.cap.rotation.y += dt * 0.7;
      m.cap.rotation.x += dt * 0.2;
      m.halo.position.y = m.cap.position.y;
      m.halo.material.opacity = 0.4 + p * 0.35;
      m.halo.scale.setScalar(2.1 + p * 0.7);
    }
    for (const isl of this.islands) {
      isl.g.position.y = isl.baseY + Math.sin(t * 0.16 + isl.phase) * 0.8;
      isl.g.rotation.y += dt * 0.006;
    }
    if (this.stars) this.stars.rotation.y += dt * 0.0035;
    if (this.sun) this.sun.material.opacity = 0.9 + Math.sin(t * 0.3) * 0.05;

    if (this.dust) {
      const pos = this.dust.geometry.attributes.position;
      const arr = pos.array;
      for (let i = 0; i < this.dustData.length; i++) {
        const d = this.dustData[i];
        arr[i * 3 + 1] += d.vy * dt;
        arr[i * 3] += Math.sin(t * 0.4 + d.ph) * dt * 0.12;
        if (arr[i * 3 + 1] > 15) {
          arr[i * 3 + 1] = 0.2;
          const a = Math.random() * Math.PI * 2;
          const dd = Math.sqrt(Math.random()) * (arenaRadiusAt(a) + 6);
          arr[i * 3] = Math.cos(a) * dd;
          arr[i * 3 + 2] = Math.sin(a) * dd;
        }
      }
      pos.needsUpdate = true;
    }

    // interior glow follows action
    if (this.fill) this.fill.color.copy(acc);

    // camera
    const target = opts.target || _zero;
    const vel = opts.velocity || _zero;
    if (mode === 'welcome') {
      this.titleTime += dt;
      const a = this.titleTime * 0.09 + 2.2;
      const rad = 27 - Math.min(13, this.titleTime * 0.42);
      _desired.set(Math.sin(a) * rad, 4.2 + Math.sin(this.titleTime * 0.22) * 1.1, Math.cos(a) * rad);
      _look.set(0, 2.3, 0);
      const k = 1 - Math.exp(-dt * 1.05);
      this.camera.position.lerp(_desired, k);
      _lookNow.lerp(_look, Math.min(1, dt * 1.5));
      this.camera.lookAt(_lookNow);
    } else if (mode === 'menu') {
      this.titleTime += dt;
      const a = this.titleTime * 0.055 + 0.6;
      const rad = 46;
      _desired.set(Math.sin(a) * rad, 20 + Math.sin(this.titleTime * 0.18) * 2.2, Math.cos(a) * rad);
      _look.set(0, 2.4, 0);
      const k = 1 - Math.exp(-dt * 1.4);
      this.camera.position.lerp(_desired, k);
      _lookNow.lerp(_look, Math.min(1, dt * 2));
      this.camera.lookAt(_lookNow);
    } else if (this.viewMode === 'first') {
      // Eye height, looking where the auto-aim is pointing, with a little
      // head bob so the cockpit feels alive.
      const aim = opts.aim || _zero;
      _aim.set(aim.x, 0, aim.z);
      if (_aim.lengthSq() < 0.0001) _aim.set(vel.x, 0, vel.z);
      if (_aim.lengthSq() < 0.0001) _aim.set(0, 0, 1);
      _aim.normalize();
      _desired.set(target.x, 1.58 + Math.sin(this.time * 5.4) * 0.015, target.z);
      this.camera.position.lerp(_desired, 1 - Math.exp(-dt * 22));
      _look.set(target.x + _aim.x * 11, 1.44, target.z + _aim.z * 11);
      _lookNow.lerp(_look, 1 - Math.exp(-dt * 11));
      this.camera.lookAt(_lookNow);
    } else if (this.viewMode === 'close') {
      const aim = opts.aim || _zero;
      const speed = Math.hypot(vel.x, vel.z);
      _aim.set(speed > 0.35 ? vel.x : aim.x, 0, speed > 0.35 ? vel.z : aim.z);
      if (_aim.lengthSq() < 0.0001) _aim.set(0, 0, 1);
      _aim.normalize();
      _desired.set(
        target.x - _aim.x * this.camBack * 0.6,
        this.camHeight * 0.46,
        target.z - _aim.z * this.camBack * 0.6
      );
      _look.set(target.x + _aim.x * 4.5, 1.25, target.z + _aim.z * 4.5);
      this.camera.position.lerp(_desired, 1 - Math.exp(-dt * 6.5));
      _lookNow.lerp(_look, 1 - Math.exp(-dt * 8));
      this.camera.lookAt(_lookNow);
    } else {
      _desired.set(target.x * 0.86, this.camHeight, target.z * 0.86 + this.camBack);
      _look.set(target.x + vel.x * 0.22, 1.15, target.z + vel.z * 0.22);
      const k = 1 - Math.exp(-dt * 5.2);
      this.camera.position.lerp(_desired, k);
      _lookNow.lerp(_look, Math.min(1, dt * 7));
      this.camera.lookAt(_lookNow);
    }

    // shake
    this.shake *= Math.exp(-dt * 4.2);
    if (this.shake > 0.001) {
      const s = this.shake * 0.55;
      this.camera.position.x += (Math.random() - 0.5) * s;
      this.camera.position.y += (Math.random() - 0.5) * s * 0.7;
      this.camera.position.z += (Math.random() - 0.5) * s;
    }

    // exposure pulses
    if (this.flashExposure > 0.001) {
      this.renderer.toneMappingExposure = 1.1 + this.flashExposure;
      this.flashExposure *= Math.exp(-dt * 5);
    } else {
      this.renderer.toneMappingExposure = 1.1;
    }

    // camera punch
    this.fovPunch *= Math.exp(-dt * 7);
    if (this.fovPunch < 0.01) this.fovPunch = 0;
    const viewFov = this.viewMode === 'first' ? 9 : this.viewMode === 'close' ? 3 : 0;
    const fov = this.baseFov + viewFov + this.fovPunch;
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}

const _pv = new THREE.Vector3();
const _zero = new THREE.Vector3();
const _desired = new THREE.Vector3();
const _look = new THREE.Vector3();
const _lookNow = new THREE.Vector3(0, 2, 0);
const _aim = new THREE.Vector3();
