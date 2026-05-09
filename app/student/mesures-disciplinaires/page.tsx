"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import styles from "../page.module.css";
import type { AuthUser } from "../../../lib/auth";
import { db } from "../../../lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

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

export default function StudentMesuresDisciplinairesPage() {
  const [user] = useState<AuthUser | null>(() => getClientSession());
  const [loading, setLoading] = useState(true);
  const [disciplinaryCount, setDisciplinaryCount] = useState(0);

  useEffect(() => {
    const fetchDisciplinaryReports = async () => {
      if (!user?.name) {
        setLoading(false);
        return;
      }
      try {
        const q = query(collection(db, "rapports"), where("studentName", "==", user.name));
        const snap = await getDocs(q);
        setDisciplinaryCount(snap.size);
      } catch (error) {
        console.error("Erreur lors de la récupération des rapports disciplinaires:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDisciplinaryReports();
  }, [user?.name]);

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Mesure Disciplinaire</h1>
            <p className={styles.subtitle}>Situation de l&apos;étudiant</p>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Statut</h2>
          </div>
          {loading ? (
            <div style={{ color: "#6b7280" }}>Vérification en cours...</div>
          ) : disciplinaryCount > 0 ? (
            <div style={{ color: "#dc2626", fontWeight: 600 }}>
              Oui, vous avez {disciplinaryCount} rapport{disciplinaryCount > 1 ? "s" : ""}.
            </div>
          ) : (
            <div style={{ color: "#059669", fontWeight: 600 }}>Aucune mesure disciplinaire.</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
