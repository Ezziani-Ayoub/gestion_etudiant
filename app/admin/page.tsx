"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import styles from "../student/page.module.css";
import { db } from "../../lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

interface DirectoryEntry {
  id: string;
  name: string;
  code: string;
  classId?: string;
  type: "teacher" | "student";
}

interface SelectedStats {
  rapportCount: number;
  absenceCount: number | null;
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<DirectoryEntry | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [stats, setStats] = useState<SelectedStats>({ rapportCount: 0, absenceCount: null });

  useEffect(() => {
    const fetchDirectory = async () => {
      setLoading(true);
      try {
        const [teachersSnap, studentsSnap] = await Promise.all([
          getDocs(collection(db, "teachers")),
          getDocs(collection(db, "students")),
        ]);

        const teacherEntries = teachersSnap.docs.map((docSnap) => {
          const data = docSnap.data() as { name: string; code: string; classId?: string };
          return {
            id: docSnap.id,
            name: data.name,
            code: data.code,
            classId: data.classId,
            type: "teacher" as const,
          };
        });

        const studentEntries = studentsSnap.docs.map((docSnap) => {
          const data = docSnap.data() as { name: string; code: string; classId?: string };
          return {
            id: docSnap.id,
            name: data.name,
            code: data.code,
            classId: data.classId,
            type: "student" as const,
          };
        });

        const dedupedMap = new Map<string, DirectoryEntry>();
        [...teacherEntries, ...studentEntries].forEach((entry) => {
          const key = `${entry.type}|${entry.code}|${entry.classId || ""}`;
          if (!dedupedMap.has(key)) {
            dedupedMap.set(key, entry);
          }
        });

        setEntries(Array.from(dedupedMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.error("Erreur lors du chargement de l'annuaire:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDirectory();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      if (!selected) {
        setStats({ rapportCount: 0, absenceCount: null });
        return;
      }

      setStatsLoading(true);
      try {
        const rapportsQuery = query(collection(db, "rapports"), where("studentName", "==", selected.name));
        const rapportsSnap = await getDocs(rapportsQuery);
        const rapportCount = rapportsSnap.size;

        if (selected.type !== "student" || !selected.classId) {
          setStats({ rapportCount, absenceCount: null });
          return;
        }

        const studentsClassSnap = await getDocs(collection(db, `classes/${selected.classId}/students`));
        const studentDoc = studentsClassSnap.docs.find(
          (docSnap) => (docSnap.data() as { name?: string }).name === selected.name
        );

        if (!studentDoc) {
          setStats({ rapportCount, absenceCount: 0 });
          return;
        }

        const attendanceSnap = await getDocs(collection(db, `classes/${selected.classId}/attendance`));
        let absenceCount = 0;
        attendanceSnap.docs.forEach((docSnap) => {
          const data = docSnap.data() as { records?: Record<string, string> };
          if (data.records?.[studentDoc.id] === "Absent") absenceCount += 1;
        });

        setStats({ rapportCount, absenceCount });
      } catch (error) {
        console.error("Erreur lors du chargement du statut:", error);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, [selected]);

  const filteredEntries = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return entries;
    return entries.filter(
      (entry) =>
        entry.name.toLowerCase().includes(term) ||
        entry.code.toLowerCase().includes(term) ||
        (entry.classId || "").toLowerCase().includes(term) ||
        entry.type.toLowerCase().includes(term)
    );
  }, [entries, search]);

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Tableau de bord Administration</h1>
            <p className={styles.subtitle}>Rechercher étudiants et professeurs</p>
          </div>
          <Link href="/admin/teachers" className={styles.primaryBtn} style={{ alignSelf: "center" }}>
            Gérer les modules des professeurs
          </Link>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Recherche</h2>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, code, classe, type..."
            style={{ width: "100%", padding: "0.75rem", borderRadius: 8, border: "1px solid #d1d5db" }}
          />
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Résultats</h2>
          </div>
          {loading ? (
            <div className={styles.loading}>Chargement...</div>
          ) : filteredEntries.length === 0 ? (
            <div style={{ color: "#6b7280" }}>Aucun résultat.</div>
          ) : (
            <table className={styles.gradesTable}>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Code spécial</th>
                  <th>Classe</th>
                  <th>Type</th>
                  <th>Détail</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.name}</td>
                    <td>{entry.code}</td>
                    <td>{entry.classId || "-"}</td>
                    <td>{entry.type === "student" ? "Étudiant" : "Professeur"}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => setSelected(entry)}
                        style={{ border: "none", background: "#2563eb", color: "white", borderRadius: 6, padding: "0.45rem 0.75rem", cursor: "pointer" }}
                      >
                        Voir statut
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selected && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Statut de {selected.name}</h2>
            </div>
            {statsLoading ? (
              <div style={{ color: "#6b7280" }}>Chargement du statut...</div>
            ) : (
              <div style={{ display: "grid", gap: "0.6rem" }}>
                <div>Type: <strong>{selected.type === "student" ? "Étudiant" : "Professeur"}</strong></div>
                <div>Classe: <strong>{selected.classId || "-"}</strong></div>
                <div>Rapports: <strong>{stats.rapportCount}</strong></div>
                <div>
                  Absences:{" "}
                  <strong>
                    {stats.absenceCount === null ? "Non applicable" : stats.absenceCount}
                  </strong>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
