/* ============================================================
   HELIOS ELEMENTS — CODEX CONTENT
   The single source of truth for everything written about the
   game: lore, the how-to-play guide, press copy and release notes.

   It is read by two things:
     • the in-game Dawn Codex  (js/ui.js, Lore + How to Play tabs)
     • the public website      (site/index.html via site/site.js)

   UPDATING: when the game changes, edit this file first.
   – new mechanic or mode  -> add to GUIDE and LORE
   – balance numbers       -> prefer the imported constants so the
                              prose cannot drift from js/data.js
   – every release         -> add a CHANGELOG entry at the top
     and bump VERSION in js/data.js
   ============================================================ */

import {
  VERSION, MODES, ELEMENTS, FUSIONS, BOSSES, PACTS, DIFFICULTIES, DESCENT,
  SIEGE, LANE, ESCORT, RITUAL, BLITZ, DUEL, CONTROL_ACTIONS, keyLabel,
  RELIC_SLOTS, RARITY, KEYBINDS, KINDLING, WEAPON_RANK, WARD_MAX_RANK, WARDS,
} from './data.js';

export const META = {
  name: 'Helios Elements',
  version: VERSION,
  tagline: 'Forge the sun. Hold the dark.',
  oneLiner:
    'An elemental survival roguelite for the browser. Pick a sigil, draft a build, and hold the light for twenty waves.',
  shortDescription:
    'Helios Elements is a fast, elemental survival roguelite that runs in your browser. Choose one of six sigils, fuse it into a hybrid form, and hold the Sunforge against the Eclipse for twenty waves — or walk a reliquary home, seal three circles, beat a burning clock, or take the ring against four champions.',
  longDescription: [
    `Every run of Helios Elements starts with one choice: which shard of the sun you carry. Ember burns and detonates. Tide pierces and mends. Gale chains. Stone crushes. Lumen lances through ranks. Umbra hunts and feeds. Six sigils, six rhythms, six ways to survive.`,
    `Level up and the sun offers boons — damage, tempo, projectiles, crit, lifesteal, orbits. Take a second sigil at level three and the two collapse into a hybrid: Magma, Storm, Frost, Void, Verdant. Wardens arrive every fifth wave, elites drop relics, and shards buy towers you will have to repair by hand while the horde walks in.`,
    `Eight missions change the question. Defend a core. Break three rift gates. Walk a reliquary down a pilgrim road. Hold three ember circles. Outrun a sunset. Stand alone in the ring. Then complete a mission and the Descent takes you one step deeper — the same arena, a little meaner, until you decide to step back.`,
  ],
  keywords: [
    'elemental roguelite', 'browser roguelite', 'survival roguelite', 'wave defense',
    'WebGL game', 'Three.js game', 'free browser game', 'roguelite with meta progression',
    'Helios Elements',
  ],
  playPath: '../index.html',
};

/* ------------------------------------------------------------
   LORE — the mythic record. Short paragraphs, read in order.
   ------------------------------------------------------------ */
