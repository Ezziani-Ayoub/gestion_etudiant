"use client";

import { useState, useEffect } from "react";
import styles from "./page.module.css";
import Link from "next/link";
import { db } from "../../lib/firebase";
import { collection, doc, getDocs, updateDoc } from "firebase/firestore";

export default function GradesPage() {
  const userName = "Teacher User";

  const [selectedClass, setSelectedClass] = useState<"G4" | "G6" | "G8">("G4");
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const studentsRef = collection(db, `classes/${selectedClass}/students`);
        const studentsSnap = await getDocs(studentsRef);
        const studentsList = studentsSnap.docs.map(d => ({ dbId: d.id, ...(d.data() as any) }));
        
        // Sort students by numeric ID
        studentsList.sort((a, b) => Number(a.id) - Number(b.id));
        setStudents(studentsList);
      } catch (error) {
        console.error("Error fetching students:", error);
      }
      setLoading(false);
    };

    fetchStudents();
  }, [selectedClass]);

  const handleGradeChange = async (dbId: string, field: "control" | "exam", value: string) => {
    // Optimistic UI update
    setStudents((prev) =>
      prev.map((student) =>
        student.dbId === dbId ? { ...student, [field]: value } : student
      )
    );

    // Save to Firestore
    try {
      const studentRef = doc(db, `classes/${selectedClass}/students`, dbId);
      await updateDoc(studentRef, {
        [field]: value
      });
    } catch (error) {
      console.error("Error updating grade:", error);
    }
  };

  // Calculate final grade
  const calculateFinal = (control: string, exam: string) => {
    const c = parseFloat(control);
    const e = parseFloat(exam);
    if (isNaN(c) || isNaN(e)) return null;
    
    // 25% Control + 75% Exam
    return (c * 0.25) + (e * 0.75);
  };

  return (
    <div className={styles.container}>
      {/* Top Navigation Bar */}
      <header className={styles.topBar}>
        <div className={styles.logo}>
          <h2>Gestion Étudiant</h2>
        </div>
        
        <nav className={styles.topNav}>
          <Link href="/" className={styles.navItem}>Home</Link>
          <Link href="/grades" className={`${styles.navItem} ${styles.active}`}>Grades</Link>
          <a href="#" className={styles.navItem}>Lessons</a>
          <a href="#" className={styles.navItem}>Assignments</a>
          <a href="#" className={styles.navItem}>Absences</a>
        </nav>

        <div className={styles.userInfo}>
          <span className={styles.userAvatar}>{userName.charAt(0)}</span>
          <span>{userName} (Maths)</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        <div className={styles.pageHeader}>
          <h1>Gestion des Notes (Grades)</h1>
          <p>Sélectionnez une classe et cliquez dans les cases pour insérer ou modifier les notes. La moyenne se calcule et s'enregistre automatiquement.</p>
        </div>
        
        {/* Class Selector for Grades */}
        <div style={{ marginBottom: "2rem", display: "flex", gap: "1rem", alignItems: "center", backgroundColor: "white", padding: "1.5rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <label htmlFor="classSelect" style={{ fontWeight: 600 }}>Sélectionnez une classe :</label>
          <select 
            id="classSelect" 
            value={selectedClass} 
            onChange={(e) => setSelectedClass(e.target.value as "G4" | "G6" | "G8")}
            style={{ padding: "0.5rem 1rem", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }}
          >
            <option value="G4">Classe G4</option>
            <option value="G6">Classe G6</option>
            <option value="G8">Classe G8</option>
          </select>
        </div>

        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
            Chargement des notes depuis Firebase...
          </div>
        ) : (
          <div className={styles.boardContainer} style={{ maxHeight: "60vh", overflowY: "auto" }}>
            <table className={styles.dataTable}>
              <thead style={{ position: "sticky", top: 0, backgroundColor: "#f8fafc", zIndex: 10, boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                <tr>
                  <th>ID</th>
                  <th>Nom de l'étudiant</th>
                  <th>Note Contrôle (25%)</th>
                  <th>Note Examen (75%)</th>
                  <th>Moyenne Finale</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const final = calculateFinal(student.control, student.exam);
                  let finalColor = "#64748b"; // default grey if null
                  if (final !== null) {
                    finalColor = final >= 10 ? "#16a34a" : "#dc2626"; // green or red
                  }

                  return (
                    <tr key={student.dbId}>
                      <td className={styles.readOnly}>#{student.id}</td>
                      <td className={styles.readOnly} style={{ fontWeight: 500 }}>{student.name}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          step="0.25"
                          className={styles.inlineInput}
                          value={student.control}
                          onChange={(e) => handleGradeChange(student.dbId, "control", e.target.value)}
                          placeholder="--"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          step="0.25"
                          className={styles.inlineInput}
                          value={student.exam}
                          onChange={(e) => handleGradeChange(student.dbId, "exam", e.target.value)}
                          placeholder="--"
                        />
                      </td>
                      <td>
                        <span className={styles.finalGrade} style={{ color: finalColor, fontWeight: "bold" }}>
                          {final !== null ? final.toFixed(2) : "--"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
