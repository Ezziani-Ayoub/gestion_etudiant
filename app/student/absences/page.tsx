"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import styles from "../page.module.css";
import type { AuthUser } from "../../../lib/auth";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../lib/firebase";

interface AttendanceDoc {
  date: string;
  status: string;
  justified: boolean;
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

export default function StudentAbsencesPage() {
  const [user] = useState<AuthUser | null>(() => getClientSession());
  const [loading, setLoading] = useState(true);
  const [absences, setAbsences] = useState<AttendanceDoc[]>([]);

  useEffect(() => {
    const fetchAbsences = async () => {
      const classId = user?.classId;
      const studentId = user?.studentId;
      if (!classId || !studentId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const attendanceRef = collection(db, `classes/${classId}/attendance`);
        const snap = await getDocs(attendanceRef);

        const rows = snap.docs
          .map((docSnap) => {
            const data = docSnap.data() as {
              records?: Record<string, string>;
              justified?: Record<string, boolean>;
            };
            const status = data.records?.[studentId];
            if (status !== "Absent") return null;

            return {
              date: docSnap.id,
              status: "Absent",
              justified: Boolean(data.justified?.[studentId]),
            } as AttendanceDoc;
          })
          .filter((row): row is AttendanceDoc => row !== null)
          .sort((a, b) => b.date.localeCompare(a.date));

        setAbsences(rows);
      } catch (error) {
        console.error("Error fetching absences:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAbsences();
  }, [user?.classId, user?.studentId]);

  if (!user) {
    return (
      <DashboardLayout>
        <div className={styles.loading}>Chargement de votre espace...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Absences aux cours</h1>
            <p className={styles.subtitle}>
              Étudiant: {user.name} (Classe {user.classId})
            </p>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Historique de vos absences</h2>
          </div>

          {loading ? (
            <div className={styles.loading}>Chargement des absences...</div>
          ) : absences.length === 0 ? (
            <div style={{ color: "#059669", fontWeight: 600 }}>
              Aucune absence enregistrée.
            </div>
          ) : (
            <table className={styles.gradesTable}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>HD</th>
                  <th>HF</th>
                  <th>Cours</th>
                  <th>Professeur</th>
                  <th>Status</th>
                  <th>Justif.</th>
                </tr>
              </thead>
              <tbody>
                {absences.map((row) => (
                  <tr key={row.date}>
                    <td>{new Date(row.date).toLocaleDateString("fr-FR")}</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td style={{ color: "#dc2626", fontWeight: 600 }}>{row.status}</td>
                    <td>{row.justified ? "Oui" : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