export const LORE = {
  intro:
    'The archive below is what the Dawn Codex remembers. It is not a history — the Eclipse took the history. It is what was written down afterwards, by the people who kept the light on.',
  chapters: [
    {
      id: 'long-dawn',
      kicker: 'Before',
      title: 'The Long Dawn',
      paragraphs: [
        `The sun was never a star. It was a promise, kept in crystal by the nine hundred who came before us, and it burned for a thousand years without asking anything in return.`,
        `They called the world Emberfall because the light fell on it constantly, and because everything that grew there grew fast and died bright. Under that light people built without walls. They had forgotten what the dark was for.`,
      ],
    },
    {
      id: 'eclipse',
      kicker: 'The wound',
      title: 'The Eclipse',
      paragraphs: [
        `It was not a moon. A moon at least has the decency to pass. This was a will that stepped between the world and its light, and stayed.`,
        `The Eclipse does not hate you. Hatred would be a kind of attention. It unremembers — it looks at a thing and decides it was never there. What walks out of that forgetting is the horde: Crawlers that were animals, Wisps that were thoughts, Brutes that were walls, Spitters that were people.`,
      ],
    },
    {
      id: 'sunforge',
      kicker: 'The hold',
      title: 'The Sunforge',
      paragraphs: [
        `Nine hundred years of light, folded into one cracked crystal, set in a ring of pedestals. It hums when you stand near it. It remembers every hand that mended it, which is why it mends you back.`,
        `The Sunforge is not a weapon. It is a lamp left on in a house everyone else abandoned. The horde comes for it because the Eclipse cannot stand a thing that refuses to be forgotten.`,
      ],
    },
    {
      id: 'sigils',
      kicker: 'The six',
      title: 'The Six Sigils',
      paragraphs: [
        `When the light broke, it did not scatter. It split along six seams, and each seam kept a habit.`,
        `Ember remembers the first flame and never stops burning. Tide remembers every wound and closes them. Gale remembers being faster than the thing that chased it. Stone remembers being too old to move. Lumen remembers the truth at speed. Umbra remembers the dark, and how to take from it.`,
        `You carry one. It is not a weapon you picked up; it is a thing you agreed to be for the length of a run.`,
      ],
    },
    {
      id: 'forms',
      kicker: 'The fusion',
      title: 'The Forged Forms',
      paragraphs: [
        `A sigil alone is an argument. Two sigils are a conversation, and at level three the sun allows it.`,
        `Ember and Stone become Magma, a walking volcano. Ember and Gale become Storm, violence at the speed of thought. Tide and Gale become Frost, stillness weaponised. Lumen and Umbra become Void, light and dark starving together. Tide and Stone become Verdant, and the ground remembers how to heal.`,
        `The form is not a costume. Your attack, your passive and your ultimate all change with it — and so does the way you have to stand.`,
      ],
    },
    {
      id: 'horde',
      kicker: 'The children',
      title: 'The Horde',
      paragraphs: [
        `Crawlers run. Wisps drift and sting from range. Brutes are slow, and being slow is the only mercy they offer. Spitters keep their distance and spit what the Eclipse made of them.`,
        `They share one thought: the nearest light. In the Siege that means your towers and your core — which is why standing in a Crawler's path is a real tactic and not a brave one.`,
      ],
    },
    {
      id: 'wardens',
      kicker: 'The crown',
      title: 'The Wardens',
      paragraphs: [
        `Every fifth wave, the Eclipse sends something with a name.`,
        `The Rift Warden is the First Wound, all volleys and a telegraphed charge. The Ashen Colossus is the Grief of Mountains, and it fights like a landslide with a grudge. The Void Herald is the Quiet Between Stars — it does not shout, it simply removes. And last is Helios Unbound, the Sun That Remembers, which is what the light becomes when it is left alone too long with its own memory.`,
        `They were keepers once. The Codex does not say of what.`,
      ],
    },
    {
      id: 'pilgrim',
      kicker: 'The road',
      title: 'The Pilgrim Road',
      paragraphs: [
        `Not every piece of the dawn stayed in the Sunforge. One reliquary was carried out before the Eclipse closed, and it has been walking ever since — five waystones, one long loop, no shelter.`,
        `It only moves while someone is beside it and the road ahead is clear, and it dims when it is left alone. Every enemy that reaches it tears a little of the dawn out. You are not escorting a box. You are escorting the last lit window on the road.`,
      ],
    },
    {
      id: 'circles',
      kicker: 'The ritual',
      title: 'The Ember Circles',
      paragraphs: [
        `Three circles were cut into the arena floor before anyone thought to ask why. Stand in one and it takes your warmth and gives it back as charge. Stand in it while something else is standing in it and it takes nothing at all.`,
        `Seal all three and the ritual completes. Fail, and the flame gutters — which is the polite word for the dark arriving.`,
      ],
    },
    {
      id: 'last-hour',
      kicker: 'The clock',
      title: 'The Last Hour',
      paragraphs: [
        `Sometimes the Eclipse does not bother with a siege. It simply begins to set, and the whole arena becomes a countdown.`,
        `Twelve waves, one sunset. Every kill buys back a heartbeat; every warden buys more. There is no breather built into the Blitz — the only rest you get is the one you make.`,
      ],
    },
    {
      id: 'ring',
      kicker: 'The duel',
      title: 'The Ring',
      paragraphs: [
        `No core. No towers. No road. Four champions, one at a time, each carrying more of the Eclipse than the last.`,
        `The duel is the oldest argument the arena knows: if the light is worth keeping, then a single person holding it should be able to say so out loud, with nothing between them and the dark.`,
      ],
    },
    {
      id: 'descent',
      kicker: 'The climb down',
      title: 'The Descent',
      paragraphs: [
        `The Codex does not record victories as endings. Every mission completed is a step further down — a descent, not a fall. The Eclipse leans in a little closer each time: the horde arrives with more health and heavier hands.`,
        `There are five steps before the arena stops counting. You can always step back. The road remembers the way up, and it does not hold it against you.`,
        `And the dawn pays for the depth. Every rank multiplies the sunmarks a run earns — the Descent is the one place in the game where the risk and the reward are the same number.`,
      ],
    },
    {
      id: 'archive',
      kicker: 'The account',
      title: 'The Dawn Codex',
      paragraphs: [
        `Sunmarks are what the dawn owes you for the runs it did not survive. They are paid out when a run ends, they are never lost, and they buy permanent things: a relic choice, a reroll, a head start, a second wind.`,
        `The Codex also keeps a list of things you have already done once — achievements, best waves per tier, every relic you have been offered. It is the only part of the game that outlives a death. Treat it kindly.`,
      ],
    },
  ],
};

