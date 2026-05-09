"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import styles from "../page.module.css";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../../../lib/firebase";

interface ExamMessage {
  id: string;
  weekStart: string;
  weekEnd: string;
  message: string;
  createdAt: number;
}

export default function StudentControlesExamensPage() {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ExamMessage[]>([]);

  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "exam_announcements"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const rows = snap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<ExamMessage, "id">) })) as ExamMessage[];
        setMessages(rows);
      } catch (error) {
        console.error("Erreur chargement examens:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, []);

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Contrôles / Examens</h1>
            <p className={styles.subtitle}>Calendrier des évaluations</p>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Planning</h2>
          </div>
          {loading ? (
            <div className={styles.loading}>Chargement...</div>
          ) : messages.length === 0 ? (
            <>
              <div style={{ color: "#6b7280" }}>La semaine des contrôles est en cours.</div>
              <div style={{ color: "#9ca3af", marginTop: "0.4rem" }}>
                Aucun contrôle ou examen n&apos;est encore planifié.
              </div>
            </>
          ) : (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {messages.map((msg) => (
                <div key={msg.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "0.9rem" }}>
                  <div style={{ fontWeight: 700, color: "#111827" }}>
                    Semaine: {new Date(msg.weekStart).toLocaleDateString("fr-FR")} - {new Date(msg.weekEnd).toLocaleDateString("fr-FR")}
                  </div>
                  <div style={{ color: "#4b5563", marginTop: "0.35rem" }}>{msg.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
