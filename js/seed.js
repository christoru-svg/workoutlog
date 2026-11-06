// Programme de départ : 2 séances par semaine (mardi A, jeudi B), séries de 15 à charge modérée.
// Tous les exercices sont validés par la kiné. Les charges sont vides : elles se remplissent à la première séance.

const now = Date.now();

// Groupes musculaires (le premier est le groupe principal)
export const MUSCLES = {
  dos: 'Dos', pecs: 'Pectoraux', epaules: 'Épaules', biceps: 'Biceps', triceps: 'Triceps',
  abdos: 'Abdos', obliques: 'Obliques', lombaires: 'Lombaires', fessiers: 'Fessiers', jambes: 'Jambes', mobilite: 'Mobilité',
};
export const SEED_MUSCLES = {
  mob: ['mobilite', 'lombaires'],
  lat: ['dos', 'biceps'],
  row: ['dos', 'biceps'],
  face: ['epaules', 'dos'],
  curl: ['biceps'],
  dead: ['abdos'],
  bird: ['lombaires', 'abdos', 'fessiers'],
  plank: ['abdos', 'epaules'],
  ext: ['lombaires', 'fessiers'],
  bench: ['pecs', 'triceps', 'epaules'],
  ohp: ['epaules', 'triceps'],
  fly: ['pecs'],
  tri: ['triceps'],
  side: ['obliques', 'abdos'],
  pallof: ['obliques', 'abdos'],
  twist: ['obliques', 'abdos'],
  superman: ['lombaires', 'fessiers', 'dos'],
};

function ex(id, name, equip, picto, extra = {}) {
  return {
    id, name, equip, picto,
    status: 'ok',
    kind: 'reps',
    sets: 3,
    reps: 15,
    secs: 20,
    perSide: false,
    load: null,
    rest: null,
    bodyweight: false,
    cue: '',
    photo: null,
    history: [{ date: now, from: null, to: 'ok', reason: 'Programme de départ validé par la kiné' }],
    muscles: [...(SEED_MUSCLES[id] || [])],
    ...extra,
  };
}

// Ajouté à ta demande, en « précaution » : rotation du buste en flexion, à confirmer avec ta kiné.
export function twist() {
  return ex('twist', 'Twist russe', 'Au sol', 'twist', {
    status: 'warn', reps: 10, perSide: true, bodyweight: true,
    cue: 'À confirmer avec ta kiné : rotation du buste en flexion. Lent, sans charge au début, amplitude réduite, dos long.',
    history: [{ date: Date.now(), from: null, to: 'warn', reason: 'Ajouté, en attente de l\'avis de la kiné' }],
  });
}

export function superman() {
  return ex('superman', 'Superman', 'Au sol', 'superman', {
    status: 'warn', reps: 10, bodyweight: true,
    cue: 'À confirmer avec ta kiné. Bras et jambes levés de quelques centimètres, regard vers le sol, sans cambrer. Tenir 2 s.',
    history: [{ date: Date.now(), from: null, to: 'warn', reason: 'Ajouté, en attente de l\'avis de la kiné' }],
  });
}

// Exercices ajoutés après l'installation : la migration les ajoute sans toucher aux données.
export const ADDONS = [
  { v: 2, make: twist, tpl: 'tB', before: 'dead' },
  { v: 3, make: superman, tpl: 'tA', before: 'ext' },
];
export const SEED_VERSION = 5;

export function seed() {
  return {
    version: 1,
    seedVersion: SEED_VERSION,
    onboarded: false,
    settings: { painThreshold: 3, restSec: 75 },
    exercises: [
      ex('mob', 'Mobilité bassin et respiration', 'Au sol', 'mob', { kind: 'time', sets: 1, secs: 480, rest: 0 }),
      ex('lat', 'Tirage vertical', 'Poulie', 'lat'),
      ex('row', 'Rowing assis', 'Poulie', 'row'),
      ex('face', 'Face pull', 'Poulie', 'face'),
      ex('curl', 'Curl biceps assis', 'Haltères', 'curl'),
      ex('dead', 'Dead bug', 'Au sol', 'dead', { reps: 10, perSide: true, bodyweight: true, rest: 45 }),
      ex('bird', 'Bird dog', 'Au sol', 'bird', { reps: 10, perSide: true, bodyweight: true, rest: 45 }),
      ex('plank', 'Planche ventrale', 'Au sol', 'plank', { kind: 'time', secs: 20, rest: 45 }),
      ex('ext', 'Extension du dos', 'Banc à 45°', 'ext', { bodyweight: true }),
      ex('bench', 'Développé couché', 'Machine', 'bench'),
      ex('ohp', 'Développé épaules assis', 'Machine', 'ohp'),
      ex('fly', 'Pec deck', 'Machine', 'fly'),
      ex('tri', 'Extension triceps', 'Poulie', 'tri'),
      ex('side', 'Gainage latéral', 'Au sol', 'side', { kind: 'time', secs: 20, perSide: true, rest: 45 }),
      ex('pallof', 'Pallof press', 'Poulie', 'pallof', { reps: 12, perSide: true }),
      twist(),
      superman(),
    ],
    templates: [
      { id: 'tA', name: 'A · Tirage + transverse', letter: 'A', day: 2,
        items: ['mob', 'lat', 'row', 'face', 'curl', 'dead', 'bird', 'plank', 'superman', 'ext'] },
      { id: 'tB', name: 'B · Poussée + obliques', letter: 'B', day: 4,
        items: ['mob', 'bench', 'ohp', 'fly', 'tri', 'side', 'pallof', 'twist', 'dead', 'ext'] },
    ],
    sessions: [],
    weights: [],
    painLogs: [],
    active: null,
  };
}
