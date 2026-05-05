"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import styles from "../../absences/page.module.css";
import { db } from "../../../lib/firebase";
import { collection, addDoc, getDocs, orderBy, query } from "firebase/firestore";

interface Rapport {
  id: string;
  studentName: string;
  reason: string;
  date: string;
  status: "on_hold" | "approved";
}

export default function RapportsPage() {
  const [showForm, setShowForm] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [reason, setReason] = useState("");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newRapport = {
      studentName,
      reason,
      date: new Date().toISOString().split('T')[0],
      status: "on_hold",
      timestamp: Date.now()
    };
    
    try {
      // Add to Firebase
      const docRef = await addDoc(collection(db, "rapports"), newRapport);
      
      // Update local state with the new ID
      setRapports([{ id: docRef.id, ...newRapport } as Rapport, ...rapports]);
      
      setShowForm(false);
      setStudentName("");
      setReason("");
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du rapport:", error);
      alert("Une erreur est survenue lors de l'enregistrement.");
    }
  };

  return (
    <DashboardLayout>
      <main className={styles.contentBody}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 className={styles.pageTitle} style={{ marginBottom: 0 }}>Rapports / Parents</h1>
          {!showForm && (
            <button 
              onClick={() => setShowForm(true)}
              style={{ padding: "0.6rem 1.25rem", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600, transition: "background-color 0.2s" }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#2563eb"}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#3b82f6"}
            >
              + Créer un rapport
            </button>
          )}
        </div>
        
        {showForm ? (
          <div className={styles.panel} style={{ padding: "1.5rem", maxWidth: "600px" }}>
            <h2 style={{ fontSize: "1.25rem", marginBottom: "1.5rem", color: "#374151" }}>Nouveau Rapport</h2>
            
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, fontSize: "0.875rem", color: "#4b5563" }}>Nom de l'étudiant</label>
                <input 
                  type="text" 
                  value={studentName} 
                  onChange={(e) => setStudentName(e.target.value)} 
                  required 
                  style={{ width: "100%", padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: "6px", outline: "none" }}
                  onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
                  onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
                />
              </div>
              
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, fontSize: "0.875rem", color: "#4b5563" }}>Raison du rapport</label>
                <input 
                  type="text" 
                  value={reason} 
                  onChange={(e) => setReason(e.target.value)} 
                  required 
                  style={{ width: "100%", padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: "6px", outline: "none" }}
                  onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
                  onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
                />
              </div>
              
              <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                <button 
                  type="button" 
                  onClick={() => setShowForm(false)}
                  style={{ padding: "0.6rem 1.25rem", backgroundColor: "transparent", color: "#4b5563", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer", fontWeight: 600 }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#f3f4f6"}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  style={{ padding: "0.6rem 1.25rem", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600 }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#2563eb"}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#3b82f6"}
                >
                  Soumettre
                </button>
              </div>
            </form>
          </div>
        ) : (
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
                    <span style={{ color: "#d97706", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem", backgroundColor: "#fef3c7", padding: "0.5rem 1rem", borderRadius: "6px", fontSize: "0.875rem" }}>
                      En attente (Administration)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </DashboardLayout>
  );
}
