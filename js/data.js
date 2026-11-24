/* ============================================================
   HELIOS ELEMENTS — DATA
   Elements, fusions, enemies, boons and wave composition.
   ============================================================ */

export const VERSION = '1.9.2';

/* Three camera stops, from the whole ring to the guardian's own eyes. */
export const CAMERA_VIEWS = [
  { id: 'distant', name: 'Distant', label: 'DISTANT', icon: '▣', hint: 'The whole ring' },
  { id: 'close', name: 'Close', label: 'CLOSE', icon: '◎', hint: 'Over the shoulder' },
  { id: 'first', name: 'First person', label: 'FIRST PERSON', icon: '◉', hint: 'Cockpit view' },
];

/* Ascension tiers are written in the old numerals: Tier I, II, III … */
export function romanTier(n) {
  let v = Math.max(0, Math.floor(Number(n) || 0));
  if (v <= 0) return '—';
  const table = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  for (const [value, sym] of table) {
    while (v >= value) { out += sym; v -= value; }
  }
  return out;
}

export const ELEMENTS = {
  ember: {
    key: 'ember', name: 'Ember', role: 'Vanguard', sigil: '✦',
    color: 0xff6a2a, glow: 0xffb347, css: '#ff7a35',
    tagline: 'Burn bright. Strike first.',
    blurb: 'A shard of the first flame. Ember hits hard and leaves everything smouldering.',
    passive: 'Ignite — attacks burn for 3 damage/s over 2.5s.',
    bars: { power: 8, tempo: 6, control: 3 },
    stats: { damage: 13, interval: 0.46, projSpeed: 15, moveSpeed: 9.4, projectiles: 1, pierce: 0, crit: 0.05, homing: 0, aoe: 0, chain: 0, knockback: 2 },
    ignite: { dps: 3, duration: 2.5 },
    surge: { name: 'Cinder Nova', type: 'nova', cd: 8, radius: 5.4, damage: 42, ignite: true, desc: 'Erupt in a ring of flame, igniting everything nearby.' },
    ult: { name: 'Inferno', type: 'meteors', desc: 'Nine meteors rain from the sun, each detonating on impact.' },
  },
  tide: {
    key: 'tide', name: 'Tide', role: 'Mender', sigil: '≈',
    color: 0x2fa8ff, glow: 0x8fe6ff, css: '#4fb9ff',
    tagline: 'Flow around the blade.',
    blurb: 'Deep water remembers every wound. Tide pierces lines of foes and mends you as it strikes.',
    passive: 'Undertow — attacks pierce one enemy and restore 0.6 HP on hit.',
    bars: { power: 5, tempo: 7, control: 7 },
    stats: { damage: 9, interval: 0.38, projSpeed: 13, moveSpeed: 9.2, projectiles: 1, pierce: 1, crit: 0.04, homing: 0, aoe: 0, chain: 0, knockback: 1 },
    healOnHit: 0.6,
    surge: { name: 'Undertow', type: 'heal', cd: 10, radius: 5, damage: 22, heal: 22, desc: 'Release a healing wave that shoves enemies back.' },
    ult: { name: 'Deluge', type: 'deluge', desc: 'A tide floods the arena, healing you and drowning the horde.' },
  },
  gale: {
    key: 'gale', name: 'Gale', role: 'Tempest', sigil: '❋',
    color: 0x6ff2c0, glow: 0xbaffeb, css: '#7df5c6',
    tagline: 'Be gone, and stay gone.',
    blurb: 'A sliver of the high wind. Gale attacks faster than thought and arcs between targets.',
    passive: 'Chain — bolts leap to one additional nearby enemy.',
    bars: { power: 4, tempo: 9, control: 5 },
    stats: { damage: 7, interval: 0.23, projSpeed: 18, moveSpeed: 10.3, projectiles: 1, pierce: 0, crit: 0.06, homing: 0, aoe: 0, chain: 1, knockback: 1 },
    surge: { name: 'Galewind', type: 'lance', cd: 7, damage: 46, desc: 'Carve a razor wind through everything in a line.' },
    ult: { name: 'Tempest', type: 'tempest', desc: 'A whirling storm shreds the arena for four seconds.' },
  },
  stone: {
    key: 'stone', name: 'Stone', role: 'Bulwark', sigil: '⬢',
    color: 0xc08a4a, glow: 0xffd39a, css: '#d49a55',
    tagline: 'Nothing moves the mountain.',
    blurb: 'The oldest witness. Stone hurls crushing boulders that shatter in a burst of shrapnel.',
    passive: 'Impact — shots explode, dealing area damage and knockback.',
    bars: { power: 9, tempo: 3, control: 6 },
    stats: { damage: 20, interval: 0.72, projSpeed: 11, moveSpeed: 8.4, projectiles: 1, pierce: 0, crit: 0.04, homing: 0, aoe: 2.2, chain: 0, knockback: 6 },
    surge: { name: 'Terra Guard', type: 'guard', cd: 11, radius: 6, damage: 30, shield: 30, desc: 'Raise a stone bulwark, shielding you and shoving foes away.' },
    ult: { name: 'Faultline', type: 'quake', desc: 'Three colossal shockwaves tear across the arena.' },
  },
  lumen: {
    key: 'lumen', name: 'Lumen', role: 'Sniper', sigil: '✴',
    color: 0xffe7a3, glow: 0xfff6dd, css: '#ffe9a8',
    tagline: 'Truth, at speed.',
    blurb: 'A splinter of daylight. Lumen lances through ranks of enemies and finds every weakness.',
    passive: 'Pierce — lances pass through three targets. +15% critical chance.',
    bars: { power: 7, tempo: 5, control: 8 },
    stats: { damage: 15, interval: 0.5, projSpeed: 24, moveSpeed: 9.6, projectiles: 1, pierce: 3, crit: 0.15, homing: 0, aoe: 0, chain: 0, knockback: 0.5 },
    surge: { name: 'Daybreak', type: 'lance', cd: 8, damage: 60, desc: 'Fire a searing ray of dawn through the horde.' },
    ult: { name: 'Radiant Dawn', type: 'beam', desc: 'A rotating pillar of light scorches the arena.' },
  },
  umbra: {
    key: 'umbra', name: 'Umbra', role: 'Reaper', sigil: '◈',
    color: 0xa06cff, glow: 0xd9b7ff, css: '#b184ff',
    tagline: 'The dark gives back.',
    blurb: 'A shard of the long night. Umbra hunts on its own and drinks the life from what it touches.',
    passive: 'Hunger — shots seek the nearest enemy and steal 5% damage as health.',
    bars: { power: 6, tempo: 6, control: 9 },
    stats: { damage: 11, interval: 0.44, projSpeed: 12, moveSpeed: 9.6, projectiles: 1, pierce: 0, crit: 0.07, homing: 6, aoe: 0, chain: 0, knockback: 1.5 },
    lifesteal: 0.05,
    surge: { name: 'Nightfall', type: 'vortex', cd: 10, radius: 6.5, damage: 34, desc: 'Tear a hungry rift that drags enemies inward.' },
    ult: { name: 'Oblivion', type: 'oblivion', desc: 'Open the abyss and consume everything near you.' },
  },
};

export const FUSIONS = {
  magma: {
    key: 'magma', name: 'Magma', role: 'Juggernaut', sigil: '⨂', pair: ['ember', 'stone'],
    color: 0xff3d12, glow: 0xffa63a, css: '#ff5a26',
    tagline: 'The mountain bleeds fire.',
    blurb: 'Ember and Stone become a walking volcano. Every shot is a detonation.',
    passive: 'Eruption — shots explode and ignite. +10% max health.',
    bars: { power: 10, tempo: 4, control: 5 },
    stats: { damage: 23, interval: 0.6, projSpeed: 13, moveSpeed: 8.8, projectiles: 1, pierce: 1, crit: 0.05, homing: 0, aoe: 2.6, chain: 0, knockback: 5 },
    ignite: { dps: 6, duration: 3 },
    bonus: { maxHpPct: 0.1 },
    surge: { name: 'Volcanic Rift', type: 'nova', cd: 9, radius: 6.5, damage: 60, ignite: true, desc: 'Split the ground, erupting in fire and magma.' },
    ult: { name: 'Eruption', type: 'meteors', desc: 'The volcano answers: twelve meteors and a sea of flame.' },
  },
  storm: {
    key: 'storm', name: 'Storm', role: 'Blitz', sigil: '⚡', pair: ['ember', 'gale'],
    color: 0x59e8ff, glow: 0xd8fbff, css: '#67ecff',
    tagline: 'Speed is violence.',
    blurb: 'Ember and Gale braid into living lightning. Attacks leap from foe to foe.',
    passive: 'Overload — shots chain twice and travel faster. +15% attack speed.',
    bars: { power: 6, tempo: 10, control: 6 },
    stats: { damage: 10, interval: 0.2, projSpeed: 21, moveSpeed: 10.4, projectiles: 1, pierce: 0, crit: 0.1, homing: 0, aoe: 0, chain: 2, knockback: 1 },
    surge: { name: 'Chain Nova', type: 'nova', cd: 7, radius: 6, damage: 40, chainFx: true, desc: 'Snap a cage of lightning around you.' },
    ult: { name: 'Skyfall', type: 'tempest', desc: 'Summon a lightning storm that hunts the horde.' },
  },
  frost: {
    key: 'frost', name: 'Frost', role: 'Controller', sigil: '❄', pair: ['tide', 'gale'],
    color: 0x9fe8ff, glow: 0xe8fbff, css: '#b3efff',
    tagline: 'Stillness, weaponised.',
    blurb: 'Tide and Gale harden into glacial precision. Everything you touch slows to a crawl.',
    passive: 'Rime — shots slow enemies by 45% for 2.5s and pierce one target.',
    bars: { power: 6, tempo: 7, control: 10 },
    stats: { damage: 11, interval: 0.3, projSpeed: 17, moveSpeed: 9.8, projectiles: 1, pierce: 1, crit: 0.06, homing: 0, aoe: 1.2, chain: 0, knockback: 2 },
    slow: { amount: 0.45, duration: 2.5 },
    surge: { name: 'Glacier', type: 'nova', cd: 9, radius: 6.2, damage: 36, slow: { amount: 0.6, duration: 3 }, desc: 'Flash-freeze the ground in a wide ring.' },
    ult: { name: 'Absolute Zero', type: 'tempest', desc: 'A blizzard locks the arena in ice and shatters it.' },
  },
  void: {
    key: 'void', name: 'Void', role: 'Devourer', sigil: '◉', pair: ['lumen', 'umbra'],
    color: 0x8a5cff, glow: 0xff9bf0, css: '#a878ff',
    tagline: 'Light and dark, starving.',
    blurb: 'Lumen and Umbra collapse into a singularity. Shots hunt, pierce, and feed you.',
    passive: 'Singularity — homing shots pierce two targets and steal 7% as health.',
    bars: { power: 8, tempo: 7, control: 10 },
    stats: { damage: 17, interval: 0.5, projSpeed: 13, moveSpeed: 9.6, projectiles: 1, pierce: 2, crit: 0.12, homing: 6, aoe: 1.1, chain: 0, knockback: 2 },
    lifesteal: 0.07,
    surge: { name: 'Collapse', type: 'vortex', cd: 9, radius: 7, damage: 50, desc: 'Collapse space into a hungry point of nothing.' },
    ult: { name: 'Oblivion', type: 'oblivion', desc: 'Unmake the arena around you. Low-health foes are erased.' },
  },
  verdant: {
    key: 'verdant', name: 'Verdant', role: 'Warden', sigil: '❦', pair: ['tide', 'stone'],
    color: 0x63e08a, glow: 0xd6ffb8, css: '#73e698',
    tagline: 'Life takes root.',
    blurb: 'Tide and Stone bloom into living armour. You strike, you root, you recover.',
    passive: 'Bloom — shots burst in thorns and restore 0.8 HP. Regenerate 2 HP/s.',
    bars: { power: 7, tempo: 6, control: 8 },
    stats: { damage: 15, interval: 0.5, projSpeed: 14, moveSpeed: 9.2, projectiles: 1, pierce: 1, crit: 0.05, homing: 0, aoe: 1.8, chain: 0, knockback: 4 },
    healOnHit: 0.8,
    regen: 2,
    bonus: { maxHpPct: 0.05 },
    surge: { name: 'Bramble Ring', type: 'guard', cd: 10, radius: 6, damage: 36, shield: 40, heal: 20, desc: 'Thorns erupt, shielding and restoring you.' },
    ult: { name: 'World Tree', type: 'deluge', desc: 'A great tree blooms, flooding the arena with life.' },
  },
};

export function comboKey(a, b) { return [a, b].sort().join('+'); }

