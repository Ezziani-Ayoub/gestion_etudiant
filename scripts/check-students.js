const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

async function check() {
  console.log("=== CHECKING ALL CODES IN DATABASE ===");
  
  // Teachers
  const teachersSnap = await getDocs(collection(db, "teachers"));
  console.log(`\nTeachers (Total: ${teachersSnap.size}):`);
  teachersSnap.forEach(doc => {
    const d = doc.data();
    console.log(`Teacher ID: ${doc.id}, Name: ${d.name}, Code: "${d.code}" (${d.code ? d.code.length : 0} chars)`);
  });

  // Administration
  const adminSnap = await getDocs(collection(db, "administration"));
  console.log(`\nAdministration (Total: ${adminSnap.size}):`);
  adminSnap.forEach(doc => {
    const d = doc.data();
    console.log(`Admin ID: ${doc.id}, Name: ${d.name}, Code: "${d.code}" (${d.code ? d.code.length : 0} chars)`);
  });

  // Top level students
  const studentsSnap = await getDocs(collection(db, "students"));
  console.log(`\nTop-level Students (Total: ${studentsSnap.size}):`);
  studentsSnap.forEach(doc => {
    const d = doc.data();
    if (!d.code || d.code.length !== 8) {
      console.log(`!!! INVALID TOP-LEVEL STUDENT ID: ${doc.id}, Name: ${d.name}, Code: "${d.code}" (${d.code ? d.code.length : 0} chars)`);
    } else {
      console.log(`Student ID: ${doc.id}, Name: ${d.name}, Code: "${d.code}" (${d.code.length} chars)`);
    }
  });

  // Classes subcollection students
  const classesSnap = await getDocs(collection(db, "classes"));
  console.log(`\nClasses (Total: ${classesSnap.size}):`);
  for (const classDoc of classesSnap.docs) {
    console.log(`\nClass: ${classDoc.id}`);
    const studentSnap = await getDocs(collection(db, `classes/${classDoc.id}/students`));
    studentSnap.forEach(doc => {
      const d = doc.data();
      if (!d.code || d.code.length !== 8) {
        console.log(`!!! INVALID CLASS STUDENT DocID: ${doc.id}, ID: ${d.id}, Name: ${d.name}, Code: "${d.code}" (${d.code ? d.code.length : 0} chars)`);
      } else {
        console.log(`Class Student DocID: ${doc.id}, ID: ${d.id}, Name: ${d.name}, Code: "${d.code}" (${d.code.length} chars)`);
      }
    });
  }

  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