/* ------------------------------------------------------------
   GUIDE — how to play, in the order a new player needs it.
   ------------------------------------------------------------ */
export const GUIDE = {
  intro:
    'Everything below is true of the current build. If you only read one section, read the first one and the tips at the end.',
  sections: [
    {
      id: 'start',
      kicker: 'First run',
      title: 'Start here',
      body: [
        `Settings → Interface → Menus decides how much this screen asks of you: Simple (four missions, Solar only), Default (six missions and every difficulty tier) or Complex (all eight missions with Eclipse Pacts and Skill Runs). Nothing is locked away — change the depth whenever you like.`,
        `Pick a sigil on the mission screen. All six are viable; they differ in rhythm. Ember and Stone hit slowly and hard, Gale and Lumen hit fast and precise, Tide and Umbra trade damage for sustain.`,
        `Pick a mission. Sunforge Siege is the default and the best place to learn: there is a core to defend, so your mistakes are survivable for a while. Warden Duel is the opposite — one champion, no adds, nothing to hide behind.`,
        `Pick a difficulty. Solar is the balance point. Kindled is a gentler descent. Umbral and Hardcore unlock as you prove the run can be finished, and they pay more sunmarks for it.`,
        `Then hold the line. A Siege run is ${SIEGE.goalWave} waves; a Blitz is ${BLITZ.goalWave} on a clock; a Caravan is one long road; a Duel is four champions.`,
      ],
    },
    {
      id: 'controls',
      kicker: 'Hands',
      title: 'Controls',
      body: [
        `You fire automatically at whatever is nearest, so your hands are for movement, timing and the three buttons that matter: Dash, Surge, Ultimate.`,
      ],
      controls: true,
      note: `Every key can be rebound in Settings. The defaults are ${KEYBINDS.map(([k, v]) => k + ' for ' + v.toLowerCase()).slice(0, 4).join('; ')}.`,
    },
    {
      id: 'screen',
      kicker: 'Reading it',
      title: 'Reading the screen',
      body: [
        `Top left is you: sigil, health, shield, level. Top centre is the wave — and, during a boss, the warden's health underneath it. Top right is the clock in Blitz, the core's integrity in the Siege, or the objective counter for the other missions.`,
        `Bottom left is your build: the boons you have taken and how many times. Bottom centre is your kit: Dash, Surge, and the Ultimate charge. Bottom right is your shards and the Forge.`,
        `If the objective bar turns red, something is being lost. Read the objective line before you read anything else.`,
      ],
    },
    {
      id: 'levels',
      kicker: 'The draft',
      title: 'Levels and boons',
      body: [
        `Kills drop essence; essence levels you. Every level opens a draft of three boons — damage, tempo, projectiles, pierce, crit, lifesteal, movement, health, shields, thorns, orbs.`,
        `Boons stack up to their own limit, and the card tells you which rarity you are being offered: common, rare, epic, legendary. Some runs give you rerolls; spend them on a draft you cannot use.`,
        `You can store a level-up with ${keyLabel('KeyL')} and open it later, which is how you avoid drafting in the middle of a warden's charge.`,
      ],
    },
    {
      id: 'fusion',
      kicker: 'The second seam',
      title: 'Fuse at level three',
      body: [
        `From level three, drafts can offer an Attune card: a second sigil. Take it and the two elements collapse into a hybrid form with its own attack, passive and ultimate.`,
        `There are five forms — ${Object.values(FUSIONS).map(f => f.name).join(', ')} — and each one changes how you should be standing, not just how hard you hit. A fusion is the single biggest power spike in a run, and the run is usually built around it.`,
      ],
    },
    {
      id: 'weapons',
      kicker: 'In hand',
      title: 'Two arms and a ward',
      body: [
        `You carry two weapons and one defence: a firing hand, a second arm that fires on its own beat for ${Math.round(WEAPON_RANK.sidearmDamage * 100)}% damage at ${Math.round(WEAPON_RANK.sidearmRange * 100)}% reach, and a ward — ${Object.values(WARDS).map(w => w.name).join(', ')}. Drafts offer an empty slot before anything else, and two options each time, so the pick is yours.`,
        `Ranks are earned, not handed out. A weapon holds ${WEAPON_RANK.max} ranks worth +${Math.round(WEAPON_RANK.perRank * 100)}% damage each, and the second arm's ranks also buy ${Math.round(WEAPON_RANK.sidearmRankTempo * 100)}% fire rate and ${Math.round(WEAPON_RANK.sidearmRankReach * 100)}% reach; a ward holds ${WARD_MAX_RANK}, and each of its ranks multiplies its whole effect — the card prints the numbers. Every level's draft offers a rank to the piece that is furthest behind, so focusing one arm to legendary costs the other its growth. The firing hand cannot be left behind, though: while it sits below one rank per ${WEAPON_RANK.step} levels, its rank card is guaranteed in the draft. Rarity follows rank — common, rare, epic, legendary — and at levels ${WEAPON_RANK.swapLevels.join(', ')} a rival weapon is offered outright. A replacement starts again at rank 1: a swap is a commitment.`,
        `Range is short on purpose. A shot loosed at a target within ${WEAPON_RANK.closeRange} paces hits ${Math.round((WEAPON_RANK.closeBonus - 1) * 100)}% harder, which rewards standing your ground instead of kiting; Long Shot (+15%) and Far Sight (+25%) are the boons that buy reach back. The HUD shows the firing hand, its rank and rarity, then the second arm and the ward.`,
      ],
    },
    {
      id: 'relics',
      kicker: 'The hoard',
      title: 'Relics',
      body: [
        `Elites sometimes drop a relic draft; wardens usually do; Sunless Vaults always can. There are three slots — ${Object.values(RELIC_SLOTS).map(s => s.name.toLowerCase()).join(', ')} — and a relic can be ranked up when you meet it again.`,
        `Relics are where a build becomes a build. A run with three ranked signets and no fusion is a different animal from a run with one crown and nothing else.`,
      ],
    },
    {
      id: 'economy',
      kicker: 'Shards',
      title: 'Shards, the Forge and repairs',
      body: [
        `Clearing waves, felling wardens and calling waves early all pay sun shards. Shards buy towers on the pedestals around the core (${keyLabel('KeyB')} opens the Forge) and upgrades for the towers you already own.`,
        `Hold ${keyLabel('KeyE')} near the core or a damaged tower to repair it by hand. It is free and it is slow, and standing still with your hands full is exactly what the horde wants.`,
        `Towers hold; they do not win. In Sunfall Lanes only your own fire can break a Rift Gate, and in the Siege only your own fire kills the warden.`,
      ],
    },
    {
      id: 'waves',
      kicker: 'Pressure',
      title: 'Waves, wardens and bonuses',
      body: [
        `Every fifth wave is a warden: ${BOSSES.map(b => b.name).join(', ')}. Deeper difficulty tiers start further along that list, so a Hardcore run meets different wardens than a Solar one.`,
        `Every third wave sends a crowned mini-boss ahead of the horde — a Cinder Herald or a Glass Revenant. They hit like elites, carry far more health, and always drop a shard.`,
        `Kills can shed kindling — a burning mote that drifts to you if you are close and pulls itself in if you are not. Elites drop three and wardens drop four. Collect ${KINDLING.need} and the dawn answers with a Dawn Gift: +${Math.round(KINDLING.boostDamage * 100)}% damage for ${KINDLING.boostTime} seconds, plus what the mission actually needs — two shards and a mended core in Sunforge, four seconds on the clock in Blitz, reliquary repairs in Caravan, a circle charge in Ritual. Every second gift sends a wisp to fight beside you.`,
        `Bodies no longer carpet the arena. Fallen enemies ash out in a few seconds — a puff of ash, a sink, and they are gone.`,
        `From wave two, a wave can arrive blessed: more enemies for more shards, faster enemies for more marks, or a thinner horde with a smaller purse. The bonus is shown in the wave pill before the wave starts.`,
        `Every run opens on an empty arena and begins on its own after three seconds — enough to read the tier and see the ground. Press ${keyLabel('Enter')} to start wave one immediately.`,
        `You can always tell what you are looking at: your sigil and element name float above your head, and every enemy wears its element's sigil with a red ring underfoot. Weapons fire their own silhouettes — bolts, blades, needles and boulders.`,
        `Press ${keyLabel('Enter')} during the breather to call the next wave early for bonus essence. It is the fastest way to level, and the fastest way to die.`,
      ],
    },
    {
      id: 'death',
      kicker: 'After',
      title: 'Death, dawn and the Descent',
      body: [
        `A run ends when you die, when the core falls, or when the clock or the ritual runs out. What it earned is banked as sunmarks and achievements — nothing you did is wasted.`,
        `Complete a mission and the Descent rises one step, up to ${DESCENT.max}. Each step makes the next run harder: +${Math.round(DESCENT.hp * 100)}% enemy health and +${Math.round(DESCENT.damage * 100)}% enemy damage per rank. It also pays: every sunmark a run earns is multiplied by +${Math.round(DESCENT.markStep * 100)}% per rank, and the results screen shows the multiplier you were paid. You can step back down from the results screen or the mission select at any time.`,
        `Sunmarks buy permanent rewards in the Dawn Codex: extra relic choices, boon rerolls, starting shards, a second wind, and more.`,
      ],
    },
    {
      id: 'tips',
      kicker: 'Field notes',
      title: 'Ten things that will save a run',
      tips: [
        `Stand inside the Sunforge Aegis when something is breaching it: +30% damage dealt, 25% less taken.`,
        `Dash through an attack, not away from it — the dash is the invulnerability, not the distance.`,
        `Kill the Spitters first. Everything else has to walk to you.`,
        `Bank a level-up before a warden wave and open it after the first volley.`,
        `Do not spend every shard on new towers; a rank-2 tower you repair beats two rank-1 towers you do not.`,
        `In the Caravan, the arrow above the reliquary points at the next checkpoint — the next unlit waystone, then the eastern rift — and the soft ground ring marks exactly where you have to stand. It tints red when the road is contested. Clear the road it points down, never the road behind the reliquary.`,
        `In the Ritual, one sealed circle stays sealed — trade ground for time.`,
        `In the Blitz, the clock is fed by kills, so the last three enemies of a wave are worth more than the first ten.`,
        `A fusion at level three is worth more than four damage boons. Plan the draft around it.`,
        `If the Descent is biting, step back a rank. The records are kept per tier, not per pride.`,
      ],
    },
  ],
};

