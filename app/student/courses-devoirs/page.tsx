"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import styles from "../page.module.css";
import type { AuthUser } from "../../../lib/auth";
import { db } from "../../../lib/firebase";
import { collection, getDocs } from "firebase/firestore";

interface Lesson {
  id: string;
  title: string;
  url: string;
  type: string;
  category: "Cours" | "Devoir";
  size: number;
  uploadedAt: number;
  module?: string;
  teacherName?: string;
  teacherCode?: string;
}

interface TeacherBucket {
  teacherKey: string;
  teacherName: string;
  modules: string[];
  lessons: Lesson[];
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

const FALLBACK_MODULE = "Mathématiques";

export default function StudentCoursesDevoirsPage() {
  const [user] = useState<AuthUser | null>(() => getClientSession());
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedTeacherKey, setSelectedTeacherKey] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.classId || !user?.studentId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const lessonsRef = collection(db, `classes/${user.classId}/lessons`);
        const lessonsSnap = await getDocs(lessonsRef);
        const fetchedLessons = lessonsSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Lesson, "id">),
        })) as Lesson[];

        fetchedLessons.sort((a, b) => b.uploadedAt - a.uploadedAt);
        setLessons(fetchedLessons);

      } catch (error) {
        console.error("Error fetching courses/devoirs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.classId, user?.studentId]);

  const teachers = useMemo(() => {
    const map = new Map<string, TeacherBucket>();

    for (const lesson of lessons) {
      const teacherName = lesson.teacherName || "Professeur";
      const teacherKey = lesson.teacherCode || teacherName;
      const moduleName = lesson.module || FALLBACK_MODULE;

      if (!map.has(teacherKey)) {
        map.set(teacherKey, {
          teacherKey,
          teacherName,
          modules: [],
          lessons: [],
        });
      }

      const bucket = map.get(teacherKey)!;
      if (!bucket.modules.includes(moduleName)) bucket.modules.push(moduleName);
      bucket.lessons.push(lesson);
    }

    return Array.from(map.values()).sort((a, b) => a.teacherName.localeCompare(b.teacherName));
  }, [lessons]);

  const selectedTeacher = useMemo(
    () => teachers.find((teacher) => teacher.teacherKey === selectedTeacherKey) || null,
    [teachers, selectedTeacherKey]
  );
  const cours = (selectedTeacher?.lessons || []).filter((lesson) => lesson.category !== "Devoir");
  const devoirs = (selectedTeacher?.lessons || []).filter((lesson) => lesson.category === "Devoir");

  const formatSize = (bytes: number) => (bytes / (1024 * 1024)).toFixed(2) + " MB";

  if (!user) {
    return (
      <DashboardLayout>
        <div className={styles.loading}>Chargement de votre espace...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Courses / Devoirs</h1>
            <p className={styles.subtitle}>
              Classe {user.classId}
              {selectedTeacher ? ` • ${selectedTeacher.teacherName}` : ""}
            </p>
          </div>
        </div>

        {!selectedTeacher ? (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Sélectionner un professeur</h2>
            </div>
            {loading ? (
              <div className={styles.loading}>Chargement...</div>
            ) : teachers.length === 0 ? (
              <div style={{ color: "#6b7280" }}>Aucun contenu publié pour votre classe.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem" }}>
                {teachers.map((teacher) => (
                  <button
                    key={teacher.teacherKey}
                    type="button"
                    onClick={() => setSelectedTeacherKey(teacher.teacherKey)}
                    style={{
                      textAlign: "left",
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: "1rem",
                      background: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: "1rem", fontWeight: 700, color: "#111827" }}>{teacher.teacherName}</div>
                    <div style={{ marginTop: "0.4rem", color: "#4b5563", fontSize: "0.9rem" }}>
                      Modules: {teacher.modules.join(", ")}
                    </div>
                    <div style={{ marginTop: "0.35rem", color: "#6b7280", fontSize: "0.85rem" }}>
                      {teacher.lessons.length} document(s)
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Cours</h2>
                <button
                  type="button"
                  onClick={() => setSelectedTeacherKey(null)}
                  style={{
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    background: "#fff",
                    padding: "0.45rem 0.7rem",
                    cursor: "pointer",
                  }}
                >
                  Changer de professeur
                </button>
              </div>
              {cours.length === 0 ? (
                <div style={{ color: "#6b7280" }}>Aucun cours disponible.</div>
              ) : (
                <table className={styles.gradesTable}>
                  <thead>
                    <tr>
                      <th>Titre</th>
                      <th>Module</th>
                      <th>Taille</th>
                      <th>Ajouté le</th>
                      <th>Téléchargement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cours.map((lesson) => (
                      <tr key={lesson.id}>
                        <td>{lesson.title}</td>
                        <td>{lesson.module || FALLBACK_MODULE}</td>
                        <td>{formatSize(lesson.size || 0)}</td>
                        <td>{new Date(lesson.uploadedAt).toLocaleDateString("fr-FR")}</td>
                        <td>
                          <a href={lesson.url} target="_blank" rel="noopener noreferrer">
                            Télécharger
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Devoirs</h2>
              </div>
              {devoirs.length === 0 ? (
                <div style={{ color: "#6b7280" }}>Aucun devoir disponible.</div>
              ) : (
                <table className={styles.gradesTable}>
                  <thead>
                    <tr>
                      <th>Titre</th>
                      <th>Module</th>
                      <th>Taille</th>
                      <th>Ajouté le</th>
                      <th>Téléchargement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devoirs.map((lesson) => (
                      <tr key={lesson.id}>
                        <td>{lesson.title}</td>
                        <td>{lesson.module || FALLBACK_MODULE}</td>
                        <td>{formatSize(lesson.size || 0)}</td>
                        <td>{new Date(lesson.uploadedAt).toLocaleDateString("fr-FR")}</td>
                        <td>
                          <a href={lesson.url} target="_blank" rel="noopener noreferrer">
                            Télécharger
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
