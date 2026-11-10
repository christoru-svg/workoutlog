// Synchronisation dans le cloud (Firebase) : connexion Google + Firestore.
// Le SDK est chargé à la demande depuis le CDN de Google : si le réseau manque,
// l'app continue de fonctionner en local et la synchro reprend plus tard.
//
// Structure Firestore (protégée par les règles : seul l'utilisateur connecté y accède) :
//   users/{uid}                  réglages, exercices, séances modèles, poids, séance en cours
//   users/{uid}/sessions/{id}    une séance réalisée
//   users/{uid}/painLogs/{id}    un relevé de douleur
//   users/{uid}/photos/{exId}    la photo d'un exercice

// Ces valeurs sont publiques par nature (elles sont dans le code de toute app web Firebase).
const firebaseConfig = {
  apiKey: 'AIzaSyAHA4YqIzzNODaRPRCBJB4hmn3QPbayrKs',
  authDomain: 'workout-log-ee4a9.firebaseapp.com',
  projectId: 'workout-log-ee4a9',
  storageBucket: 'workout-log-ee4a9.firebasestorage.app',
  messagingSenderId: '24090290047',
  appId: '1:24090290047:web:2445fd088795c30828dc4a',
};

const SDK = 'https://www.gstatic.com/firebasejs/10.14.1';
let fb = null;

async function ready() {
  if (fb) return fb;
  const [appMod, authMod, fsMod] = await Promise.all([
    import(`${SDK}/firebase-app.js`),
    import(`${SDK}/firebase-auth.js`),
    import(`${SDK}/firebase-firestore.js`),
  ]);
  const app = appMod.initializeApp(firebaseConfig);
  const auth = authMod.getAuth(app);
  let db;
  try {
    // Cache local : les écritures faites hors ligne sont envoyées au retour du réseau.
    db = fsMod.initializeFirestore(app, { localCache: fsMod.persistentLocalCache({ tabManager: fsMod.persistentMultipleTabManager() }) });
  } catch {
    db = fsMod.getFirestore(app);
  }
  fb = { auth, db, ...authMod, ...fsMod };
  return fb;
}

export async function watchUser(cb) {
  const f = await ready();
  f.getRedirectResult(f.auth).catch(() => {});
  f.onAuthStateChanged(f.auth, (u) => cb(u ? { uid: u.uid, email: u.email, name: u.displayName } : null));
}

export async function signIn() {
  const f = await ready();
  const provider = new f.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await f.signInWithPopup(f.auth, provider);
  } catch (e) {
    // Fenêtre bloquée ou non prise en charge (certaines apps installées) : on passe par une redirection.
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/web-storage-unsupported'].includes(e.code)) {
      await f.signInWithRedirect(f.auth, provider);
      return;
    }
    throw e;
  }
}

export async function signOutUser() {
  const f = await ready();
  await f.signOut(f.auth);
}

export async function pullAll(uid) {
  const f = await ready();
  const u = f.doc(f.db, 'users', uid);
  const [core, sessions, painLogs, photos] = await Promise.all([
    f.getDoc(u),
    f.getDocs(f.collection(u, 'sessions')),
    f.getDocs(f.collection(u, 'painLogs')),
    f.getDocs(f.collection(u, 'photos')),
  ]);
  return {
    core: core.exists() ? core.data() : null,
    sessions: sessions.docs.map((d) => d.data()),
    painLogs: painLogs.docs.map((d) => d.data()),
    photos: Object.fromEntries(photos.docs.map((d) => [d.id, d.data().data])),
  };
}

// ops : [{ data }] pour le document principal, [{ coll, id, data }] ou [{ coll, id, del: true }] pour les sous-collections
export async function pushOps(uid, ops) {
  const f = await ready();
  const u = f.doc(f.db, 'users', uid);
  const commits = [];
  for (let i = 0; i < ops.length; i += 400) {
    const batch = f.writeBatch(f.db);
    for (const op of ops.slice(i, i + 400)) {
      const ref = op.coll ? f.doc(u, op.coll, op.id) : u;
      if (op.del) batch.delete(ref); else batch.set(ref, op.data);
    }
    commits.push(batch.commit());
  }
  await Promise.all(commits);
}
