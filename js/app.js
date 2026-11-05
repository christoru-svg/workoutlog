import { load, save, flush } from './store.js';
import { seed } from './seed.js';
import { SPRITE, PICTOS, picto, logo } from './pictos.js';

const app = document.getElementById('app');
const sheetEl = document.getElementById('sheet');
const toastEl = document.getElementById('toast');

let S = null;          // état complet de l'app
let sheetCtx = {};     // données temporaires du panneau ouvert
let exFilter = 'all';  // filtre de la liste d'exercices

/* ---------- Utilitaires ---------- */
const DAY_L = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const DAY_S = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
const MON = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MON_S = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const EQUIPS = ['Poulie', 'Machine', 'Haltères', 'Barre', 'Au sol', 'Banc à 45°', 'Élastique', 'Kettlebell'];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const STATUS = {
  ok: { label: 'Validé', hint: 'Fait partie des séances.' },
  warn: { label: 'Avec précaution', hint: "Reste dans les séances, consigne affichée pendant l'exercice." },
  stop: { label: 'À éviter', hint: "Retiré des séances, gardé dans l'historique." },
};
const FEEL = { easy: { label: 'Facile', cls: 'ok' }, ok: { label: 'Modéré', cls: 'acc' }, hard: { label: 'Dur', cls: 'stop' } };

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const num = (v) => { if (v === '' || v == null) return null; const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };
const int = (v, min, max, def) => { const n = Math.round(num(v)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def; };
const fnum = (n) => (n == null ? '' : String(Math.round(n * 10) / 10).replace('.', ','));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const dShort = (t) => { const d = new Date(t); return `${DAY_S[d.getDay()]} ${d.getDate()} ${MON_S[d.getMonth()]}`; };
const dLong = (t) => { const d = new Date(t); return cap(`${DAY_L[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`); };
const dNum = (t) => { const d = new Date(t); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`; };
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
const mins = (ms) => Math.max(1, Math.round(ms / 60000));
const clock = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return (h ? `${h}:${String(m).padStart(2, '0')}` : `${m}`) + ':' + String(x).padStart(2, '0');
};
const ago = (t) => {
  const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  const d1 = new Date(t); d1.setHours(0, 0, 0, 0);
  const n = Math.round((d0 - d1) / 864e5);
  return n <= 0 ? "aujourd'hui" : n === 1 ? 'hier' : `il y a ${n} j`;
};
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
const byName = (a, b) => a.name.localeCompare(b.name, 'fr');

const exById = (id) => S.exercises.find((e) => e.id === id);
const tplById = (id) => S.templates.find((t) => t.id === id);
const sessById = (id) => S.sessions.find((s) => s.id === id);
const exName = (ex) => (ex ? `${ex.name}${ex.equip ? ' · ' + ex.equip : ''}` : 'Exercice supprimé');
const thumb = (ex, cls = 'thumb') => (ex?.photo ? `<img class="${cls}" src="${ex.photo}" alt="">` : picto(ex?.picto, cls));
const activeItems = (t) => t.items.map(exById).filter((e) => e && e.status !== 'stop');
const entryDone = (e) => e.skipped || e.sets.every((s) => s.done);
const th = () => S.settings.painThreshold;

function fmtTarget(ex) {
  if (!ex) return '';
  const side = ex.perSide ? '/côté' : '';
  if (ex.kind === 'time') {
    const v = ex.secs >= 120 && ex.secs % 60 === 0 ? `${ex.secs / 60} min` : `${ex.secs} s`;
    return ex.sets > 1 ? `${ex.sets} × ${v}${side}` : `${v}${side}`;
  }
  let s = `${ex.sets} × ${ex.reps}${side}`;
  if (ex.bodyweight) s += ' · PDC';
  else if (ex.load != null) s += ` · ${fnum(ex.load)} kg`;
  return s;
}

function commit() { save(S); }
const fmtSecs = (v) => (v == null ? '—' : v >= 120 && v % 60 === 0 ? `${v / 60} min` : `${v} s`);

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { toastEl.hidden = true; }, 2800);
}

// Bouton en deux temps (remplace les boîtes de confirmation)
function armed(el, label) {
  if (el.dataset.armed) return true;
  el.dataset.orig = el.textContent;
  el.dataset.armed = '1';
  el.textContent = label;
  setTimeout(() => { if (el.isConnected && el.dataset.armed) { delete el.dataset.armed; el.textContent = el.dataset.orig; } }, 4000);
  return false;
}

/* ---------- Icônes ---------- */
const I = {
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  more: '<svg viewBox="0 0 24 24"><circle class="f" cx="12" cy="5" r="1.7"/><circle class="f" cx="12" cy="12" r="1.7"/><circle class="f" cx="12" cy="19" r="1.7"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M6 3h11a2 2 0 0 1 2 2v16H8a3 3 0 0 1-3-3V5a2 2 0 0 1 1-2z"/><path d="M5 18a3 3 0 0 1 3-3h11M9 7h6"/></svg>',
  dumbbell: '<svg viewBox="0 0 24 24"><path d="M6.5 7v10M3.5 9.5v5M17.5 7v10M20.5 9.5v5M6.5 12h11"/></svg>',
};

/* ---------- Composants de formulaire ---------- */
const scale = (name, val) => `<div class="scale" role="radiogroup">${Array.from({ length: 11 }, (_, i) =>
  `<label><input class="vh" type="radio" name="${name}" value="${i}" ${val === i ? 'checked' : ''} aria-label="${i} sur 10"><span>${i}</span></label>`).join('')}</div>`;
const seg = (name, opts, val) => `<div class="seg">${opts.map(([v, l]) =>
  `<label><input class="vh" type="radio" name="${name}" value="${v}" ${String(val) === String(v) ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>`;
const chk = (name, v, l, on = false) => `<label><input class="vh" type="checkbox" name="${name}" value="${v}" ${on ? 'checked' : ''}><span>${l}</span></label>`;

/* ---------- Panneau (bottom sheet) ---------- */
function openSheet(html, label = 'Panneau') {
  sheetEl.innerHTML = `<div class="backdrop" data-act="closeSheet"></div><div class="panel" role="dialog" aria-modal="true" aria-label="${esc(label)}"><div class="grab"></div>${html}</div>`;
  sheetEl.hidden = false;
  document.body.classList.add('noscroll');
  const first = sheetEl.querySelector('input:not(.vh), textarea');
  if (first && !matchMedia('(pointer: coarse)').matches) first.focus();
}
function closeSheet() {
  sheetEl.hidden = true;
  sheetEl.innerHTML = '';
  document.body.classList.remove('noscroll');
  sheetCtx = {};
}

/* ---------- Données dérivées ---------- */
function nextMorning(t) { const d = new Date(t); d.setDate(d.getDate() + 1); d.setHours(5, 0, 0, 0); return d.getTime(); }
function pendingJ1() {
  const now = Date.now();
  return S.sessions.filter((s) => !s.j1 && s.end && now >= nextMorning(s.end) && now - s.end < 4 * 864e5);
}
function lastDone(t) { const s = S.sessions.filter((x) => x.templateId === t.id).slice(-1)[0]; return s ? s.start : 0; }
function nextPlanned() {
  const today = new Date();
  for (let i = 0; i <= 7; i++) {
    const d = (today.getDay() + i) % 7;
    for (const t of S.templates.filter((x) => x.day === d)) {
      if (i === 0 && S.sessions.some((s) => s.templateId === t.id && sameDay(s.start, today))) continue;
      return { tpl: t, label: i === 0 ? "Aujourd'hui" : i === 1 ? 'Demain' : cap(DAY_L[d]) };
    }
  }
  if (!S.templates.length) return null;
  const t = [...S.templates].sort((a, b) => lastDone(a) - lastDone(b))[0];
  return { tpl: t, label: 'Prochaine séance' };
}
function entryHistory(exId, before = Infinity, max = 2) {
  const out = [];
  for (let i = S.sessions.length - 1; i >= 0 && out.length < max; i--) {
    const s = S.sessions[i];
    if (s.start >= before) continue;
    const e = s.entries.find((x) => x.exId === exId && x.sets.some((y) => y.done));
    if (e) out.push({ s, e });
  }
  return out;
}
function suggestion(ex) {
  const hist = entryHistory(ex.id);
  if (!hist.length) return null;
  const last = hist[0];
  if (last.s.j1 && last.s.j1.eva > th()) {
    return { type: 'hold', text: `Lendemain à ${last.s.j1.eva} la dernière fois (seuil ${th()}) : garde la charge, ou baisse-la si ça tire.` };
  }
  if (ex.kind === 'reps' && !ex.bodyweight && hist.length === 2 &&
      hist.every((h) => h.e.feel === 'easy' && h.s.j1 && h.s.j1.eva <= th())) {
    return { type: 'up', text: 'Facile deux fois de suite, lendemains calmes : tu peux essayer +2,5 kg.' };
  }
  return null;
}
function volume(s) {
  return s.entries.reduce((a, e) => a + e.sets.reduce((b, x) => b + (x.done && x.kg && x.reps ? x.kg * x.reps : 0), 0), 0);
}
function sessionPainLine(s) {
  const b = s.painBefore?.eva, a = s.painAfter?.eva;
  return `EVA ${b ?? '—'} → ${a ?? '—'}`;
}

/* ---------- Rendu ---------- */
function route() {
  const [v = 'home', id, sub] = (location.hash.slice(1) || 'home').split('/');
  return { v, id, sub };
}

function render() {
  const r = route();
  if (r.v === 'session' && !S.active) { location.replace('#home'); return; }
  let html;
  switch (r.v) {
    case 'templates': html = vTemplates(); break;
    case 'template': html = r.sub === 'edit' ? vTemplateEdit(r.id) : vTemplate(r.id); break;
    case 'session': html = vSession(); break;
    case 'log': html = r.id ? vLogDetail(r.id) : vLog(); break;
    case 'exercises': html = vExercises(); break;
    case 'settings': html = vSettings(); break;
    default: html = vHome();
  }
  const inSession = r.v === 'session';
  app.className = inSession ? 'in-session' : '';
  app.innerHTML = html + (inSession ? '' : tabbar(r.v));
  keepAwake(inSession);
}

function tabbar(v) {
  const cur = { home: 'home', settings: 'home', templates: 'templates', template: 'templates', log: 'log', exercises: 'exercises' }[v] || 'home';
  const tabs = [['home', 'Accueil', I.home], ['templates', 'Séances', I.list], ['log', 'Carnet', I.book], ['exercises', 'Exercices', I.dumbbell]];
  return `<nav class="tabbar" aria-label="Navigation principale"><div class="tabs">${tabs.map(([k, l, ic]) =>
    `<a href="#${k}" class="${cur === k ? 'on' : ''}" ${cur === k ? 'aria-current="page"' : ''}>${ic}<span>${l}</span></a>`).join('')}</div></nav>`;
}

const notFound = (back) => `<div class="empty"><p>Cet élément n'existe plus.</p><a class="btn sm" href="${back}">Retour</a></div>`;

/* Accueil */
function vHome() {
  const now = new Date();
  const h = now.getHours();
  const greet = h >= 5 && h < 18 ? 'Bonjour' : 'Bonsoir';
  let out = `<header class="row between"><div class="row">${logo(40)}<div class="t"><span class="small">${dLong(now)}</span><h1 class="h1">${greet}</h1></div></div><a class="iconbtn" href="#settings" aria-label="Réglages">${I.gear}</a></header>`;

  if (S.active) {
    const a = S.active;
    const done = a.entries.filter(entryDone).length;
    out += `<a class="card hl" href="#session"><span class="eyebrow">Séance en cours</span><strong class="h2">${esc(a.name)}</strong><span class="small mono">${done}/${a.entries.length} exercices · démarrée il y a ${mins(Date.now() - a.start)} min</span><span class="btn">Reprendre la séance</span></a>`;
  }
  out += pendingJ1().map(j1Card).join('');

  const nx = nextPlanned();
  if (nx && !S.active) {
    const t = nx.tpl;
    const last = S.sessions.filter((s) => s.templateId === t.id).slice(-1)[0];
    out += `<div class="card"><span class="small">${nx.label}</span><strong class="h2">${esc(t.name)}</strong>
      <span class="small mono">${activeItems(t).length} exercices · ~${Math.max(10, activeItems(t).length * 5)} min${last ? ' · dernière ' + ago(last.start) : ''}</span>
      <button class="btn" data-act="start" data-id="${t.id}">Démarrer la séance</button>
      ${S.templates.length > 1 ? '<a class="link" href="#templates">Choisir une autre séance</a>' : ''}</div>`;
  } else if (!S.templates.length) {
    out += `<div class="card"><strong>Aucune séance pour l'instant</strong><span class="small">Crée ta première séance à partir de tes exercices.</span><button class="btn" data-act="newTpl">Créer une séance</button></div>`;
  }
  out += painTrend();
  out += `<div class="grid2"><button class="btn ghost" data-act="newEx">+ Exercice</button><button class="btn ghost" data-act="newTpl">+ Séance</button></div>`;
  return `<div class="stack">${out}</div>`;
}

function j1Card(s) {
  return `<div class="card warnb"><span class="chip warn" style="justify-self:start"><span class="dot"></span>Bilan du lendemain</span>
    <strong>Comment va ton dos après la séance ${esc(s.letter || s.name)} de ${DAY_L[new Date(s.start).getDay()]} ?</strong>
    <button class="btn" data-act="j1" data-id="${s.id}">Faire le bilan (30 s)</button></div>`;
}

function painTrend() {
  const ss = S.sessions.slice(-8);
  const pts = ss.map((s) => s.j1?.eva ?? s.painAfter?.eva).filter((v) => v != null);
  if (pts.length < 2) {
    return `<div class="card"><span class="small">Douleur</span><span>Ta courbe de douleur apparaîtra après deux séances.</span></div>`;
  }
  const W = 300, H = 70, n = pts.length;
  const x = (i) => 8 + (i * (W - 16)) / (n - 1);
  const y = (v) => 60 - v * 5;
  const line = pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v)}`).join(' ');
  const first = avg(pts.slice(0, Math.ceil(n / 2))), second = avg(pts.slice(Math.floor(n / 2)));
  const trend = second < first - 0.4 ? ['ok', 'en baisse'] : second > first + 0.4 ? ['warn', 'en hausse'] : ['acc', 'stable'];
  const hasJ1 = ss.some((s) => s.j1);
  return `<div class="card"><div class="row between"><span class="small">${hasJ1 ? 'Douleur au réveil, dernières séances' : 'Douleur après tes séances'}</span><span class="chip ${trend[0]}"><span class="dot"></span>${trend[1]}</span></div>
    <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="Douleur de ${pts[0]} à ${pts[n - 1]}">
      <line class="ch-base" x1="0" y1="62" x2="${W}" y2="62"/>
      <path class="spark-a" d="${line} L${x(n - 1).toFixed(1)} 62 L${x(0)} 62Z"/>
      <path class="spark-l" d="${line}"/>
      <circle class="spark-d" cx="${x(n - 1).toFixed(1)}" cy="${y(pts[n - 1])}" r="4"/>
    </svg>
    <div class="row between small mono"><span>EVA ${pts[0]}</span><span>EVA ${pts[n - 1]}</span></div></div>`;
}

/* Séances */
function vTemplates() {
  const cards = S.templates.map((t, k) => {
    const items = t.items.map(exById).filter(Boolean);
    return `<div class="card"><div class="row between"><div class="t"><a href="#template/${t.id}" style="text-decoration:none"><strong class="h2">${esc(t.name)}</strong></a>
      <span class="small">${activeItems(t).length} exercices${t.day != null ? ' · ' + DAY_L[t.day] : ''}</span></div><span class="badge ${k % 2 ? 'alt' : ''}">${esc(t.letter || '•')}</span></div>
      ${items.slice(0, 3).map((e) => `<div class="li"><span class="dot c-${e.status}"></span><span>${esc(exName(e))}</span><span class="mono">${fmtTarget(e)}</span></div>`).join('')}
      <a class="link" href="#template/${t.id}" style="justify-self:end">${items.length ? 'Voir tout' : 'Ouvrir'}</a></div>`;
  }).join('');
  return `<div class="stack"><h1 class="h1">Séances</h1>${cards || '<div class="empty"><p>Aucune séance.</p></div>'}
    <button class="btn" data-act="newTpl">+ Nouvelle séance</button></div>`;
}

function vTemplate(id) {
  const t = tplById(id);
  if (!t) return notFound('#templates');
  const ss = S.sessions.filter((s) => s.templateId === t.id);
  let reg = '—';
  if (t.day != null) {
    const n = ss.filter((s) => s.start > Date.now() - 28 * 864e5).length;
    reg = `${Math.min(100, Math.round((n / 4) * 100))} %`;
  }
  const b = avg(ss.map((s) => s.painBefore?.eva).filter((v) => v != null));
  const j = avg(ss.map((s) => s.j1?.eva).filter((v) => v != null));
  const pain = b == null ? '—' : `${fnum(b)} → ${j == null ? '—' : fnum(j)}`;
  const items = t.items.map((xid) => {
    const e = exById(xid);
    if (!e) return '';
    return `<button class="exrow ${e.status === 'stop' ? 'stopped' : ''}" data-act="exEdit" data-id="${e.id}">${thumb(e, 'thumb sm')}
      <span class="t"><strong>${esc(exName(e))}</strong><span class="mono">${e.status === 'stop' ? 'À éviter · ignoré en séance' : fmtTarget(e)}</span></span><span class="dot c-${e.status}" aria-label="${STATUS[e.status].label}"></span></button>`;
  }).join('');
  const lasts = ss.slice(-3).reverse().map((s) =>
    `<a class="li" href="#log/${s.id}" style="text-decoration:none"><span></span><span>${cap(dShort(s.start))} · ${mins(s.end - s.start)} min</span><span class="mono">${s.j1 ? 'J+1 ' + s.j1.eva : sessionPainLine(s)}</span></a>`).join('');
  return `<div class="stack">
    <div class="band"><div class="row between"><a class="iconbtn" href="#templates" aria-label="Retour aux séances">${I.back}</a><button class="iconbtn" data-act="tplMenu" data-id="${t.id}" aria-label="Options de la séance">${I.more}</button></div>
      <h1 class="h1">${esc(t.name)}</h1>
      <div class="stats"><div><strong>${ss.length}</strong><span>séances</span></div><div><strong>${reg}</strong><span>régularité (4 sem.)</span></div><div><strong>${pain}</strong><span>douleur avant → J+1</span></div></div></div>
    ${items || '<div class="empty"><p>Cette séance est vide.</p></div>'}
    <a class="btn ghost" href="#template/${t.id}/edit">Modifier la séance</a>
    ${lasts ? `<div class="card"><span class="small">Dernières fois</span>${lasts}</div>` : ''}
    <div class="sticky-cta">${S.active ? '<a class="btn" href="#session">Reprendre la séance en cours</a>' : `<button class="btn" data-act="start" data-id="${t.id}">Démarrer</button>`}</div>
  </div>`;
}

function vTemplateEdit(id) {
  const t = tplById(id);
  if (!t) return notFound('#templates');
  const rows = t.items.map((xid, i) => {
    const e = exById(xid);
    return `<div class="editrow">${thumb(e, 'thumb sm')}<span class="t"><strong>${esc(exName(e))}</strong><span class="small mono">${fmtTarget(e)}</span></span>
      <span class="ctl"><button type="button" data-act="tplMove" data-id="${t.id}" data-i="${i}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="Monter">↑</button>
      <button type="button" data-act="tplMove" data-id="${t.id}" data-i="${i}" data-d="1" ${i === t.items.length - 1 ? 'disabled' : ''} aria-label="Descendre">↓</button>
      <button type="button" data-act="tplRemove" data-id="${t.id}" data-i="${i}" aria-label="Retirer">✕</button></span></div>`;
  }).join('');
  return `<div class="stack">
    <div class="top"><a class="iconbtn" href="#template/${t.id}" aria-label="Retour">${I.back}</a><h1 class="h2">Modifier la séance</h1></div>
    <label class="field"><span>Nom</span><input id="tpl-name" data-tpl="name" data-id="${t.id}" value="${esc(t.name)}"></label>
    <div class="grid2"><label class="field"><span>Lettre</span><input id="tpl-letter" data-tpl="letter" data-id="${t.id}" maxlength="2" value="${esc(t.letter)}"></label>
    <label class="field"><span>Jour habituel</span><select id="tpl-day" data-tpl="day" data-id="${t.id}"><option value="">Aucun</option>${DAY_ORDER.map((d) => `<option value="${d}" ${t.day === d ? 'selected' : ''}>${cap(DAY_L[d])}</option>`).join('')}</select></label></div>
    <span class="eyebrow">Exercices, dans l'ordre</span>
    ${rows || '<p class="small">Aucun exercice pour l\'instant.</p>'}
    <button class="btn ghost" data-act="pickEx" data-id="${t.id}">+ Ajouter des exercices</button>
    <a class="btn" href="#template/${t.id}">Terminé</a></div>`;
}

/* Séance en cours */
function vSession() {
  const a = S.active;
  const done = a.entries.filter(entryDone).length;
  const warn = a.painBefore && (a.painBefore.eva > th() || a.painBefore.tingling)
    ? `<div class="note">Douleur à ${a.painBefore.eva}${a.painBefore.tingling ? ' avec fourmillements' : ''} avant de commencer : version allégée conseillée (charges plus basses, moins de séries, ou seulement l'échauffement).</div>` : '';
  return `<div class="stack">
    <div class="top"><a class="iconbtn" href="#home" aria-label="Retour à l'accueil">${I.back}</a>
      <div class="t"><span class="small">${esc(a.name)}</span><span class="clock mono" id="chrono">${clock(Date.now() - a.start)}</span></div>
      <span class="small mono">${done} / ${a.entries.length}</span>
      <button class="iconbtn" data-act="sessMenu" aria-label="Options de la séance">${I.more}</button></div>
    ${warn}
    ${a.entries.map(accItem).join('')}
  </div><div class="dock" id="dock">${dockHtml()}</div>`;
}

function accItem(e, i) {
  const a = S.active;
  const ex = exById(e.exId);
  const d = e.sets.filter((s) => s.done).length, n = e.sets.length;
  const complete = entryDone(e);
  const flagged = e.sets.some((s) => s.flag);
  if (i !== a.open) {
    return `<button class="accx ${complete ? 'done' : ''}" data-act="openEntry" data-i="${i}">
      <span class="chev" aria-hidden="true">${complete ? '✓' : '⌄'}</span>${thumb(ex, 'thumb xs')}
      <span class="t"><strong>${esc(exName(ex))}</strong><span class="small">${e.skipped ? 'passé' : `${d}/${n}`}${e.feel ? ' · ' + FEEL[e.feel].label : ''}${flagged ? ' · ça tire' : ''}</span></span></button>`;
  }
  const isTime = ex?.kind === 'time';
  const cur = e.sets.findIndex((s) => !s.done);
  const head = isTime
    ? '<div class="set time head"><span></span><span>secondes</span></div>'
    : '<div class="set head"><span></span><span>kg</span><span>reps</span></div>';
  const rows = e.sets.map((s, j) => {
    const cls = ['set', isTime ? 'time' : '', s.done ? 'done' : '', s.flag ? 'flag' : '', j === cur && !e.skipped ? 'cur' : ''].join(' ');
    const btn = `<button class="chk" data-act="toggleSet" data-i="${i}" data-j="${j}" aria-label="Série ${j + 1}, ${s.done ? 'faite' : 'à faire'}">${s.done ? '✓' : j + 1}</button>`;
    if (isTime) {
      return `<div class="${cls}">${btn}<input inputmode="numeric" data-set data-i="${i}" data-j="${j}" data-f="secs" value="${s.secs ?? ''}" aria-label="Durée en secondes, série ${j + 1}"></div>`;
    }
    const kg = ex?.bodyweight ? '<span class="pdc">PDC</span>'
      : `<input inputmode="decimal" data-set data-i="${i}" data-j="${j}" data-f="kg" value="${fnum(s.kg)}" placeholder="kg" aria-label="Charge en kg, série ${j + 1}">`;
    return `<div class="${cls}">${btn}${kg}<input inputmode="numeric" data-set data-i="${i}" data-j="${j}" data-f="reps" value="${s.reps ?? ''}" aria-label="Répétitions, série ${j + 1}"></div>`;
  }).join('');
  const st = ex?.status || 'ok';
  return `<section class="accx open" aria-label="${esc(exName(ex))}">
    <button class="accx-h" data-act="openEntry" data-i="-1" aria-label="Replier">${'<span class="chev" aria-hidden="true">⌃</span>'}${thumb(ex, 'thumb xs')}
      <span class="t"><strong>${esc(exName(ex))}</strong><span class="small">${d}/${n}${ex?.perSide ? ' · par côté' : ''} · <span class="c-${st}">${STATUS[st].label}</span></span></span></button>
    ${ex?.cue ? `<div class="note ${st === 'warn' ? '' : 'tip'}"><strong>Kiné :</strong> ${esc(ex.cue)}</div>` : ''}
    ${e.suggest ? `<div class="sugg ${e.suggest.type}"><span>${esc(e.suggest.text)}</span>${e.suggest.type === 'up' && !e.applied ? `<button class="link" data-act="applyUp" data-i="${i}">Appliquer</button>` : ''}</div>` : ''}
    <div class="sets">${head}${rows}</div>
    <div class="row between"><button class="link" data-act="addSet" data-i="${i}">+ Ajouter une série</button>${complete ? '' : `<button class="link muted" data-act="skipEntry" data-i="${i}">Passer l'exercice</button>`}</div>
    ${complete && !e.skipped ? `<div class="stack-s"><span class="small">Ressenti à chaud</span><div class="segb-row">${Object.keys(FEEL).map((k) =>
      `<button class="segb ${e.feel === k ? 'on' : ''}" data-act="feel" data-i="${i}" data-v="${k}" aria-pressed="${e.feel === k}">${FEEL[k].label}</button>`).join('')}</div></div>` : ''}
    ${e.showNote || e.note ? `<label class="field"><span>Note</span><textarea data-note="${i}" placeholder="Ex. tiraillement lombaire en fin de série">${esc(e.note)}</textarea></label>` : ''}
  </section>`;
}

function dockHtml() {
  const a = S.active;
  if (!a) return '';
  let rest = '';
  if (a.restEnd) {
    rest = `<div class="rest"><span>Repos</span><strong class="mono" id="rest-t">${clock(a.restEnd - Date.now() + 999)}</strong>
      <button class="chip" data-act="rest" data-v="-15">−15 s</button><button class="chip" data-act="rest" data-v="15">+15 s</button><button class="chip" data-act="rest" data-v="0">Passer</button></div>`;
  }
  const allDone = a.entries.every(entryDone);
  const e = a.entries[a.open];
  const label = allDone ? 'Terminer la séance' : !e || entryDone(e) ? 'Exercice suivant' : 'Valider la série';
  return `<div class="dock-in">${rest}<div class="row"><button class="btn ghost" data-act="pinch" ${!e || allDone || e.skipped ? 'disabled' : ''}>Ça tire</button><button class="btn main" data-act="logNext">${label}</button></div></div>`;
}
function refreshDock() { const d = document.getElementById('dock'); if (d) d.innerHTML = dockHtml(); }

function nextOpen(from) {
  const es = S.active.entries;
  for (let k = from + 1; k < es.length; k++) if (!entryDone(es[k])) return k;
  for (let k = 0; k < es.length; k++) if (!entryDone(es[k])) return k;
  return -1;
}
function scrollToOpen() {
  requestAnimationFrame(() => {
    const el = app.querySelector('.accx.open');
    if (el) el.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
}

function buildEntry(ex) {
  const prev = entryHistory(ex.id, Infinity, 1)[0];
  const prevDone = prev ? prev.e.sets.filter((s) => s.done) : [];
  const sets = Array.from({ length: Math.max(1, ex.sets) }, (_, j) => {
    const p = prevDone[j] || prevDone[prevDone.length - 1];
    return {
      kg: ex.kind === 'reps' && !ex.bodyweight ? (p?.kg ?? ex.load ?? null) : null,
      reps: ex.kind === 'reps' ? ex.reps : null,
      secs: ex.kind === 'time' ? (p?.secs ?? ex.secs) : null,
      done: false, flag: false,
    };
  });
  return { exId: ex.id, sets, feel: null, note: '', suggest: suggestion(ex) };
}

/* Carnet */
function vLog() {
  let out = '<h1 class="h1">Carnet</h1>';
  out += pendingJ1().map(j1Card).join('');
  out += weekCard();
  out += j1Insights();
  const list = [...S.sessions].reverse();
  if (!list.length) {
    out += `<div class="empty"><p>Ton carnet est vide pour l'instant. Chaque séance terminée s'ajoute ici, avec ton bilan du lendemain.</p><a class="btn sm" href="#home">Aller à l'accueil</a></div>`;
  }
  let month = '';
  for (const s of list) {
    const d = new Date(s.start);
    const m = `${MON[d.getMonth()]} ${d.getFullYear()}`;
    if (m !== month) { month = m; out += `<h2 class="eyebrow">${m}</h2>`; }
    const flags = s.entries.reduce((a, e) => a + e.sets.filter((x) => x.flag).length, 0);
    const feels = s.entries.map((e) => e.feel).filter(Boolean);
    const topFeel = feels.length ? Object.keys(FEEL).sort((x, y) => feels.filter((f) => f === y).length - feels.filter((f) => f === x).length)[0] : null;
    let j1 = '';
    if (s.j1) j1 = `<span class="chip ${s.j1.eva > th() ? 'warn' : 'ok'}"><span class="dot"></span>J+1 · ${s.j1.eva}</span>`;
    else if (Date.now() - s.end < 4 * 864e5) j1 = '<span class="chip">J+1 · en attente</span>';
    out += `<a class="logrow" href="#log/${s.id}"><span class="d"><strong>${String(d.getDate()).padStart(2, '0')}</strong><span>${DAY_S[d.getDay()]}</span></span>
      <span class="t"><strong>${esc(s.name)}</strong><span class="small mono">${mins(s.end - s.start)} min · ${sessionPainLine(s)}</span>
      <span class="row wrap" style="gap:4px;margin-top:4px">${j1}${topFeel ? `<span class="chip ${FEEL[topFeel].cls}">${FEEL[topFeel].label}</span>` : ''}${flags ? `<span class="chip">${flags} « ça tire »</span>` : ''}</span></span></a>`;
  }
  return `<div class="stack">${out}</div>`;
}

function weekCard() {
  const now = new Date();
  const mon = new Date(now); mon.setHours(0, 0, 0, 0); mon.setDate(mon.getDate() - ((now.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i);
    return { d, has: S.sessions.some((s) => sameDay(s.start, d)), plan: S.templates.some((t) => t.day === d.getDay()), today: sameDay(d, now) };
  });
  const n = S.sessions.filter((s) => s.start >= mon.getTime()).length;
  const p = S.templates.filter((t) => t.day != null).length;
  return `<div class="card"><div class="row between"><span class="small">Cette semaine</span><strong class="mono">${n}${p ? ' / ' + p : ''} séance${Math.max(n, p) > 1 ? 's' : ''}</strong></div>
    <div class="wk">${days.map((x, i) => `<span class="${x.has ? 'on' : x.plan ? 'plan' : ''} ${x.today ? 'today' : ''}"><i></i><b>${'LMMJVSD'[i]}</b></span>`).join('')}</div></div>`;
}

function j1Insights() {
  const withJ1 = S.sessions.filter((s) => s.j1);
  if (!withJ1.length) return '';
  const list = withJ1.slice(-8);
  const W = 300, H = 112, base = 88, top = 14;
  const max = Math.max(5, th() + 1, ...list.map((s) => s.j1.eva));
  const k = (base - top) / max;
  const step = (W - 16) / list.length;
  const bw = Math.min(26, step - 8);
  const tplIdx = (s) => S.templates.findIndex((t) => t.id === s.templateId);
  const bars = list.map((s, i) => {
    const x = 8 + i * step + (step - bw) / 2;
    const hgt = Math.max(2, s.j1.eva * k);
    return `<rect class="ch-bar ${tplIdx(s) % 2 ? 'b2' : ''}" x="${x.toFixed(1)}" y="${(base - hgt).toFixed(1)}" width="${bw.toFixed(1)}" height="${hgt.toFixed(1)}" rx="4"/>
      <text class="ch-v" x="${(x + bw / 2).toFixed(1)}" y="${(base - hgt - 4).toFixed(1)}" text-anchor="middle">${s.j1.eva}</text>
      <text class="ch-t" x="${(x + bw / 2).toFixed(1)}" y="${base + 16}" text-anchor="middle">${esc((s.letter || s.name).slice(0, 2))}</text>`;
  }).join('');
  const ty = base - th() * k;
  let out = `<div class="card"><div class="row between"><span class="small">Douleur au réveil · ${list.length} séance${list.length > 1 ? 's' : ''}</span><span class="small c-warn">seuil ${th()}</span></div>
    <svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Douleur le lendemain : ${list.map((s) => s.j1.eva).join(', ')}">
      <line class="ch-base" x1="4" y1="${base}" x2="${W - 4}" y2="${base}"/><line class="ch-th" x1="4" y1="${ty.toFixed(1)}" x2="${W - 4}" y2="${ty.toFixed(1)}"/>${bars}</svg></div>`;

  const by = {};
  for (const s of withJ1) (by[s.templateId] ??= []).push(s);
  const ids = Object.keys(by).filter((x) => by[x].length >= 2);
  if (ids.length < 2) return out;
  const m = (x) => avg(by[x].map((s) => s.j1.eva));
  ids.sort((x, y) => m(y) - m(x));
  const hi = ids[0], lo = ids[ids.length - 1];
  const nm = (x) => esc(tplById(x)?.name || by[x][0].name);
  if (m(hi) - m(lo) < 1) {
    return out + `<div class="card"><span class="small">Tes lendemains sont comparables d'une séance à l'autre (écart de moins d'un point).</span></div>`;
  }
  const loEx = new Set(by[lo].flatMap((s) => s.entries.map((e) => e.exId)));
  const only = [...new Set(by[hi].flatMap((s) => s.entries.map((e) => e.exId)))].filter((x) => !loEx.has(x));
  const rows = only.map((xid) => {
    const ex = exById(xid);
    const ents = by[hi].map((s) => s.entries.find((e) => e.exId === xid)).filter(Boolean);
    const flags = ents.reduce((a, e) => a + e.sets.filter((x) => x.flag).length, 0);
    const kgs = ents.map((e) => e.sets.find((x) => x.done && x.kg != null)?.kg).filter((v) => v != null);
    const dk = kgs.length > 1 ? kgs[kgs.length - 1] - kgs[0] : 0;
    const info = [dk ? `${dk > 0 ? '+' : ''}${fnum(dk)} kg` : '', flags ? `${flags} « ça tire »` : ''].filter(Boolean).join(' · ') || '=';
    return `<div class="li"><span class="dot c-${ex?.status || 'ok'}"></span><span>${esc(exName(ex))}</span><span class="mono">${info}</span></div>`;
  }).join('');
  return out + `<div class="card warnb"><span class="chip warn" style="justify-self:start"><span class="dot"></span>Piste à surveiller</span>
    <strong>Les lendemains de ${nm(hi)} sont plus douloureux</strong>
    <span class="small">En moyenne ${fnum(m(hi))} au réveil, contre ${fnum(m(lo))} après ${nm(lo)}.</span>
    ${rows ? `<span class="small">Présents dans ${nm(hi)}, pas dans ${nm(lo)} :</span>${rows}` : ''}
    <span class="small">C'est une piste à montrer à ta kiné, pas un diagnostic.</span></div>`;
}

function vLogDetail(id) {
  const s = sessById(id);
  if (!s) return notFound('#log');
  const vol = volume(s);
  const canJ1 = !s.j1 && Date.now() >= nextMorning(s.end);
  const j1 = s.j1 ? `<span class="chip ${s.j1.eva > th() ? 'warn' : 'ok'}"><span class="dot"></span>J+1 · ${s.j1.eva}</span>` : '';
  const pb = s.painBefore || {};
  const zones = (pb.zones || []).map((z) => ({ lomb: 'lombaires', fesse: 'fesse', jambe: 'jambe' }[z])).filter(Boolean);
  const entries = s.entries.map((e) => {
    const ex = exById(e.exId);
    const name = ex ? exName(ex) : e.name || 'Exercice supprimé';
    const isTime = e.sets.some((x) => x.secs != null) && !e.sets.some((x) => x.reps != null);
    const prev = entryHistory(e.exId, s.start, 1)[0];
    const pDone = prev ? prev.e.sets.filter((x) => x.done) : [];
    let k = -1;
    const rows = e.sets.map((x, j) => {
      if (!x.done) return `<div class="nb skip"><span>${j + 1}</span><span>non faite</span><span></span></div>`;
      k++;
      const p = pDone[k];
      const val = isTime ? fmtSecs(x.secs) : `${x.kg != null ? fnum(x.kg) : 'PDC'} × ${x.reps ?? '—'}`;
      let cmp = '<span class="eq">—</span>';
      if (x.flag) cmp = '<span class="dn">⚑ gêne</span>';
      else if (p) {
        if (isTime) {
          const dd = (x.secs ?? 0) - (p.secs ?? 0);
          cmp = dd ? `<span class="${dd > 0 ? 'up' : 'dn'}">${dd > 0 ? '↑ +' : '↓ '}${dd} s</span>` : '<span class="eq">=</span>';
        } else {
          const dk = (x.kg ?? 0) - (p.kg ?? 0);
          const dr = (x.reps ?? 0) - (p.reps ?? 0);
          if (dk) cmp = `<span class="${dk > 0 ? 'up' : 'dn'}">${dk > 0 ? '↑ +' : '↓ '}${fnum(dk)} kg</span>`;
          else if (dr) cmp = `<span class="${dr > 0 ? 'up' : 'dn'}">${dr > 0 ? '+' : ''}${dr} rep${Math.abs(dr) > 1 ? 's' : ''}</span>`;
          else cmp = '<span class="eq">=</span>';
        }
      }
      return `<div class="nb ${x.flag ? 'flag' : ''}"><span>${j + 1}</span><span>${val}</span>${cmp}</div>`;
    }).join('');
    return `<div class="card" style="gap:4px"><div class="row between"><strong>${esc(name)}</strong>${e.feel ? `<span class="chip ${FEEL[e.feel].cls}">${FEEL[e.feel].label}</span>` : ''}</div>
      <div class="nb head"><span>#</span><span>${isTime ? 'durée' : 'kg × reps'}</span><span>${prev ? 'vs ' + dNum(prev.s.start) : ''}</span></div>${rows}
      ${e.note ? `<div class="note" style="margin-top:6px">${esc(e.note)}</div>` : ''}</div>`;
  }).join('');
  const j1Detail = s.j1 ? `<div class="card"><span class="small">Bilan du lendemain · ${dShort(s.j1.date)}</span>
      <div class="trio"><div><strong>${pb.eva ?? '—'}</strong><span>avant</span></div><div><strong>${s.painAfter?.eva ?? '—'}</strong><span>juste après</span></div><div class="${s.j1.eva > th() ? 'hot' : ''}"><strong>${s.j1.eva}</strong><span>au réveil</span></div></div>
      <span class="small">Raideur : ${{ none: 'aucune', light: 'légère', strong: 'forte' }[s.j1.stiffness] || '—'} · Jambe : ${s.j1.leg ? 'oui' : 'non'}${s.j1.factors?.length ? ' · ' + s.j1.factors.map(esc).join(', ') : ''}</span></div>` : '';
  return `<div class="stack">
    <div class="top"><a class="iconbtn" href="#log" aria-label="Retour au carnet">${I.back}</a><span class="small">Carnet</span></div>
    <div><span class="small">${dLong(s.start)}</span><h1 class="h1">${esc(s.name)}</h1></div>
    <div class="row wrap" style="gap:6px"><span class="chip">${mins(s.end - s.start)} min</span><span class="chip">${sessionPainLine(s)}</span>${j1}${vol ? `<span class="chip">${fnum(vol)} kg soulevés</span>` : ''}</div>
    ${zones.length || pb.tingling ? `<span class="small">Avant la séance : ${zones.join(', ') || '—'}${pb.tingling ? ', fourmillements' : ''}</span>` : ''}
    ${canJ1 ? `<button class="btn" data-act="j1" data-id="${s.id}">Faire le bilan du lendemain</button>` : ''}
    ${j1Detail}
    ${entries}
    ${s.note ? `<div class="card"><span class="small">Note de séance</span><p>${esc(s.note)}</p></div>` : ''}
    <button class="btn danger sm" style="justify-self:start" data-act="delSession" data-id="${s.id}">Supprimer cette séance</button></div>`;
}

/* Exercices */
function vExercises() {
  const filters = [['all', 'Tous'], ['ok', 'Validés'], ['warn', 'Précaution'], ['stop', 'À éviter']];
  const list = S.exercises.filter((e) => exFilter === 'all' || e.status === exFilter).sort(byName);
  const usedIn = (e) => S.templates.filter((t) => t.items.includes(e.id)).map((t) => t.letter || t.name);
  const rows = list.map((e) => {
    const u = usedIn(e);
    return `<div class="exrow split ${e.status === 'stop' ? 'stopped' : ''}"><button class="main" data-act="exEdit" data-id="${e.id}" aria-label="Modifier ${esc(e.name)}">${thumb(e, 'thumb sm')}
      <span class="t" style="text-align:left"><strong>${esc(exName(e))}</strong><span class="mono">${fmtTarget(e)}${u.length ? ' · ' + u.map(esc).join(', ') : ''}</span></span></button>
      <button class="stbtn ${e.status}" data-act="exStatus" data-id="${e.id}" aria-label="Statut : ${STATUS[e.status].label}. Changer"><span class="dot"></span>${e.status === 'ok' ? 'Validé' : e.status === 'warn' ? 'Précaution' : 'À éviter'}</button></div>`;
  }).join('');
  return `<div class="stack"><h1 class="h1">Exercices</h1>
    <div class="segb-row" style="grid-template-columns:repeat(4,1fr)">${filters.map(([k, l]) => `<button class="segb ${exFilter === k ? 'on' : ''}" data-act="exFilter" data-v="${k}" aria-pressed="${exFilter === k}">${l}</button>`).join('')}</div>
    ${rows || '<div class="empty"><p>Aucun exercice dans ce filtre.</p></div>'}
    <button class="btn" data-act="newEx">+ Nouvel exercice</button></div>`;
}

/* Réglages */
function vSettings() {
  return `<div class="stack">
    <div class="top"><a class="iconbtn" href="#home" aria-label="Retour">${I.back}</a><h1 class="h2">Réglages</h1></div>
    <div class="card"><label class="field"><span>Seuil de douleur au réveil</span>
      <select data-setting="painThreshold">${[1, 2, 3, 4, 5, 6].map((v) => `<option value="${v}" ${th() === v ? 'selected' : ''}>${v} sur 10</option>`).join('')}</select></label>
      <p class="small">Au‑dessus de ce seuil le lendemain, l'app ne propose plus d'augmenter la charge et signale la séance. À régler avec ta kiné.</p></div>
    <div class="card"><label class="field"><span>Repos entre les séries</span>
      <select data-setting="restSec">${[45, 60, 75, 90, 120, 150, 180].map((v) => `<option value="${v}" ${S.settings.restSec === v ? 'selected' : ''}>${clock(v * 1000)}</option>`).join('')}</select></label></div>
    <div class="card"><strong>Bilan du lendemain</strong><p class="small">Le matin qui suit une séance, une carte « Bilan du lendemain » t'attend à l'ouverture de l'app, sur l'accueil et dans le carnet.</p></div>
    <div class="card"><strong>Sauvegarde</strong><p class="small">Tes données restent sur ce téléphone, sans compte. Exporte‑les de temps en temps pour ne rien perdre si tu changes de téléphone.</p>
      <div class="row wrap"><button class="btn sm" data-act="export">Exporter (JSON)</button><label class="btn sm ghost"><input type="file" accept="application/json,.json" data-import hidden>Importer</label></div></div>
    <div class="card"><strong>Signaux d'alerte</strong><p class="small">Perte de force dans la jambe, engourdissement du périnée ou de l'entrejambe, troubles urinaires ou intestinaux : arrête la séance et consulte rapidement un médecin.</p></div>
    <div class="card"><strong>Réinitialiser</strong><p class="small">Efface tout et recharge le programme de départ.</p><button class="btn sm danger" style="justify-self:start" data-act="reset">Tout effacer</button></div>
    <p class="small" style="text-align:center">Workout Log · V1</p></div>`;
}

/* ---------- Panneaux ---------- */
function openCheckin(tid) {
  if (S.active) { location.hash = '#session'; return; }
  const t = tplById(tid);
  if (!t) return;
  if (!activeItems(t).length) { toast('Ajoute des exercices à cette séance avant de la démarrer.'); location.hash = `#template/${t.id}/edit`; return; }
  const last = S.sessions.slice(-1)[0];
  const lastLine = last ? `Dernière séance (${dShort(last.start)}) : ${last.painAfter?.eva ?? '—'} juste après${last.j1 ? `, ${last.j1.eva} au réveil` : ''}.` : '';
  openSheet(`<form data-form="checkin" data-id="${t.id}" class="stack">
    <div><span class="small">Avant de commencer · ${esc(t.name)}</span><h2 class="h2">Comment va ton dos ?</h2></div>
    <div class="field"><span>Douleur maintenant (0 = aucune, 10 = maximale)</span>${scale('eva', null)}</div>
    <div class="field"><span>Où ?</span><div class="chips">${chk('zone', 'lomb', 'Lombaires')}${chk('zone', 'fesse', 'Fesse')}${chk('zone', 'jambe', 'Jambe')}</div></div>
    <div class="field"><span>Fourmillements ou engourdissement ?</span>${seg('ting', [['0', 'Non'], ['1', 'Oui']], '0')}</div>
    ${lastLine ? `<p class="small">${lastLine}</p>` : ''}
    <div id="ci-warn"></div>
    <button class="btn" type="submit">Commencer</button></form>`, 'Avant de commencer');
}
function ciWarn(f) {
  const fd = new FormData(f);
  const eva = num(fd.get('eva'));
  const ting = fd.get('ting') === '1';
  const box = f.querySelector('#ci-warn');
  box.innerHTML = (eva != null && eva > th()) || ting
    ? `<div class="note">${eva != null && eva > th() ? `Douleur au‑dessus de ton seuil (${th()})` : 'Fourmillements'} : fais une version allégée (charges plus basses, moins de séries) ou seulement l'échauffement. Perte de force dans la jambe, engourdissement du périnée ou troubles urinaires : arrête et consulte rapidement.</div>` : '';
}

function openCheckout() {
  const a = S.active;
  const done = a.entries.filter((e) => e.sets.some((s) => s.done)).length;
  const vol = a.entries.reduce((x, e) => x + e.sets.reduce((y, s) => y + (s.done && s.kg && s.reps ? s.kg * s.reps : 0), 0), 0);
  openSheet(`<form data-form="checkout" class="stack">
    <div><span class="small">${esc(a.name)} · ${mins(Date.now() - a.start)} min · ${done} exercice${done > 1 ? 's' : ''}${vol ? ` · ${fnum(vol)} kg` : ''}</span><h2 class="h2">Et ton dos, juste après ?</h2></div>
    <div class="field"><span>Douleur maintenant (0 à 10)</span>${scale('eva', null)}</div>
    <label class="field"><span>Note (optionnel)</span><textarea name="note" placeholder="Ex. bonne séance, un peu raide sur le rowing"></textarea></label>
    <p class="small">Demain matin, l'app te demandera comment va ton dos à froid.</p>
    <button class="btn" type="submit">Enregistrer la séance</button>
    <button class="btn ghost" type="button" data-act="closeSheet">Continuer la séance</button></form>`, 'Fin de séance');
}

function openJ1(id) {
  const s = sessById(id);
  if (!s) return;
  openSheet(`<form data-form="j1" data-id="${s.id}" class="stack">
    <div><span class="small">${dLong(Date.now())} · lendemain de ${esc(s.name)}</span><h2 class="h2">Ce matin, ton dos ?</h2></div>
    <div class="field"><span>Douleur au réveil (0 à 10)</span>${scale('eva', null)}</div>
    <div class="card" style="gap:6px"><span class="small">Ta douleur autour de la séance</span>
      <div class="trio"><div><strong>${s.painBefore?.eva ?? '—'}</strong><span>avant</span></div><div><strong>${s.painAfter?.eva ?? '—'}</strong><span>juste après</span></div><div id="j1-now"><strong>—</strong><span>ce matin</span></div></div></div>
    <div class="field"><span>Raideur au réveil</span>${seg('stiff', [['none', 'Aucune'], ['light', 'Légère'], ['strong', 'Forte']], 'none')}</div>
    <div class="field"><span>Douleur ou fourmillements dans la jambe ?</span>${seg('leg', [['0', 'Non'], ['1', 'Oui']], '0')}</div>
    <div class="field"><span>Autre chose a pu jouer ?</span><div class="chips">${['Mal dormi', 'Longtemps assis', 'Port de charge', 'Stress', 'Rien de spécial'].map((f) => chk('fac', f, f)).join('')}</div></div>
    <button class="btn" type="submit">Enregistrer</button></form>`, 'Bilan du lendemain');
}
function j1Live(f) {
  const v = num(new FormData(f).get('eva'));
  const box = f.querySelector('#j1-now');
  if (!box || v == null) return;
  box.className = v > th() ? 'hot' : '';
  box.querySelector('strong').textContent = v;
}

function openExSheet(id, opts = {}) {
  const ex = id ? exById(id) : { name: '', equip: '', status: 'ok', kind: 'reps', sets: 3, reps: 15, secs: 20, perSide: false, load: null, bodyweight: false, cue: '', picto: 'none', photo: null };
  if (!ex) return;
  sheetCtx = { photo: ex.photo || null, exId: id || null, addTo: opts.addTo || null };
  const isTime = ex.kind === 'time';
  openSheet(`<form data-form="ex" class="stack">
    <h2 class="h2">${id ? "Modifier l'exercice" : 'Nouvel exercice'}</h2>
    <label class="field"><span>Nom</span><input name="name" required value="${esc(ex.name)}" placeholder="Ex. Rowing assis" autocomplete="off"></label>
    <label class="field"><span>Matériel</span><input name="equip" list="equips" value="${esc(ex.equip)}" placeholder="Poulie, machine, haltères…" autocomplete="off"></label>
    <datalist id="equips">${EQUIPS.map((e) => `<option value="${e}">`).join('')}</datalist>
    <div class="field"><span>Statut kiné</span>${seg('status', [['ok', 'Validé'], ['warn', 'Précaution'], ['stop', 'À éviter']], ex.status)}</div>
    <div class="field"><span>Format</span>${seg('kind', [['reps', 'Répétitions'], ['time', 'Durée']], ex.kind)}</div>
    <div class="grid2"><label class="field"><span>Séries</span><input name="sets" type="number" inputmode="numeric" min="1" max="10" value="${ex.sets}"></label>
      <label class="field" data-k="reps" ${isTime ? 'hidden' : ''}><span>Répétitions</span><input name="reps" type="number" inputmode="numeric" min="1" max="100" value="${ex.reps ?? 15}"></label>
      <label class="field" data-k="time" ${isTime ? '' : 'hidden'}><span>Durée (s)</span><input name="secs" type="number" inputmode="numeric" min="5" max="3600" value="${ex.secs ?? 20}"></label></div>
    <label class="check"><input type="checkbox" name="perSide" ${ex.perSide ? 'checked' : ''}> Par côté</label>
    <div class="grid2" data-k="reps" ${isTime ? 'hidden' : ''}><label class="field"><span>Charge (kg)</span><input name="load" inputmode="decimal" value="${fnum(ex.load)}" placeholder="—"></label>
      <label class="check" style="align-self:end"><input type="checkbox" name="bodyweight" ${ex.bodyweight ? 'checked' : ''}> Poids du corps</label></div>
    <label class="field"><span>Consigne kiné</span><textarea name="cue" placeholder="Ex. buste fixe, ne pas cambrer">${esc(ex.cue)}</textarea></label>
    <div class="field"><span>Image</span><div id="photo-prev">${photoPrev()}</div>
      <div class="pick">${PICTOS.map((p) => `<label title="${esc(p.label)}"><input class="vh" type="radio" name="picto" value="${p.id}" ${ex.picto === p.id ? 'checked' : ''} aria-label="${esc(p.label)}"><span>${picto(p.id)}</span></label>`).join('')}</div></div>
    <div class="row wrap"><button class="btn sm" type="submit">Enregistrer</button>${id ? `<button class="btn sm danger" type="button" data-act="exDelete" data-id="${id}">Supprimer</button>` : ''}</div>
  </form>`, id ? "Modifier l'exercice" : 'Nouvel exercice');
}
function photoPrev() {
  return sheetCtx.photo
    ? `<div class="row"><img class="thumb" src="${sheetCtx.photo}" alt="Photo de l'exercice"><button type="button" class="link" data-act="photoRemove">Retirer la photo</button></div>`
    : `<label class="btn sm ghost" style="justify-self:start"><input type="file" accept="image/*" data-photo hidden>Ajouter ta photo</label>`;
}
function handlePhoto(input) {
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const max = 480;
      const r = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      sheetCtx.photo = c.toDataURL('image/jpeg', 0.8);
      const box = document.getElementById('photo-prev');
      if (box) box.innerHTML = photoPrev();
    };
    img.onerror = () => toast("Cette image n'a pas pu être lue. Essaie une photo JPEG ou PNG.");
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function openStatus(id) {
  const ex = exById(id);
  if (!ex) return;
  const hist = (ex.history || []).slice().reverse().map((h) =>
    `<div class="small mono">${dShort(h.date)} · ${h.from ? STATUS[h.from].label.toLowerCase() + ' → ' : ''}${STATUS[h.to].label.toLowerCase()}${h.reason ? ' · ' + esc(h.reason) : ''}</div>`).join('');
  openSheet(`<form data-form="status" data-id="${ex.id}" class="stack">
    <div><span class="small">${esc(exName(ex))}</span><h2 class="h2">Statut kiné</h2></div>
    ${Object.keys(STATUS).map((k) => `<label class="opt ${k}"><input class="vh" type="radio" name="st" value="${k}" ${ex.status === k ? 'checked' : ''}><span class="rd"></span><span class="t"><strong>${STATUS[k].label}</strong><span>${STATUS[k].hint}</span></span></label>`).join('')}
    <label class="field"><span>Pourquoi (optionnel)</span><input name="reason" placeholder="Ex. revu au RDV kiné du 12 nov." autocomplete="off"></label>
    ${hist ? `<div class="field"><span>Historique</span>${hist}</div>` : ''}
    <button class="btn" type="submit">Enregistrer</button></form>`, 'Statut kiné');
}

function openPicker(tid) {
  const t = tplById(tid);
  if (!t) return;
  const list = S.exercises.filter((e) => e.status !== 'stop').sort(byName);
  openSheet(`<form data-form="pick" data-id="${t.id}" class="stack"><h2 class="h2">Ajouter des exercices</h2>
    <div>${list.map((e) => `<label class="pickrow"><input type="checkbox" name="ex" value="${e.id}" ${t.items.includes(e.id) ? 'checked disabled' : ''}>${thumb(e, 'thumb sm')}<span class="t"><strong>${esc(exName(e))}</strong><span class="small mono">${fmtTarget(e)}</span></span></label>`).join('')}</div>
    <button type="button" class="btn ghost" data-act="newEx" data-to="${t.id}">+ Créer un exercice</button>
    <button class="btn" type="submit">Ajouter à la séance</button></form>`, 'Ajouter des exercices');
}

function openTplMenu(id) {
  openSheet(`<div class="stack"><a class="btn ghost" href="#template/${id}/edit" data-act="closeSheet">Modifier</a>
    <button class="btn ghost" data-act="tplDup" data-id="${id}">Dupliquer</button>
    <button class="btn danger" data-act="tplDel" data-id="${id}">Supprimer la séance</button></div>`, 'Options de la séance');
}
function openSessMenu() {
  openSheet(`<div class="stack"><button class="btn" data-act="checkout">Terminer la séance</button>
    <button class="btn danger" data-act="abandon">Abandonner sans enregistrer</button>
    <button class="btn ghost" data-act="closeSheet">Annuler</button></div>`, 'Options de la séance');
}

/* ---------- Formulaires ---------- */
const forms = {
  checkin(f) {
    const fd = new FormData(f);
    const eva = num(fd.get('eva'));
    if (eva == null) { toast('Choisis ta douleur de 0 à 10.'); return; }
    const t = tplById(f.dataset.id);
    S.active = {
      id: uid(), templateId: t.id, name: t.name, letter: t.letter, start: Date.now(),
      painBefore: { eva, zones: fd.getAll('zone'), tingling: fd.get('ting') === '1' },
      entries: activeItems(t).map(buildEntry), open: 0, restEnd: null,
    };
    commit(); closeSheet(); location.hash = '#session';
  },
  checkout(f) {
    const fd = new FormData(f);
    const eva = num(fd.get('eva'));
    if (eva == null) { toast('Choisis ta douleur de 0 à 10.'); return; }
    const a = S.active;
    const entries = a.entries.filter((e) => e.sets.some((s) => s.done)).map((e) => ({
      exId: e.exId, name: exName(exById(e.exId)), feel: e.feel, note: e.note || '',
      sets: e.sets.map(({ kg, reps, secs, done, flag }) => ({ kg, reps, secs, done, flag })),
    }));
    for (const e of entries) {
      const ex = exById(e.exId);
      const last = e.sets.filter((s) => s.done && s.kg != null).slice(-1)[0];
      if (ex && last && ex.kind === 'reps' && !ex.bodyweight) ex.load = last.kg;
    }
    const s = { id: a.id, templateId: a.templateId, name: a.name, letter: a.letter, start: a.start, end: Date.now(),
      painBefore: a.painBefore, painAfter: { eva }, note: (fd.get('note') || '').trim(), entries, j1: null };
    S.sessions.push(s);
    S.active = null;
    commit(); closeSheet();
    location.hash = `#log/${s.id}`;
    toast('Séance enregistrée. Bilan demain matin.');
  },
  j1(f) {
    const fd = new FormData(f);
    const eva = num(fd.get('eva'));
    if (eva == null) { toast('Choisis ta douleur de 0 à 10.'); return; }
    const s = sessById(f.dataset.id);
    s.j1 = { date: Date.now(), eva, stiffness: fd.get('stiff'), leg: fd.get('leg') === '1', factors: fd.getAll('fac') };
    commit(); closeSheet(); render();
    toast(eva > th() ? "Noté. Au‑dessus de ton seuil : l'app ne proposera pas d'augmenter la charge sur ces exercices la prochaine fois." : 'Noté. Bon lendemain !');
  },
  ex(f) {
    const fd = new FormData(f);
    const name = (fd.get('name') || '').trim();
    if (!name) { toast("Donne un nom à l'exercice."); return; }
    const data = {
      name, equip: (fd.get('equip') || '').trim(), status: fd.get('status'), kind: fd.get('kind'),
      sets: int(fd.get('sets'), 1, 10, 3), reps: int(fd.get('reps'), 1, 100, 15), secs: int(fd.get('secs'), 5, 3600, 20),
      perSide: !!fd.get('perSide'), load: num(fd.get('load')), bodyweight: !!fd.get('bodyweight'),
      cue: (fd.get('cue') || '').trim(), picto: fd.get('picto') || 'none', photo: sheetCtx.photo || null,
    };
    if (sheetCtx.exId) {
      const ex = exById(sheetCtx.exId);
      if (ex.status !== data.status) (ex.history ||= []).push({ date: Date.now(), from: ex.status, to: data.status, reason: '' });
      Object.assign(ex, data);
    } else {
      const ex = { id: uid(), ...data, history: [{ date: Date.now(), from: null, to: data.status, reason: 'Création' }] };
      S.exercises.push(ex);
      if (sheetCtx.addTo) tplById(sheetCtx.addTo)?.items.push(ex.id);
    }
    commit(); closeSheet(); render(); toast('Exercice enregistré.');
  },
  status(f) {
    const fd = new FormData(f);
    const ex = exById(f.dataset.id);
    const to = fd.get('st');
    const reason = (fd.get('reason') || '').trim();
    if (to !== ex.status) {
      (ex.history ||= []).push({ date: Date.now(), from: ex.status, to, reason });
      ex.status = to;
      toast(`${ex.name} : ${STATUS[to].label.toLowerCase()}.`);
    }
    commit(); closeSheet(); render();
  },
  pick(f) {
    const t = tplById(f.dataset.id);
    const ids = new FormData(f).getAll('ex');
    t.items.push(...ids);
    commit(); closeSheet(); render();
    if (ids.length) toast(`${ids.length} exercice${ids.length > 1 ? 's' : ''} ajouté${ids.length > 1 ? 's' : ''}.`);
  },
};

/* ---------- Actions ---------- */
let audioCtx = null;
function ensureAudio() { try { audioCtx ||= new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume(); } catch { /* son indisponible */ } }
function beep(at = 0) {
  if (!audioCtx) return;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination);
  const t0 = audioCtx.currentTime + at;
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);
  o.start(t0); o.stop(t0 + 0.3);
}
function restAlert() { try { navigator.vibrate?.([200, 100, 200]); } catch { /* */ } beep(0); beep(0.35); }

