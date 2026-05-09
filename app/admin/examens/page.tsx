"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import styles from "../../student/page.module.css";
import type { AuthUser } from "../../../lib/auth";
import { db } from "../../../lib/firebase";
import { addDoc, collection, getDocs, orderBy, query } from "firebase/firestore";

interface ExamMessage {
  id: string;
  weekStart: string;
  weekEnd: string;
  message: string;
  createdAt: number;
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

export default function ExamensPage() {
  const [user] = useState<AuthUser | null>(() => getClientSession());
  const isAdmin = user?.role === "administration";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weekStart, setWeekStart] = useState("");
  const [weekEnd, setWeekEnd] = useState("");
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
        console.error("Erreur lors du chargement des examens:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    try {
      const message = `Semaine des contrôles/examens du ${new Date(weekStart).toLocaleDateString("fr-FR")} au ${new Date(weekEnd).toLocaleDateString("fr-FR")}.`;
      const payload = { weekStart, weekEnd, message, createdAt: Date.now() };
      const docRef = await addDoc(collection(db, "exam_announcements"), payload);
      setMessages((prev) => [{ id: docRef.id, ...payload }, ...prev]);
      setWeekStart("");
      setWeekEnd("");
    } catch (error) {
      console.error("Erreur lors de la création du message d'examen:", error);
      alert("Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Contrôles / Examens</h1>
            <p className={styles.subtitle}>{isAdmin ? "Planifier une semaine d'évaluation" : "Messages d'examens"}</p>
          </div>
        </div>

        {isAdmin && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Nouvelle période</h2>
            </div>
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
              <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} required style={{ padding: "0.65rem", border: "1px solid #d1d5db", borderRadius: 8 }} />
              <input type="date" value={weekEnd} onChange={(e) => setWeekEnd(e.target.value)} required style={{ padding: "0.65rem", border: "1px solid #d1d5db", borderRadius: 8 }} />
              <button type="submit" disabled={saving} style={{ border: "none", borderRadius: 8, background: "#2563eb", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
                {saving ? "Envoi..." : "Soumettre"}
              </button>
            </form>
          </div>
        )}

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Messages publiés</h2>
          </div>
          {loading ? (
            <div className={styles.loading}>Chargement...</div>
          ) : messages.length === 0 ? (
            <div style={{ color: "#6b7280" }}>Aucun contrôle ou examen déclaré.</div>
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