const FUSION_BY_PAIR = {};
for (const f of Object.values(FUSIONS)) {
  FUSION_BY_PAIR[comboKey(f.pair[0], f.pair[1])] = f;
}

export function fusionFor(a, b) { return FUSION_BY_PAIR[comboKey(a, b)] || null; }

export function resolveForm(sigils) {
  if (sigils.length > 1) {
    const fusion = fusionFor(sigils[0], sigils[1]);
    if (fusion) return { ...fusion, isFusion: true, sigils: [...sigils] };
  }
  const base = ELEMENTS[sigils[0]];
  return { ...base, isFusion: false, sigils: [base.key] };
}

/* ------------------------------------------------------------
   ELEMENT MATCHUPS — each element beats the two that follow it in
   the wheel and is weak to the two that precede it. The sixth is
   neutral. Fusions strike with both halves; the founding sigil
   still decides what the guardian is weak to.
   ------------------------------------------------------------ */
export const ELEMENT_WHEEL = ['tide', 'ember', 'gale', 'stone', 'lumen', 'umbra'];
export const ELEMENT_MATCH = { strong: 1.5, weak: 0.72, resonance: 1.15 };

export function elementRelation(attacker, defender) {
  const i = ELEMENT_WHEEL.indexOf(attacker);
  const j = ELEMENT_WHEEL.indexOf(defender);
  if (i < 0 || j < 0 || i === j) return 0;
  const d = (j - i + 6) % 6;
  if (d === 1 || d === 2) return 1;
  if (d === 4 || d === 5) return -1;
  return 0;
}

export function elementMult(attacker, defender) {
  const rel = elementRelation(attacker, defender);
  return rel === 1 ? ELEMENT_MATCH.strong : rel === -1 ? ELEMENT_MATCH.weak : 1;
}

export function bestElementMult(attackers, defender) {
  if (!attackers || !attackers.length) return 1;
  let best = 0;
  for (const a of attackers) best = Math.max(best, elementMult(a, defender));
  return best;
}

/* What this element is strong against. */
export function strongAgainst(element) {
  const i = ELEMENT_WHEEL.indexOf(element);
  if (i < 0) return [];
  return [ELEMENT_WHEEL[(i + 1) % 6], ELEMENT_WHEEL[(i + 2) % 6]];
}

/* What this element is weak to. */
export function weakTo(element) {
  const i = ELEMENT_WHEEL.indexOf(element);
  if (i < 0) return [];
  return [ELEMENT_WHEEL[(i + 5) % 6], ELEMENT_WHEEL[(i + 4) % 6]];
}

/* The horde an attuned arena sends against you. */
export function countersOf(element) { return weakTo(element); }

/* ------------------------------------------------------------
   ARMAMENTS — every element carries three weapons. The shape of
   the shot changes; the element decides what it is good against.
   ------------------------------------------------------------ */
export const WEAPONS = {
  ember: [
    { key: 'cinder_lance', name: 'Cinder Lance', icon: '✦', css: '#ff7a35', tagline: 'Balanced flame', desc: 'A steady lance of fire that punches through one extra foe.', mods: { pierce: 1, damage: 1.06 } },
    { key: 'ashen_fan', name: 'Ashen Fan', icon: '⋔', css: '#ff9a5a', tagline: 'Spread the fire', desc: 'Two tongues of flame per volley, each a little weaker and faster.', mods: { projectiles: 1, damage: 0.78, interval: 0.92 } },
    { key: 'pyre_maul', name: 'Pyre Maul', icon: '✹', css: '#ff5a26', tagline: 'One heavy blow', desc: 'Slow, crushing shots that detonate on impact.', mods: { damage: 1.45, interval: 1.28, aoe: 1.3, knockback: 2 } },
  ],
  tide: [
    { key: 'undertow', name: 'Undertow', icon: '≈', css: '#4fb9ff', tagline: 'Draw them under', desc: 'A piercing current that mends a little more with every hit.', mods: { pierce: 1, healOnHit: 0.5 } },
    { key: 'riptide', name: 'Riptide', icon: '≋', css: '#6fd0ff', tagline: 'Faster than the wound', desc: 'Quick, shallow cuts of water that keep the pressure on.', mods: { interval: 0.8, damage: 0.9 } },
    { key: 'deep_well', name: 'Deep Well', icon: '◍', css: '#2f8fe0', tagline: 'A wide tide', desc: 'Three slow bolts spread across a wide arc.', mods: { projectiles: 2, damage: 0.72, interval: 1.15 } },
  ],
  gale: [
    { key: 'galewhip', name: 'Galewhip', icon: '❋', css: '#7df5c6', tagline: 'Let it arc', desc: 'Faster bolts that leap to one more target.', mods: { chain: 1, speed: 1.15 } },
    { key: 'squall', name: 'Squall', icon: '⁂', css: '#9dffd8', tagline: 'Scatter shot', desc: 'Two quick needles of wind, each lighter than the last.', mods: { projectiles: 2, damage: 0.74, interval: 0.95 } },
    { key: 'tempest_edge', name: 'Tempest Edge', icon: '⚡', css: '#59e8ff', tagline: 'One clean cut', desc: 'Slower, heavier wind that cuts straight through a rank.', mods: { damage: 1.35, interval: 1.18, pierce: 1 } },
  ],
  stone: [
    { key: 'granite_fist', name: 'Granite Fist', icon: '⬢', css: '#d49a55', tagline: 'Solid impact', desc: 'Boulders that hit harder and burst wider.', mods: { damage: 1.2, aoe: 0.6 } },
    { key: 'landslide', name: 'Landslide', icon: '⛰', css: '#c08a4a', tagline: 'Wide ruin', desc: 'Huge, slow boulders that throw the horde back.', mods: { aoe: 2.2, damage: 0.85, knockback: 3 } },
    { key: 'bulwark', name: 'Bulwark', icon: '▣', css: '#a8793f', tagline: 'Hold the line', desc: 'Heavy slabs that shove everything away from you.', mods: { knockback: 4, aoe: 1, damage: 0.95 } },
  ],
  lumen: [
    { key: 'dawnlance', name: 'Dawnlance', icon: '✴', css: '#ffe9a8', tagline: 'Through the ranks', desc: 'A needle of dawn that pierces deep and finds weak points.', mods: { pierce: 2, crit: 0.08 } },
    { key: 'prism', name: 'Prism Array', icon: '✧', css: '#fff3c4', tagline: 'Split the light', desc: 'Three thin rays instead of one bright lance.', mods: { projectiles: 2, damage: 0.75, pierce: 1 } },
    { key: 'sunspear', name: 'Sunspear', icon: '☀', css: '#ffd166', tagline: 'One decisive throw', desc: 'A single, enormous spear of light at long range.', mods: { damage: 1.4, interval: 1.25, speed: 1.2 } },
  ],
  umbra: [
    { key: 'nightfang', name: 'Nightfang', icon: '◈', css: '#b184ff', tagline: 'Bite deeper', desc: 'Hunting shots that pierce one more and drink more life.', mods: { pierce: 1, lifesteal: 0.03 } },
    { key: 'wraith', name: 'Wraith Volley', icon: '☾', css: '#c9a6ff', tagline: 'Let them hunt', desc: 'Two seeking shades that find their own targets.', mods: { projectiles: 1, homing: 2, damage: 0.88 } },
    { key: 'voidmaw', name: 'Voidmaw', icon: '◉', css: '#8a5cff', tagline: 'Feed the dark', desc: 'Heavy, hungry shots that seek and steal life.', mods: { damage: 1.3, homing: 3, lifesteal: 0.05, interval: 1.12 } },
  ],
};

export function weaponFor(element, key) {
  const list = WEAPONS[element] || WEAPONS.ember;
  return list.find(w => w.key === key) || list[0];
}

export function applyWeapon(form, weapon) {
  if (!weapon) return form;
  const m = weapon.mods || {};
  const stats = { ...form.stats };
  stats.damage *= m.damage ?? 1;
  stats.interval *= m.interval ?? 1;
  stats.projSpeed *= m.speed ?? 1;
  stats.projectiles += m.projectiles || 0;
  stats.pierce += m.pierce || 0;
  stats.aoe += m.aoe || 0;
  stats.crit += m.crit || 0;
  stats.chain += m.chain || 0;
  stats.homing += m.homing || 0;
  stats.knockback += m.knockback || 0;
  return {
    ...form,
    stats,
    weapon,
    healOnHit: (form.healOnHit || 0) + (m.healOnHit || 0),
    lifesteal: (form.lifesteal || 0) + (m.lifesteal || 0),
  };
}

export const ENEMIES = {
  crawler: {
    key: 'crawler', name: 'Cinder Crawler', hp: 26, speed: 4.5, damage: 8, radius: 0.78,
    xp: 2, color: 0xff5636, glow: 0xffb05a, css: '#ff7a52', shape: 'crawler', element: 'ember',
    desc: 'A scuttling cinder with a taste for sigils. Fast enough to punish standing still.',
  },
  wisp: {
    key: 'wisp', name: 'Shade Wisp', hp: 16, speed: 6.2, damage: 5, radius: 0.62,
    xp: 2, color: 0x9c7bff, glow: 0xe0ccff, css: '#b79bff', shape: 'wisp', flying: true, element: 'umbra',
    desc: 'A fragment of the long night. Fragile, quick, and relentlessly direct.',
  },
  brute: {
    key: 'brute', name: 'Obsidian Brute', hp: 95, speed: 2.7, damage: 16, radius: 1.15,
    xp: 5, color: 0x7c6a63, glow: 0xff9a4d, css: '#b08f7a', shape: 'brute', element: 'stone',
    desc: 'A walking wall of black stone. Slow, patient, and very hard to stagger.',
  },
  spitter: {
    key: 'spitter', name: 'Solar Spitter', hp: 42, speed: 3.3, damage: 7, radius: 0.82,
    xp: 3, color: 0xffc14d, glow: 0xfff0b0, css: '#ffd166', shape: 'spitter', ranged: true, element: 'lumen',
    desc: 'Keeps its distance and spits gouts of scalding light. Close the gap or eat it.',
  },
  mini_warden: {
    key: 'mini_warden', name: 'Cinder Herald', hp: 205, speed: 3.1, damage: 18, radius: 1.05,
    xp: 12, color: 0xff6a3a, glow: 0xffd08a, css: '#ff9a5a', shape: 'brute', element: 'ember', miniBoss: true,
    desc: 'A herald of the ember court. Hits like a brute, and carries a brute’s health.',
  },
  mini_shade: {
    key: 'mini_shade', name: 'Glass Revenant', hp: 165, speed: 4.3, damage: 14, radius: 0.95,
    xp: 11, color: 0x6f8cff, glow: 0xcbd6ff, css: '#93a8ff', shape: 'spitter', element: 'umbra', miniBoss: true,
    desc: 'A revenant of the long night. Keeps its distance and spits glass.',
  },
  mini_tide: {
    key: 'mini_tide', name: 'Brine Custodian', hp: 235, speed: 3.0, damage: 15, radius: 1.12,
    xp: 13, color: 0x2f8fe0, glow: 0x9fe8ff, css: '#4fb9ff', shape: 'brute', element: 'tide', miniBoss: true,
    desc: 'A keeper of the deep, armoured in salt. Slow, patient, and very hard to shift.',
  },
  mini_gale: {
    key: 'mini_gale', name: 'Squall Matron', hp: 175, speed: 5.2, damage: 12, radius: 0.9,
    xp: 12, color: 0x59e8ff, glow: 0xd8fbff, css: '#67ecff', shape: 'wisp', flying: true, element: 'gale', miniBoss: true,
    desc: 'A storm given a body. Circles the arena, daring you to lead your shots.',
  },
  mini_lumen: {
    key: 'mini_lumen', name: 'Dawn Inquisitor', hp: 195, speed: 3.4, damage: 16, radius: 0.9,
    xp: 13, color: 0xffd166, glow: 0xfff0b0, css: '#ffe9a8', shape: 'spitter', ranged: true, element: 'lumen', miniBoss: true,
    desc: 'It judges from a distance and sentences in gouts of daylight.',
  },
  mini_stone: {
    key: 'mini_stone', name: 'Granite Sentinel', hp: 270, speed: 2.4, damage: 21, radius: 1.2,
    xp: 14, color: 0x8a6a45, glow: 0xffd39a, css: '#d49a55', shape: 'brute', element: 'stone', miniBoss: true,
    desc: 'A standing stone that learned to walk. Every plate is a door that does not open.',
  },
  boss: {
    key: 'boss', name: 'Rift Warden', hp: 560, speed: 3.0, damage: 22, radius: 1.9,
    xp: 30, color: 0xb44dff, glow: 0xff8af0, css: '#c879ff', shape: 'boss', boss: true, element: 'umbra',
    desc: 'A warden of the rift. Charges, volleys and calls the dark to its side.',
  },
};