/* ------------------------------------------------------------
   MARKETING — press kit copy and the fact sheet.
   ------------------------------------------------------------ */
export const MARKETING = {
  hook: 'One sigil. Twenty waves. A sun that will not go out quietly.',
  elevator:
    'A browser roguelite about holding a light in a world that has decided to forget it. Six elemental sigils, five hybrid forms, eight missions and a descent that gets harder every time you win.',
  features: [
    { icon: '✦', title: 'Six sigils, five fusions', text: 'Every element plays differently, and any two can collapse into a hybrid form with its own attack, passive and ultimate.' },
    { icon: '◈', title: 'Eight ways to lose', text: 'Defend a core, break three rift gates, walk a reliquary home, seal three circles, outrun a sunset, or take the ring against four champions.' },
    { icon: '⚔', title: 'Wardens with names', text: 'Four bosses arrive on a fixed cadence, each with its own telegraphs, volleys and reinforcements.' },
    { icon: '✺', title: 'Kindling and Dawn Gifts', text: 'Kills shed burning motes. Eight of them summon a gift that answers the mission — a damage surge, a wisp helper, shards, seconds or repairs.' },
    { icon: '☀', title: 'Builds that snowball', text: 'Boons, relics and pacts stack into runs that end very differently from how they started.' },
    { icon: '⬢', title: 'A Descent that remembers', text: 'Every completed mission raises the difficulty one step — and you can always step back down.' },
    { icon: '✧', title: 'Runs, not grinds', text: 'A mission is ten to twenty-five minutes. Sunmarks and achievements carry between runs; nothing else has to.' },
  ],
  factSheet: [
    ['Genre', 'Action survival roguelite'],
    ['Platform', 'Desktop browser (WebGL)'],
    ['Price', 'Free to play'],
    ['Players', 'Single player'],
    ['Missions', '8 modes, 4 difficulty tiers, 5 descent ranks'],
    ['Menus', 'Simple, Default or Complex depth'],
    ['Kindling', '8 motes summon a mode-aware Dawn Gift'],
    ['Session', '10–25 minutes per mission'],
    ['Controls', 'Keyboard and mouse, fully rebindable'],
    ['Engine', 'Three.js / WebGL, no install'],
    ['Version', VERSION],
    ['Language', 'English'],
  ],
  assets: [
    { label: 'Storyboard sheet', path: '../marketing/helios-elements-storyboard.png', note: 'Five 1080p panels with captions' },
    { label: 'Sunfall Lanes', path: '../marketing/storyboard/01-sunfall-lanes.png', note: '1920×1080' },
    { label: 'Rift Warden', path: '../marketing/storyboard/02-warden.png', note: '1920×1080' },
    { label: 'Solar Caravan', path: '../marketing/storyboard/03-solar-caravan.png', note: '1920×1080' },
    { label: 'Eclipse Blitz', path: '../marketing/storyboard/04-eclipse-blitz.png', note: '1920×1080' },
    { label: 'Dawn Restored', path: '../marketing/storyboard/05-dawn-restored.png', note: '1920×1080' },
  ],
  // Add a real address before publishing; the site hides the row while this is null.
  contact: null,
};

