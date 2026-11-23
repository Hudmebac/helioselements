/* ============================================================
   HELIOS ELEMENTS — public site
   Renders from js/codex.js (the same file the in-game Dawn Codex
   reads). Nothing on this page should be hand-written twice.
   ============================================================ */
import {
  META, LORE, GUIDE, MARKETING, FAQ, CHANGELOG,
  MODE_LIST, SIGIL_LIST, FORM_LIST, WARDEN_LIST, TIER_LIST, PACT_LIST,
  CONTROL_LIST, DESCENT_INFO,
} from '../js/codex.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------------- hero ---------------- */
$('hero-eyebrow').textContent = `Browser roguelite · v${META.version}`;
$('hero-title').textContent = META.tagline;
$('hero-lede').textContent = META.oneLiner;
$('hero-fine').textContent = 'Free · no install · no account · runs in your browser';

/* ---------------- about ---------------- */
$('about-copy').innerHTML = META.longDescription.map((p) => `<p>${esc(p)}</p>`).join('');
$('about-stats').innerHTML = [
  [MODE_LIST.length, 'missions'],
  [SIGIL_LIST.length, 'sigils'],
  [FORM_LIST.length, 'forged forms'],
  [WARDEN_LIST.length, 'wardens'],
].map(([n, label]) => `<div class="stat"><b>${n}</b><span>${label}</span></div>`).join('');

/* ---------------- missions ---------------- */
$('mission-grid').innerHTML = MODE_LIST.map((m) => `
  <article class="card" style="--ec:${m.css}">
    <div class="card-top">
      <span class="card-sigil">${m.sigil}</span>
      <div><div class="card-name">${esc(m.name)}</div><div class="card-role">${esc(m.kicker)}</div></div>
    </div>
    <p>${esc(m.desc)}</p>
    ${m.steps.length ? `<ul>${m.steps.slice(0, 3).map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
    <div class="card-meta"><span>${esc(m.tagline)}</span><b>${esc(m.goal)}</b></div>
  </article>`).join('');

/* ---------------- sigils + forms ---------------- */
$('sigil-grid').innerHTML = SIGIL_LIST.map((s) => `
  <article class="card" style="--ec:${s.css}">
    <div class="card-top">
      <span class="card-sigil">${s.sigil}</span>
      <div><div class="card-name">${esc(s.name)}</div><div class="card-role">${esc(s.role)}</div></div>
    </div>
    <p>${esc(s.blurb)}</p>
    <p style="color:${s.css};font-size:13px">${esc(s.passive)}</p>
    <div class="card-meta"><span>Surge · ${esc(s.surge || '')}</span><b>${esc(s.ult || '')}</b></div>
  </article>`).join('');

$('fusion-row').innerHTML = FORM_LIST.map((f) => `
  <div class="fusion" style="--ec:${f.css}">
    <div class="pair">${f.pair.map(esc).join(' + ')}</div>
    <b>${esc(f.name)}</b>
    <span>${esc(f.tagline)}</span>
  </div>`).join('');

/* ---------------- lore ---------------- */
$('lore-intro').textContent = LORE.intro;
$('lore-chapters').innerHTML = LORE.chapters.map((c, i) => `
  <details class="chapter" id="lore-${c.id}" ${i === 0 ? 'open' : ''}>
    <summary><span class="kicker">${esc(c.kicker)}</span><h3>${esc(c.title)}</h3></summary>
    <div class="chapter-body">${c.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
  </details>`).join('');

/* ---------------- guide ---------------- */
$('guide-intro').textContent = GUIDE.intro;
$('guide-sections').innerHTML = GUIDE.sections.map((s) => `
  <article class="guide-section" id="guide-${s.id}">
    <div class="kicker">${esc(s.kicker)}</div>
    <h3>${esc(s.title)}</h3>
    ${(s.body || []).map((p) => `<p>${esc(p)}</p>`).join('')}
    ${s.controls ? `<div class="controls-table">${CONTROL_LIST.map((c) => `<div class="control-row"><span>${esc(c.name)}</span><kbd>${esc(c.key)}</kbd></div>`).join('')}</div>` : ''}
    ${s.note ? `<p class="fine" style="margin-top:14px">${esc(s.note)}</p>` : ''}
    ${s.tips ? `<ol class="tips">${s.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>` : ''}
  </article>`).join('');

/* ---------------- descent ---------------- */
$('descent-copy').textContent = DESCENT_INFO.text;
$('descent-meter').innerHTML = Array.from({ length: DESCENT_INFO.max }, (_, i) => `<i style="height:${34 + i * 17}px"></i>`).join('');

/* ---------------- faq ---------------- */
$('faq-list').innerHTML = FAQ.map((f, i) => `
  <details ${i === 0 ? 'open' : ''}>
    <summary>${esc(f.q)}</summary>
    <p>${esc(f.a)}</p>
  </details>`).join('');

/* ---------------- press ---------------- */
$('press-hook').textContent = MARKETING.hook;
$('feature-grid').innerHTML = MARKETING.features.map((f) => `
  <article class="card">
    <div class="card-top"><span class="card-sigil">${f.icon}</span><div class="card-name" style="font-size:16px">${esc(f.title)}</div></div>
    <p>${esc(f.text)}</p>
  </article>`).join('');
$('fact-table').innerHTML = MARKETING.factSheet
  .map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('');
$('asset-list').innerHTML = MARKETING.assets
  .map((a) => `<li><a href="${a.path}" download>${esc(a.label)}</a><span>${esc(a.note)}</span></li>`).join('');
if (MARKETING.contact) $('press-contact').textContent = `Press contact: ${MARKETING.contact}`;
else $('press-contact').remove();

/* ---------------- screens ---------------- */
$('gallery').innerHTML = MARKETING.assets
  .filter((a) => a.path.includes('/storyboard/'))
  .map((a) => `<figure><a href="${a.path}" target="_blank" rel="noopener"><img src="${a.path}" alt="${esc(a.label)} gameplay" loading="lazy" width="1920" height="1080"></a><figcaption>${esc(a.label)}</figcaption></figure>`)
  .join('');

/* ---------------- changelog ---------------- */
$('changelog').innerHTML = CHANGELOG.map((r) => `
  <article class="release">
    <div class="release-head"><b>v${esc(r.version)}</b><span>${esc(r.date)}</span></div>
    <h3>${esc(r.title)}</h3>
    <ul>${r.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
  </article>`).join('');

/* ---------------- closing + meta ---------------- */
$('play-copy').textContent = `${META.shortDescription} Progress saves in your browser, so you can close the tab and come back to the same Descent.`;
$('footer-meta').textContent = `v${META.version} · ${MODE_LIST.length} missions · ${SIGIL_LIST.length} sigils · ${TIER_LIST.length} difficulty tiers · ${PACT_LIST.length} pacts`;
