"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import styles from "../page.module.css";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../../../lib/firebase";

interface EventItem {
  id: string;
  name: string;
  date: string;
  description: string;
  createdAt: number;
}

export default function StudentEvenementsPage() {
  const [loading, setLoading] = useState(true);
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

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Événements</h1>
            <p className={styles.subtitle}>Annonces et activités de l&apos;administration</p>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>À venir</h2>
          </div>
          {loading ? (
            <div className={styles.loading}>Chargement...</div>
          ) : events.length === 0 ? (
            <div style={{ color: "#9ca3af" }}>
              Aucun événement pour le moment (à venir depuis l&apos;administration).
            </div>
          ) : (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {events.map((evt) => (
                <div key={evt.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "0.9rem" }}>
                  <div style={{ fontWeight: 700, color: "#111827" }}>{evt.name}</div>
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
