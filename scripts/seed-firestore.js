// Firestore seeding script using Firebase client SDK
// Run with: node scripts/seed-firestore.js

const fs = require('fs');
const path = require('path');

const { initializeApp: initClientApp } = require('firebase/app');
const { getFirestore: getClientFirestore, collection, doc, setDoc } = require('firebase/firestore');

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

async function seed() {
  console.log('🌱 Seeding Firestore with updated 8-char codes...\n');

  // Seed teachers
  console.log(`📚 Seeding ${data.teachers.length} teachers...`);
  for (const teacher of data.teachers) {
    const ref = doc(collection(db, 'teachers'));
    await setDoc(ref, teacher);
    console.log(`  ✅ ${teacher.name} → ${teacher.code}`);
  }

  // Seed administration
  if (data.administration) {
    console.log(`\n🏫 Seeding ${data.administration.length} admin users...`);
    for (const admin of data.administration) {
      const ref = doc(collection(db, 'administration'));
      await setDoc(ref, admin);
      console.log(`  ✅ ${admin.name} → ${admin.code}`);
    }
  }

  // Seed students with their 8-char codes
  console.log(`\n🎓 Seeding ${data.students.length} students with codes...`);
  for (const student of data.students) {
    // Also update in classes subcollection
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

    // And in top-level students collection for auth lookup
    const authRef = doc(collection(db, 'students'));
    await setDoc(authRef, {
      name: student.name,
      code: student.code,
      classId: student.classId,
      studentId: student.studentId,
    });
    console.log(`  ✅ ${student.name} (${student.classId}) → ${student.code}`);
  }

  console.log('\n✅ Seeding complete!');
  console.log('\n🔑 Test credentials:');
  console.log(`  Teacher code:  TEACHER1`);
  console.log(`  Student code:  STUDENT1`);
  console.log(`  Admin code:    ADMIN123`);
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
