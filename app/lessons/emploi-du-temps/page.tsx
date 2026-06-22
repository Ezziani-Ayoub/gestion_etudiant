"use client";

import { useState, useEffect } from "react";
import styles from "../page.module.css";
import DashboardLayout from "../../../components/DashboardLayout";
import { db } from "../../../lib/firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import type { AuthUser } from "../../../lib/auth";

interface Schedule {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  classId: string;
  module?: string;
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

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const CLASSES = ["G4", "G6", "G8"];

export default function SchedulePage() {
  const session = getClientSession();
  const teacherModule = session?.module || "";

  const [selectedClass, setSelectedClass] = useState<"G4" | "G6" | "G8">("G4");
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    day: "Lundi",
    startTime: "08:00",
    endTime: "09:30",
  });

  useEffect(() => {
    if (!teacherModule) {
      setLoading(false);
      return;
    }

    const fetchSchedule = async () => {
      setLoading(true);
      try {
        const scheduleRef = collection(
          db,
          `teachers_schedule/${teacherModule}/classes/${selectedClass}`
        );
        const snap = await getDocs(scheduleRef);
        const scheduleList = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Schedule, "id">),
        })) as Schedule[];

        // Sort by day
        const dayOrder = DAYS.reduce(
          (acc, day, idx) => ({ ...acc, [day]: idx }),
          {} as Record<string, number>
        );
        scheduleList.sort(
          (a, b) =>
            (dayOrder[a.day] || 0) - (dayOrder[b.day] || 0) ||
            a.startTime.localeCompare(b.startTime)
        );

        setSchedule(scheduleList);
      } catch (error) {
        console.error("Error fetching schedule:", error);
      }
      setLoading(false);
    };

    fetchSchedule();
  }, [selectedClass, teacherModule]);

  const handleAddSchedule = async () => {
    if (!formData.day || !formData.startTime || !formData.endTime) {
      alert("Veuillez remplir tous les champs.");
      return;
    }

    if (formData.startTime >= formData.endTime) {
      alert("L'heure de fin doit être après l'heure de début.");
      return;
    }

    setUpdating("adding");
    try {
      const newSchedule = {
        day: formData.day,
        startTime: formData.startTime,
        endTime: formData.endTime,
        classId: selectedClass,
        module: teacherModule,
        createdAt: Date.now(),
      };

      const scheduleRef = collection(
        db,
        `teachers_schedule/${teacherModule}/classes/${selectedClass}`
      );
      const docRef = await addDoc(scheduleRef, newSchedule);

      setSchedule((prev) =>
        [...prev, { id: docRef.id, ...newSchedule }].sort((a, b) => {
          const dayOrder = DAYS.reduce(
            (acc, day, idx) => ({ ...acc, [day]: idx }),
            {} as Record<string, number>
          );
          return (
            (dayOrder[a.day] || 0) - (dayOrder[b.day] || 0) ||
            a.startTime.localeCompare(b.startTime)
          );
        })
      );

      setFormData({ day: "Lundi", startTime: "08:00", endTime: "09:30" });
      setShowForm(false);
    } catch (error) {
      console.error("Error adding schedule:", error);
      alert("Erreur lors de l'ajout du créneau.");
    } finally {
      setUpdating(null);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    setUpdating(scheduleId);
    try {
      await deleteDoc(
        doc(
          db,
          `teachers_schedule/${teacherModule}/classes/${selectedClass}`,
          scheduleId
        )
      );
      setSchedule((prev) => prev.filter((s) => s.id !== scheduleId));
    } catch (error) {
      console.error("Error deleting schedule:", error);
      alert("Erreur lors de la suppression.");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <DashboardLayout>
      {/* TOP HEADER - TABS */}
      <header className={styles.topHeader}>
        <div className={styles.classTabs}>
          {CLASSES.map((cls) => (
            <button
              key={cls}
              className={`${styles.classTab} ${
                selectedClass === cls ? styles.activeTab : ""
              }`}
              onClick={() => setSelectedClass(cls as "G4" | "G6" | "G8")}
            >
              Classe {cls}
            </button>
          ))}
        </div>
      </header>

      {/* CONTENT BODY */}
      <main className={styles.contentBody}>
        {!teacherModule ? (
          <div
            style={{
              padding: "2rem",
              backgroundColor: "#fee2e2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              color: "#991b1b",
            }}
          >
            <h3 style={{ margin: "0 0 0.5rem 0" }}>Module non configuré</h3>
            <p>
              Votre module n'a pas été défini. Veuillez contacter
              l'administration pour configurer votre matière.
            </p>
          </div>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "2rem",
              }}
            >
              <div>
                <h1
                  className={styles.pageTitle}
                  style={{ margin: 0 }}
                >
                  Emploi du Temps : Classe {selectedClass}
                </h1>
                <p
                  style={{
                    margin: "0.5rem 0 0 0",
                    color: "#6b7280",
                    fontSize: "0.9rem",
                  }}
                >
                  Module : <strong>{teacherModule}</strong>
                </p>
              </div>
              <button
                className={styles.primaryBtn}
                onClick={() => setShowForm(!showForm)}
              >
                {showForm ? "Annuler" : "Ajouter un créneau"}
              </button>
            </div>

            {showForm && (
              <div
                style={{
                  padding: "1.5rem",
                  backgroundColor: "#f0f9ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "8px",
                  marginBottom: "2rem",
                }}
              >
                <h3 style={{ margin: "0 0 1rem 0" }}>Nouveau créneau</h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        fontWeight: 500,
                        fontSize: "0.9rem",
                      }}
                    >
                      Jour
                    </label>
                    <select
                      value={formData.day}
                      onChange={(e) =>
                        setFormData({ ...formData, day: e.target.value })
                      }
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        borderRadius: "6px",
                        border: "1px solid #d1d5db",
                      }}
                    >
                      {DAYS.map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        fontWeight: 500,
                        fontSize: "0.9rem",
                      }}
                    >
                      Heure de début
                    </label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          startTime: e.target.value,
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        borderRadius: "6px",
                        border: "1px solid #d1d5db",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        fontWeight: 500,
                        fontSize: "0.9rem",
                      }}
                    >
                      Heure de fin
                    </label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) =>
                        setFormData({ ...formData, endTime: e.target.value })
                      }
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        borderRadius: "6px",
                        border: "1px solid #d1d5db",
                      }}
                    />
                  </div>
                </div>
                <button
                  className={styles.primaryBtn}
                  onClick={handleAddSchedule}
                  disabled={updating === "adding"}
                  style={{ marginTop: "1rem" }}
                >
                  {updating === "adding"
                    ? "Ajout en cours..."
                    : "Confirmer"}
                </button>
              </div>
            )}

            {loading ? (
              <div className={styles.loadingState}>
                Chargement de l'emploi du temps...
              </div>
            ) : schedule.length === 0 ? (
              <div className={styles.emptyState}>
                Aucun créneau n'a été défini pour cette classe.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
                  gap: "1rem",
                }}
              >
                {schedule.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: "1.5rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      backgroundColor: "#fff",
                    }}
                  >
                    <div style={{ marginBottom: "0.75rem" }}>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: "1.1rem",
                          fontWeight: 600,
                          color: "#1f2937",
                        }}
                      >
                        {item.day}
                      </h4>
                      <p
                        style={{
                          margin: "0.25rem 0 0 0",
                          color: "#6b7280",
                          fontSize: "0.95rem",
                        }}
                      >
                        {item.startTime} - {item.endTime}
                      </p>
                    </div>
                    <button
                      className={styles.deleteTextBtn}
                      onClick={() => handleDeleteSchedule(item.id)}
                      disabled={updating === item.id}
                    >
                      {updating === item.id ? "Suppression..." : "Supprimer"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </DashboardLayout>
  );
}
