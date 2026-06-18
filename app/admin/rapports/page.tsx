"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import styles from "../../absences/page.module.css";
import { db } from "../../../lib/firebase";
import { addDoc, collection, doc, getDocs, orderBy, query, updateDoc, where } from "firebase/firestore";
import type { AuthUser } from "../../../lib/auth";

interface Rapport {
  id: string;
  studentName: string;
  reason: string;
  date: string;
  status: "on_hold" | "approved" | "rejected";
  teacherName?: string;
  teacherCode?: string;
}

interface StudentOption {
  id: string;
  name: string;
  classId?: string;
  code?: string;
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

export default function RapportsPage() {
  const [rapports, setRapports] = useState<Rapport[]>([]);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  const selectedStudent = students.find((student) => student.id === selectedStudentId) || null;
  const userCode = user?.code || "";
  const userRole = user?.role || "";
  const isTeacher = userRole === "teacher";
  const isAdmin = userRole === "administration";

  useEffect(() => {
    setUser(getClientSession());
  }, []);

  useEffect(() => {
    if (!isTeacher) return;

    const fetchStudents = async () => {
      try {
        const snap = await getDocs(collection(db, "students"));
        const loadedStudents = snap.docs
          .map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as { name?: string; classId?: string; code?: string }),
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setStudents(loadedStudents);
      } catch (error) {
        console.error("Erreur lors du chargement des étudiants:", error);
      }
    };

    fetchStudents();
  }, [isTeacher]);

  useEffect(() => {
    if (user === null) {
      return;
    }

    const fetchRapports = async () => {
      try {
        const rapportsRef = collection(db, "rapports");

        const q = isTeacher && userCode
          ? query(rapportsRef, where("teacherCode", "==", userCode))
          : query(rapportsRef, orderBy("timestamp", "desc"));

        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Rapport[];

        if (isTeacher && userCode) {
          data.sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
        }

        setRapports(data);
      } catch (error) {
        console.error("Erreur lors de la récupération des rapports:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRapports();
  }, [userCode, userRole]);

  const handleDecision = async (rapport: Rapport, status: "approved" | "rejected") => {
    try {
      await updateDoc(doc(db, "rapports", rapport.id), { status });
      setRapports((prev) => prev.map((r) => (r.id === rapport.id ? { ...r, status } : r)));
    } catch (error) {
      console.error("Erreur lors de la décision sur le rapport:", error);
      alert("Impossible de mettre à jour le statut du rapport.");
    }
  };

  const handleSubmitRapport = async () => {
    if (!isTeacher) {
      alert("Seuls les enseignants peuvent soumettre un rapport aux parents.");
      return;
    }

    if (!selectedStudent || !reason.trim()) {
      alert("Veuillez sélectionner un étudiant et saisir un motif.");
      return;
    }

    setSubmitting(true);
    try {
      const newRapport = {
        studentName: selectedStudent.name,
        reason: reason.trim(),
        date: new Date().toLocaleDateString("fr-FR"),
        status: "on_hold" as const,
        teacherName: user?.name || "Enseignant",
        teacherCode: user?.code || "",
        timestamp: Date.now(),
      };

      const rapportRef = await addDoc(collection(db, "rapports"), newRapport);
      setRapports((prev) => [{ id: rapportRef.id, ...newRapport }, ...prev]);
      setReason("");
      setSelectedStudentId("");
      alert("Le rapport a bien été envoyé à l'administration.");
    } catch (error) {
      console.error("Erreur lors de l'envoi du rapport:", error);
      alert("Impossible d'envoyer le rapport.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <main className={styles.contentBody}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 className={styles.pageTitle} style={{ marginBottom: 0 }}>Rapports / Parents</h1>
        </div>

        {isTeacher && (
          <div className={styles.panel} style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem", color: "#374151" }}>
              Envoyer un rapport à l'administration
            </h2>
            <p style={{ marginBottom: "1rem", color: "#6b7280" }}>
              Sélectionnez un étudiant et décrivez le motif pour transmettre ce rapport à l'administration.
            </p>

            <div style={{ display: "grid", gap: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#374151" }}>
                Étudiant
              </label>
              <select
                value={selectedStudentId}
                onChange={(event) => setSelectedStudentId(event.target.value)}
                style={{ width: "100%", padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: 8, background: "white" }}
              >
                <option value="">Choisir un étudiant</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} {student.classId ? `(${student.classId})` : ""}
                  </option>
                ))}
              </select>

              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#374151" }}>
                Motif
              </label>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={4}
                placeholder="Saisir le motif du rapport pour l'administration"
                style={{ width: "100%", padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: 8, minHeight: 120, resize: "vertical" }}
              />

              <button
                type="button"
                onClick={handleSubmitRapport}
                disabled={submitting || !selectedStudentId || !reason.trim()}
                style={{ padding: "0.8rem 1.1rem", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? "Envoi..." : "Envoyer le rapport"}
              </button>
            </div>
          </div>
        )}

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
                    isAdmin ? (
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
                      <span style={{ color: "#f59e0b", fontWeight: 600 }}>
                        En attente
                      </span>
                    )
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