/* ------------------------------------------------------------
   FAQ — the questions a new player actually asks.
   ------------------------------------------------------------ */
export const FAQ = [
  {
    q: 'Is Helios Elements free?',
    a: 'Yes. It runs in the browser with no install, no account and no purchase. Open the page and play.',
  },
  {
    q: 'Do I need an account?',
    a: 'No. Progress is saved in your browser’s local storage — sunmarks, achievements, unlocks, settings and your descent rank.',
  },
  {
    q: 'Does it work on mobile?',
    a: 'It is built for a keyboard and mouse. A phone or tablet will render it, but the controls assume WASD, a mouse and a few hotkeys.',
  },
  {
    q: 'How long is a run?',
    a: 'A Sunforge Siege is twenty waves, roughly fifteen to twenty-five minutes. Blitz and Duel are shorter; a Caravan is one long road.',
  },
  {
    q: 'What carries between runs?',
    a: 'Sunmarks, achievements, unlockable rewards, per-tier best waves and your descent rank. Boons, relics and shards do not.',
  },
  {
    q: 'What is the Descent?',
    a: 'A difficulty rank that rises by one each time you complete a mission, up to five. Each rank adds enemy health and damage — and multiplies the sunmarks every run pays by 15%, so the deeper descent is also the better-paid one. You can step back down from the results screen or the mission select.',
  },
  {
    q: 'What are sunmarks?',
    a: 'The permanent currency. Runs pay them out when they end; the Dawn Codex spends them on rewards like extra relic choices, rerolls, starting shards and a second wind.',
  },
  {
    q: 'Why can’t I see every mission?',
    a: 'Settings → Interface → Menus sets how much the game shows you. Simple offers four missions on one difficulty, Default offers six with every tier and the Descent, and Complex opens all eight missions plus Eclipse Pacts, Skill Runs and the full Codex. Nothing is removed — change the depth whenever you like.',
  },
  {
    q: 'Can I lose my progress?',
    a: 'Only by clearing the site’s stored data or using a private window. There is no cloud save yet, but Settings → Save can copy your progress as text or download it as a file, and import it back on any browser.',
  },
  {
    q: 'Are the keys rebindable?',
    a: 'Yes — Settings has a full rebind list for movement, dash, surge, ultimate, Forge, repair, wave call, level-up and pause.',
  },
  {
    q: 'Is there a story?',
    a: 'There is a whole archive of it in the Dawn Codex, and the lore section of this site is the same text. Nothing is gated behind progress.',
  },
];