/* Every mini-boss the horde can crown, in rotation. */
export const MINI_BOSS_KEYS = ['mini_warden', 'mini_shade', 'mini_tide', 'mini_gale', 'mini_lumen', 'mini_stone'];

export const BOSSES = [
  { name: 'Rift Warden', color: 0xb44dff, glow: 0xff8af0, css: '#c879ff', title: 'The First Wound', element: 'umbra' },
  { name: 'Ashen Colossus', color: 0xff5a2a, glow: 0xffc06a, css: '#ff8a4a', title: 'The Grief of Mountains', element: 'ember' },
  { name: 'Void Herald', color: 0x6c7bff, glow: 0xc9d2ff, css: '#8f9bff', title: 'The Quiet Between Stars', element: 'umbra' },
  { name: 'Helios Unbound', color: 0xffd166, glow: 0xfff3c4, css: '#ffdc85', title: 'The Sun That Remembers', element: 'lumen' },
  { name: 'Cinder Tyrant', color: 0xff7a2a, glow: 0xffd08a, css: '#ffb066', title: 'The Last Ember King', element: 'ember' },
  { name: 'Stormglass Seraph', color: 0x7de8ff, glow: 0xd8fbff, css: '#a9e9ff', title: 'The Sky That Broke', element: 'gale' },
];

/* ------------------------------------------------------------
   BOONS — drafted on level up. Stack limits keep builds sharp.
   ------------------------------------------------------------ */
export const RARITY = {
  common: { name: 'Common', css: '#a9b6d6', weight: 100 },
  rare: { name: 'Rare', css: '#69d2ff', weight: 52 },
  epic: { name: 'Epic', css: '#ffc76b', weight: 24 },
  legendary: { name: 'Legendary', css: '#ff8ae0', weight: 8 },
};

export const BOONS = [
  { id: 'solar_flare', name: 'Solar Flare', rarity: 'common', icon: '✦', max: 8, weight: 100, desc: '+22% damage.', apply: p => { p.stats.damageMult *= 1.22; } },
  { id: 'quickdraw', name: 'Quickdraw', rarity: 'common', icon: '»', max: 8, weight: 100, desc: '+16% attack speed.', apply: p => { p.stats.intervalMult *= 0.86; } },
  { id: 'twin_orbs', name: 'Twin Orbs', rarity: 'rare', icon: '⧉', max: 3, weight: 46, desc: '+1 projectile per volley.', apply: p => { p.stats.extraProjectiles += 1; } },
  { id: 'shrapnel', name: 'Shrapnel', rarity: 'rare', icon: '⋔', max: 4, weight: 50, desc: 'Shots pierce +1 enemy.', apply: p => { p.stats.extraPierce += 1; } },
  { id: 'critical_mass', name: 'Critical Mass', rarity: 'rare', icon: '✹', max: 6, weight: 48, desc: '+8% crit chance, +30% crit damage.', apply: p => { p.stats.crit += 0.08; p.stats.critMult += 0.3; } },
  { id: 'feather_boots', name: 'Feather Boots', rarity: 'common', icon: '≫', max: 5, weight: 80, desc: '+10% move speed.', apply: p => { p.stats.moveMult *= 1.1; } },
  { id: 'aegis', name: 'Aegis', rarity: 'rare', icon: '◈', max: 5, weight: 44, desc: '+30 shield. Shield regenerates out of combat.', apply: p => { p.stats.maxShield += 30; p.shield = p.stats.maxShield; } },
  { id: 'vitality', name: 'Vitality', rarity: 'common', icon: '❤', max: 6, weight: 74, desc: '+25 max health and heal 25.', apply: p => { p.stats.maxHp += 25; p.stats.hp = Math.min(p.stats.maxHp, p.stats.hp + 25); } },
  { id: 'magnetism', name: 'Magnetism', rarity: 'common', icon: '◎', max: 4, weight: 70, desc: '+45% essence pickup radius.', apply: p => { p.stats.magnet *= 1.45; } },
  { id: 'overcharge', name: 'Overcharge', rarity: 'rare', icon: '⌁', max: 4, weight: 42, desc: '-18% surge cooldown. +10% ultimate charge.', apply: p => { p.stats.cdr *= 0.82; p.stats.ultGain *= 1.1; } },
  { id: 'executioner', name: 'Executioner', rarity: 'epic', icon: '⚔', max: 3, weight: 22, desc: '+35% damage to enemies below 35% health.', apply: p => { p.stats.execute += 0.35; } },
  { id: 'vampiric_sigil', name: 'Vampiric Sigil', rarity: 'epic', icon: '☾', max: 4, weight: 22, desc: 'Steal 4% of damage dealt as health.', apply: p => { p.stats.lifesteal += 0.04; } },
  { id: 'thorns', name: 'Thornmail', rarity: 'rare', icon: '✧', max: 3, weight: 34, desc: 'Reflect 40% of contact damage.', apply: p => { p.stats.thorns += 0.4; } },
  { id: 'sentinel', name: 'Orbital Sentinel', rarity: 'epic', icon: '◍', max: 3, weight: 26, desc: 'Summon an orbiting mote that strikes nearby foes.', apply: p => { p.addSentinel(); } },
  { id: 'burst_dash', name: 'Burst Dash', rarity: 'rare', icon: '⇢', max: 2, weight: 30, desc: 'Dashing detonates a damaging pulse.', apply: p => { p.stats.dashBurst += 26; } },
  { id: 'solar_wind', name: 'Solar Wind', rarity: 'epic', icon: '❂', max: 3, weight: 24, desc: 'Nearby enemies are slowed by 20%.', apply: p => { p.stats.auraSlow = Math.min(0.5, p.stats.auraSlow + 0.2); } },
  { id: 'focused_lens', name: 'Focused Lens', rarity: 'epic', icon: '◉', max: 3, weight: 24, desc: '+25% damage but attacks 8% slower.', apply: p => { p.stats.damageMult *= 1.25; p.stats.intervalMult *= 1.08; } },
  { id: 'essence_bloom', name: 'Essence Bloom', rarity: 'common', icon: '✺', max: 4, weight: 66, desc: '+25% essence gained.', apply: p => { p.stats.essenceGain *= 1.25; } },
  { id: 'long_shot', name: 'Long Shot', rarity: 'common', icon: '➹', max: 3, weight: 54, desc: '+15% weapon range.', apply: p => { p.stats.range += 0.15; } },
  { id: 'far_sight', name: 'Far Sight', rarity: 'rare', icon: '◎', max: 2, weight: 28, desc: '+25% weapon range.', apply: p => { p.stats.range += 0.25; } },
  { id: 'warmth', name: 'Warmth', rarity: 'common', icon: '☀', max: 6, weight: 70, desc: 'Heal 40 health and gain 8 max health.', apply: p => { p.stats.maxHp += 8; p.stats.hp = Math.min(p.stats.maxHp, p.stats.hp + 40); } },
  { id: 'wide_angle', name: 'Wide Angle', rarity: 'rare', icon: '∠', max: 3, weight: 34, desc: 'Shots gain +45% explosion radius.', apply: p => { p.stats.aoeBonus += 0.45; } },
  { id: 'glass_edge', name: 'Glass Edge', rarity: 'legendary', icon: '🗡', max: 1, weight: 8, desc: '+60% damage. You take 15% more damage.', apply: p => { p.stats.damageMult *= 1.6; p.stats.damageTaken *= 1.15; } },
  { id: 'second_wind', name: 'Second Wind', rarity: 'legendary', icon: '⟲', max: 1, weight: 8, desc: 'Once per run, survive a killing blow and heal 50%.', apply: p => { p.stats.revive += 1; } },
  { id: 'eventide', name: 'Eventide', rarity: 'legendary', icon: '✵', max: 1, weight: 7, desc: 'Ultimate charges 40% faster and hits 30% harder.', apply: p => { p.stats.ultGain *= 1.4; p.stats.ultPower *= 1.3; } },
];

export function boonById(id) { return BOONS.find(b => b.id === id) || null; }

/* ------------------------------------------------------------
   SOLAR RELICS — permanent-for-the-run jewelry and crowns.
   Signets and talismans stack ranks; one crown remakes a sigil.
   ------------------------------------------------------------ */
export const RELIC_SLOTS = {
  signet: { key: 'signet', name: 'Signet', icon: '◯', blurb: 'A band of solar memory. Two minor slots.' },
  talisman: { key: 'talisman', name: 'Talisman', icon: '◇', blurb: 'A charm of stored power. Two minor slots.' },
  crown: { key: 'crown', name: 'Crown', icon: '♛', blurb: 'One crown. It remakes the way your sigil fights.' },
};

export const RELIC_MAX_RANK = 5;

export const RELICS = [
  /* Signets — the steadier half of the hoard. */
  { id: 'ember_signet', slot: 'signet', name: 'Ember Signet', icon: '✦', rarity: 'common', maxRank: 5, desc: '+12% damage per rank.', mods: { damage: 0.12 } },
  { id: 'quick_signet', slot: 'signet', name: 'Quickening Signet', icon: '»', rarity: 'rare', maxRank: 5, desc: '+9% attack speed per rank.', mods: { interval: 0.09 } },
  { id: 'wander_signet', slot: 'signet', name: 'Wanderer Signet', icon: '≫', rarity: 'common', maxRank: 5, desc: '+7% move speed per rank.', mods: { move: 0.07 } },
  { id: 'vital_signet', slot: 'signet', name: 'Vital Signet', icon: '❤', rarity: 'rare', maxRank: 5, desc: '+10% max health per rank.', mods: { maxHp: 0.10 } },
  { id: 'hunter_signet', slot: 'signet', name: 'Hunter Signet', icon: '✹', rarity: 'rare', maxRank: 5, desc: '+6% critical chance per rank.', mods: { crit: 0.06 } },
  { id: 'leech_signet', slot: 'signet', name: 'Leech Signet', icon: '☾', rarity: 'epic', maxRank: 5, desc: '+2% lifesteal per rank.', mods: { lifesteal: 0.02 } },
  { id: 'essence_signet', slot: 'signet', name: 'Gleaming Signet', icon: '✺', rarity: 'common', maxRank: 5, desc: '+12% essence gained per rank.', mods: { essence: 0.12 } },
  { id: 'magnet_signet', slot: 'signet', name: 'Gravity Signet', icon: '◎', rarity: 'common', maxRank: 5, desc: '+25% pickup radius per rank.', mods: { magnet: 0.25 } },
  { id: 'execution_signet', slot: 'signet', name: 'Executioner Signet', icon: '⚔', rarity: 'epic', maxRank: 5, desc: '+10% execute damage per rank.', mods: { execute: 0.10 } },
  { id: 'aegis_signet', slot: 'signet', name: 'Aegis Signet', icon: '◈', rarity: 'rare', maxRank: 5, desc: '+8% max shield per rank.', mods: { maxShield: 0.08 } },
  { id: 'thorn_signet', slot: 'signet', name: 'Thorn Signet', icon: '✧', rarity: 'rare', maxRank: 5, desc: '+12% contact damage reflected per rank.', mods: { thorns: 0.12 } },
  { id: 'regen_signet', slot: 'signet', name: 'Verdant Signet', icon: '❦', rarity: 'rare', maxRank: 5, desc: '+1.2 health per second per rank.', mods: { regen: 1.2 } },

  /* Talismans — sharper, stranger, more expensive. */
  { id: 'solar_talisman', slot: 'talisman', name: 'Solar Talisman', icon: '☀', rarity: 'epic', maxRank: 5, desc: '+8% damage and +4% crit per rank.', mods: { damage: 0.08, crit: 0.04 } },
  { id: 'storm_talisman', slot: 'talisman', name: 'Storm Talisman', icon: '⚡', rarity: 'epic', maxRank: 5, desc: '+10% attack speed and +4% move per rank.', mods: { interval: 0.10, move: 0.04 } },
  { id: 'ward_talisman', slot: 'talisman', name: 'Ward Talisman', icon: '◍', rarity: 'epic', maxRank: 5, desc: '+8% damage reduction per rank.', mods: { damageReduction: 0.08 } },
  { id: 'wide_talisman', slot: 'talisman', name: 'Wide Talisman', icon: '∠', rarity: 'epic', maxRank: 5, desc: '+18% blast radius per rank.', mods: { aoe: 0.18 } },
  { id: 'dash_talisman', slot: 'talisman', name: 'Dash Talisman', icon: '⇢', rarity: 'rare', maxRank: 5, desc: '+18 dash burst damage per rank.', mods: { dashBurst: 18 } },
  { id: 'homing_talisman', slot: 'talisman', name: 'Homing Talisman', icon: '◉', rarity: 'epic', maxRank: 5, desc: '+3 projectile homing per rank.', mods: { homing: 3 } },
  { id: 'pierce_talisman', slot: 'talisman', name: 'Piercing Talisman', icon: '⋔', rarity: 'rare', maxRank: 5, desc: '+1 projectile pierce per rank.', mods: { pierce: 1 } },
  { id: 'chain_talisman', slot: 'talisman', name: 'Chain Talisman', icon: '❋', rarity: 'epic', maxRank: 5, desc: '+1 chain per rank.', mods: { chain: 1 } },
  { id: 'projectile_talisman', slot: 'talisman', name: 'Twin Soul Talisman', icon: '⧉', rarity: 'legendary', maxRank: 2, desc: '+1 projectile per rank.', mods: { projectiles: 1 } },
  { id: 'greed_talisman', slot: 'talisman', name: 'Greed Talisman', icon: '◈', rarity: 'rare', maxRank: 5, desc: '+10% essence and +15% pickup radius per rank.', mods: { essence: 0.10, magnet: 0.15 } },
  { id: 'giant_talisman', slot: 'talisman', name: 'Giant Talisman', icon: '⬢', rarity: 'epic', maxRank: 5, desc: '+8% max health and +6% damage per rank.', mods: { maxHp: 0.08, damage: 0.06 } },

  /* Crowns — one at a time, and they change a sigil's identity. */
  { id: 'crown_ember', slot: 'crown', element: 'ember', name: 'Crown of Cinders', icon: '✹', rarity: 'legendary', maxRank: 3, desc: 'Your shots burst and ignite. +1.2 blast radius and a growing burn per rank.', mods: { damage: 0.08 }, effect: { aoe: 1.2, ignite: { dps: 4, duration: 2.5 } } },
  { id: 'crown_tide', slot: 'crown', element: 'tide', name: 'Crown of Tides', icon: '≈', rarity: 'legendary', maxRank: 3, desc: 'Your shots pierce +2 and steal 2% more life per rank.', mods: { maxHp: 0.08 }, effect: { pierce: 2, lifesteal: 0.02 } },
  { id: 'crown_gale', slot: 'crown', element: 'gale', name: 'Crown of Gales', icon: '❋', rarity: 'legendary', maxRank: 3, desc: 'Your shots chain twice more. +8% attack speed and +5% move per rank.', mods: { interval: 0.08, move: 0.05 }, effect: { chain: 2 } },
  { id: 'crown_stone', slot: 'crown', element: 'stone', name: 'Crown of Mountains', icon: '⬢', rarity: 'legendary', maxRank: 3, desc: 'Your shots split, knock back, and detonate wider. +1 projectile and +1.8 blast radius per rank.', mods: { maxHp: 0.10 }, effect: { aoe: 1.8, knockback: 2, projectiles: 1 } },
  { id: 'crown_lumen', slot: 'crown', element: 'lumen', name: 'Crown of Dawn', icon: '✴', rarity: 'legendary', maxRank: 3, desc: 'Your shots pierce +2 and find weak points. +6% crit per rank.', mods: { critMult: 0.12, damage: 0.06 }, effect: { pierce: 2, crit: 0.06 } },
  { id: 'crown_umbra', slot: 'crown', element: 'umbra', name: 'Crown of Night', icon: '◈', rarity: 'legendary', maxRank: 3, desc: 'Your shots hunt, pierce one more target, and drink deeper. +4 homing and +2.5% lifesteal per rank.', mods: { crit: 0.04, lifesteal: 0.015 }, effect: { homing: 4, pierce: 1, lifesteal: 0.025 } },
];

