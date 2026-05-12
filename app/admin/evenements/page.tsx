"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import styles from "../../student/page.module.css";
import { addDoc, collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import type { AuthUser } from "../../../lib/auth";

interface EventItem {
  id: string;
  name: string;
  date: string;
  description: string;
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

export default function AdminEvenementsPage() {
  const [user] = useState<AuthUser | null>(() => getClientSession());
  const isAdmin = user?.role === "administration";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const rows = snap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<EventItem, "id">) })) as EventItem[];
        setEvents(rows);
      } catch (error) {
        console.error("Erreur chargement événements:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    try {
      const payload = { name, date, description, createdAt: Date.now() };
      const docRef = await addDoc(collection(db, "events"), payload);
      setEvents((prev) => [{ id: docRef.id, ...payload }, ...prev]);
      setName("");
      setDate("");
      setDescription("");
    } catch (error) {
      console.error("Erreur création événement:", error);
      alert("Erreur lors de la création de l'événement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Événements</h1>
            <p className={styles.subtitle}>
              {isAdmin
                ? "Publier un événement pour les étudiants et professeurs"
                : "Consultation des événements publiés par l'administration"}
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Nouveau événement</h2>
            </div>
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem" }}>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom de l'événement" required style={{ padding: "0.65rem", border: "1px solid #d1d5db", borderRadius: 8 }} />
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={{ padding: "0.65rem", border: "1px solid #d1d5db", borderRadius: 8 }} />
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" required rows={4} style={{ padding: "0.65rem", border: "1px solid #d1d5db", borderRadius: 8 }} />
              <button type="submit" disabled={saving} style={{ width: "fit-content", border: "none", borderRadius: 8, padding: "0.7rem 1rem", background: "#2563eb", color: "white", fontWeight: 600, cursor: "pointer" }}>
                {saving ? "Publication..." : "Publier"}
              </button>
            </form>
          </div>
        )}

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Historique</h2>
          </div>
          {loading ? (
            <div className={styles.loading}>Chargement...</div>
          ) : events.length === 0 ? (
            <div style={{ color: "#6b7280" }}>Aucun événement publié.</div>
          ) : (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {events.map((evt) => (
                <div key={evt.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "0.9rem" }}>
                  <div style={{ fontWeight: 700 }}>{evt.name}</div>
                  <div style={{ color: "#6b7280", fontSize: "0.9rem", margin: "0.2rem 0 0.4rem" }}>
                    {new Date(evt.date).toLocaleDateString("fr-FR")}
                  </div>
                  <div style={{ color: "#374151" }}>{evt.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
