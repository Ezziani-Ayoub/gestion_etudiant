"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import styles from "../../student/page.module.css";
import type { AuthUser } from "../../../lib/auth";
import { db } from "../../../lib/firebase";
import { addDoc, collection, getDocs, orderBy, query } from "firebase/firestore";

interface ReunionMessage {
  id: string;
  date: string;
  hour: string;
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

export default function ReunionsPage() {
  const [user] = useState<AuthUser | null>(() => getClientSession());
  const isAdmin = user?.role === "administration";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState("");
  const [hour, setHour] = useState("");
  const [messages, setMessages] = useState<ReunionMessage[]>([]);

  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "reunion_announcements"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const rows = snap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<ReunionMessage, "id">) })) as ReunionMessage[];
        setMessages(rows);
      } catch (error) {
        console.error("Erreur lors du chargement des réunions:", error);
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
      const message = `Réunion programmée le ${new Date(date).toLocaleDateString("fr-FR")} à ${hour}. Merci de votre présence.`;
      const payload = { date, hour, message, createdAt: Date.now() };
      const docRef = await addDoc(collection(db, "reunion_announcements"), payload);
      setMessages((prev) => [{ id: docRef.id, ...payload }, ...prev]);
      setDate("");
      setHour("");
    } catch (error) {
      console.error("Erreur lors de la création de la réunion:", error);
      alert("Erreur lors de l'enregistrement de la réunion.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Réunions</h1>
            <p className={styles.subtitle}>{isAdmin ? "Planifier une réunion pour les professeurs" : "Messages des réunions"}</p>
          </div>
        </div>

        {isAdmin && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Nouvelle réunion</h2>
            </div>
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={{ padding: "0.65rem", border: "1px solid #d1d5db", borderRadius: 8 }} />
              <input type="time" value={hour} onChange={(e) => setHour(e.target.value)} required style={{ padding: "0.65rem", border: "1px solid #d1d5db", borderRadius: 8 }} />
              <button type="submit" disabled={saving} style={{ border: "none", borderRadius: 8, background: "#2563eb", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
                {saving ? "Envoi..." : "Soumettre"}
              </button>
            </form>
          </div>
        )}

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Messages</h2>
          </div>
          {loading ? (
            <div className={styles.loading}>Chargement...</div>
          ) : messages.length === 0 ? (
            <div style={{ color: "#6b7280" }}>Aucune réunion déclarée.</div>
          ) : (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {messages.map((msg) => (
                <div key={msg.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "0.9rem" }}>
                  <div style={{ fontWeight: 700, color: "#111827" }}>
                    Réunion: {new Date(msg.date).toLocaleDateString("fr-FR")} à {msg.hour}
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