export function relicById(id) { return RELICS.find(r => r.id === id) || null; }

/* ------------------------------------------------------------
   ECLIPSE PACTS — harder runs, richer dawn.
   ------------------------------------------------------------ */
export const PACTS = {
  density: { key: 'density', name: 'Horde Density', short: 'Density', icon: '☲', max: 5, desc: 'More enemies arrive, but each kill is worth less essence.' },
  vitality: { key: 'vitality', name: 'Black Vitality', short: 'Vitality', icon: '⬢', max: 5, desc: 'The horde and its wardens gain health.' },
  fury: { key: 'fury', name: 'Eclipse Fury', short: 'Fury', icon: '✹', max: 5, desc: 'Every enemy hit lands harder.' },
  haste: { key: 'haste', name: 'Night Haste', short: 'Haste', icon: '≫', max: 5, desc: 'The horde closes the distance faster.' },
};

export const PACT_REWARD_STEP = 0.07;
export const PACT_REWARD_CAP = 2.4;

export function normalizePacts(pacts = {}) {
  const out = {};
  for (const key of Object.keys(PACTS)) {
    out[key] = Math.max(0, Math.min(PACTS[key].max, Math.floor(Number(pacts?.[key]) || 0)));
  }
  return out;
}

export function pactRanks(pacts = {}) {
  const p = normalizePacts(pacts);
  return Object.keys(PACTS).reduce((sum, key) => sum + p[key], 0);
}

export function pactReward(pacts = {}) {
  return Math.min(PACT_REWARD_CAP, 1 + pactRanks(pacts) * PACT_REWARD_STEP);
}

/* ------------------------------------------------------------
   DAWN CODEX — account achievements and permanent rewards.
   ------------------------------------------------------------ */
export const ACHIEVEMENTS = [
  { id: 'first_blood', name: 'First Blood', desc: 'Slay 50 enemies in one run.', points: 1, check: r => r.kills >= 50 },
  { id: 'tenfold', name: 'Tenfold', desc: 'Reach wave 10.', points: 2, check: r => r.wave >= 10 },
  { id: 'first_light', name: 'First Light', desc: 'Win a run.', points: 5, check: r => r.victory },
  { id: 'warden_slayer', name: 'Warden Slayer', desc: 'Fell four wardens in one run.', points: 3, check: r => r.bosses >= 4 },
  { id: 'horde_breaker', name: 'Horde Breaker', desc: 'Slay 400 enemies in one run.', points: 3, check: r => r.kills >= 400 },
  { id: 'essence_drinker', name: 'Essence Drinker', desc: 'Collect 500 essence in one run.', points: 2, check: r => r.essence >= 500 },
  { id: 'relic_hunter', name: 'Relic Hunter', desc: 'Take five relic offers in one run.', points: 3, check: r => r.relicPicks >= 5 },
  { id: 'full_regalia', name: 'Full Regalia', desc: 'Wear a signet, a talisman and a crown at once.', points: 4, check: r => !!(r.relicSlots.signet && r.relicSlots.talisman && r.relicSlots.crown) },
  { id: 'crown_ascendant', name: 'Crown Ascendant', desc: 'Claim a crown.', points: 3, check: r => !!r.relicSlots.crown },
  { id: 'vaultbreaker', name: 'Vaultbreaker', desc: 'Open a Sunless Vault.', points: 3, check: r => r.vaults >= 1 },
  { id: 'vault_hoarder', name: 'Vault Hoarder', desc: 'Open three Sunless Vaults in one run.', points: 4, check: r => r.vaults >= 3 },
  { id: 'pact_runner', name: 'Pact Runner', desc: 'Enter a run with four Eclipse Pact ranks.', points: 2, check: r => r.pactsTotal >= 4 },
  { id: 'eclipse_zealot', name: 'Eclipse Zealot', desc: 'Win with eight Eclipse Pact ranks active.', points: 5, check: r => r.victory && r.pactsTotal >= 8 },
  { id: 'untouched_core', name: 'Untouched Core', desc: 'Win a Siege with the Sunforge above 80% integrity.', points: 5, check: r => r.mode === 'siege' && r.victory && r.corePct >= 0.8 },
  { id: 'endless_wanderer', name: 'Endless Wanderer', desc: 'Reach wave 15 in Endless Trial.', points: 3, check: r => r.mode === 'trial' && r.wave >= 15 },
  { id: 'lane_breaker', name: 'Lane Breaker', desc: 'Shatter all three Rift Gates in Sunfall Lanes.', points: 5, check: r => r.mode === 'lane' && r.victory },
  { id: 'lane_bulwark', name: 'Lane Bulwark', desc: 'Win a Lane push with the Sunforge above 80% integrity.', points: 5, check: r => r.mode === 'lane' && r.victory && r.corePct >= 0.8 },
  { id: 'warden_hunter', name: 'Warden Hunter', desc: 'Fell all four wardens in Warden Hunt.', points: 4, check: r => r.mode === 'hunt' && r.victory },
  { id: 'three_styles', name: 'Three Styles', desc: 'Win a run in three different mission styles.', points: 6, check: (r, s) => Object.values(s.modeWins || {}).filter(v => v > 0).length >= 3 },
  { id: 'no_relics', name: 'Bare Light', desc: 'Win a run without taking a relic.', points: 4, check: r => r.victory && r.relicPicks === 0 },
  { id: 'sigil_variety', name: 'Sixfold Path', desc: 'Play three different sigils across your account.', points: 2, check: (r, s) => Object.keys(s.sigilRuns || {}).length >= 3 },
  { id: 'archivist', name: 'Solar Archivist', desc: 'Discover eight relics across your account.', points: 3, check: (r, s) => Object.values(s.codex?.relics || {}).filter(v => v?.seen).length >= 8 },
  { id: 'umbral_dawn', name: 'Umbral Dawn', desc: 'Win a run on Umbral difficulty or harder.', points: 4, check: r => r.victory && r.difficultyRank >= 2 },
  { id: 'hardcore_dawn', name: 'Hardcore Dawn', desc: 'Win a run in Hardcore.', points: 8, check: r => r.victory && r.difficulty === 'hardcore' },
  { id: 'hardcore_ten', name: 'Iron Nerve', desc: 'Reach wave 10 in Hardcore.', points: 5, check: r => r.difficulty === 'hardcore' && r.wave >= 10 },
  { id: 'all_difficulties', name: 'Fourfold Path', desc: 'Win a run on three different difficulties.', points: 6, check: (r, s) => Object.values(s.difficultyWins || {}).filter(v => v > 0).length >= 3 },
  { id: 'escort_home', name: 'Caravan Home', desc: 'Bring the Solar Caravan home.', points: 4, check: r => r.mode === 'escort' && r.victory },
  { id: 'ritual_sealed', name: 'Emberwright', desc: 'Complete an Ember Ritual.', points: 4, check: r => r.mode === 'ritual' && r.victory },
  { id: 'blitz_clear', name: 'Before Sunset', desc: 'Clear all twelve waves of Eclipse Blitz.', points: 5, check: r => r.mode === 'blitz' && r.victory },
  { id: 'duel_champion', name: 'Champion of the Ring', desc: 'Fell all four champions in Warden Duel.', points: 5, check: r => r.mode === 'duel' && r.victory },
  { id: 'bonus_hunter', name: 'Fortune Favours', desc: 'Clear five bonus waves in one run.', points: 3, check: r => (r.bonusWaves || 0) >= 5 },
  { id: 'five_styles', name: 'Fivefold Path', desc: 'Win a run in five different mission styles.', points: 8, check: (r, s) => Object.values(s.modeWins || {}).filter(v => v > 0).length >= 5 },
  { id: 'skill_win', name: 'Bare Hands', desc: 'Win a Skill Run.', points: 6, check: r => r.skillRun && r.victory },
  { id: 'skill_ten', name: 'Discipline', desc: 'Reach wave 10 in a Skill Run.', points: 4, check: r => r.skillRun && r.wave >= 10 },
];

export const REWARDS = [
  { id: 'sun_wisp', name: 'Sun Wisp', icon: '✺', cost: 8, desc: 'A companion follows every run and fetches essence up to 12 units beyond your pickup radius, one every 2 sec. Never shards, never caches.' },
  { id: 'boon_reroll', name: 'Boon Reroll', icon: '⟲', cost: 10, desc: 'Once per run, reroll a level-up draft.' },
  { id: 'relic_choice', name: 'Fourth Relic', icon: '◇', cost: 12, desc: 'Relic drafts offer four choices instead of three.' },
  { id: 'starting_shard', name: 'Forge Tithe', icon: '◈', cost: 6, desc: 'Begin each Siege with one additional Sun Shard.' },
  { id: 'hardened', name: 'Hardened Light', icon: '❤', cost: 8, desc: 'Begin every run with +12 max health.' },
  { id: 'charged_start', name: 'Dawn Charge', icon: '☀', cost: 8, desc: 'Begin every run with 20 ultimate charge.' },
];

/* ------------------------------------------------------------
   WAVE COMPOSITION
   ------------------------------------------------------------ */
const lerp = (a, b, t) => a + (b - a) * t;