/* ------------------------------------------------------------
   CHANGELOG — newest first. Add an entry every release.
   ------------------------------------------------------------ */
export const CHANGELOG = [
  {
    version: '1.7.6',
    date: '2026-11-23',
    title: 'What the dead leave behind',
    items: [
      'Kindling: kills can shed a burning mote. Eight motes summon a Dawn Gift — +35% damage for 18 seconds, shown in the HUD meter beside the shard count. Elites drop three, wardens four.',
      'Dawn Gifts answer the mission: two shards and a mended core in Sunforge Siege, four seconds back on the clock in Eclipse Blitz, reliquary repair in Solar Caravan, a circle charge in Blind Ritual — and every second gift calls a wisp to fight beside you.',
      'Fallen enemies now dissolve in seconds instead of lingering: a puff of ash at the moment of death, then a shrink and sink that clears the arena in seven seconds (ten for elites, sixteen for wardens).',
      'Runs begin on their own: wave one starts three seconds after the arena opens, with the countdown in the HUD — Enter starts it immediately.',
      'Characters and weapons read better: the guardian carries its sigil and element name overhead, enemies wear their element sigil and a red hostile ring, and each weapon class fires its own projectile silhouette from a crystal focus that recoils.',
      'Two new wardens (Cinder Tyrant, Stormglass Seraph) and two crowned mini-bosses: every third wave sends a Cinder Herald or Glass Revenant ahead of the horde, and deeper tiers meet the newer wardens.',
      'Essence buys less: the level curve is roughly 60% longer, and drafts earned during a live wave are stored and opened when the wave clears instead of freezing the fight.',
      'A loadout instead of a single gun: two weapons (the second fires slower for 60% damage and 85% range, and each of its ranks adds 6% fire rate and 4% reach) and one ward — Aegis, Briar, Pyre or Tidewell — with three ranks of its own, all shown in the HUD.',
      'Ranks are drafted, not automatic: each level offers a rank to the piece furthest behind (+20% damage per weapon rank, rarity follows rank), so where you spend growth is a decision. The firing hand’s rank card is guaranteed while it falls behind one rank per four levels, so it can no longer stall; replacement weapons at levels 5, 9 and 13 still restart at rank 1. Rank cards now print what the pick buys — damage, rate and reach for an arm, the real shield and pulse numbers for a ward.',
      'Shorter reach, closer fights: projectiles travel about a quarter less far and lock on at 17 paces, but a shot fired inside six paces hits 14% harder, and waves now trickle in over a longer window instead of arriving as one wall.',
      'Solar Caravan has a wayfinder: an arrow that floats above the reliquary and points at the next checkpoint — the next unlit waystone, then the eastern rift — with a soft ground zone showing exactly where you must stand, green when clear and red when contested.',
    ],
  },
  {
    version: '1.7.5',
    date: '2026-11-23',
    title: 'Three depths of menu',
    items: [
      'Settings → Interface → Menus. Simple shows four missions and one difficulty; Default shows six missions, every difficulty, the Descent and weapon choice; Complex opens all eight missions, Eclipse Pacts, Skill Runs and the whole Codex.',
      'A run only ever uses what the chosen depth shows: hidden pacts, skill runs, weapon choices and difficulty tiers are switched off for that run instead of silently applying.',
      'The first wave no longer starts on its own — the arena opens empty and waits for Enter or the Begin button.',
    ],
  },
  {
    version: '1.7.4',
    date: '2026-11-23',
    title: 'The Descent pays, and progress is portable',
    items: [
      'The Descent now pays: every sunmark a run earns is multiplied by +15% per descent rank (rank 5 pays ×1.75), shown on the results screen and explained in the Codex.',
      'Settings → Save: export your progress as text or a downloadable file, and import one to restore it or move between browsers.',
    ],
  },
  {
    version: '1.7.3',
    date: '2026-11-23',
    title: 'The Descent and the long road',
    items: [
      'Added the Descent: every completed mission raises a persistent difficulty rank (0–5), +7% enemy health and +5% damage per rank, with a Step Back control on the results screen and the mission select.',
      `Rebuilt Solar Caravan on an eight-point pilgrim road (${Math.round(ESCORT.route.reduce((n, p, i, a) => i ? n + Math.hypot(p[0] - a[i - 1][0], p[1] - a[i - 1][1]) : 0, 0))} m) with five waystones, 800 integrity and a faster reliquary.`,
      'Warden waves in Eclipse Blitz now scale their sunset clock to the warden’s health, so boss fights are set by health rather than the horde timer.',
      'Codex: new Lore and How to Play chapters, and the public site now renders from the same content file.',
    ],
  },
];

