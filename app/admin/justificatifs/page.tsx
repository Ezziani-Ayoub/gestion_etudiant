"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import { db } from "../../../lib/firebase";
import { doc, getDocs, collection, setDoc } from "firebase/firestore";
import styles from "../../student/page.module.css";

interface StudentOption {
  id: string;
  dbId: string;
  classId: string;
  name: string;
}

const REASONS = [
  "Certificat médical",
  "Accident",
  "Décès familial",
  "Permis de conduire",
  "Convocation administrative",
  "Autre justificatif valide",
];

export default function JustificatifsPage() {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [absenceDates, setAbsenceDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [reason, setReason] = useState(REASONS[0]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const classIds: Array<"G4" | "G6" | "G8"> = ["G4", "G6", "G8"];
        const allStudents: StudentOption[] = [];

        for (const classId of classIds) {
          const snap = await getDocs(collection(db, `classes/${classId}/students`));
          snap.docs.forEach((docSnap) => {
            const data = docSnap.data() as { name: string; id: string };
            allStudents.push({
              dbId: docSnap.id,
              id: String(data.id || docSnap.id),
              classId,
              name: data.name,
            });
          });
        }

        setStudents(allStudents.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.error("Erreur chargement étudiants:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  useEffect(() => {
    const fetchAbsenceDates = async () => {
      if (!selectedStudent) {
        setAbsenceDates([]);
        setSelectedDate("");
        return;
      }
      try {
        const snap = await getDocs(collection(db, `classes/${selectedStudent.classId}/attendance`));
        const dates: string[] = [];
        snap.docs.forEach((docSnap) => {
          const data = docSnap.data() as { records?: Record<string, string> };
          if (data.records?.[selectedStudent.dbId] === "Absent") {
            dates.push(docSnap.id);
          }
        });
        dates.sort((a, b) => b.localeCompare(a));
        setAbsenceDates(dates);
        setSelectedDate(dates[0] || "");
      } catch (error) {
        console.error("Erreur chargement absences étudiant:", error);
      }
    };

    fetchAbsenceDates();
  }, [selectedStudent]);

  const handleApply = async () => {
    if (!selectedStudent || !selectedDate) return;
    setApplying(true);
    try {
      const attRef = doc(db, `classes/${selectedStudent.classId}/attendance`, selectedDate);
      await setDoc(attRef, {
        justified: {
          [selectedStudent.dbId]: true
        }
      }, { merge: true });

      await setDoc(doc(db, "absence_justifications", `${selectedStudent.classId}_${selectedStudent.dbId}_${selectedDate}`), {
        studentName: selectedStudent.name,
        studentId: selectedStudent.dbId,
        classId: selectedStudent.classId,
        date: selectedDate,
        reason,
        appliedAt: Date.now(),
      });
      
      alert("Justification appliquée avec succès.");
    } catch (error) {
      console.error("Erreur lors de l'application", error);
      alert("Erreur lors de l'enregistrement de la justification.");
    } finally {
      setApplying(false);
    }
  };

  const filteredStudents = students.filter((s) =>
    `${s.name} ${s.classId} ${s.id}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Justificatifs d&apos;Absence</h1>
            <p className={styles.subtitle}>Sélectionner un étudiant, une date d&apos;absence et un motif</p>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Recherche étudiant</h2>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, classe ou ID..."
            style={{ width: "100%", padding: "0.75rem", borderRadius: 8, border: "1px solid #d1d5db" }}
          />
          <div style={{ marginTop: "0.75rem", maxHeight: "220px", overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: 8 }}>
            {filteredStudents.map((student) => (
              <button
                key={`${student.classId}-${student.dbId}`}
                type="button"
                onClick={() => setSelectedStudent(student)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "0.65rem 0.85rem",
                  border: "none",
                  borderBottom: "1px solid #f3f4f6",
                  background: selectedStudent?.dbId === student.dbId && selectedStudent?.classId === student.classId ? "#eff6ff" : "#fff",
                  cursor: "pointer",
                }}
              >
                {student.name} - {student.classId} (#{student.id})
              </button>
            ))}
            {!loading && filteredStudents.length === 0 && (
              <div style={{ padding: "0.8rem", color: "#6b7280" }}>Aucun étudiant trouvé.</div>
            )}
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Application du justificatif</h2>
          </div>
          {loading ? (
            <p style={{ color: "#6b7280" }}>Chargement des données...</p>
          ) : !selectedStudent ? (
            <p style={{ color: "#6b7280" }}>Sélectionnez un étudiant pour continuer.</p>
          ) : absenceDates.length === 0 ? (
            <p style={{ color: "#6b7280" }}>Aucune absence enregistrée pour cet étudiant.</p>
          ) : (
            <div style={{ display: "grid", gap: "0.8rem", maxWidth: "560px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.35rem", fontWeight: 600, color: "#374151" }}>Date d&apos;absence</label>
                <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ width: "100%", padding: "0.65rem", border: "1px solid #d1d5db", borderRadius: 8 }}>
                  {absenceDates.map((d) => (
                    <option key={d} value={d}>
                      {new Date(d).toLocaleDateString("fr-FR")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.35rem", fontWeight: 600, color: "#374151" }}>Motif</label>
                <select value={reason} onChange={(e) => setReason(e.target.value)} style={{ width: "100%", padding: "0.65rem", border: "1px solid #d1d5db", borderRadius: 8 }}>
                  {REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleApply}
                disabled={applying}
                style={{ border: "none", borderRadius: 8, padding: "0.7rem 1rem", background: "#2563eb", color: "white", fontWeight: 600, cursor: "pointer" }}
              >
                {applying ? "Application..." : "Appliquer la justification"}
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
