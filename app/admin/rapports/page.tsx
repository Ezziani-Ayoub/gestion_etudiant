"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import styles from "../../absences/page.module.css";
import { db } from "../../../lib/firebase";
import { collection, doc, getDocs, orderBy, query, updateDoc } from "firebase/firestore";

interface Rapport {
  id: string;
  studentName: string;
  reason: string;
  date: string;
  status: "on_hold" | "approved" | "rejected";
}

export default function RapportsPage() {
  const [rapports, setRapports] = useState<Rapport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRapports = async () => {
      try {
        const q = query(collection(db, "rapports"), orderBy("timestamp", "desc"));
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Rapport[];
        setRapports(data);
      } catch (error) {
        console.error("Erreur lors de la récupération des rapports:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRapports();
  }, []);

  const handleDecision = async (rapport: Rapport, status: "approved" | "rejected") => {
    try {
      await updateDoc(doc(db, "rapports", rapport.id), { status });
      setRapports((prev) => prev.map((r) => (r.id === rapport.id ? { ...r, status } : r)));
    } catch (error) {
      console.error("Erreur lors de la décision sur le rapport:", error);
      alert("Impossible de mettre à jour le statut du rapport.");
    }
  };

  return (
    <DashboardLayout>
      <main className={styles.contentBody}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 className={styles.pageTitle} style={{ marginBottom: 0 }}>Rapports / Parents</h1>
        </div>

        <div className={styles.panel} style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "1.5rem", color: "#374151" }}>Rapports Soumis</h2>
          
          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
              Chargement des rapports...
            </div>
          ) : rapports.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
              Aucun rapport soumis pour le moment.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {rapports.map(rapport => (
                <div key={rapport.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: 'white', boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "#111827", fontSize: "1.05rem" }}>{rapport.studentName}</div>
                    <div style={{ color: "#4b5563", fontSize: "0.875rem", marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ backgroundColor: "#e5e7eb", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600 }}>{rapport.date}</span>
                      {rapport.reason}
                    </div>
                  </div>
                  {rapport.status === "on_hold" ? (
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        type="button"
                        onClick={() => handleDecision(rapport, "approved")}
                        style={{ padding: "0.5rem 0.9rem", border: "none", borderRadius: "6px", backgroundColor: "#16a34a", color: "white", cursor: "pointer", fontWeight: 600 }}
                      >
                        Accepter
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecision(rapport, "rejected")}
                        style={{ padding: "0.5rem 0.9rem", border: "none", borderRadius: "6px", backgroundColor: "#dc2626", color: "white", cursor: "pointer", fontWeight: 600 }}
                      >
                        Refuser
                      </button>
                    </div>
                  ) : (
                    <span style={{ color: rapport.status === "approved" ? "#15803d" : "#b91c1c", fontWeight: 600 }}>
                      {rapport.status === "approved" ? "Accepté" : "Refusé"}
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
