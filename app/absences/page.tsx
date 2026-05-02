"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import { db } from "../../lib/firebase";
import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";

interface Student {
  id: number | string;
  dbId: string;
  name: string;
}

interface ScheduleSlot {
  day: string;
  time: string;
  room: string;
}

const dayMap: { [key: string]: number } = {
  "Dimanche": 0, "Lundi": 1, "Mardi": 2, "Mercredi": 3, "Jeudi": 4, "Vendredi": 5, "Samedi": 6
};

export default function AbsencesPage() {
  const userName = "Professeur";

  const [selectedClass, setSelectedClass] = useState<"G4" | "G6" | "G8">("G4");
  const [students, setStudents] = useState<Student[]>([]);
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
  const [validDates, setValidDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, string>>({});
  
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Fetch schedule and restrict dates
  useEffect(() => {
    const fetchClassData = async () => {
      setLoading(true);
      try {
        const classRef = doc(db, "classes", selectedClass);
        const classSnap = await getDoc(classRef);
        let currentSchedule: ScheduleSlot[] = [];
        if (classSnap.exists()) {
          currentSchedule = classSnap.data().schedule || [];
          setSchedule(currentSchedule);
        }

        const validDays = currentSchedule.map(s => dayMap[s.day]).filter(d => d !== undefined);
        const generatedDates: string[] = [];
        if (validDays.length > 0) {
          const today = new Date();
          // Find the last 15 valid class dates
          for (let i = 0; i < 90; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            if (validDays.includes(d.getDay())) {
              generatedDates.push(d.toISOString().split('T')[0]);
              if (generatedDates.length >= 15) break;
            }
          }
        }
        setValidDates(generatedDates);
        if (generatedDates.length > 0) {
          setSelectedDate(generatedDates[0]);
        } else {
          setSelectedDate("");
        }

        const studentsRef = collection(db, `classes/${selectedClass}/students`);
        const studentsSnap = await getDocs(studentsRef);
        const studentsList = studentsSnap.docs.map(d => ({ dbId: d.id, ...(d.data() as Omit<Student, "dbId">) })) as Student[];
        studentsList.sort((a, b) => Number(a.id) - Number(b.id));
        setStudents(studentsList);

      } catch (error) {
        console.error("Error fetching class data:", error);
      }
      setLoading(false);
    };

    fetchClassData();
  }, [selectedClass]);

  // Fetch attendance for the specific selected date
  useEffect(() => {
    const fetchAttendance = async () => {
      if (!selectedDate) {
        setAttendanceRecords({});
        return;
      }
      try {
        const attRef = doc(db, `classes/${selectedClass}/attendance`, selectedDate);
        const attSnap = await getDoc(attRef);
        if (attSnap.exists()) {
          setAttendanceRecords(attSnap.data().records || {});
        } else {
          setAttendanceRecords({});
        }
      } catch (error) {
        console.error("Error fetching attendance:", error);
      }
    };

    fetchAttendance();
  }, [selectedClass, selectedDate]);

  const handleStatusChange = async (dbId: string, status: string) => {
    if (!selectedDate) return;
    
    setAttendanceRecords(prev => ({ ...prev, [dbId]: status }));
    setSavingId(dbId);
    
    try {
      const attRef = doc(db, `classes/${selectedClass}/attendance`, selectedDate);
      await setDoc(attRef, {
        records: {
          [dbId]: status
        }
      }, { merge: true });
    } catch (error) {
      console.error("Error saving attendance:", error);
    }
    setSavingId(null);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('fr-FR', options);
  };

  const getStatusColorClass = (status: string) => {
    switch(status) {
      case "Présent": return styles.statusPresent;
      case "Absent": return styles.statusAbsent;
      case "En Retard": return styles.statusLate;
      case "Justifié": return styles.statusExcused;
      default: return "";
    }
  };

  return (
    <div className={styles.layoutContainer}>
      {/* LEFT SIDEBAR */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2>Gestion Académique</h2>
        </div>
        <nav className={styles.sidebarNav}>
          <Link href="/" className={styles.navItem}>Tableau de bord</Link>
          <Link href="/grades" className={styles.navItem}>Registre des Notes</Link>
          <Link href="/lessons" className={styles.navItem}>Leçons et Devoirs</Link>
          <Link href="/absences" className={`${styles.navItem} ${styles.active}`}>Suivi des Absences</Link>
        </nav>
        <div className={styles.sidebarFooter}>
          <div className={styles.userAvatar}>{userName.charAt(0)}</div>
          <div>
            <div style={{ fontWeight: 600 }}>{userName}</div>
            <div style={{ color: "#9ca3af", fontSize: "0.75rem" }}>Département Mathématiques</div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className={styles.mainWrapper}>
        
        {/* TOP HEADER - TABS */}
        <header className={styles.topHeader}>
          <div className={styles.classTabs}>
            <button 
              className={`${styles.classTab} ${selectedClass === "G4" ? styles.activeTab : ""}`}
              onClick={() => setSelectedClass("G4")}
            >
              Classe G4
            </button>
            <button 
              className={`${styles.classTab} ${selectedClass === "G6" ? styles.activeTab : ""}`}
              onClick={() => setSelectedClass("G6")}
            >
              Classe G6
            </button>
            <button 
              className={`${styles.classTab} ${selectedClass === "G8" ? styles.activeTab : ""}`}
              onClick={() => setSelectedClass("G8")}
            >
              Classe G8
            </button>
          </div>
        </header>

        {/* CONTENT BODY */}
        <main className={styles.contentBody}>
          <h1 className={styles.pageTitle}>Appel Journalier : Classe {selectedClass}</h1>

          {loading ? (
            <div className={styles.loadingState}>Chargement du registre d'appel...</div>
          ) : (
            <div className={styles.panel}>
              {/* Controls Header */}
              <div className={styles.panelHeader}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", marginBottom: "0.25rem", textTransform: "uppercase" }}>
                    Date du cours
                  </label>
                  {validDates.length > 0 ? (
                    <select 
                      className={styles.dateSelect}
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    >
                      {validDates.map(dateStr => (
                        <option key={dateStr} value={dateStr}>
                          {formatDate(dateStr)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ color: "#dc2626", fontSize: "0.875rem", padding: "0.5rem 0" }}>
                      Aucun horaire défini pour cette classe. L'appel est impossible.
                    </div>
                  )}
                </div>
              </div>

              {/* Attendance Table */}
              {validDates.length > 0 && (
                <div style={{ maxHeight: "65vh", overflowY: "auto" }}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th style={{ width: "80px" }}>ID</th>
                        <th>Étudiant</th>
                        <th style={{ width: "140px" }}>Statut d'Assiduité</th>
                        <th style={{ width: "100px", textAlign: "center" }}>Justifié</th>
                        <th style={{ width: "80px", textAlign: "right" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => {
                        const status = attendanceRecords[student.dbId] || "Présent"; // Default to present
                        return (
                          <tr key={student.dbId}>
                            <td className={styles.readOnly} style={{ color: "#6b7280" }}>#{student.id}</td>
                            <td className={styles.readOnly} style={{ fontWeight: 500 }}>{student.name}</td>
                            <td>
                              <select 
                                className={`${styles.statusSelect} ${getStatusColorClass(status)}`}
                                value={status}
                                onChange={(e) => handleStatusChange(student.dbId, e.target.value)}
                              >
                                <option value="Présent" className={styles.statusPresent}>Présent</option>
                                <option value="Absent" className={styles.statusAbsent}>Absent</option>
                              </select>
                            </td>
                            <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                            </td>
                            <td className={styles.readOnly} style={{ textAlign: "right", color: "#9ca3af", fontSize: "0.75rem" }}>
                              {savingId === student.dbId ? "Enr..." : ""}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
