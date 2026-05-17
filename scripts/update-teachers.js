// update-teachers.js
// Removes placeholder teachers (Professeur G4/G6/G8) and adds real teachers.
// Run with: node scripts/update-teachers.js

const { initializeApp } = require('firebase/app');
const {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
} = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDMeI9XaVuUlaXWoaLEp40Cu8sv_Fab_3o",
  authDomain: "gestion-etudiant-22e68.firebaseapp.com",
  projectId: "gestion-etudiant-22e68",
  storageBucket: "gestion-etudiant-22e68.firebasestorage.app",
  messagingSenderId: "727920724475",
  appId: "1:727920724475:web:aba048e36b18d926eb635e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Real teachers to add
const REAL_TEACHERS = [
  { name: "Badia",    module: "Mathématiques",        code: "TEACHER1" },
  { name: "Drayef",   module: "Français",              code: "DR8YF2KZ" },
  { name: "Mkhanter", module: "Physique-Chimie",       code: "MKH3NT9R" },
  { name: "Jamal",    module: "SVT",                   code: "JM4LSV7T" },
  { name: "Jamila",   module: "Anglais",               code: "JML5ANG8" },
  { name: "Boujmaa",  module: "Histoire-Géographie",   code: "BJM4HG2X" },
  { name: "Kamal",    module: "Informatique",          code: "KML9INF3" },
];

// Placeholder IDs to delete (from our reseed)
const PLACEHOLDERS_TO_DELETE = [
  'professeur-g4',
  'professeur-g6',
  'professeur-g8',
];

function toSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function run() {
  console.log('🗑️  Step 1: Removing placeholder teachers...\n');

  for (const id of PLACEHOLDERS_TO_DELETE) {
    try {
      await deleteDoc(doc(db, 'teachers', id));
      console.log(`  ✅ Deleted teachers/${id}`);
    } catch (e) {
      console.log(`  ⚠️  teachers/${id} not found (already deleted?)`);
    }
  }

  // Also scan for any remaining random-ID duplicates just in case
  const snap = await getDocs(collection(db, 'teachers'));
  const placeholderNames = ['Professeur G4', 'Professeur G6', 'Professeur G8'];
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    if (placeholderNames.includes(data.name)) {
      await deleteDoc(doc(db, 'teachers', docSnap.id));
      console.log(`  🗑️  Also removed stale doc: teachers/${docSnap.id} (${data.name})`);
    }
  }

  console.log('\n✅ Step 2: Adding real teachers...\n');

  for (const teacher of REAL_TEACHERS) {
    const docId = toSlug(teacher.name); // e.g. "badia"
    const ref = doc(db, 'teachers', docId);
    await setDoc(ref, teacher);
    console.log(`  ✅ ${teacher.name} (${teacher.module}) → Code: ${teacher.code}  [ID: ${docId}]`);
  }

  console.log('\n🎉 Done! All 7 real teachers added to Firestore.');
  console.log('\n📋 Teacher login codes:');
  for (const t of REAL_TEACHERS) {
    console.log(`  ${t.name.padEnd(12)} (${t.module.padEnd(22)})  → ${t.code}`);
  }
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
