/* ============================================================
   HELIOS ELEMENTS — FX
   GPU particles, shockwave rings, beams, arcs, damage numbers.
   ============================================================ */

const MAX_PARTICLES = 1800;

export class FX {
  constructor(engine) {
    this.engine = engine;
    this.scene = engine.scene;
    this.settings = { numbers: true, quality: 'high' };
    this.tmpColor = new THREE.Color();
    this._buildParticles();
    this._buildRings();
    this._buildBeams();
    this._buildArcs();
    this._buildDOM();
    this.shakeScale = 1;
  }

  /* ---------------- PARTICLES ---------------- */
  _buildParticles() {
    const geo = new THREE.BufferGeometry();
    this.pPos = new Float32Array(MAX_PARTICLES * 3);
    this.pCol = new Float32Array(MAX_PARTICLES * 3);
    this.pSize = new Float32Array(MAX_PARTICLES);
    this.pAlpha = new Float32Array(MAX_PARTICLES);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.pCol, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.pSize, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.pAlpha, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 200);

    const mat = new THREE.ShaderMaterial({
      uniforms: { uPixel: { value: Math.min(window.devicePixelRatio || 1, 2) } },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aAlpha;
        uniform float uPixel;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = aColor;
          vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixel * (260.0 / max(0.1, -mv.z));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.0, d);
          a *= a;
          gl_FragColor = vec4(vColor, a * vAlpha);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.scene.add(this.points);

    this.parts = new Array(MAX_PARTICLES);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.parts[i] = { life: 0, max: 1, x: 0, y: -100, z: 0, vx: 0, vy: 0, vz: 0, size: 0.2, r: 1, g: 1, b: 1, grav: 0, drag: 0.98 };
      this.pAlpha[i] = 0;
    }
    this.pCursor = 0;
  }

  _spawn(x, y, z, vx, vy, vz, color, size, life, grav = 0, drag = 0.985) {
    const p = this.parts[this.pCursor];
    this.pCursor = (this.pCursor + 1) % MAX_PARTICLES;
    p.life = life; p.max = life;
    p.x = x; p.y = y; p.z = z;
    p.vx = vx; p.vy = vy; p.vz = vz;
    p.size = size; p.grav = grav; p.drag = drag;
    this.tmpColor.set(color);
    p.r = this.tmpColor.r; p.g = this.tmpColor.g; p.b = this.tmpColor.b;
    return p;
  }

  burst(pos, color, opts = {}) {
    const count = Math.round((opts.count || 14) * (this.settings.quality === 'low' ? 0.5 : 1));
    const speed = opts.speed ?? 4;
    const size = opts.size ?? 0.22;
    const life = opts.life ?? 0.6;
    const up = opts.up ?? 1.4;
    const spread = opts.spread ?? 1;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.35 + Math.random() * 0.65);
      this._spawn(
        pos.x + (Math.random() - 0.5) * 0.4 * spread,
        pos.y + (Math.random() - 0.5) * 0.35 * spread,
        pos.z + (Math.random() - 0.5) * 0.4 * spread,
        Math.cos(a) * s, Math.random() * up, Math.sin(a) * s,
        color, size * (0.6 + Math.random() * 0.8), life * (0.6 + Math.random() * 0.7),
        opts.grav ?? 4, opts.drag ?? 0.97
      );
    }
  }

  trail(pos, color, size = 0.16, life = 0.32) {
    this._spawn(pos.x, pos.y, pos.z, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, color, size, life, 0, 0.94);
  }

  streak(pos, color, dir, count = 3, size = 0.2) {
    for (let i = 0; i < count; i++) {
      this._spawn(
        pos.x + (Math.random() - 0.5) * 0.5, pos.y + (Math.random() - 0.5) * 0.5, pos.z + (Math.random() - 0.5) * 0.5,
        -dir.x * 2 + (Math.random() - 0.5), -dir.y * 2 + Math.random(), -dir.z * 2 + (Math.random() - 0.5),
        color, size * (0.5 + Math.random()), 0.28, 0, 0.93
      );
    }
  }

  /* ---------------- RINGS ---------------- */
  _buildRings() {
    this.rings = [];
    const geo = new THREE.RingGeometry(0.8, 1, 64, 1);
    for (let i = 0; i < 40; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffaa66, transparent: true, opacity: 0,
        side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      this.scene.add(m);
      this.rings.push({ mesh: m, life: 0, max: 1, r0: 1, r1: 4, base: 0.8, y: 0.05 });
    }
    this.ringCursor = 0;
  }

  ring(pos, color, opts = {}) {
    const r = this.rings[this.ringCursor];
    this.ringCursor = (this.ringCursor + 1) % this.rings.length;
    r.life = opts.life ?? 0.5;
    r.max = r.life;
    r.r0 = opts.r0 ?? 0.4;
    r.r1 = opts.r1 ?? 4;
    r.base = opts.opacity ?? 0.7;
    r.mesh.position.set(pos.x, (opts.y ?? 0.05), pos.z);
    r.mesh.material.color.set(color);
    r.mesh.visible = true;
    r.mesh.scale.setScalar(r.r0);
    r.mesh.material.opacity = r.base;
    return r;
  }

  /* ---------------- BEAMS ---------------- */
  _buildBeams() {
    this.beams = [];
    const geo = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);
    for (let i = 0; i < 12; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffdd99, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      });
      const m = new THREE.Mesh(geo, mat);
      m.visible = false;
      this.scene.add(m);
      this.beams.push({ mesh: m, life: 0, max: 1 });
    }
    this.beamCursor = 0;
  }

  beam(from, to, color, thickness = 0.18, life = 0.25) {
    const b = this.beams[this.beamCursor];
    this.beamCursor = (this.beamCursor + 1) % this.beams.length;
    const a = _v1.copy(from);
    const c = _v2.copy(to);
    const dir = _v3.copy(c).sub(a);
    const len = dir.length();
    if (len < 0.01) return;
    const mid = _v4.copy(a).add(c).multiplyScalar(0.5);
    b.mesh.position.copy(mid);
    b.mesh.quaternion.setFromUnitVectors(_up, dir.normalize());
    b.mesh.scale.set(thickness, len, thickness);
    b.mesh.material.color.set(color);
    b.mesh.visible = true;
    b.life = life; b.max = life;
    b.mesh.material.opacity = 0.9;
  }

  /* ---------------- ARCS ---------------- */
  _buildArcs() {
    this.arcs = [];
    for (let i = 0; i < 10; i++) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12 * 3), 3));
      const mat = new THREE.LineBasicMaterial({
        color: 0x99eeff, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const line = new THREE.Line(geo, mat);
      line.visible = false;
      line.frustumCulled = false;
      this.scene.add(line);
      this.arcs.push({ line, life: 0, max: 1 });
    }
    this.arcCursor = 0;
  }

  arc(from, to, color, life = 0.18) {
    const a = this.arcs[this.arcCursor];
    this.arcCursor = (this.arcCursor + 1) % this.arcs.length;
    const pts = a.line.geometry.attributes.position.array;
    const N = 12;
    const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len, nz = dx / len;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const jag = (i === 0 || i === N - 1) ? 0 : (Math.random() - 0.5) * 0.9;
      pts[i * 3] = from.x + dx * t + nx * jag;
      pts[i * 3 + 1] = from.y + dy * t + (i === 0 || i === N - 1 ? 0 : (Math.random() - 0.5) * 0.5);
      pts[i * 3 + 2] = from.z + dz * t + nz * jag;
    }
    a.line.geometry.attributes.position.needsUpdate = true;
    a.line.geometry.computeBoundingSphere();
    a.line.material.color.set(color);
    a.line.material.opacity = 0.95;
    a.line.visible = true;
    a.life = life; a.max = life;
  }

  /* ---------------- DOM LAYERS ---------------- */
  _buildDOM() {
    const host = document.getElementById('ui') || document.body;
    this.dmgLayer = document.createElement('div');
    this.dmgLayer.className = 'dmg-layer';
    this.dmgLayer.id = 'dmg-layer';
    host.appendChild(this.dmgLayer);
    this.dmgEls = [];
    for (let i = 0; i < 42; i++) {
      const el = document.createElement('div');
      el.className = 'dmg';
      el.style.opacity = '0';
      this.dmgLayer.appendChild(el);
      this.dmgEls.push(el);
    }
    this.dmgCursor = 0;

    this.flashEl = document.createElement('div');
    this.flashEl.className = 'flash';
    host.appendChild(this.flashEl);
  }

  number(worldPos, text, kind = '') {
    if (!this.settings.numbers) return;
    const p = this.engine.project(worldPos);
    if (!p.visible) return;
    const el = this.dmgEls[this.dmgCursor];
    this.dmgCursor = (this.dmgCursor + 1) % this.dmgEls.length;
    el.style.left = p.x + 'px';
    el.style.top = p.y + 'px';
    el.className = 'dmg ' + kind;
    el.textContent = text;
    el.style.opacity = '';
    // restart animation
    void el.offsetWidth;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
  }

  flash(kind = 'hit') {
    const el = this.flashEl;
    el.className = 'flash';
    void el.offsetWidth;
    el.className = 'flash ' + kind;
  }

  shake(amount) {
    this.engine.addShake(amount * this.shakeScale);
  }

  /* ---------------- UPDATE ---------------- */
  update(dt) {
    const pos = this.pPos, col = this.pCol, size = this.pSize, alpha = this.pAlpha;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.parts[i];
      if (p.life <= 0) { if (alpha[i] !== 0) alpha[i] = 0; continue; }
      p.life -= dt;
      if (p.life <= 0) { alpha[i] = 0; continue; }
      p.vy -= p.grav * dt;
      const drag = Math.pow(p.drag, dt * 60);
      p.vx *= drag; p.vz *= drag;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < 0.06) { p.y = 0.06; p.vy *= -0.35; p.vx *= 0.7; p.vz *= 0.7; }
      const t = p.life / p.max;
      pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
      col[i * 3] = p.r; col[i * 3 + 1] = p.g; col[i * 3 + 2] = p.b;
      size[i] = p.size * (0.6 + 0.4 * t);
      alpha[i] = Math.min(1, t * 2.2);
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.aColor.needsUpdate = true;
    this.points.geometry.attributes.aSize.needsUpdate = true;
    this.points.geometry.attributes.aAlpha.needsUpdate = true;

    for (const r of this.rings) {
      if (r.life <= 0) continue;
      r.life -= dt;
      if (r.life <= 0) { r.mesh.visible = false; r.mesh.material.opacity = 0; continue; }
      const t = 1 - r.life / r.max;
      const e = 1 - Math.pow(1 - t, 2.4);
      const rr = r.r0 + (r.r1 - r.r0) * e;
      r.mesh.scale.set(rr, rr, rr);
      r.mesh.material.opacity = r.base * (1 - t);
    }

    for (const b of this.beams) {
      if (b.life <= 0) continue;
      b.life -= dt;
      if (b.life <= 0) { b.mesh.visible = false; continue; }
      const t = b.life / b.max;
      b.mesh.material.opacity = 0.9 * t;
    }

    for (const a of this.arcs) {
      if (a.life <= 0) continue;
      a.life -= dt;
      if (a.life <= 0) { a.line.visible = false; continue; }
      a.line.material.opacity = 0.95 * (a.life / a.max);
    }
  }

  clear() {
    for (const p of this.parts) p.life = 0;
    for (const r of this.rings) { r.life = 0; r.mesh.visible = false; }
    for (const b of this.beams) { b.life = 0; b.mesh.visible = false; }
    for (const a of this.arcs) { a.life = 0; a.line.visible = false; }
  }
}

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _v4 = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