function weightedPick(table) {
  const total = table.reduce((s, e) => s + e.w, 0);
  let r = Math.random() * total;
  for (const e of table) { r -= e.w; if (r <= 0) return e.key; }
  return table[table.length - 1].key;
}

export function buildWave(wave, pacts = {}, difficulty = null, bonus = null, theme = null) {
  const p = normalizePacts(pacts);
  const d = difficulty || DIFFICULTIES.solar;
  const b = bonus || {};
  const density = p.density;
  const isBoss = wave % 5 === 0;
  const hpMult = (1 + 0.21 * (wave - 1) + Math.max(0, wave - 10) * 0.06) * 1.14 * (1 + 0.12 * p.vitality) * (d.enemyHp || 1) * (b.hp || 1);
  const dmgMult = (1 + 0.10 * (wave - 1)) * (1 + 0.10 * p.fury) * (d.enemyDamage || 1);
  const speedMult = Math.min(2.1, (1 + 0.015 * (wave - 1)) * (1 + 0.05 * p.haste) * (d.enemySpeed || 1) * (b.speed || 1));
  const entries = [];

  if (isBoss) {
    // Deeper tiers meet the newer wardens: the rotation starts further along the list.
    const wardenIndex = (Math.floor(wave / 5) - 1 + (d.rank || 0)) % BOSSES.length;
    entries.push({ type: 'boss', delay: 1.4, bossIndex: wardenIndex });
    const adds = 3 + Math.floor(wave / 5) * 2 + density * 2;
    for (let i = 0; i < adds; i++) {
      entries.push({ type: i % 3 === 0 ? 'wisp' : 'crawler', delay: 4 + i * 0.55 });
    }
  } else {
    const total = Math.min(56, Math.round((6 + wave * 1.7) * (1 + density * 0.16) * (d.spawn || 1) * (b.spawn || 1)));
    const pool = [{ key: 'crawler', w: 100 }];
    if (wave >= 2) pool.push({ key: 'wisp', w: Math.min(60, 20 + wave * 4) });
    if (wave >= 3) pool.push({ key: 'spitter', w: Math.min(64, 16 + wave * 4) });
    if (wave >= 4) pool.push({ key: 'brute', w: Math.min(55, 8 + wave * 3.4) });
    // An attuned arena sends the elements that beat it.
    const counters = theme ? countersOf(theme) : [];
    const biased = counters.length ? pool.filter(e => counters.includes(ENEMIES[e.key]?.element)) : [];
    // Every third wave sends a mini-boss ahead of the horde — six kinds, in rotation.
    let miniIndex = 0;
    if (wave >= 3 && wave % 3 === 0) {
      miniIndex = (Math.floor(wave / 3) - 1 + (d.rank || 0)) % MINI_BOSS_KEYS.length;
      entries.push({ type: MINI_BOSS_KEYS[miniIndex], delay: 2.1 });
    }
    // From wave six, the fourth wave of each cycle crowns a second one.
    if (wave >= 6 && wave % 4 === 0) {
      entries.push({ type: MINI_BOSS_KEYS[(miniIndex + 3) % MINI_BOSS_KEYS.length], delay: 3.6 });
    }
    // A longer trickle instead of a wall: same fight, less of a stampede.
    const duration = Math.min(26, 5 + total * 0.7);
    for (let i = 0; i < total; i++) {
      entries.push({
        type: biased.length && Math.random() < 0.45 ? weightedPick(biased) : weightedPick(pool),
        delay: (i / total) * duration + Math.random() * 0.4,
        elite: wave >= 6 && Math.random() < Math.min(0.3, 0.03 + wave * 0.012 + density * 0.012 + (b.eliteBonus || 0)),
      });
    }
  }
  return {
    wave, isBoss, hpMult, dmgMult, speedMult, entries, pacts: p,
    bossIndex: Math.floor(wave / 5) - 1,
    xpScale: (1 / (1 + density * 0.07)) * (b.xp || 1),
    reward: pactReward(p), difficulty: d.key, bonus: b.id ? b : null,
  };
}

/* ------------------------------------------------------------
   LANE WAVES — MOBA-style creep waves down every open lane.
   ------------------------------------------------------------ */
export function buildLaneWave(wave, pacts = {}, openLanes = [0, 1, 2], difficulty = null, bonus = null, theme = null) {
  const p = normalizePacts(pacts);
  const d = difficulty || DIFFICULTIES.solar;
  const b = bonus || {};
  const isBoss = wave % 5 === 0;
  const hpMult = (1 + 0.24 * (wave - 1) + Math.max(0, wave - 10) * 0.07) * 1.05 * (1 + 0.12 * p.vitality) * (d.enemyHp || 1) * (b.hp || 1);
  const dmgMult = (1 + 0.09 * (wave - 1)) * (1 + 0.1 * p.fury) * (d.enemyDamage || 1);
  const speedMult = Math.min(1.9, (1 + 0.012 * (wave - 1)) * (1 + 0.05 * p.haste) * (d.enemySpeed || 1) * (b.speed || 1));
  const lanes = openLanes.length ? openLanes : [1];
  const perLane = Math.min(14, Math.round((3 + Math.floor(wave * 0.7) + p.density) * (d.spawn || 1) * (b.spawn || 1)));
  const duration = Math.min(20, 5 + perLane * 0.95);
  const entries = [];
  // Attuned arenas bias their lanes toward the countering elements.
  const counterTypes = (theme ? countersOf(theme) : []).filter(k => ENEMIES[k] && (k === 'crawler'
    || (k === 'wisp' && wave >= 2) || (k === 'spitter' && wave >= 3) || (k === 'brute' && wave >= 4)));

  for (const lane of lanes) {
    for (let i = 0; i < perLane; i++) {
      let type = 'crawler';
      const roll = Math.random();
      if (wave >= 2 && roll < Math.min(0.4, 0.08 + wave * 0.03)) type = 'wisp';
      if (wave >= 3 && roll > 0.82) type = 'spitter';
      if (wave >= 4 && roll > 0.66 && roll < 0.8) type = 'brute';
      if (counterTypes.length && Math.random() < 0.4) type = counterTypes[Math.floor(Math.random() * counterTypes.length)];
      entries.push({
        type, lane,
        delay: 1.2 + (i / Math.max(1, perLane)) * duration + Math.random() * 0.5,
        elite: wave >= 6 && Math.random() < Math.min(0.26, 0.02 + wave * 0.009 + (b.eliteBonus || 0)),
      });
    }
  }

  // A crowned mini-boss walks a lane every third wave, ahead of the creep.
  if (!isBoss && wave >= 3 && wave % 3 === 0) {
    const mini = MINI_BOSS_KEYS[(Math.floor(wave / 3) - 1 + (d.rank || 0)) % MINI_BOSS_KEYS.length];
    entries.push({ type: mini, lane: lanes[Math.floor(Math.random() * lanes.length)], delay: 1.6 });
  }

  // One warden per boss wave, marching down a random open lane.
  if (isBoss) {
    entries.push({
      type: 'boss', lane: lanes[Math.floor(Math.random() * lanes.length)],
      delay: 2.2, bossIndex: Math.floor(wave / 5) - 1,
    });
  }

  return {
    wave, isBoss, hpMult, dmgMult, speedMult, entries, pacts: p,
    bossIndex: Math.floor(wave / 5) - 1,
    xpScale: (1 / (1 + p.density * 0.07)) * (b.xp || 1),
    reward: pactReward(p), difficulty: d.key, bonus: b.id ? b : null,
  };
}

/* ------------------------------------------------------------
   HUNT WAVES — one warden per wave, always escorted.
   ------------------------------------------------------------ */
export function buildHuntWave(wave, pacts = {}, difficulty = null, bonus = null) {
  const p = normalizePacts(pacts);
  const d = difficulty || DIFFICULTIES.solar;
  const b = bonus || {};
  const bossIndex = (Math.max(0, wave - 1) + (d.rank || 0)) % BOSSES.length;
  const hpMult = (1 + 0.2 * (wave - 1)) * HUNT.bossHpMult * (1 + 0.12 * p.vitality) * (d.enemyHp || 1) * (b.hp || 1);
  const dmgMult = (1 + 0.1 * (wave - 1)) * (1 + 0.1 * p.fury) * (d.enemyDamage || 1);
  const speedMult = Math.min(1.8, (1 + 0.03 * (wave - 1) + p.haste * 0.05) * (d.enemySpeed || 1) * (b.speed || 1));
  const entries = [{ type: 'boss', delay: 1.6, bossIndex }];
  // The warden's court: a crowned sub-boss walks with every hunt after the first.
  if (wave >= 2) {
    const mini = MINI_BOSS_KEYS[(wave - 2 + (d.rank || 0)) % MINI_BOSS_KEYS.length];
    entries.push({ type: mini, delay: 2.7 });
  }
  const escorts = Math.round((6 + wave * 2 + p.density * 2) * (d.spawn || 1) * (b.spawn || 1));
  for (let i = 0; i < escorts; i++) {
    entries.push({
      type: i % 4 === 0 ? 'brute' : i % 3 === 0 ? 'spitter' : i % 2 === 0 ? 'wisp' : 'crawler',
      delay: 3 + i * 0.5,
      elite: wave >= 2 && i % 5 === 0,
    });
  }
  return {
    wave, isBoss: true, hpMult, dmgMult, speedMult, entries, pacts: p, bossIndex,
    xpScale: (b.xp || 1), reward: pactReward(p), difficulty: d.key, bonus: b.id ? b : null,
  };
}

/* ------------------------------------------------------------
   DUEL WAVES — one crowned champion, alone, no escorts.
   ------------------------------------------------------------ */
export function buildDuelWave(wave, pacts = {}, difficulty = null, bonus = null) {
  const p = normalizePacts(pacts);
  const d = difficulty || DIFFICULTIES.solar;
  const b = bonus || {};
  const bossIndex = (Math.max(0, wave - 1) + (d.rank || 0)) % BOSSES.length;
  const hpMult = (1 + 0.24 * (wave - 1)) * DUEL.bossHpMult * (1 + 0.12 * p.vitality) * (d.enemyHp || 1) * (b.hp || 1);
  const dmgMult = (1 + 0.12 * (wave - 1)) * (1 + 0.1 * p.fury) * (d.enemyDamage || 1);
  const speedMult = Math.min(1.7, (1 + 0.02 * (wave - 1)) * (d.enemySpeed || 1) * (b.speed || 1));
  return {
    wave, isBoss: true, hpMult, dmgMult, speedMult,
    entries: [{ type: 'boss', delay: 1.5, bossIndex }], pacts: p, bossIndex,
    xpScale: (b.xp || 1), reward: pactReward(p), difficulty: d.key, bonus: b.id ? b : null,
  };
}

// Slower than it used to be: more fighting between drafts, fewer chains of cards.
export function xpToNext(level) { return Math.round(20 + level * 13 + Math.pow(level, 1.5) * 2.4); }

/* ------------------------------------------------------------
   WEAPON RANKS — one weapon, grown by levels, replaced by choice.
   ------------------------------------------------------------ */
/* A small combat gamble on every clean hit. Player shots can miss or graze;
   enemy blows can miss, graze, or land a critical. DoTs and area effects do
   not roll — only the attacks that actually connect. */
export const HIT_RNG = {
  playerMiss: 0.04,
  playerGraze: 0.10,
  playerCrit: 0.05,
  enemyMiss: 0.08,
  enemyGraze: 0.12,
  enemyCrit: 0.05,
  grazeMult: 0.55,
  critMult: 1.6,
};

export const WEAPON_RANK = {
  max: 5,                 // one weapon, five ranks — earned in drafts
  perRank: 0.20,          // +20% damage per rank held — a rank must beat a common boon
  step: 4,                // the firing hand is expected to gain a rank every four levels
  swapLevels: [5, 9, 13], // levels where a replacement weapon is offered
  baseRange: 1.2,         // shot lifetime at range 1 — deliberately short
  closeRange: 6,          // shots loosed at a target inside this are braced
  closeBonus: 1.14,       // ...and hit 14% harder
  sidearmDamage: 0.6,     // the second arm hits softer...
  sidearmInterval: 1.15,  // ...on a slower beat...
  sidearmRange: 0.85,     // ...and shorter
  sidearmRankTempo: 0.06, // each second-arm rank fires 6% faster — a rank must be worth a pick
  sidearmRankReach: 0.04, // ...and reaches 4% farther
  rarities: ['common', 'common', 'rare', 'epic', 'legendary'],
  rarityMult: { common: 1, rare: 1.08, epic: 1.18, legendary: 1.3 },
};
/* The cadence the old automatic ladder used. While the firing hand sits
   behind it, its rank card is always on offer in the draft. */
