"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import styles from "../../student/page.module.css";
import { db } from "../../../lib/firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

interface Teacher {
  id: string;
  name: string;
  code: string;
  module?: string;
}

const MODULES = [
  "Mathématiques",
  "Physique-Chimie",
  "SVT",
  "Français",
  "Anglais",
  "Histoire-Géographie",
  "Informatique",
];

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchTeachers = async () => {
      setLoading(true);
      try {
        const teachersRef = collection(db, "teachers");
        const snap = await getDocs(teachersRef);
        const teachersList = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Teacher, "id">),
        })) as Teacher[];
        teachersList.sort((a, b) => a.name.localeCompare(b.name));
        setTeachers(teachersList);
      } catch (error) {
        console.error("Error fetching teachers:", error);
      }
      setLoading(false);
    };

    fetchTeachers();
  }, []);

  const handleModuleChange = async (
    teacherId: string,
    newModule: string
  ) => {
    setUpdating(teacherId);
    try {
      const teacherRef = doc(db, "teachers", teacherId);
      await updateDoc(teacherRef, { module: newModule });
      
      setTeachers((prev) =>
        prev.map((t) =>
          t.id === teacherId ? { ...t, module: newModule } : t
        )
      );
    } catch (error) {
      console.error("Error updating module:", error);
      alert("Erreur lors de la mise à jour du module.");
    } finally {
      setUpdating(null);
    }
  };

  const filteredTeachers = search.trim()
    ? teachers.filter((t) =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.code.toLowerCase().includes(search.toLowerCase())
      )
    : teachers;

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Gestion des Professeurs</h1>
            <p className={styles.subtitle}>
              Assignez un module à chaque professeur
            </p>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Recherche</h2>
          </div>
          <input
            type="text"
            placeholder="Rechercher par nom ou code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            Chargement des professeurs...
          </div>
        ) : (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                Professeurs ({filteredTeachers.length})
              </h2>
            </div>

            {filteredTeachers.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center" }}>
                Aucun professeur trouvé.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr
                      style={{
                        borderBottom: "2px solid #d1d5db",
                        backgroundColor: "#f9fafb",
                      }}
                    >
                      <th
                        style={{
                          padding: "1rem",
                          textAlign: "left",
                          fontWeight: 600,
                        }}
                      >
                        Nom
                      </th>
                      <th
                        style={{
                          padding: "1rem",
                          textAlign: "left",
                          fontWeight: 600,
                        }}
                      >
                        Code
                      </th>
                      <th
                        style={{
                          padding: "1rem",
                          textAlign: "left",
                          fontWeight: 600,
                        }}
                      >
                        Module Assigné
                      </th>
                      <th
                        style={{
                          padding: "1rem",
                          textAlign: "center",
                          fontWeight: 600,
                        }}
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeachers.map((teacher) => (
                      <tr
                        key={teacher.id}
                        style={{
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        <td
                          style={{
                            padding: "1rem",
                            color: "#111827",
                            fontWeight: 500,
                          }}
                        >
                          {teacher.name}
                        </td>
                        <td style={{ padding: "1rem", color: "#6b7280" }}>
                          {teacher.code}
                        </td>
                        <td style={{ padding: "1rem" }}>
                          {teacher.module ? (
                            <span
                              style={{
                                display: "inline-block",
                                padding: "0.5rem 1rem",
                                backgroundColor: "#dbeafe",
                                color: "#1e40af",
                                borderRadius: "6px",
                                fontSize: "0.875rem",
                                fontWeight: 500,
                              }}
                            >
                              {teacher.module}
                            </span>
                          ) : (
                            <span
                              style={{
                                color: "#dc2626",
                                fontWeight: 500,
                              }}
                            >
                              Non configuré
                            </span>
                          )}
                        </td>
                        <td
                          style={{
                            padding: "1rem",
                            textAlign: "center",
                          }}
                        >
                          <select
                            value={teacher.module || ""}
                            onChange={(e) =>
                              handleModuleChange(teacher.id, e.target.value)
                            }
                            disabled={updating === teacher.id}
                            style={{
                              padding: "0.5rem 0.75rem",
                              borderRadius: "6px",
                              border: "1px solid #d1d5db",
                              cursor:
                                updating === teacher.id ? "not-allowed" : "pointer",
                              opacity: updating === teacher.id ? 0.6 : 1,
                            }}
                          >
                            <option value="">-- Sélectionner un module --</option>
                            {MODULES.map((mod) => (
                              <option key={mod} value={mod}>
                                {mod}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
