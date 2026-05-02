"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import { db } from "../../lib/firebase";
import { collection, doc, getDocs, updateDoc } from "firebase/firestore";

interface Student {
  id: number | string;
  dbId: string;
  name: string;
  control?: string;
  exam?: string;
}

export default function GradesPage() {
  const userName = "Professeur";

  const [selectedClass, setSelectedClass] = useState<"G4" | "G6" | "G8">("G4");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const studentsRef = collection(db, `classes/${selectedClass}/students`);
        const studentsSnap = await getDocs(studentsRef);
        const studentsList = studentsSnap.docs.map(d => ({ dbId: d.id, ...(d.data() as Omit<Student, "dbId">) })) as Student[];
        
        studentsList.sort((a, b) => Number(a.id) - Number(b.id));
        setStudents(studentsList);
      } catch (error) {
        console.error("Error fetching students:", error);
      }
      setLoading(false);
    };

    fetchStudents();
  }, [selectedClass]);

  const handleGradeChange = (dbId: string, field: "control" | "exam", value: string) => {
    setStudents(prev => prev.map(student => {
      if (student.dbId === dbId) {
        return { ...student, [field]: value };
      }
      return student;
    }));
  };

  const handleGradeBlur = async (student: Student) => {
    setSavingId(student.dbId);
    try {
      await updateDoc(doc(db, `classes/${selectedClass}/students`, student.dbId), {
        control: student.control,
        exam: student.exam
      });
    } catch (error) {
      console.error("Error updating grades:", error);
    }
    setSavingId(null);
  };

  const calculateAverage = (controlStr?: string, examStr?: string) => {
    const control = parseFloat(controlStr || "");
    const exam = parseFloat(examStr || "");
    
    if (isNaN(control) && isNaN(exam)) return "--";
    if (isNaN(control)) return exam.toFixed(2);
    if (isNaN(exam)) return control.toFixed(2);

    const avg = (control * 0.4) + (exam * 0.6);
    return avg.toFixed(2);
  };

  return (
    <div className={styles.layoutContainer}>
      {/* LEFT SIDEBAR */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2>Gestion Académique</h2>
        </div>
        <nav className={styles.sidebarNav}>
          <Link href="/" className={styles.navItem}>Tableau de bord</Link>
          <Link href="/grades" className={`${styles.navItem} ${styles.active}`}>Registre des Notes</Link>
          <Link href="/lessons" className={styles.navItem}>Leçons et Devoirs</Link>
          <Link href="/absences" className={styles.navItem}>Suivi des Absences</Link>
        </nav>
        <div className={styles.sidebarFooter}>
          <div className={styles.userAvatar}>{userName.charAt(0)}</div>
          <div>
            <div style={{ fontWeight: 600 }}>{userName}</div>
            <div style={{ color: "#9ca3af", fontSize: "0.75rem" }}>Département Mathématiques</div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className={styles.mainWrapper}>
        
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
          <h1 className={styles.pageTitle}>Registre des Notes : Classe {selectedClass}</h1>

          {loading ? (
            <div className={styles.loadingState}>Chargement du registre...</div>
          ) : (
            <div className={styles.panel}>
              <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th style={{ width: "80px" }}>ID</th>
                      <th>Étudiant</th>
                      <th style={{ width: "15%" }}>Contrôle Continu</th>
                      <th style={{ width: "15%" }}>Examen Final</th>
                      <th style={{ width: "15%" }}>Moyenne Générale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => {
                      const avg = calculateAverage(student.control, student.exam);
                      const avgNum = parseFloat(avg as string);
                      
                      let avgColor = "#111827";
                      if (!isNaN(avgNum)) {
                        avgColor = avgNum >= 10 ? "#059669" : "#dc2626";
                      }

                      return (
                        <tr key={student.dbId}>
                          <td className={styles.readOnly} style={{ color: "#6b7280" }}>#{student.id}</td>
                          <td className={styles.readOnly} style={{ fontWeight: 500 }}>{student.name}</td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              max="20"
                              step="0.25"
                              value={student.control || ""}
                              onChange={(e) => handleGradeChange(student.dbId, "control", e.target.value)}
                              onBlur={() => handleGradeBlur(student)}
                              className={styles.inlineInput}
                              placeholder="--"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              max="20"
                              step="0.25"
                              value={student.exam || ""}
                              onChange={(e) => handleGradeChange(student.dbId, "exam", e.target.value)}
                              onBlur={() => handleGradeBlur(student)}
                              className={styles.inlineInput}
                              placeholder="--"
                            />
                          </td>
                          <td>
                            <span className={styles.finalGrade} style={{ color: avgColor }}>
                              {avg} {avg !== "--" && "/ 20"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