export function weaponRankFor(level) {
  return Math.min(WEAPON_RANK.max, 1 + Math.floor((Math.max(1, level) - 1) / WEAPON_RANK.step));
}
export function weaponRarityFor(rank) {
  return WEAPON_RANK.rarities[Math.max(0, Math.min(WEAPON_RANK.max, rank) - 1)] || 'common';
}

/* ------------------------------------------------------------
   DEFENCES — the single ward slot. One ward, three ranks.
   ------------------------------------------------------------ */
export const WARD_MAX_RANK = 3;

export const WARDS = {
  aegis: {
    key: 'aegis', name: 'Aegis Ward', role: 'Bulwark', icon: '◈', element: 'tide',
    color: 0x6fe3ff, glow: 0xbdf4ff, css: '#8fe8ff',
    shield: 45, regen: 1.1, radius: 4.4, damage: 9, knockback: 3.5, slow: 0.28, interval: 2.2,
    desc: '+45 shield per rank, slow healing, and a cold pulse that slows and shoves whatever crowds you.',
  },
  briar: {
    key: 'briar', name: 'Briar Ward', role: 'Thorns', icon: '✧', element: 'verdant',
    color: 0x63e08a, glow: 0xd6ffb8, css: '#73e698',
    thorns: 0.35, radius: 3.8, damage: 16, knockback: 8, interval: 1.5,
    desc: 'Reflects +35% of contact damage per rank, and bursts thorns that throw attackers off you.',
  },
  pyre: {
    key: 'pyre', name: 'Pyre Ward', role: 'Burn', icon: '✹', element: 'ember',
    color: 0xff6a2a, glow: 0xffc06a, css: '#ff8a52',
    radius: 3.6, damage: 9, ignite: { dps: 4, duration: 2.2 }, knockback: 0, interval: 0.75,
    desc: 'A ring of coals: everything that steps close catches fire, and the ring burns faster each rank.',
  },
  well: {
    key: 'well', name: 'Tidewell', role: 'Mend', icon: '≈', element: 'tide',
    color: 0x2fa8ff, glow: 0x8fe6ff, css: '#4fb9ff',
    regen: 2.2, heal: 10, radius: 4.6, damage: 6, knockback: 2, interval: 3,
    desc: 'Health back every second, and a washing pulse that mends you and pushes the horde off.',
  },
};

/* What a ward actually gives at a rank, in words — the draft cards and the
   HUD tooltip both print this, so the numbers cannot drift apart. */
export function wardSummaryFor(def, rank = 1) {
  if (!def) return '';
  const r = Math.max(1, rank);
  const bits = [];
  if (def.shield) bits.push(Math.round(def.shield * r) + ' shield');
  if (def.thorns) bits.push('reflects ' + Math.round(def.thorns * r * 100) + '%');
  if (def.regen) bits.push((def.regen * r).toFixed(1) + ' hp/s mending');
  if (def.heal) bits.push(Math.round(def.heal * r) + ' hp a pulse');
  if (def.damage) bits.push(Math.round(def.damage * r) + ' pulse damage');
  if (def.ignite) bits.push(def.ignite.dps * r + ' burn/s');
  return bits.join(', ');
}

export const SETTINGS_DEFAULT = {
  menus: 'default',
  master: 0.7,
  music: 0.45,
  sfx: 0.8,
  shake: 1,
  numbers: true,
  quality: 'high',
  musicOn: true,
  storeLevels: false,
  touch: 'auto',
  view: 'distant',
};

/* ------------------------------------------------------------
   LEVEL BONUSES — some waves arrive blessed. Data-driven modifiers
   rolled before the wave is built, so the reward is real.
   ------------------------------------------------------------ */
export const WAVE_BONUSES = [
  { id: 'sunwell', name: 'Sunwell', icon: '◈', css: '#ffd98a', desc: 'The Forge brims — +2 shards when this wave is cleared.', shards: 2 },
  { id: 'gilded', name: 'Gilded Hour', icon: '✺', css: '#ffc76b', desc: 'Essence flows double from every kill this wave.', xp: 2 },
  { id: 'frenzy', name: 'Ember Frenzy', icon: '✹', css: '#ff7a35', desc: 'The horde runs 25% faster — and pays 40% more essence.', xp: 1.4, speed: 1.25 },
  { id: 'bounty', name: "Warden's Bounty", icon: '☄', css: '#c879ff', desc: 'Elites answer the call, and each one felled drops an extra shard.', eliteBonus: 0.2, eliteShard: true },
  { id: 'dawncharge', name: 'Dawn Charge', icon: '☀', css: '#ffe9a8', desc: 'Begin the wave with 35 ultimate charge.', charge: 35 },
  { id: 'stillair', name: 'Still Air', icon: '❋', css: '#8fe6ff', desc: 'The horde arrives softer and slower, but pays less essence.', hp: 0.9, speed: 0.9, xp: 0.85 },
  { id: 'twin', name: 'Twin Tides', icon: '⧉', css: '#b184ff', desc: 'Twice the horde, and twice the shards when the wave is cleared.', spawn: 2, shards: 2 },
];

export function waveBonusById(id) { return WAVE_BONUSES.find(b => b.id === id) || null; }

export function rollWaveBonus(wave, lastId = null) {
  if (wave < 2 || wave % 5 === 0) return null;
  if (Math.random() > 0.42) return null;
  const pool = WAVE_BONUSES.filter(b => b.id !== lastId);
  return pool[Math.floor(Math.random() * pool.length)] || null;
}

/* ------------------------------------------------------------
   SKILL RUNS — no drafts, no relics, only what you can do.
   ------------------------------------------------------------ */
export const SKILL_RUN = {
  key: 'skill', name: 'Skill Run', icon: '⟡', css: '#8fe6ff',
  tagline: 'No drafts. No relics. Just you.',
  desc: 'Boon drafts and relic offers are closed for the whole run. Each level instead grants flat Mastery: +6% damage, +4% attack speed and +8 max health. The dawn pays 60% more sunmarks.',
  markMult: 1.6,
  mastery: { damage: 0.06, interval: 0.04, maxHp: 8 },
};

/* ------------------------------------------------------------
   MODES — every mission style shares the horde, not the objective.
   ------------------------------------------------------------ */
export const MODES = {
  siege: {
    key: 'siege', name: 'Sunforge Siege', kicker: 'The objective',
    tagline: 'Hold the light. Build the wall.',
    desc: 'The Sunforge core is failing and the horde is coming for it. Spend shards on towers, stand in the breach, and hold for twenty waves.',
    goal: 'Survive 20 waves',
    steps: [
      'Spend sun shards at the Forge to raise towers on the pedestals around the core.',
      'Stand in an enemy\'s path to body-block it before it reaches the Sunforge.',
      'Survive all twenty waves. Every fifth wave brings a warden.',
    ],
    win: 'Survive 20 waves',
    fail: 'The Sunforge core is destroyed',
    color: 0xf5c26b, css: '#f5c26b', sigil: '☀', hasCore: true, arena: 'sanctum',
  },
  lane: {
    key: 'lane', name: 'Sunfall Lanes', kicker: 'The push',
    tagline: 'Three lanes. One core. Break them first.',
    desc: 'Three rift lanes pour into the Sunforge, each ending at a Rift Gate. Towers hold the core — but only your own fire can break a gate.',
    goal: 'Shatter 3 Rift Gates',
    steps: [
      'Raise towers on the lane pads to keep the core alive.',
      'Walk out along a lane and shoot its Rift Gate. Towers cannot damage gates — you can, with shots, surges and ultimates.',
      'Break all three. Each broken gate stops that lane\'s reinforcements for good and grants Rift Siphon: permanent bonus damage.',
    ],
    win: 'All three Rift Gates broken',
    fail: 'The Sunforge core is destroyed',
    color: 0x59e8ff, css: '#67ecff', sigil: '⌖', hasCore: true, arena: 'reach',
  },
  trial: {
    key: 'trial', name: 'Endless Trial', kicker: 'The classic',
    tagline: 'No core. No safety net.',
    desc: 'The pure arena: no core to defend, no towers to raise, no finish line. Just your sigil and an endless horde.',
    goal: 'Endless survival',
    steps: [
      'No core and no defenses — every hit lands on you.',
      'Kill chains raise your essence multiplier. Boons and relics still drop.',
      'There is no winning, only a higher wave than last time.',
    ],
    win: 'No end — chase your best wave',
    fail: 'You fall',
    color: 0xb184ff, css: '#b184ff', sigil: '◈', hasCore: false, arena: 'colosseum',
  },
  hunt: {
    key: 'hunt', name: 'Warden Hunt', kicker: 'The gauntlet',
    tagline: 'Four wardens. No walls. No mercy.',
    desc: 'No core and no defenses. Four wardens arrive back to back, each with an escort. Kill them all before the arena closes.',
    goal: 'Fell 4 wardens',
    steps: [
      'Every wave is a warden plus its escort — there are no trash waves between them.',
      'Wardens hit far harder than the horde. Keep moving and use the whole arena.',
      'Fell all four to win the hunt.',
    ],
    win: 'All four wardens felled',
    fail: 'You fall',
    color: 0xff8a4a, css: '#ff9a5a', sigil: '☄', hasCore: false, arena: 'basin',
  },
  escort: {
    key: 'escort', name: 'Solar Caravan', kicker: 'The escort',
    tagline: 'Walk the light home.',
    desc: 'A reliquary of dawn must be walked the length of the pilgrim road to the rift. It only moves while you are beside it and the road ahead is clear — and the horde tears at it whenever it gets close.',
    goal: 'Walk the reliquary home',
    steps: [
      'Stand within 6.5m of the reliquary to push it forward. Leave it and it stops, then starts to dim.',
      'Clear the road: anything within 4m of the reliquary tears its integrity down.',
      'It halts at five waystones until the ground around them is clear. Each one mends the reliquary and pays shards.',
    ],
    win: 'The reliquary reaches the eastern rift',
    fail: 'Reliquary integrity reaches zero',
    color: 0x63e08a, css: '#73e698', sigil: '⛨', hasCore: false, arena: 'road',
  },
  ritual: {
    key: 'ritual', name: 'Ember Ritual', kicker: 'The ritual',
    tagline: 'Hold the circles. Feed the flame.',
    desc: 'Three ember circles ring the arena. Stand in one to charge it while the horde tries to take the others. Seal all three before the ritual gutters out.',
    goal: 'Seal 3 ember circles',
    steps: [
      'Stand inside a circle to charge it. Enemies inside stop the charge and drain it.',
      'Sealed circles stay sealed, but the horde still walks over them.',
      'Seal all three to complete the ritual.',
    ],
    win: 'All three circles sealed',
    fail: 'You fall before the ritual completes',
    color: 0xffc14d, css: '#ffd166', sigil: '◉', hasCore: false, arena: 'cloister',
  },
  blitz: {
    key: 'blitz', name: 'Eclipse Blitz', kicker: 'The clock',
    tagline: 'No breathers. No mercy.',
    desc: 'Twelve waves on a burning clock. Clear each one before the sun sets; every kill buys you a heartbeat.',
    goal: 'Clear 12 waves on the clock',
    steps: [
      'The clock starts when the wave does. Let it empty and the run ends.',
      'Kills add time — keep killing even when the wave is nearly done.',
      'Clear twelve waves to outlast the sunset.',
    ],
    win: 'Twelve waves cleared',
    fail: 'The clock empties',
    color: 0xff5a5a, css: '#ff6b6b', sigil: '⌛', hasCore: false, arena: 'ring',
  },
  duel: {
    key: 'duel', name: 'Warden Duel', kicker: 'The champion',
    tagline: 'One arena. Four champions.',
    desc: 'Four crowned champions come alone, one after another — the last of them is Helios Unbound. No escorts, no walls, no core — just the ring and your sigil.',
    goal: 'Fell 4 champions',
    steps: [
      'Each wave is a single champion, far stronger than a normal warden.',
      'No escorts and no adds — learn the pattern and stay mobile.',
      'Fell all four to take the ring. Each champion is tougher than the last.',
    ],
    win: 'All four champions felled',
    fail: 'You fall',
    color: 0xffe7a3, css: '#ffe9a8', sigil: '⚔', hasCore: false, arena: 'crown',
  },
};

/* ------------------------------------------------------------
   MENU DEPTH — the same game at three widths.
   Simple asks nothing, Default asks for a tier, Complex opens every
   dial the game owns. Hidden systems are switched off at run start,
   so a lean menu is never secretly running pacts or skill runs.
   ------------------------------------------------------------ */
