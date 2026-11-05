// Pictogrammes d'exercices et logo, en symboles SVG réutilisables.
// Le corps hérite du trait de l'élément <svg class="thumb"> (couleur du texte),
// le matériel utilise currentColor (cobalt).

const FLOOR = '<line stroke-width="1.5" opacity=".4" x1="2" y1="56" x2="78" y2="56"/>';

export const PICTOS = [
  { id: 'mob', label: 'Mobilité au sol', d: `${FLOOR}<circle cx="12" cy="47" r="4.5"/><path d="M17 49 L44 49 L54 36 L60 54"/><path d="M22 51 L36 53"/><path d="M38 41 q6 -8 12 0" stroke="currentColor"/>` },
  { id: 'lat', label: 'Tirage vertical', d: `<path d="M22 6 H48 M33 6 V0 M30 44 H48 M39 44 V56 M50 34 v6" stroke="currentColor"/><circle cx="38" cy="16" r="4.5"/><path d="M38 42 V22 M38 42 H52 V54 M38 24 L31 16 L30 6"/>` },
  { id: 'row', label: 'Rowing assis', d: `<path d="M22 44 H40 M31 44 V56 M45 18 V36 M38 30 H60 V8" stroke="currentColor"/><circle cx="37" cy="15" r="4.5"/><path d="M32 42 L36 22 M32 42 L46 44 L52 54 M36 24 L25 29 L38 30"/>` },
  { id: 'face', label: 'Face pull', d: `<path d="M40 12 H70 M70 4 V56" stroke="currentColor"/><circle cx="34" cy="11" r="4.5"/><path d="M34 17 V36 M34 36 L30 55 M34 36 L39 55 M34 20 L27 15 L40 12"/>` },
  { id: 'curl', label: 'Curl assis', d: `<path d="M24 42 H46 M24 42 V12 M35 42 V56 M38 21 v9 M43 21 v9 M38 25.5 h5" stroke="currentColor"/><circle cx="30" cy="13" r="4.5"/><path d="M29 40 V19 M29 40 H45 L47 54 M29 22 L31 34 L40 26"/>` },
  { id: 'dead', label: 'Dead bug', d: `${FLOOR}<circle cx="12" cy="48" r="4.5"/><path d="M17 50 H42 M24 49 L26 26 M24 49 L12 36 M42 50 L44 33 H58 M42 50 L70 46"/>` },
  { id: 'bird', label: 'Bird dog', d: `${FLOOR}<circle cx="14" cy="39" r="4.5"/><path d="M22 36 H46 M22 36 V55 M22 36 L4 29 M46 36 L48 55 H62 M46 36 L74 33"/>` },
  { id: 'plank', label: 'Planche', d: `${FLOOR}<circle cx="12" cy="38" r="4.5"/><path d="M28 54 H18 V40 L66 53"/>` },
  { id: 'side', label: 'Gainage latéral', d: `${FLOOR}<circle cx="11" cy="35" r="4.5"/><path d="M28 54 H18 V40 L66 53 M20 41 L23 20"/>` },
  { id: 'ext', label: 'Extension banc 45°', d: `${FLOOR}<path d="M28 56 H72 M48 41 L57 49 M52 45 V56 M63 55 L69 48" stroke="currentColor"/><circle cx="21" cy="12" r="4.5"/><path d="M65 50 L44 32 L25 16 M29 20 L35 24"/><path d="M13 22 q0 9 7 13" stroke="currentColor"/>` },
  { id: 'bench', label: 'Développé couché', d: `<path d="M14 40 H54 M20 40 V56 M48 40 V56 M16 13 H34" stroke="currentColor"/><circle cx="12" cy="33" r="4.5"/><path d="M17 36 H42 L56 38 L58 55 M23 35 L25 13"/>` },
  { id: 'ohp', label: 'Développé épaules', d: `<path d="M24 42 H46 M24 42 V8 M35 42 V56 M30 3 H40" stroke="currentColor"/><circle cx="30" cy="13" r="4.5"/><path d="M29 40 V19 M29 40 H45 L47 54 M30 21 L37 12 L35 3"/>` },
  { id: 'fly', label: 'Écarté / pec deck', d: `<path d="M6 4 V56 M74 4 V56 M18 26 L6 8 M62 26 L74 8" stroke="currentColor"/><circle cx="40" cy="10" r="4.5"/><path d="M40 16 V36 L34 55 M40 36 L46 55 M40 19 L26 22 L18 26 M40 19 L54 22 L62 26"/>` },
  { id: 'tri', label: 'Extension triceps', d: `<path d="M60 4 V56 M54 6 H62 M41 40 L55 6" stroke="currentColor"/><circle cx="40" cy="11" r="4.5"/><path d="M38 18 L34 36 L30 55 M34 36 L38 55 M38 20 L36 30 L41 40"/>` },
  { id: 'pallof', label: 'Pallof press', d: `<path d="M6 4 V56 M8 25 H38" stroke="currentColor"/><circle cx="44" cy="10" r="4.5"/><path d="M44 16 V36 L37 55 M44 36 L51 55 M38 19 L42 25 M50 19 L46 25"/><path d="M56 14 q8 6 0 14" stroke="currentColor"/>` },
  { id: 'twist', label: 'Twist russe', d: `${FLOOR}<circle cx="22" cy="25" r="4.5"/><path d="M36 53 L26 32 M36 53 L50 40 L62 46 M27 34 L40 37"/><circle cx="43" cy="37" r="3.5" stroke="currentColor"/><path d="M44 24 q9 3 6 11" stroke="currentColor"/>` },
  { id: 'superman', label: 'Superman', d: `${FLOOR}<circle cx="14" cy="43" r="4.5"/><path d="M20 47 L46 50 M21 46 L4 38 M46 50 L74 43"/><path d="M33 40 V31 M29.5 34.5 L33 31 L36.5 34.5" stroke="currentColor"/>` },
  { id: 'none', label: 'Haltère', d: `<path d="M22 30 H58 M18 20 V40 M24 23 V37 M62 20 V40 M56 23 V37" stroke="currentColor"/>` },
];

const LOGO = `<symbol id="logo" viewBox="0 0 64 64">
  <rect class="lg-bg" width="64" height="64" rx="16"/>
  <line class="lg-st" x1="16" y1="25" x2="48" y2="25"/>
  <rect class="lg-fg" x="10" y="16" width="5" height="18" rx="2"/>
  <rect class="lg-fg" x="16.5" y="19.5" width="4" height="11" rx="1.5"/>
  <rect class="lg-fg" x="49" y="16" width="5" height="18" rx="2"/>
  <rect class="lg-fg" x="43.5" y="19.5" width="4" height="11" rx="1.5"/>
  <line class="lg-st" x1="14" y1="42" x2="50" y2="42"/>
  <line class="lg-st" x1="14" y1="50" x2="36" y2="50" opacity=".55"/>
</symbol>`;

export const SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">${LOGO}${
  PICTOS.map(p => `<symbol id="x-${p.id}" viewBox="0 0 80 60">${p.d}</symbol>`).join('')
}</svg>`;

export function picto(id, cls = 'thumb') {
  const known = PICTOS.some(p => p.id === id);
  return `<svg class="${cls}" viewBox="0 0 80 60" aria-hidden="true" focusable="false"><use href="#x-${known ? id : 'none'}"/></svg>`;
}

export function logo(size = 36) {
  return `<svg class="logo" width="${size}" height="${size}" viewBox="0 0 64 64" role="img" aria-label="Workout Log"><use href="#logo"/></svg>`;
}
