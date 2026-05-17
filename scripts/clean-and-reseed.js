// clean-and-reseed.js
// Deletes old random-ID documents, then re-seeds with readable IDs.
// Run with: node scripts/clean-and-reseed.js

const fs = require('fs');
const path = require('path');

const { initializeApp: initClientApp } = require('firebase/app');
const {
  getFirestore: getClientFirestore,
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

const app = initClientApp(firebaseConfig);
const db = getClientFirestore(app);

const data = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../firestore-seeded-users.json'), 'utf8')
);

function toSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function deleteCollection(collectionName) {
  const snap = await getDocs(collection(db, collectionName));
  if (snap.empty) {
    console.log(`  (no documents found in "${collectionName}")`);
    return;
  }
  for (const docSnap of snap.docs) {
    await deleteDoc(doc(db, collectionName, docSnap.id));
    console.log(`  🗑️  Deleted ${collectionName}/${docSnap.id}`);
  }
}

async function run() {
  console.log('🧹 Step 1: Cleaning old documents...\n');

  console.log('Cleaning "teachers"...');
  await deleteCollection('teachers');

  console.log('Cleaning "administration"...');
  await deleteCollection('administration');

  console.log('Cleaning "students"...');
  await deleteCollection('students');

  console.log('\n🌱 Step 2: Re-seeding with readable document IDs...\n');

  // Seed teachers
  console.log(`📚 Seeding ${data.teachers.length} teachers...`);
  for (const teacher of data.teachers) {
    const docId = toSlug(teacher.name); // e.g. "professeur-g4"
    const ref = doc(db, 'teachers', docId);
    await setDoc(ref, teacher);
    console.log(`  ✅ ${teacher.name} → ${teacher.code}  [ID: ${docId}]`);
  }

  // Seed administration
  if (data.administration) {
    console.log(`\n🏫 Seeding ${data.administration.length} admin users...`);
    for (const admin of data.administration) {
      const docId = toSlug(admin.name); // e.g. "admin-system"
      const ref = doc(db, 'administration', docId);
      await setDoc(ref, admin);
      console.log(`  ✅ ${admin.name} → ${admin.code}  [ID: ${docId}]`);
    }
  }

  // Seed students
  console.log(`\n🎓 Seeding ${data.students.length} students...`);
  for (const student of data.students) {
    // Update in classes subcollection (keeps studentId as doc ID there — that's fine)
    const studentRef = doc(
      db,
      `classes/${student.classId}/students`,
      student.studentId
    );
    await setDoc(studentRef, {
      id: student.studentId,
      name: student.name,
      code: student.code,
    }, { merge: true });

    // Top-level students collection: use readable custom ID
    // e.g. "g6_mustapha-el-glaoui"
    const docId = `${student.classId.toLowerCase()}_${toSlug(student.name)}`;
    const authRef = doc(db, 'students', docId);
    await setDoc(authRef, {
      name: student.name,
      code: student.code,
      classId: student.classId,
      studentId: student.studentId,
    });
    console.log(`  ✅ ${student.name} (${student.classId}) → ${student.code}  [ID: ${docId}]`);
  }

  console.log('\n✅ All done! Firebase console now shows readable student names as document IDs.');
  console.log('\n🔑 Login credentials unchanged:');
  console.log(`  Teacher:  TEACHER1`);
  console.log(`  Student:  STUDENT1`);
  console.log(`  Admin:    ADMIN123`);
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
