"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import { db } from "../../../lib/firebase";
import { doc, getDoc, getDocs, collection, setDoc } from "firebase/firestore";
import styles from "../../absences/page.module.css";

interface Justification {
  id: string;
  studentName: string;
  studentId: string;
  classId: string;
  date: string;
  reason: string;
  status: "pending" | "applied";
}

export default function JustificatifsPage() {
  const [justifications, setJustifications] = useState<Justification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTestJustification = async () => {
      try {
        const classRef = doc(db, "classes", "G4");
        const classSnap = await getDoc(classRef);
        let validDates: string[] = [];
        
        if (classSnap.exists()) {
          const schedule = classSnap.data().schedule || [];
          const dayMap: { [key: string]: number } = { "Dimanche": 0, "Lundi": 1, "Mardi": 2, "Mercredi": 3, "Jeudi": 4, "Vendredi": 5, "Samedi": 6 };
          const validDays = schedule.map((s: any) => dayMap[s.day]).filter((d: number) => d !== undefined);
          
          if (validDays.length > 0) {
            const today = new Date();
            today.setDate(today.getDate() - 1);
            for (let i = 0; i < 30; i++) {
              const d = new Date(today);
              d.setDate(d.getDate() - i);
              if (validDays.includes(d.getDay())) {
                validDates.push(d.toISOString().split('T')[0]);
                break;
              }
            }
          }
        }

        const studentsRef = collection(db, "classes/G4/students");
        const studentsSnap = await getDocs(studentsRef);
        
        if (!studentsSnap.empty && validDates.length > 0) {
          const firstStudent = studentsSnap.docs[0];
          const testDate = validDates[0];
          
          // Check if already applied
          let isApplied = false;
          const attRef = doc(db, `classes/G4/attendance`, testDate);
          const attSnap = await getDoc(attRef);
          if (attSnap.exists()) {
            const justified = attSnap.data().justified || {};
            if (justified[firstStudent.id]) {
              isApplied = true;
            }
          }

          setJustifications([
            {
              id: "test-justification-1",
              studentName: firstStudent.data().name,
              studentId: firstStudent.id,
              classId: "G4",
              date: testDate,
              reason: "A justifié son absence (Certificat médical)",
              status: isApplied ? "applied" : "pending"
            }
          ]);
        }
      } catch (error) {
        console.error("Error fetching test data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTestJustification();
  }, []);

  const handleApply = async (j: Justification) => {
    try {
      const attRef = doc(db, `classes/${j.classId}/attendance`, j.date);
      await setDoc(attRef, {
        justified: {
          [j.studentId]: true
        }
      }, { merge: true });

      setJustifications(justifications.map(just => just.id === j.id ? { ...just, status: "applied" } : just));
      
      alert(`Justification appliquée. Vous pouvez vérifier dans le Suivi des Absences pour la date ${j.date}.`);
    } catch (error) {
      console.error("Erreur lors de l'application", error);
      alert("Erreur lors de l'enregistrement dans Firebase. Assurez-vous que l'ID de l'étudiant est correct.");
    }
  };

  return (
    <DashboardLayout>
      <main className={styles.contentBody}>
        <h1 className={styles.pageTitle}>Justificatifs d'Absence</h1>
        
        <div className={styles.panel} style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem", color: "#374151" }}>Liste des justifications à appliquer</h2>
          
          {loading ? (
            <p style={{ color: "#6b7280" }}>Chargement des justifications...</p>
          ) : justifications.length === 0 ? (
            <p style={{ color: "#6b7280" }}>Aucune justification en attente.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {justifications.map(j => (
                <div key={j.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: j.status === 'applied' ? '#f9fafb' : 'white', transition: "all 0.2s", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "#111827", fontSize: "1.05rem" }}>{j.studentName} <span style={{ color: "#6b7280", fontWeight: "normal", fontSize: "0.9rem" }}>({j.classId})</span></div>
                    <div style={{ color: "#4b5563", fontSize: "0.875rem", marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ backgroundColor: "#e5e7eb", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600 }}>{j.date}</span>
                      {j.reason}
                    </div>
                  </div>
                  {j.status === "pending" ? (
                    <button 
                      onClick={() => handleApply(j)}
                      style={{ padding: "0.6rem 1.25rem", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600, transition: "background-color 0.2s" }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#2563eb"}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#3b82f6"}
                    >
                      Appliquer
                    </button>
                  ) : (
                    <span style={{ color: "#10b981", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem", backgroundColor: "#d1fae5", padding: "0.5rem 1rem", borderRadius: "6px" }}>
                      ✓ Justifié
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
