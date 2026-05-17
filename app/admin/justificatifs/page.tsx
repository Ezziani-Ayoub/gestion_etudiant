"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import { db } from "../../../lib/firebase";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import styles from "../../absences/page.module.css";
import type { AuthUser } from "../../../lib/auth";

type ClassId = "G4" | "G6" | "G8";
type JustificationStatus = "pending" | "applied";

interface StudentOption {
  key: string;
  name: string;
  code?: string;
  classId: ClassId;
  studentId: string;
}

interface AbsenceOption {
  date: string;
  justified: boolean;
}

interface TargetTeacher {
  code: string;
  name: string;
  module?: string;
}

interface Justification {
  id: string;
  studentName: string;
  studentId: string;
  classId: ClassId;
  date: string;
  reason: string;
  status: JustificationStatus;
  targetTeachers?: TargetTeacher[];
  createdAt?: number;
  appliedAt?: number;
}

const CLASSES: ClassId[] = ["G4", "G6", "G8"];
const DAY_NAMES = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getDayName(date: string) {
  return DAY_NAMES[new Date(`${date}T00:00:00`).getDay()];
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

function dedupeStudents(students: StudentOption[]) {
  const unique = new Map<string, StudentOption>();
  students.forEach((student) => {
    const key = `${student.classId}-${student.studentId}`;
    if (!unique.has(key)) unique.set(key, { ...student, key });
  });
  return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function dedupeTeachers(teachers: TargetTeacher[]) {
  const unique = new Map<string, TargetTeacher>();
  teachers.forEach((teacher) => {
    if (!unique.has(teacher.code)) unique.set(teacher.code, teacher);
  });
  return Array.from(unique.values());
}

export default function JustificatifsPage() {
  const user = getClientSession();
  const isAdmin = user?.role === "administration";
  const isTeacher = user?.role === "teacher";
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [absences, setAbsences] = useState<AbsenceOption[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [reason, setReason] = useState("");
  const [justifications, setJustifications] = useState<Justification[]>([]);
  const [loading, setLoading] = useState(true);
  const [absenceLoading, setAbsenceLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [studentsSnap, ticketsSnap] = await Promise.all([
          getDocs(collection(db, "students")),
          getDocs(collection(db, "justifications")),
        ]);

        let loadedStudents = studentsSnap.docs.map((studentDoc) => {
          const data = studentDoc.data() as {
            name?: string;
            code?: string;
            classId?: ClassId;
            studentId?: string;
          };

          return {
            key: studentDoc.id,
            name: data.name || "Etudiant",
            code: data.code,
            classId: data.classId || "G4",
            studentId: data.studentId || studentDoc.id,
          };
        });

        if (loadedStudents.length === 0) {
          const classSnaps = await Promise.all(
            CLASSES.map(async (classId) => ({
              classId,
              snap: await getDocs(collection(db, `classes/${classId}/students`)),
            }))
          );

          loadedStudents = classSnaps.flatMap(({ classId, snap }) =>
            snap.docs.map((studentDoc) => {
              const data = studentDoc.data() as { name?: string; code?: string; id?: string | number };
              return {
                key: `${classId}-${studentDoc.id}`,
                name: data.name || "Etudiant",
                code: data.code,
                classId,
                studentId: studentDoc.id || String(data.id || ""),
              };
            })
          );
        }

        const loadedTickets = ticketsSnap.docs.map((ticketDoc) => ({
          id: ticketDoc.id,
          ...(ticketDoc.data() as Omit<Justification, "id">),
        }));

        setStudents(dedupeStudents(loadedStudents));
        setJustifications(
          loadedTickets.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        );
      } catch (error) {
        console.error("Erreur lors du chargement des justificatifs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchStudentAbsences = async () => {
      if (!selectedStudent) {
        setAbsences([]);
        setSelectedDate("");
        return;
      }

      setAbsenceLoading(true);
      try {
        const attendanceSnap = await getDocs(
          collection(db, `classes/${selectedStudent.classId}/attendance`)
        );
        const rows = attendanceSnap.docs
          .map((attendanceDoc) => {
            const data = attendanceDoc.data() as {
              records?: Record<string, string>;
              justified?: Record<string, boolean>;
            };

            if (data.records?.[selectedStudent.studentId] !== "Absent") return null;
            return {
              date: attendanceDoc.id,
              justified: Boolean(data.justified?.[selectedStudent.studentId]),
            };
          })
          .filter((row): row is AbsenceOption => Boolean(row))
          .sort((a, b) => b.date.localeCompare(a.date));

        setAbsences(rows);
        setSelectedDate(rows[0]?.date || "");
      } catch (error) {
        console.error("Erreur lors du chargement des absences:", error);
        setAbsences([]);
        setSelectedDate("");
      } finally {
        setAbsenceLoading(false);
      }
    };

    fetchStudentAbsences();
  }, [selectedStudent]);

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return students.slice(0, 12);

    return students
      .filter(
        (student) =>
          student.name.toLowerCase().includes(term) ||
          student.studentId.toLowerCase().includes(term) ||
          student.classId.toLowerCase().includes(term) ||
          (student.code || "").toLowerCase().includes(term)
      )
      .slice(0, 12);
  }, [search, students]);

  const selectedAbsence = absences.find((absence) => absence.date === selectedDate);

  const visibleJustifications = useMemo(() => {
    if (isTeacher && user?.code) {
      return justifications.filter((ticket) => {
        if (!ticket.targetTeachers?.length) return true;
        return ticket.targetTeachers.some((teacher) => teacher.code === user.code);
      });
    }

    return justifications;
  }, [isTeacher, justifications, user?.code]);

  const findTargetTeachers = async (classId: ClassId, date: string): Promise<TargetTeacher[]> => {
    const teachersSnap = await getDocs(collection(db, "teachers"));
    const dayName = getDayName(date);

    const teachers: TargetTeacher[] = dedupeTeachers(
      teachersSnap.docs.map((teacherDoc) => {
        const data = teacherDoc.data() as { code?: string; name?: string; module?: string };
        return {
          code: data.code || teacherDoc.id,
          name: data.name || "Professeur",
          ...(data.module ? { module: data.module } : {}),
        };
      })
    );

    const scheduledTeachers = await Promise.all(
      teachers.map(async (teacher) => {
        const scheduleSnap = await getDocs(
          collection(db, `teachers_schedule/${teacher.code}/classes/${classId}/slots`)
        );
        const teachesThatDay = scheduleSnap.docs.some((scheduleDoc) => {
          const data = scheduleDoc.data() as { day?: string };
          return data.day === dayName;
        });

        return teachesThatDay ? teacher : null;
      })
    );

    const targets = scheduledTeachers.filter(
      (teacher): teacher is TargetTeacher => Boolean(teacher)
    );

    return targets.length > 0 ? targets : teachers;
  };

  const handleSelectStudent = (student: StudentOption) => {
    setSelectedStudent(student);
    setSearch(student.name);
    setReason("");
  };

  const handleSubmit = async () => {
    if (!isAdmin) {
      alert("Seule l'administration peut créer une justification.");
      return;
    }

    if (!selectedStudent || !selectedDate || !reason.trim()) {
      alert("Veuillez choisir un étudiant, une date d'absence et saisir le motif.");
      return;
    }

    setSubmitting(true);
    try {
      const targetTeachers = await findTargetTeachers(selectedStudent.classId, selectedDate);
      const ticket = {
        studentName: selectedStudent.name,
        studentId: selectedStudent.studentId,
        classId: selectedStudent.classId,
        date: selectedDate,
        reason: reason.trim(),
        status: "pending" as const,
        targetTeachers,
        createdAt: Date.now(),
      };

      const ticketRef = await addDoc(collection(db, "justifications"), ticket);

      setJustifications((prev) => [{ id: ticketRef.id, ...ticket }, ...prev]);
      setReason("");
      alert("Justification envoyée aux professeurs concernés.");
    } catch (error) {
      console.error("Erreur lors de la création du ticket:", error);
      alert("Erreur lors de la création du ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApply = async (justification: Justification) => {
    if (!isTeacher) {
      alert("Seuls les professeurs peuvent appliquer une justification.");
      return;
    }

    setApplyingId(justification.id);
    try {
      const appliedAt = new Date().getTime();
      const attendanceRef = doc(
        db,
        `classes/${justification.classId}/attendance`,
        justification.date
      );

      await setDoc(
        attendanceRef,
        {
          justified: {
            [justification.studentId]: true,
          },
        },
        { merge: true }
      );

      await updateDoc(doc(db, "justifications", justification.id), {
        status: "applied",
        appliedAt,
      });

      setJustifications((prev) =>
        prev.map((ticket) =>
          ticket.id === justification.id ? { ...ticket, status: "applied" } : ticket
        )
      );
      setAbsences((prev) =>
        prev.map((absence) =>
          absence.date === justification.date ? { ...absence, justified: true } : absence
        )
      );

      alert("Justification appliquée. Le suivi des absences affichera la coche verte.");
    } catch (error) {
      console.error("Erreur lors de l'application:", error);
      alert("Erreur lors de l'application de la justification.");
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <DashboardLayout>
      <main className={styles.contentBody}>
        <h1 className={styles.pageTitle}>Justificatifs d&apos;Absence</h1>

        {isAdmin && (
        <div className={styles.panel} style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", margin: "0 0 1rem 0", color: "#374151" }}>
            Créer une justification
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 1fr) minmax(220px, 0.7fr)", gap: "1rem", alignItems: "start" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#6b7280", marginBottom: "0.4rem" }}>
                Rechercher un étudiant
              </label>
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  if (selectedStudent && event.target.value !== selectedStudent.name) {
                    setSelectedStudent(null);
                  }
                }}
                placeholder="Nom, code ou classe..."
                style={{ width: "100%", padding: "0.7rem", border: "1px solid #d1d5db", borderRadius: 6 }}
              />

              {search && !selectedStudent && (
                <div style={{ marginTop: "0.5rem", border: "1px solid #e5e7eb", borderRadius: 6, overflow: "hidden" }}>
                  {filteredStudents.length === 0 ? (
                    <div style={{ padding: "0.75rem", color: "#6b7280" }}>Aucun étudiant trouvé.</div>
                  ) : (
                    filteredStudents.map((student) => (
                      <button
                        key={student.key}
                        type="button"
                        onClick={() => handleSelectStudent(student)}
                        style={{ display: "flex", justifyContent: "space-between", width: "100%", padding: "0.75rem", border: "none", borderBottom: "1px solid #f3f4f6", background: "white", cursor: "pointer", textAlign: "left" }}
                      >
                        <span>{student.name}</span>
                        <span style={{ color: "#6b7280" }}>{student.classId} #{student.studentId}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#6b7280", marginBottom: "0.4rem" }}>
                Date d&apos;absence
              </label>
              <select
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                disabled={!selectedStudent || absenceLoading || absences.length === 0}
                style={{ width: "100%", padding: "0.7rem", border: "1px solid #d1d5db", borderRadius: 6, background: "white" }}
              >
                {!selectedStudent && <option>Choisir un étudiant</option>}
                {selectedStudent && absenceLoading && <option>Chargement...</option>}
                {selectedStudent && !absenceLoading && absences.length === 0 && (
                  <option>Aucune absence enregistrée</option>
                )}
                {absences.map((absence) => (
                  <option key={absence.date} value={absence.date}>
                    {formatDate(absence.date)}
                    {absence.justified ? " - déjà justifiée" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#6b7280", margin: "1rem 0 0.4rem" }}>
            Motif de justification
          </label>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Certificat médical, décès familial, convocation administrative..."
            rows={4}
            style={{ width: "100%", padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: 6, resize: "vertical" }}
          />

          {selectedAbsence?.justified && (
            <p style={{ color: "#059669", margin: "0.75rem 0 0 0", fontSize: "0.9rem" }}>
              Cette absence est déjà marquée comme justifiée.
            </p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !selectedStudent || !selectedDate || !reason.trim()}
            style={{ marginTop: "1rem", padding: "0.7rem 1.25rem", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? "Envoi..." : "Soumettre"}
          </button>
        </div>
        )}

        <div className={styles.panel} style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", margin: "0 0 1rem 0", color: "#374151" }}>
            Justifications
          </h2>

          {loading ? (
            <p style={{ color: "#6b7280" }}>Chargement des justifications...</p>
          ) : visibleJustifications.length === 0 ? (
            <p style={{ color: "#6b7280" }}>Aucune justification créée.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {visibleJustifications.map((ticket) => (
                <div
                  key={ticket.id}
                  style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center", padding: "1.25rem", border: "1px solid #e5e7eb", borderRadius: 8, backgroundColor: ticket.status === "applied" ? "#f9fafb" : "white", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: "#111827", fontSize: "1rem" }}>
                      {ticket.studentName} <span style={{ color: "#6b7280", fontWeight: 400 }}>({ticket.classId})</span>
                    </div>
                    <div style={{ color: "#4b5563", fontSize: "0.875rem", marginTop: "0.45rem" }}>
                      <strong>{formatDate(ticket.date)}</strong> - {ticket.reason}
                    </div>
                    <div style={{ color: "#6b7280", fontSize: "0.8rem", marginTop: "0.45rem" }}>
                      Envoyé à:{" "}
                      {ticket.targetTeachers?.length
                        ? dedupeTeachers(ticket.targetTeachers).map((teacher) => teacher.name).join(", ")
                        : "Professeurs concernés"}
                    </div>
                  </div>

                  {isTeacher && ticket.status === "pending" ? (
                    <button
                      type="button"
                      onClick={() => handleApply(ticket)}
                      disabled={applyingId === ticket.id}
                      style={{ flexShrink: 0, padding: "0.65rem 1.1rem", backgroundColor: "#059669", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}
                    >
                      {applyingId === ticket.id ? "Application..." : "Appliquer"}
                    </button>
                  ) : ticket.status === "applied" ? (
                    <span style={{ flexShrink: 0, color: "#047857", fontWeight: 700, backgroundColor: "#d1fae5", padding: "0.55rem 0.9rem", borderRadius: 6 }}>
                      Justifié
                    </span>
                  ) : (
                    <span style={{ flexShrink: 0, color: "#92400e", fontWeight: 700, backgroundColor: "#fef3c7", padding: "0.55rem 0.9rem", borderRadius: 6 }}>
                      En attente
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
