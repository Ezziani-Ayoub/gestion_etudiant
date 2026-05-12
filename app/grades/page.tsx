"use client";

import { useState, useEffect } from "react";
import styles from "./page.module.css";
import DashboardLayout from "../../components/DashboardLayout";
import { db } from "../../lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import type { AuthUser } from "../../lib/auth";
import {
  getStudentGradesFromLocalStorage,
  saveStudentGradesToLocalStorage,
} from "../../lib/local-grades";

interface Student {
  id: number | string;
  dbId: string;
  name: string;
  grades?: Record<string, { control?: string; exam?: string }>;
}

function getClientSession(): AuthUser | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)client_session=([^;]*)/);
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1])) as AuthUser;
  } catch {
    return null;
  }
}

export default function GradesPage() {
  const [selectedClass, setSelectedClass] = useState<"G4" | "G6" | "G8">("G4");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [teacherModule] = useState<string>(() => getClientSession()?.module || "Module non configuré");
  const isModuleConfigured = teacherModule !== "Module non configuré";

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const studentsRef = collection(db, `classes/${selectedClass}/students`);
        const studentsSnap = await getDocs(studentsRef);
        const studentsList = studentsSnap.docs.map(d => ({ dbId: d.id, ...(d.data() as Omit<Student, "dbId">) })) as Student[];
        const studentsWithLocalGrades = studentsList.map((student) => {
          // Read by both keys to support older/local variations (dbId vs id)
          const localGradesByDocId = getStudentGradesFromLocalStorage(selectedClass, student.dbId);
          const localGradesByStudentId = getStudentGradesFromLocalStorage(selectedClass, String(student.id));
          return {
            ...student,
            grades: {
              ...(student.grades || {}),
              ...localGradesByDocId,
              ...localGradesByStudentId,
            },
          };
        });
        
        studentsWithLocalGrades.sort((a, b) => Number(a.id) - Number(b.id));
        setStudents(studentsWithLocalGrades);
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
        const currentGrades = student.grades || {};
        const currentModuleGrades = currentGrades[teacherModule] || {};
        return {
          ...student,
          grades: {
            ...currentGrades,
            [teacherModule]: {
              ...currentModuleGrades,
              [field]: value
            }
          }
        };
      }
      return student;
    }));
  };

  const handleSaveGrades = async () => {
    if (!isModuleConfigured) {
      alert("Votre module n'est pas configuré. Contactez l'administration.");
      return;
    }
    setSavingId("all");
    students.forEach((student) => {
      // Save under both keys so student profile can always resolve grades
      saveStudentGradesToLocalStorage(selectedClass, student.dbId, student.grades || {});
      saveStudentGradesToLocalStorage(selectedClass, String(student.id), student.grades || {});
    });
    alert("Notes enregistrées localement avec succès !");
    window.location.reload();
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

  const calculateGeneralAverage = () => {
    const averages = students
      .map((student) => {
        const moduleGrades = student.grades?.[teacherModule] || {};
        const avg = calculateAverage(moduleGrades.control, moduleGrades.exam);
        return parseFloat(avg as string);
      })
      .filter((value) => !isNaN(value));

    if (averages.length === 0) return "--";
    const total = averages.reduce((sum, value) => sum + value, 0);
    return (total / averages.length).toFixed(2);
  };

  const generalAverage = calculateGeneralAverage();

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
          <h1 className={styles.pageTitle}>Registre des Notes : {teacherModule} (Classe {selectedClass})</h1>
          {!isModuleConfigured && (
            <div style={{ marginBottom: "1rem", color: "#b91c1c", fontWeight: 600 }}>
              Module non configuré pour ce compte. Les notes sont désactivées tant que l&apos;administration ne définit pas votre matière.
            </div>
          )}

          {loading ? (
            <div className={styles.loadingState}>Chargement du registre...</div>
          ) : (
            <>
            <div className={styles.panel}>
              <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th style={{ width: "80px" }}>ID</th>
                      <th>Étudiant</th>
                      <th style={{ width: "15%" }}>Contrôle Continu</th>
                      <th style={{ width: "15%" }}>Examen Final</th>
                      <th style={{ width: "15%" }}>Moyenne ({teacherModule})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => {
                      const moduleGrades = student.grades?.[teacherModule] || {};
                      const avg = calculateAverage(moduleGrades.control, moduleGrades.exam);
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
                              value={moduleGrades.control || ""}
                              onChange={(e) => handleGradeChange(student.dbId, "control", e.target.value)}
                              className={styles.inlineInput}
                              placeholder="--"
                              disabled={!isModuleConfigured}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              max="20"
                              step="0.25"
                              value={moduleGrades.exam || ""}
                              onChange={(e) => handleGradeChange(student.dbId, "exam", e.target.value)}
                              className={styles.inlineInput}
                              placeholder="--"
                              disabled={!isModuleConfigured}
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
              <div style={{ marginTop: "0.75rem", display: "flex", justifyContent: "flex-end", paddingRight: "1rem" }}>
                <div style={{ fontWeight: 700, color: generalAverage === "--" ? "#6b7280" : "#111827" }}>
                  Moyenne générale : {generalAverage} {generalAverage !== "--" ? "/ 20" : ""}
                </div>
              </div>
            </div>
              <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
                <button 
                  onClick={handleSaveGrades}
                  disabled={savingId === "all" || !isModuleConfigured}
                  style={{
                    backgroundColor: "#2563eb",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    padding: "0.75rem 1.5rem",
                    fontWeight: 600,
                    cursor: savingId === "all" ? "not-allowed" : "pointer",
                    opacity: savingId === "all" ? 0.7 : 1
                  }}
                >
                  {savingId === "all" ? "Enregistrement en cours..." : "Enregistrer"}
                </button>
              </div>
            </>
          )}
        </main>
    </DashboardLayout>
  );
}
