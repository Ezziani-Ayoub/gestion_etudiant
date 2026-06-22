"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import DashboardLayout from "../components/DashboardLayout";
import { db } from "../lib/firebase";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where } from "firebase/firestore";

interface Student {
  id: number | string;
  dbId: string;
  name: string;
  code?: string;
  control?: string;
  exam?: string;
}

interface ScheduleSlot {
  day: string;
  time: string;
  room: string;
}

function generateRandomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const getRootStudentDocRef = async (classId: string, studentId: string) => {
  const predictableId = `${classId}_${studentId}`;
  const predictableRef = doc(db, "students", predictableId);
  try {
    const snap = await getDoc(predictableRef);
    if (snap.exists()) {
      return predictableRef;
    }
  } catch (error) {
    console.error("Error getting predictable student doc:", error);
  }
  
  try {
    const q = query(
      collection(db, "students"),
      where("classId", "==", classId),
      where("studentId", "==", studentId)
    );
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      return doc(db, "students", querySnap.docs[0].id);
    }
  } catch (error) {
    console.error("Error querying root student:", error);
  }
  return null;
};

export default function TeacherDashboard() {
  const userName = "Professeur";
  
  const [selectedClass, setSelectedClass] = useState<"G4" | "G6" | "G8">("G4");
  const [currentStudents, setCurrentStudents] = useState<Student[]>([]);
  const [currentSchedule, setCurrentSchedule] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchClassData = async () => {
      setLoading(true);
      try {
        const classRef = doc(db, "classes", selectedClass);
        const classSnap = await getDoc(classRef);
        if (classSnap.exists()) {
          setCurrentSchedule(classSnap.data().schedule || []);
        } else {
          setCurrentSchedule([]);
        }

        const studentsRef = collection(db, `classes/${selectedClass}/students`);
        const studentsSnap = await getDocs(studentsRef);
        const studentsList = studentsSnap.docs.map(d => ({ dbId: d.id, ...(d.data() as Omit<Student, "dbId">) })) as Student[];
        
        studentsList.sort((a, b) => Number(a.id) - Number(b.id));
        setCurrentStudents(studentsList);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
      setLoading(false);
    };

    fetchClassData();
  }, [selectedClass]);

  const handleNameChange = (dbId: string, newName: string) => {
    setCurrentStudents(prev => 
      prev.map(student => student.dbId === dbId ? { ...student, name: newName } : student)
    );
  };

  const handleNameBlur = async (student: Student) => {
    setSavingId(student.dbId);
    
    if (student.name.trim() === "") {
      try {
        await deleteDoc(doc(db, `classes/${selectedClass}/students`, student.dbId));
        const rootRef = await getRootStudentDocRef(selectedClass, student.dbId);
        if (rootRef) {
          await deleteDoc(rootRef);
        }
        setCurrentStudents(prev => prev.filter(s => s.dbId !== student.dbId));
      } catch (error) {
        console.error("Error deleting student:", error);
      }
    } else {
      try {
        await updateDoc(doc(db, `classes/${selectedClass}/students`, student.dbId), {
          name: student.name
        });
        const rootRef = await getRootStudentDocRef(selectedClass, student.dbId);
        if (rootRef) {
          await updateDoc(rootRef, {
            name: student.name
          });
        }
      } catch (error) {
        console.error("Error updating student name:", error);
      }
    }
    
    setSavingId(null);
  };

  const handleAddStudent = async () => {
    let maxId = 0;
    currentStudents.forEach(s => {
      if (Number(s.id) > maxId) maxId = Number(s.id);
    });
    const newId = maxId + 1;
    const code = generateRandomCode();
    
    const newStudent = { 
      id: newId, 
      name: "Nouveau", 
      code: code,
      control: "", 
      exam: "" 
    };

    setSavingId("NEW");
    try {
      const studentRef = doc(collection(db, `classes/${selectedClass}/students`), newId.toString());
      await setDoc(studentRef, newStudent);
      
      const authRef = doc(db, "students", `${selectedClass}_${newId}`);
      await setDoc(authRef, {
        name: "Nouveau",
        code: code,
        classId: selectedClass,
        studentId: newId.toString()
      });

      setCurrentStudents(prev => [...prev, { dbId: studentRef.id, ...newStudent }]);
    } catch (error) {
      console.error("Error adding new student:", error);
    }
    setSavingId(null);
  };

  return (
    <DashboardLayout>
      {/* TOP HEADER - TABS */}
      <header className={styles.topHeader}>
          <div className={styles.classTabs}>
            <button 
              className={`${styles.classTab} ${selectedClass === "G4" ? styles.activeTab : ""}`}
              onClick={() => setSelectedClass("G4")}
            >
              Classe G4
            </button>
            <button 
              className={`${styles.classTab} ${selectedClass === "G6" ? styles.activeTab : ""}`}
              onClick={() => setSelectedClass("G6")}
            >
              Classe G6
            </button>
            <button 
              className={`${styles.classTab} ${selectedClass === "G8" ? styles.activeTab : ""}`}
              onClick={() => setSelectedClass("G8")}
            >
              Classe G8
            </button>
          </div>
        </header>

        {/* CONTENT BODY */}
        <main className={styles.contentBody}>
          <h1 className={styles.pageTitle}>Aperçu : Classe {selectedClass}</h1>

          {loading ? (
            <div className={styles.loadingState}>Chargement de la base de données...</div>
          ) : (
            <div className={styles.dashboardGrid}>
              
              {/* SCHEDULE PANEL */}
              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h3>Emploi du temps</h3>
                </div>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Jour</th>
                      <th>Horaire</th>
                      <th>Salle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentSchedule.map((slot, index) => (
                      <tr key={index}>
                        <td>{slot.day}</td>
                        <td>{slot.time}</td>
                        <td>{slot.room}</td>
                      </tr>
                    ))}
                    {currentSchedule.length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ textAlign: "center", color: "#9ca3af" }}>Non assigné</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* STUDENTS PANEL */}
              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h3>Effectif ({currentStudents.length})</h3>
                  <button 
                    className={styles.primaryBtn}
                    onClick={handleAddStudent}
                    disabled={savingId === "NEW"}
                  >
                    Ajouter
                  </button>
                </div>
                <div style={{ maxHeight: "500px", overflowY: "auto" }}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th style={{ width: "60px" }}>ID</th>
                        <th>Nom Complet</th>
                        <th>Code d'accès</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentStudents.map((student) => (
                        <tr key={student.dbId}>
                          <td style={{ color: "#6b7280" }}>{student.id}</td>
                          <td>
                            <input
                              type="text"
                              value={student.name}
                              onChange={(e) => handleNameChange(student.dbId, e.target.value)}
                              onBlur={() => handleNameBlur(student)}
                              className={styles.inlineInput}
                              placeholder="Supprimer (laisser vide)"
                            />
                          </td>
                          <td style={{ color: "#4b5563", fontFamily: "monospace", fontWeight: 600 }}>
                            {student.code || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </main>
    </DashboardLayout>
  );
}