/* ------------------------------------------------------------
   Derived helpers — keep prose honest about the live data.
   ------------------------------------------------------------ */
export const MODE_LIST = Object.values(MODES).map(m => ({
  key: m.key, name: m.name, sigil: m.sigil, css: m.css,
  kicker: m.kicker, tagline: m.tagline, goal: m.goal, desc: m.desc, steps: m.steps || [],
}));

export const SIGIL_LIST = Object.values(ELEMENTS).map(el => ({
  key: el.key, name: el.name, sigil: el.sigil, css: el.css, role: el.role,
  tagline: el.tagline, blurb: el.blurb, passive: el.passive,
  surge: el.surge?.name, ult: el.ult?.name,
}));

export const FORM_LIST = Object.values(FUSIONS).map(f => ({
  key: f.key, name: f.name, sigil: f.sigil, css: f.css, role: f.role,
  tagline: f.tagline, blurb: f.blurb, passive: f.passive,
  pair: f.pair.map(k => ELEMENTS[k]?.name || k), ult: f.ult?.name,
}));

export const WARDEN_LIST = BOSSES.map((b, i) => ({
  name: b.name, title: b.title, css: b.css, wave: (i + 1) * 5, element: ELEMENTS[b.element]?.name || '',
}));

export const TIER_LIST = Object.entries(DIFFICULTIES).map(([key, d]) => ({
  key, name: d.name, icon: d.icon, css: d.css, short: d.short, tagline: d.tagline, desc: d.desc,
}));

export const PACT_LIST = Object.values(PACTS).map(p => ({ key: p.key, name: p.name, icon: p.icon, desc: p.desc, max: p.max }));

export const CONTROL_LIST = CONTROL_ACTIONS.map(a => ({ name: a.name, key: keyLabel(a.def) }));

export const RARITY_LIST = Object.entries(RARITY).map(([key, r]) => ({ key, name: r.name, css: r.css }));

export const DESCENT_INFO = {
  max: DESCENT.max,
  hp: DESCENT.hp,
  damage: DESCENT.damage,
  text: `Each completed mission adds one rank, up to ${DESCENT.max}. Each rank makes the next run +${Math.round(DESCENT.hp * 100)}% enemy health and +${Math.round(DESCENT.damage * 100)}% enemy damage.`,
};