const acts = {
  closeSheet: () => closeSheet(),
  start: (el) => openCheckin(el.dataset.id),
  j1: (el) => openJ1(el.dataset.id),
  newEx: (el) => openExSheet(null, { addTo: el.dataset.to }),
  exEdit: (el) => openExSheet(el.dataset.id),
  exStatus: (el) => openStatus(el.dataset.id),
  exFilter: (el) => { exFilter = el.dataset.v; render(); },
  photoRemove: () => { sheetCtx.photo = null; document.getElementById('photo-prev').innerHTML = photoPrev(); },
  exDelete: (el) => {
    if (!armed(el, 'Confirmer la suppression')) return;
    const id = el.dataset.id;
    S.exercises = S.exercises.filter((e) => e.id !== id);
    S.templates.forEach((t) => { t.items = t.items.filter((x) => x !== id); });
    commit(); closeSheet(); render(); toast('Exercice supprimé. Il reste visible dans ton carnet.');
  },
  newTpl: () => {
    const used = new Set(S.templates.map((t) => t.letter));
    const letter = 'ABCDEFGH'.split('').find((l) => !used.has(l)) || '';
    const t = { id: uid(), name: `${letter ? letter + ' · ' : ''}Nouvelle séance`, letter, day: null, items: [] };
    S.templates.push(t); commit();
    location.hash = `#template/${t.id}/edit`;
  },
  tplMenu: (el) => openTplMenu(el.dataset.id),
  tplDup: (el) => {
    const t = tplById(el.dataset.id);
    const c = { ...t, id: uid(), name: `${t.name} (copie)`, day: null, items: [...t.items] };
    S.templates.push(c); commit(); closeSheet(); location.hash = `#template/${c.id}/edit`;
  },
  tplDel: (el) => {
    if (!armed(el, 'Confirmer : supprimer la séance')) return;
    S.templates = S.templates.filter((t) => t.id !== el.dataset.id);
    commit(); closeSheet(); location.hash = '#templates'; toast('Séance supprimée. Ton carnet est conservé.');
  },
  tplMove: (el) => {
    const t = tplById(el.dataset.id); const i = +el.dataset.i; const j = i + +el.dataset.d;
    if (j < 0 || j >= t.items.length) return;
    [t.items[i], t.items[j]] = [t.items[j], t.items[i]];
    commit(); render();
  },
  tplRemove: (el) => { const t = tplById(el.dataset.id); t.items.splice(+el.dataset.i, 1); commit(); render(); },
  pickEx: (el) => openPicker(el.dataset.id),

  openEntry: (el) => { S.active.open = +el.dataset.i; commit(); render(); scrollToOpen(); },
  toggleSet: (el) => {
    const e = S.active.entries[+el.dataset.i]; const s = e.sets[+el.dataset.j];
    s.done = !s.done; if (!s.done) s.flag = false;
    e.skipped = false; commit(); render();
  },
  logNext: () => {
    ensureAudio();
    const a = S.active;
    if (a.entries.every(entryDone)) { openCheckout(); return; }
    const e = a.entries[a.open];
    if (!e || entryDone(e)) { a.open = nextOpen(a.open); a.restEnd = null; commit(); render(); scrollToOpen(); return; }
    const j = e.sets.findIndex((s) => !s.done);
    e.sets[j].done = true;
    a.restEnd = a.entries.every(entryDone) ? null : Date.now() + S.settings.restSec * 1000;
    commit(); render();
  },
  feel: (el) => {
    const a = S.active; const i = +el.dataset.i;
    a.entries[i].feel = el.dataset.v;
    if (entryDone(a.entries[i])) a.open = nextOpen(i);
    commit(); render(); scrollToOpen();
  },
  pinch: () => {
    const a = S.active; const e = a.entries[a.open];
    if (!e) return;
    let j = -1;
    e.sets.forEach((s, k) => { if (s.done) j = k; });
    if (j < 0) j = 0;
    e.sets[j].flag = true;
    e.showNote = true;
    commit(); render();
    toast("Noté sur la série. Baisse la charge, réduis l'amplitude ou passe l'exercice.");
  },
  addSet: (el) => {
    const e = S.active.entries[+el.dataset.i];
    const last = e.sets[e.sets.length - 1] || {};
    e.sets.push({ kg: last.kg ?? null, reps: last.reps ?? null, secs: last.secs ?? null, done: false, flag: false });
    e.skipped = false; commit(); render();
  },
  skipEntry: (el) => { const a = S.active; const i = +el.dataset.i; a.entries[i].skipped = true; a.open = nextOpen(i); commit(); render(); scrollToOpen(); },
  applyUp: (el) => {
    const e = S.active.entries[+el.dataset.i];
    e.sets.forEach((s) => { if (!s.done && s.kg != null) s.kg = Math.round((s.kg + 2.5) * 10) / 10; });
    e.applied = true; commit(); render();
  },
  rest: (el) => {
    const a = S.active; const v = +el.dataset.v;
    a.restEnd = v === 0 ? null : Math.max(Date.now() + 1000, a.restEnd + v * 1000);
    commit(); refreshDock();
  },
  sessMenu: () => openSessMenu(),
  checkout: () => { closeSheet(); openCheckout(); },
  abandon: (el) => {
    if (!armed(el, "Confirmer l'abandon")) return;
    S.active = null; commit(); closeSheet(); location.hash = '#home'; toast('Séance abandonnée.');
  },
  delSession: (el) => {
    if (!armed(el, 'Confirmer la suppression')) return;
    S.sessions = S.sessions.filter((s) => s.id !== el.dataset.id);
    commit(); location.hash = '#log'; toast('Séance supprimée.');
  },
  export: () => {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `workout-log-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },
  reset: (el) => {
    if (!armed(el, 'Confirmer : tout effacer')) return;
    S = seed(); commit(); location.hash = '#home'; render(); toast('Données effacées, programme de départ rechargé.');
  },
};

function handleImport(input) {
  const file = input.files?.[0];
  if (!file) return;
  file.text().then((txt) => {
    const data = JSON.parse(txt);
    if (!Array.isArray(data.exercises) || !Array.isArray(data.templates) || !Array.isArray(data.sessions)) throw new Error('format');
    S = migrate(data);
    commit(); render(); toast('Sauvegarde importée.');
  }).catch(() => toast("Ce fichier n'est pas une sauvegarde Workout Log."));
}

function migrate(st) {
  st.settings = { painThreshold: 3, restSec: 75, ...(st.settings || {}) };
  st.exercises.forEach((e) => { e.history ||= []; e.status ||= 'ok'; });
  st.sessions.sort((a, b) => a.start - b.start);
  st.active ??= null;
  return st;
}

/* ---------- Événements ---------- */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = acts[el.dataset.act];
  if (!fn) return;
  if (el.tagName === 'BUTTON') e.preventDefault();
  fn(el, e);
});

document.addEventListener('submit', (e) => {
  const f = e.target;
  const fn = forms[f.dataset.form];
  if (fn) { e.preventDefault(); fn(f); }
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.matches('[data-set]')) {
    const a = S.active; const i = +t.dataset.i, j = +t.dataset.j, f = t.dataset.f;
    const entry = a.entries[i];
    const old = entry.sets[j][f];
    const raw = num(t.value);
    const v = raw == null ? null : f === 'kg' ? Math.round(raw * 10) / 10 : Math.round(raw);
    entry.sets[j][f] = v;
    for (let k = j + 1; k < entry.sets.length; k++) {
      const s = entry.sets[k];
      if (!s.done && (s[f] === old || s[f] == null)) {
        s[f] = v;
        const inp = app.querySelector(`[data-set][data-i="${i}"][data-j="${k}"][data-f="${f}"]`);
        if (inp) inp.value = f === 'kg' ? fnum(v) : v ?? '';
      }
    }
    commit(); return;
  }
  if (t.matches('[data-tpl]')) {
    const tp = tplById(t.dataset.id); const k = t.dataset.tpl;
    if (k === 'day') tp.day = t.value === '' ? null : +t.value;
    else if (k === 'letter') { tp.letter = t.value.trim().toUpperCase(); t.value = tp.letter; }
    else tp.name = t.value.trim() || tp.name;
    commit(); return;
  }
  if (t.matches('[data-setting]')) { S.settings[t.dataset.setting] = +t.value; commit(); toast('Réglage enregistré.'); return; }
  if (t.matches('[data-photo]')) { handlePhoto(t); return; }
  if (t.matches('[data-import]')) { handleImport(t); return; }
  if (t.name === 'kind' && t.closest('form[data-form="ex"]')) {
    const f = t.closest('form');
    f.querySelectorAll('[data-k]').forEach((n) => { n.hidden = n.dataset.k !== t.value; });
  }
});

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.matches('[data-note]') && S.active) { S.active.entries[+t.dataset.note].note = t.value; commit(); }
  const f = t.closest('form');
  if (f?.dataset.form === 'checkin') ciWarn(f);
  if (f?.dataset.form === 'j1') j1Live(f);
});

document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheetEl.hidden) closeSheet(); });

window.addEventListener('hashchange', () => { closeSheet(); render(); window.scrollTo(0, 0); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flush();
  else if (S) { render(); }
});
window.addEventListener('pagehide', () => flush());

/* Écran allumé pendant la séance */
let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && !wakeLock && 'wakeLock' in navigator && document.visibilityState === 'visible') {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch { wakeLock = null; }
}

/* Horloge : chrono de séance et repos */
function tick() {
  if (!S?.active || route().v !== 'session') return;
  const a = S.active;
  const c = document.getElementById('chrono');
  if (c) c.textContent = clock(Date.now() - a.start);
  if (a.restEnd) {
    const rem = a.restEnd - Date.now();
    if (rem <= 0) { a.restEnd = null; commit(); restAlert(); refreshDock(); }
    else { const r = document.getElementById('rest-t'); if (r) r.textContent = clock(rem + 999); }
  }
}

/* ---------- Démarrage ---------- */
(async function init() {
  document.body.insertAdjacentHTML('afterbegin', SPRITE);
  const stored = await load();
  S = stored && Array.isArray(stored.exercises) ? migrate(stored) : seed();
  if (!stored) commit();
  render();
  setInterval(tick, 500);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js').catch(() => {});
  navigator.storage?.persist?.().catch(() => {});
})();