export const MENU_DEPTHS = {
  simple: {
    key: 'simple', name: 'Simple', icon: '○', css: '#8fe6a0',
    tagline: 'Just the fight',
    desc: 'Four missions and one difficulty. No pacts, no skill runs, no weapon picker — the arena, your sigil and the horde.',
    modes: ['siege', 'trial', 'hunt', 'blitz'],
    difficulty: false, pacts: false, skillRun: false, weapons: false,
    codex: ['guide', 'elements', 'missions', 'controls'],
  },
  default: {
    key: 'default', name: 'Default', icon: '◐', css: '#f5c26b',
    tagline: 'The descent',
    desc: 'Six missions, all four difficulties, the Descent and weapon choice. Pacts and skill runs wait behind Complex.',
    modes: ['siege', 'lane', 'trial', 'hunt', 'escort', 'blitz'],
    difficulty: true, pacts: false, skillRun: false, weapons: true,
    codex: ['lore', 'guide', 'elements', 'fusions', 'missions', 'controls'],
  },
  complex: {
    key: 'complex', name: 'Complex', icon: '●', css: '#b184ff',
    tagline: 'Every dial',
    desc: 'All eight missions, Eclipse Pacts, Skill Runs, weapon choice and the whole Codex — for players who want to tune the run themselves.',
    modes: ['siege', 'lane', 'trial', 'hunt', 'escort', 'ritual', 'blitz', 'duel'],
    difficulty: true, pacts: true, skillRun: true, weapons: true,
    codex: ['lore', 'guide', 'elements', 'fusions', 'relics', 'bestiary', 'boons', 'dawn', 'missions', 'controls'],
  },
};

export const MENU_DEPTH_ORDER = ['simple', 'default', 'complex'];

export function menuDepth(save = {}) {
  return MENU_DEPTHS[save?.settings?.menus] || MENU_DEPTHS.default;
}

/* ------------------------------------------------------------
   ARENAS — every mission fights on its own ground. Shape and size
   change how the fight flows; stone and palette change the mood.
   radius is the circumradius (oval: long axis x1.22, short x0.84).
   ------------------------------------------------------------ */
export const ARENAS = {
  sanctum: {
    id: 'sanctum', name: 'Sunforge Sanctum', shape: 'circle', shapeName: 'Circular', radius: 34, size: 'Standard', element: 'lumen',
    blurb: 'The old solar ring. Hex flagstones, a crown of monoliths and the long shadow of the Forge.',
    accent: 0xf5c26b,
    floor: { pattern: 'hex', base: ['#141a30', '#0e1224', '#090c19', '#05070f'], line: 'rgba(170,190,255,.05)', glow: 'rgba(245,194,107,.5)', rough: 0.68, metal: 0.34, emissive: 0.8 },
    wall: { color: 0x151c30, stone: 0x131a2c, height: 3.4, vary: 0.9, thick: 0.6, rough: 0.62, metal: 0.45 },
    fog: { color: 0x0a0e1e, density: 0.0105 },
    sky: { top: 0x03050e, mid: 0x151a3a, bot: 0x2a1526, sun: [-0.55, 0.16, -0.82], sunColor: 0xffffff },
    light: { hemi: 0x6a86d8, ground: 0x2a1a22, key: 0xffd7a8, rim: 0x7a5bff, orbitA: 0xffa85a, orbitB: 0x7194ff },
  },
  reach: {
    id: 'reach', name: 'Sunfall Reach', shape: 'octagon', shapeName: 'Octagonal', radius: 37, size: 'Wide', element: 'gale',
    blurb: 'Eight steel walls and a grid of inlaid conduits. Three lanes run out from the core into the dark.',
    accent: 0x59e8ff,
    floor: { pattern: 'grid', base: ['#0c1c2c', '#081521', '#061019', '#03080e'], line: 'rgba(140,230,255,.10)', glow: 'rgba(90,220,255,.5)', rough: 0.55, metal: 0.55, emissive: 0.9 },
    wall: { color: 0x14202f, stone: 0x0e1a24, height: 2.6, vary: 0.4, thick: 0.5, rough: 0.5, metal: 0.65 },
    fog: { color: 0x061019, density: 0.0115 },
    sky: { top: 0x020812, mid: 0x0d2438, bot: 0x123040, sun: [0.4, 0.22, -0.9], sunColor: 0xdff6ff },
    light: { hemi: 0x4f8fd8, ground: 0x14202a, key: 0xbfeaff, rim: 0x2ea8ff, orbitA: 0x59e8ff, orbitB: 0x2f6fff },
  },
  colosseum: {
    id: 'colosseum', name: 'Umbral Colosseum', shape: 'circle', shapeName: 'Circular', radius: 39, size: 'Grand', element: 'umbra',
    blurb: 'The widest ring in the descent. Tiered stone, concentric sigils and a sky the colour of a bruise.',
    accent: 0xb184ff,
    floor: { pattern: 'rings', base: ['#171126', '#100c1c', '#0a0714', '#05030c'], line: 'rgba(190,160,255,.09)', glow: 'rgba(177,132,255,.55)', rough: 0.75, metal: 0.2, emissive: 0.75 },
    wall: { color: 0x1a1430, stone: 0x120e22, height: 4.6, vary: 0.5, thick: 0.7, rough: 0.7, metal: 0.3 },
    fog: { color: 0x0b0818, density: 0.009 },
    sky: { top: 0x04030c, mid: 0x1a1030, bot: 0x2a1238, sun: [-0.2, 0.3, -0.93], sunColor: 0xe8ddff },
    light: { hemi: 0x6f5ad8, ground: 0x221232, key: 0xd9c8ff, rim: 0x8a5bff, orbitA: 0xb184ff, orbitB: 0x5f7bff },
  },
  basin: {
    id: 'basin', name: 'Ashfall Basin', shape: 'hexagon', shapeName: 'Hexagonal', radius: 35, size: 'Standard', element: 'ember',
    blurb: 'Six broken walls around a floor of cooled ash. The cracks still remember the fire that made them.',
    accent: 0xff8a4a,
    floor: { pattern: 'cracks', base: ['#241016', '#1a0b10', '#12070b', '#080305'], line: 'rgba(255,150,90,.08)', glow: 'rgba(255,120,50,.6)', rough: 0.9, metal: 0.08, emissive: 0.95 },
    wall: { color: 0x241318, stone: 0x1a0e10, height: 3.0, vary: 1.4, thick: 0.75, rough: 0.85, metal: 0.15 },
    fog: { color: 0x120609, density: 0.013 },
    sky: { top: 0x080306, mid: 0x2a0f16, bot: 0x3a1a14, sun: [-0.6, 0.1, -0.78], sunColor: 0xffd0a0 },
    light: { hemi: 0xd87a5a, ground: 0x2a120a, key: 0xffb27a, rim: 0xff5a2a, orbitA: 0xff8a4a, orbitB: 0xff4a2a },
  },
  road: {
    id: 'road', name: 'Dawn Road', shape: 'oval', shapeName: 'Oval', radius: 36, size: 'Long', element: 'tide',
    blurb: 'A pilgrim road running east to the rift, walled by standing stones. Long ground for a long walk.',
    accent: 0x63e08a,
    floor: { pattern: 'road', base: ['#16241a', '#101c16', '#0b1410', '#060b09'], line: 'rgba(150,255,190,.07)', glow: 'rgba(110,230,150,.5)', rough: 0.85, metal: 0.12, emissive: 0.6 },
    wall: { color: 0x17241c, stone: 0x101a14, height: 2.2, vary: 0.5, thick: 0.5, rough: 0.8, metal: 0.2 },
    fog: { color: 0x08120c, density: 0.01 },
    sky: { top: 0x030b07, mid: 0x0f2a24, bot: 0x2a3a20, sun: [0.7, 0.12, -0.7], sunColor: 0xfff0c0 },
    light: { hemi: 0x7ad8a8, ground: 0x18220f, key: 0xfff0c0, rim: 0x2fbf7a, orbitA: 0x8affb0, orbitB: 0x3f8fff },
  },
  cloister: {
    id: 'cloister', name: 'Cinder Cloister', shape: 'square', shapeName: 'Square', radius: 34, size: 'Compact', element: 'stone',
    blurb: 'Four walls, a floor of cracked mosaic and three circles waiting to be fed. Built to be held, not fled.',
    accent: 0xffc14d,
    floor: { pattern: 'mosaic', base: ['#221a12', '#1a140e', '#130f0a', '#0a0705'], line: 'rgba(255,210,150,.08)', glow: 'rgba(255,190,90,.55)', rough: 0.7, metal: 0.3, emissive: 0.8 },
    wall: { color: 0x241a12, stone: 0x1a130d, height: 3.8, vary: 0.3, thick: 0.8, rough: 0.72, metal: 0.25 },
    fog: { color: 0x100a06, density: 0.011 },
    sky: { top: 0x06040a, mid: 0x241828, bot: 0x3a2412, sun: [-0.35, 0.2, -0.9], sunColor: 0xffe0b0 },
    light: { hemi: 0xd8a878, ground: 0x241a10, key: 0xffdca8, rim: 0xff9a3a, orbitA: 0xffc14d, orbitB: 0xff7a3a },
  },
  ring: {
    id: 'ring', name: 'Eclipse Ring', shape: 'circle', shapeName: 'Circular', radius: 32, size: 'Tight', element: 'ember',
    blurb: 'A scorched clock-face ringed by broken wall. Nothing to hide behind and nowhere to run but the middle.',
    accent: 0xff5a5a,
    floor: { pattern: 'scorch', base: ['#1e0c0e', '#16080a', '#0f0507', '#070203'], line: 'rgba(255,120,120,.08)', glow: 'rgba(255,70,60,.6)', rough: 0.82, metal: 0.18, emissive: 0.95 },
    wall: { color: 0x241014, stone: 0x1a0b0c, height: 1.9, vary: 1.1, thick: 0.7, rough: 0.8, metal: 0.2 },
    fog: { color: 0x0e0405, density: 0.014 },
    sky: { top: 0x080203, mid: 0x2a0a0e, bot: 0x40140e, sun: [0.15, 0.08, -0.98], sunColor: 0xffb0a0 },
    light: { hemi: 0xd85a5a, ground: 0x2a0a0a, key: 0xffb0a0, rim: 0xff3030, orbitA: 0xff5a5a, orbitB: 0xff8a4a },
  },
  crown: {
    id: 'crown', name: "Warden's Crown", shape: 'octagon', shapeName: 'Octagonal', radius: 33, size: 'Compact', element: 'lumen',
    blurb: 'Eight high walls and polished slabs, built like a throne room. Champions are crowned in the middle.',
    accent: 0xffe7a3,
    floor: { pattern: 'duel', base: ['#1c1a1a', '#141314', '#0e0d0f', '#070708'], line: 'rgba(255,235,180,.10)', glow: 'rgba(255,220,140,.5)', rough: 0.42, metal: 0.6, emissive: 0.7 },
    wall: { color: 0x22201c, stone: 0x171512, height: 5.2, vary: 0.2, thick: 0.9, rough: 0.55, metal: 0.5 },
    fog: { color: 0x0b0a09, density: 0.0095 },
    sky: { top: 0x050506, mid: 0x1e1c22, bot: 0x3a2e20, sun: [0, 0.28, -0.96], sunColor: 0xfff2d0 },
    light: { hemi: 0xa8a8c8, ground: 0x241e14, key: 0xfff2d0, rim: 0xffc76b, orbitA: 0xffe7a3, orbitB: 0xffb066 },
  },
};

export function arenaById(id) { return ARENAS[id] || ARENAS.sanctum; }

/* ------------------------------------------------------------
   DIFFICULTIES — the descent you choose before you enter.
   Each tier scales the horde, your shards and the dawn's pay.
   ------------------------------------------------------------ */
