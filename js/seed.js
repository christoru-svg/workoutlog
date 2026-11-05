// Programme de départ : 2 séances par semaine (mardi A, jeudi B), séries de 15 à charge modérée.
// Tous les exercices sont validés par la kiné. Les charges sont vides : elles se remplissent à la première séance.

const now = Date.now();

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
    bodyweight: false,
    cue: '',
    photo: null,
    history: [{ date: now, from: null, to: 'ok', reason: 'Programme de départ validé par la kiné' }],
    ...extra,
  };
}

export function seed() {
  return {
    version: 1,
    settings: { painThreshold: 3, restSec: 75 },
    exercises: [
      ex('mob', 'Mobilité bassin et respiration', 'Au sol', 'mob', { kind: 'time', sets: 1, secs: 480 }),
      ex('lat', 'Tirage vertical', 'Poulie', 'lat'),
      ex('row', 'Rowing assis', 'Poulie', 'row'),
      ex('face', 'Face pull', 'Poulie', 'face'),
      ex('curl', 'Curl biceps assis', 'Haltères', 'curl'),
      ex('dead', 'Dead bug', 'Au sol', 'dead', { reps: 10, perSide: true, bodyweight: true }),
      ex('bird', 'Bird dog', 'Au sol', 'bird', { reps: 10, perSide: true, bodyweight: true }),
      ex('plank', 'Planche ventrale', 'Au sol', 'plank', { kind: 'time', secs: 20 }),
      ex('ext', 'Extension du dos', 'Banc à 45°', 'ext', { bodyweight: true }),
      ex('bench', 'Développé couché', 'Machine', 'bench'),
      ex('ohp', 'Développé épaules assis', 'Machine', 'ohp'),
      ex('fly', 'Pec deck', 'Machine', 'fly'),
      ex('tri', 'Extension triceps', 'Poulie', 'tri'),
      ex('side', 'Gainage latéral', 'Au sol', 'side', { kind: 'time', secs: 20, perSide: true }),
      ex('pallof', 'Pallof press', 'Poulie', 'pallof', { reps: 12, perSide: true }),
    ],
    templates: [
      { id: 'tA', name: 'A · Tirage + transverse', letter: 'A', day: 2,
        items: ['mob', 'lat', 'row', 'face', 'curl', 'dead', 'bird', 'plank', 'ext'] },
      { id: 'tB', name: 'B · Poussée + obliques', letter: 'B', day: 4,
        items: ['mob', 'bench', 'ohp', 'fly', 'tri', 'side', 'pallof', 'dead', 'ext'] },
    ],
    sessions: [],
    active: null,
  };
}
