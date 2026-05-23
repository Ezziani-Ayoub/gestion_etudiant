"use client";

import { useState, useEffect } from "react";
import styles from "./page.module.css";
import DashboardLayout from "../../components/DashboardLayout";
import { db } from "../../lib/firebase";
import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import type { AuthUser } from "../../lib/auth";

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
  const [teacherModule, setTeacherModule] = useState<string>("Module Inconnu");

  useEffect(() => {
    const session = getClientSession();
    console.log("[GradesPage] Session:", session);
    if (session?.module) {
      setTeacherModule(session.module);
      console.log("[GradesPage] teacherModule set to:", session.module);
    } else {
      console.warn("[GradesPage] No module found in session — grades cannot be saved!");
    }
  }, []);

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const studentsRef = collection(db, `classes/${selectedClass}/students`);
        const studentsSnap = await getDocs(studentsRef);
        const studentsList = studentsSnap.docs.map(d => ({
          dbId: d.id,
          ...(d.data() as Omit<Student, "dbId">),
        })) as Student[];

        studentsList.sort((a, b) => Number(a.id) - Number(b.id));
        console.log("[GradesPage] Fetched students:", studentsList);
        setStudents(studentsList);
      } catch (error) {
        console.error("[GradesPage] Error fetching students:", error);
      }
      setLoading(false);
    };

    fetchStudents();
  }, [selectedClass]);

  const handleGradeChange = (dbId: string, field: "control" | "exam", value: string) => {
    setStudents(prev =>
      prev.map(student => {
        if (student.dbId === dbId) {
          const currentGrades = student.grades || {};
          const currentModuleGrades = currentGrades[teacherModule] || {};
          return {
            ...student,
            grades: {
              ...currentGrades,
              [teacherModule]: {
                ...currentModuleGrades,
                [field]: value,
              },
            },
          };
        }
        return student;
      })
    );
  };

  const handleSaveGrades = async () => {
    console.log("[GradesPage] handleSaveGrades called");
    console.log("[GradesPage] teacherModule:", teacherModule);
    console.log("[GradesPage] selectedClass:", selectedClass);
    console.log("[GradesPage] students:", students);

    if (teacherModule === "Module Inconnu") {
      console.error("[GradesPage] BLOCKED: teacherModule is 'Module Inconnu' — cannot save.");
      alert("Erreur : le module de l'enseignant est inconnu. Veuillez vous reconnecter.");
      return;
    }

    setSavingId("all");

    // Filter students who have grades entered for this module
    const studentsWithGrades = students.filter(student => student.grades?.[teacherModule]);
    console.log("[GradesPage] Students with grades to save:", studentsWithGrades);

    if (studentsWithGrades.length === 0) {
      console.warn("[GradesPage] No students have grades for module:", teacherModule);
      alert("Aucune note à enregistrer.");
      setSavingId(null);
      return;
    }

    try {
      const promises = studentsWithGrades.map(student => {
        const moduleGrades = student.grades![teacherModule];
        const path = `classes/${selectedClass}/students/${student.dbId}`;
        const payload = {
          grades: {
            [teacherModule]: {
              ...(moduleGrades.control !== undefined && moduleGrades.control !== ""
                ? { control: moduleGrades.control }
                : {}),
              ...(moduleGrades.exam !== undefined && moduleGrades.exam !== ""
                ? { exam: moduleGrades.exam }
                : {}),
            },
          },
        };

        console.log(`[GradesPage] Saving to Firestore path: ${path}`, payload);

        return setDoc(doc(db, `classes/${selectedClass}/students`, student.dbId), payload, {
          merge: true,
        });
      });

      await Promise.all(promises);
      console.log("[GradesPage] All grades saved successfully.");
      alert("Notes enregistrées avec succès !");
    } catch (error) {
      console.error("[GradesPage] Firestore save error:", error);
      alert("Erreur lors de l'enregistrement des notes : " + (error as Error).message);
    }

    setSavingId(null);
  };

  const calculateAverage = (controlStr?: string, examStr?: string) => {
    const control = parseFloat(controlStr || "");
    const exam = parseFloat(examStr || "");

    if (isNaN(control) && isNaN(exam)) return "--";
    if (isNaN(control)) return exam.toFixed(2);
    if (isNaN(exam)) return control.toFixed(2);

    const avg = control * 0.4 + exam * 0.6;
    return avg.toFixed(2);
  };

  return (
    <DashboardLayout>
      <header className={styles.topHeader}>
        <div className={styles.classTabs}>
          {(["G4", "G6", "G8"] as const).map(cls => (
            <button
              key={cls}
              className={`${styles.classTab} ${selectedClass === cls ? styles.activeTab : ""}`}
              onClick={() => setSelectedClass(cls)}
            >
              Classe {cls}
            </button>
          ))}
        </div>
      </header>

      <main className={styles.contentBody}>
        <h1 className={styles.pageTitle}>
          Registre des Notes : {teacherModule} (Classe {selectedClass})
        </h1>

        {/* DEBUG BANNER — remove after fixing */}
        {teacherModule === "Module Inconnu" && (
          <div style={{
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            color: "#991b1b",
            padding: "0.75rem 1rem",
            borderRadius: "6px",
            marginBottom: "1rem",
            fontWeight: 500
          }}>
            ⚠️ Aucun module trouvé dans la session. Les notes ne peuvent pas être enregistrées. Vérifiez que <code>session.module</code> est bien défini.
          </div>
        )}

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
                    <th style={{ width: "15%" }}>Moyenne ({teacherModule})</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(student => {
                    const moduleGrades = student.grades?.[teacherModule] || {};
                    const avg = calculateAverage(moduleGrades.control, moduleGrades.exam);
                    const avgNum = parseFloat(avg as string);
                    const avgColor = isNaN(avgNum) ? "#111827" : avgNum >= 10 ? "#059669" : "#dc2626";

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
                            onChange={e => handleGradeChange(student.dbId, "control", e.target.value)}
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
                            value={moduleGrades.exam || ""}
                            onChange={e => handleGradeChange(student.dbId, "exam", e.target.value)}
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
            <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={handleSaveGrades}
                disabled={savingId === "all"}
                style={{
                  backgroundColor: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  padding: "0.75rem 1.5rem",
                  fontWeight: 600,
                  cursor: savingId === "all" ? "not-allowed" : "pointer",
                  opacity: savingId === "all" ? 0.7 : 1,
                }}
              >
                {savingId === "all" ? "Enregistrement en cours..." : "Enregistrer"}
              </button>
            </div>
          </div>
        )}
      </main>
    </DashboardLayout>
  );
}