export const DIFFICULTIES = {
  kindled: {
    key: 'kindled', name: 'Kindled', short: 'EASY', icon: '☼', css: '#8fe6a0', rank: 0,
    tagline: 'The sun leans close.',
    desc: 'A gentler descent. The horde arrives thinner and softer, your sigil hits harder, and shards come generously.',
    enemyHp: 0.82, enemyDamage: 0.75, enemySpeed: 0.95, spawn: 0.85, playerDamage: 1.18,
    shardMult: 1.25, markMult: 0.8, startShards: 1, gateHpMult: 0.9,
    objective: { blitzTime: 1.2, ritualCharge: 0.8, escortSpeed: 1.15, waystoneHold: 0.8, escortDecay: 0.8 },
    unlock: null,
  },
  solar: {
    key: 'solar', name: 'Solar', short: 'NORMAL', icon: '☀', css: '#f5c26b', rank: 1,
    tagline: 'The intended descent.',
    desc: 'The balance the arena was built for. Every mission, every pact, no modifiers.',
    enemyHp: 1, enemyDamage: 1, enemySpeed: 1, spawn: 1, playerDamage: 1,
    shardMult: 1, markMult: 1, startShards: 0, gateHpMult: 1,
    objective: { blitzTime: 1, ritualCharge: 1, escortSpeed: 1, waystoneHold: 1, escortDecay: 1 },
    unlock: null,
  },
  umbral: {
    key: 'umbral', name: 'Umbral', short: 'HARD', icon: '◐', css: '#a878ff', rank: 2,
    tagline: 'The dark pushes back.',
    desc: 'A thicker, meaner horde, a thinner shard purse and tougher rift gates. The dark offers an extra boon reroll, and the Sunforge gutters back once at 18% integrity. The objective itself tightens: the Blitz clock runs 15% shorter, ritual circles charge 20% slower, and the caravan walks 10% slower with a longer waystone hold.',
    enemyHp: 1.22, enemyDamage: 1.12, enemySpeed: 1.04, spawn: 1.08, playerDamage: 1,
    shardMult: 0.9, markMult: 1.4, startShards: 0, rerolls: 1, gateHpMult: 1.25,
    objective: { blitzTime: 0.85, ritualCharge: 1.2, escortSpeed: 0.9, waystoneHold: 1.25, escortDecay: 1.2 },
    lastStand: { pct: 0.18, heal: 0.1, shield: 3 },
    unlock: { wins: 1, wave: 10, text: 'Win a run or reach wave 10' },
  },
  hardcore: {
    key: 'hardcore', name: 'Hardcore', short: 'HARDCORE', icon: '☠', css: '#ff5a5a', rank: 3,
    tagline: 'One life. No mending. No mercy.',
    desc: 'Second Wind cannot save you and the Forge refuses to mend the Sunforge, but a felled warden restores 10% of the core, field repairs run at 70%, and the Sunforge makes one Last Stand. You get two boon rerolls, a fourth relic choice and double sunmarks. Objectives tighten too: the Blitz clock loses 28%, ritual circles charge 35% slower, and the caravan walks 18% slower with a 40% longer waystone hold.',
    enemyHp: 1.3, enemyDamage: 1.25, enemySpeed: 1.07, spawn: 1.12, playerDamage: 1,
    shardMult: 1, markMult: 2, startShards: 2,
    objective: { blitzTime: 0.72, ritualCharge: 1.35, escortSpeed: 0.82, waystoneHold: 1.4, escortDecay: 1.35 },
    hardcore: true, noRevive: true, noCoreRepair: true, repairMult: 0.7, bossCoreHeal: 0.1,
    rerolls: 2, relicChoices: 1, gateHpMult: 1.5,
    lastStand: { pct: 0.25, heal: 0.18, shield: 5 },
    unlock: { wins: 1, text: 'Win any run to unlock' },
  },
};

export const DIFFICULTY_ORDER = ['kindled', 'solar', 'umbral', 'hardcore'];

/* ------------------------------------------------------------
   DESCENT — the climb you carry between runs.
   Every completed mission raises the descent by one; each rank
   makes the next run slightly harder, and you can step back down.
   ------------------------------------------------------------ */
export const DESCENT = { max: 5, hp: 0.07, damage: 0.05, markStep: 0.15 };

/* ------------------------------------------------------------
   KINDLING — what the dead leave behind.
   Enemies shed burning motes; collect enough and the dawn answers
   with a gift: a weapon surge, a helper, or whatever the mode needs.
   ------------------------------------------------------------ */
export const KINDLING = {
  key: 'kindling', name: 'Kindling', icon: '✺',
  color: 0xffb066, glow: 0xffd8a8, css: '#ffb066',
  need: 8,
  chance: 0.13,
  elite: 3,
  boss: 4,
  boostTime: 18,
  boostDamage: 0.35,
};

export function normalizeDifficulty(key) { return DIFFICULTIES[key] ? key : 'solar'; }

export function difficultyUnlocked(key, save = {}) {
  const d = DIFFICULTIES[key];
  if (!d) return false;
  const u = d.unlock;
  if (!u) return true;
  if (u.wins && (save.wins || 0) >= u.wins) return true;
  if (u.wave && (save.bestWave || 0) >= u.wave) return true;
  return false;
}

export const SIEGE = {
  goalWave: 20,
  coreHp: 900,
  startShards: 3,
  waveShards: 2,
  bossShards: 3,
  earlyCallShards: 1,
  repairCost: 2,
  repairPct: 0.3,
  repairRate: 55,
  coreClearHeal: 0.06,
  /* Defending the core pays. Stand inside the Aegis to slow the breach and
     hit harder; keep the Sunforge above the hold line and earn extra shards. */
  aegisRadius: 8.5,
  aegisSlow: 0.32,
  aegisDamage: 0.3,
  aegisDr: 0.25,
  breachRadius: 11,
  coreRegen: 0.9,
  coreRegenDelay: 6,
  holdPct: 0.75,
  holdShards: 1,
  lastLightPct: 0.25,
  lastLightDamage: 0.4,
  lastLightCharge: 2.5,
  coreZapRadius: 9,
  coreZapInterval: 2.4,
  coreZapDamage: 22,
};

export const LANE = {
  goalGates: 3,
  gateHp: 750,
  gateRadius: 2.0,
  laneRadius: 27,
  padRadii: [11.5, 18.5],
  startShards: 6,
  waveShards: 2,
  gateShardReward: 2,
  gateClearHeal: 0.04,
  siphon: 0.06,
  lanes: [
    { key: 'top', name: 'Top Lane', short: 'TOP', angle: Math.PI * 1.17, css: '#ff9a5a' },
    { key: 'mid', name: 'Mid Lane', short: 'MID', angle: Math.PI * 0.5, css: '#ffd166' },
    { key: 'bot', name: 'Bot Lane', short: 'BOT', angle: -Math.PI * 0.17, css: '#67ecff' },
  ],
};

export const HUNT = {
  goalWave: 4,
  bossHpMult: 1.3,
  interTimer: 4.6,
};

export const ESCORT = {
  // The pilgrim road: one long switchback across Dawn Road rather than a dash to the rift.
  // Points are [x, z] on the oval (radius 36 → 43.9 × 30.2), kept clear of the walls.
  route: [[6, 2], [-24, 12], [-24, -16], [2, -24], [28, -10], [24, 16], [-2, 22], [30, 6]],
  hp: 800,
  speed: 3.2,
  escortRadius: 6.5,
  contestedRadius: 4.2,
  damageInterval: 0.9,
  damagePerEnemy: 6,
  waveDamage: 1.1,
  decay: 6,
  interTimer: 6.5,
  // Waystones: fractions along the road where the reliquary halts until the ground is clear.
  waystones: [0.14, 0.31, 0.5, 0.7, 0.87],
  waystoneHoldRadius: 7.5,
  waystoneClearTime: 1.0,
  waystoneHeal: 0.08,
  waystoneShards: 2,
  // Dawn pulse: the reliquary answers the horde while you walk beside it.
  pulseChargeTime: 15,
  pulseRadius: 9,
  pulseDamage: 55,
  pulseWaveDamage: 9,
};

export const RITUAL = {
  shrineCount: 3,
  shrineRadius: 13,
  standRadius: 3.4,
  chargeTime: 9,
  decay: 0.035,
  contestDecay: 0.2,
  interTimer: 6,
};

export const BLITZ = {
  goalWave: 12,
  waveTime: 34,
  killBonus: 0.4,
  bossBonus: 5,
  bossTimeMult: 1.05,
  interTimer: 3.2,
};

export const DUEL = {
  goalWave: 4,
  bossHpMult: 1.75,
  interTimer: 5,
};

export const DEFENSES = {
  lance: {
    key: 'lance', name: 'Solar Lance', role: 'Turret', sigil: '✧', element: 'lumen',
    cost: 3, hp: 180, radius: 0.9, color: 0xffb347, glow: 0xffe1a3, css: '#ffc46b',
    damage: 16, interval: 0.7, range: 16, projSpeed: 25, upgradeCost: 2, maxRank: 3,
    desc: 'A long-range lance that burns the nearest threat. Fragile, but it thins the horde before it reaches the core.',
  },
  ward: {
    key: 'ward', name: 'Aegis Ward', role: 'Control', sigil: '◈', element: 'tide',
    cost: 3, hp: 240, radius: 0.9, color: 0x6fe3ff, glow: 0xbdf4ff, css: '#8fe8ff',
    damage: 12, interval: 1.6, range: 7.5, slowRadius: 6.5, slow: 0.32, upgradeCost: 2, maxRank: 3,
    desc: 'A cold obelisk that slows everything around it and arcs judgement into the nearest foe. Buys your core time.',
  },
  maul: {
    key: 'maul', name: 'Gravemaw', role: 'Artillery', sigil: '✦', element: 'stone',
    cost: 4, hp: 220, radius: 1.0, color: 0xff7a3a, glow: 0xffc48a, css: '#ff8a52',
    damage: 28, interval: 2.3, range: 5.8, upgradeCost: 3, maxRank: 3,
    desc: 'A heavy stone heart that detonates a shockwave around itself. Devastating when the horde closes in.',
  },
  pyre: {
    key: 'pyre', name: 'Ember Pyre', role: 'Burn', sigil: '✹', element: 'ember',
    cost: 4, hp: 200, radius: 0.9, color: 0xff6a2a, glow: 0xffc06a, css: '#ff8a52',
    damage: 18, interval: 0.6, range: 9, upgradeCost: 3, maxRank: 3,
    desc: 'A brazier that sets everything close to it alight. Short reach, but it burns a whole cluster.',
  },
  galecore: {
    key: 'galecore', name: 'Galecore', role: 'Chain', sigil: '❋', element: 'gale',
    cost: 3, hp: 140, radius: 0.9, color: 0x6ff2c0, glow: 0xbaffeb, css: '#7df5c6',
    damage: 9, interval: 0.45, range: 12, upgradeCost: 2, maxRank: 3,
    desc: 'A spinning core that snaps lightning through three foes in a row. Cheap, quick and fragile.',
  },
  gloom: {
    key: 'gloom', name: 'Gloomwell', role: 'Siphon', sigil: '◈', element: 'umbra',
    cost: 5, hp: 260, radius: 1.0, color: 0xa06cff, glow: 0xd9b7ff, css: '#b184ff',
    damage: 24, interval: 1.4, range: 13, upgradeCost: 3, maxRank: 3,
    desc: 'A well of night that drains one foe at a time and feeds a quarter of it back to you.',
  },
};

/* ------------------------------------------------------------
   CONTROLS — every action can be rebound. Codes are KeyboardEvent.code.
   ------------------------------------------------------------ */
export const CONTROL_ACTIONS = [
  { key: 'up', name: 'Move up', def: 'KeyW' },
  { key: 'down', name: 'Move down', def: 'KeyS' },
  { key: 'left', name: 'Move left', def: 'KeyA' },
  { key: 'right', name: 'Move right', def: 'KeyD' },
  { key: 'dash', name: 'Dash', def: 'Space' },
  { key: 'surge', name: 'Elemental surge', def: 'KeyQ' },
  { key: 'ult', name: 'Ultimate', def: 'KeyR' },
  { key: 'forge', name: 'Open the Forge', def: 'KeyB' },
  { key: 'repair', name: 'Repair (hold)', def: 'KeyE' },
  { key: 'callwave', name: 'Begin wave 1 / call wave', def: 'Enter' },
  { key: 'levelup', name: 'Open stored level-up', def: 'KeyL' },
  { key: 'pause', name: 'Pause', def: 'Escape' },
];

export function defaultKeys() {
  const out = {};
  for (const a of CONTROL_ACTIONS) out[a.key] = a.def;
  return out;
}

const KEY_NAMES = {
  Space: 'SPACE', Escape: 'ESC', Enter: 'ENTER', Tab: 'TAB', Backspace: 'BKSP',
  ShiftLeft: 'L-SHIFT', ShiftRight: 'R-SHIFT', ControlLeft: 'L-CTRL', ControlRight: 'R-CTRL',
  AltLeft: 'L-ALT', AltRight: 'R-ALT', CapsLock: 'CAPS', Backquote: '`', Minus: '-', Equal: '=',
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
};

export function keyLabel(code) {
  if (!code) return '—';
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'NUM ' + code.slice(6);
  if (code.startsWith('Arrow')) return code.slice(5).toUpperCase();
  return code.toUpperCase();
}

export const KEYBINDS = [
  ['W A S D', 'Move'],
  ['Shift / Space', 'Dash (brief invulnerability)'],
  ['Q', 'Elemental surge'],
  ['R', 'Ultimate (when fully charged)'],
  ['Enter', 'Begin wave 1 · call the next wave early'],
  ['B / F', 'Open the Forge (Siege and Lanes)'],
  ['E (hold)', 'Repair the Sunforge, a tower or a lane pad'],
  ['L', 'Open a stored level-up'],
  ['Esc / P', 'Pause'],
];
