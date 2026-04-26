"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import { db } from "../lib/firebase";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

export default function TeacherDashboard() {
  const userName = "Teacher User"; // Math Teacher
  
  const [selectedClass, setSelectedClass] = useState<"G4" | "G6" | "G8">("G4");
  const [currentStudents, setCurrentStudents] = useState<any[]>([]);
  const [currentSchedule, setCurrentSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Track save status for UI feedback
  const [savingId, setSavingId] = useState<string | null>(null);

  // Fetch data from Firebase when the selected class changes
  useEffect(() => {
    const fetchClassData = async () => {
      setLoading(true);
      try {
        // Fetch Schedule from the class document
        const classRef = doc(db, "classes", selectedClass);
        const classSnap = await getDoc(classRef);
        if (classSnap.exists()) {
          setCurrentSchedule(classSnap.data().schedule || []);
        } else {
          setCurrentSchedule([]);
        }

        // Fetch Students from the subcollection
        const studentsRef = collection(db, `classes/${selectedClass}/students`);
        const studentsSnap = await getDocs(studentsRef);
        const studentsList = studentsSnap.docs.map(d => ({ dbId: d.id, ...(d.data() as any) }));
        
        // Sort students by numeric ID
        studentsList.sort((a, b) => Number(a.id) - Number(b.id));
        setCurrentStudents(studentsList);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
      setLoading(false);
    };

    fetchClassData();
  }, [selectedClass]);

  // Handle inline change of name
  const handleNameChange = (dbId: string, newName: string) => {
    setCurrentStudents(prev => 
      prev.map(student => student.dbId === dbId ? { ...student, name: newName } : student)
    );
  };

  // Trigger save or delete when user clicks away from the input
  const handleNameBlur = async (student: any) => {
    setSavingId(student.dbId);
    
    // If the name is completely empty, delete the student
    if (student.name.trim() === "") {
      try {
        await deleteDoc(doc(db, `classes/${selectedClass}/students`, student.dbId));
        setCurrentStudents(prev => prev.filter(s => s.dbId !== student.dbId));
      } catch (error) {
        console.error("Error deleting student:", error);
      }
    } else {
      // Otherwise, just update the name
      try {
        await updateDoc(doc(db, `classes/${selectedClass}/students`, student.dbId), {
          name: student.name
        });
      } catch (error) {
        console.error("Error updating student name:", error);
      }
    }
    
    setSavingId(null);
  };

  // Handle adding a new student
  const handleAddStudent = async () => {
    // Find the highest ID to automatically assign the next one
    let maxId = 0;
    currentStudents.forEach(s => {
      if (Number(s.id) > maxId) maxId = Number(s.id);
    });
    const newId = maxId + 1;
    
    const newStudent = { 
      id: newId, 
      name: "Nouveau Étudiant", 
      control: "", 
      exam: "" 
    };

    setSavingId("NEW");
    try {
      // Create document in Firestore with the new ID
      const studentRef = doc(collection(db, `classes/${selectedClass}/students`), newId.toString());
      await setDoc(studentRef, newStudent);
      
      // Add to local state so it appears in the list immediately
      setCurrentStudents(prev => [...prev, { dbId: studentRef.id, ...newStudent }]);
    } catch (error) {
      console.error("Error adding new student:", error);
    }
    setSavingId(null);
  };

  return (
    <div className={styles.container}>
      {/* Top Navigation Bar */}
      <header className={styles.topBar}>
        <div className={styles.logo}>
          <h2>Gestion Étudiant</h2>
        </div>
        
        <nav className={styles.topNav}>
          <Link href="/" className={`${styles.navItem} ${styles.active}`}>Home</Link>
          <Link href="/grades" className={styles.navItem}>Grades</Link>
          <a href="#" className={styles.navItem}>Lessons</a>
          <a href="#" className={styles.navItem}>Assignments</a>
          <a href="#" className={styles.navItem}>Absences</a>
        </nav>

        <div className={styles.userInfo}>
          <span className={styles.userAvatar}>{userName.charAt(0)}</span>
          <span>{userName} (Maths)</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        <div className={styles.welcomeSection}>
          <h1>Bonjour {userName} !</h1>
          <p>
            Veuillez utiliser le menu en haut pour gérer vos classes, publier des leçons, 
            évaluer les devoirs et suivre les absences.
          </p>
        </div>
        
        {/* Class Selector and Dashboard Overview */}
        <div className={styles.dashboardSection}>
          <div className={styles.classSelectorBox}>
            <label htmlFor="classSelect" className={styles.selectLabel}>Sélectionnez une classe : </label>
            <select 
              id="classSelect" 
              value={selectedClass} 
              onChange={(e) => setSelectedClass(e.target.value as "G4" | "G6" | "G8")}
              className={styles.selectInput}
            >
              <option value="G4">Classe G4</option>
              <option value="G6">Classe G6</option>
              <option value="G8">Classe G8</option>
            </select>
          </div>

          {loading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
              Chargement des données Firebase...
            </div>
          ) : (
            <div className={styles.classContent}>
              {/* Schedule Section */}
              <div className={styles.contentBlock}>
                <h3 className={styles.sectionTitle}>Emploi du temps (Mathématiques)</h3>
                <div className={styles.tableContainer}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Jour</th>
                        <th>Horaire</th>
                        <th>Salle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentSchedule.map((slot, index) => (
                        <tr key={index}>
                          <td>{slot.day}</td>
                          <td>{slot.time}</td>
                          <td>{slot.room}</td>
                        </tr>
                      ))}
                      {currentSchedule.length === 0 && (
                        <tr>
                          <td colSpan={3} style={{ textAlign: "center" }}>Aucun cours programmé</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Students List Section */}
              <div className={styles.contentBlock}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Liste des étudiants ({currentStudents.length})</h3>
                  <button 
                    onClick={handleAddStudent}
                    disabled={savingId === "NEW"}
                    style={{
                      padding: "0.4rem 1rem",
                      backgroundColor: "#f8fafc",
                      color: "#334155",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      fontWeight: 500
                    }}
                  >
                    + Ajouter Étudiant
                  </button>
                </div>
                
                <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1rem" }}>
                  <em>Astuce: Cliquez sur un nom pour le modifier. Effacez le nom complètement pour supprimer l'étudiant.</em>
                </p>

                <div className={styles.tableContainer} style={{ maxHeight: "400px", overflowY: "auto" }}>
                  <table className={styles.dataTable}>
                    <thead style={{ position: "sticky", top: 0, backgroundColor: "#f8fafc", zIndex: 10 }}>
                      <tr>
                        <th style={{ width: "80px" }}>ID</th>
                        <th>Nom et Prénom</th>
                        <th style={{ width: "50px" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentStudents.map((student) => (
                        <tr key={student.dbId}>
                          <td className={styles.readOnly}>#{student.id}</td>
                          <td>
                            <input
                              type="text"
                              value={student.name}
                              onChange={(e) => handleNameChange(student.dbId, e.target.value)}
                              onBlur={() => handleNameBlur(student)}
                              style={{
                                width: "100%",
                                border: "none",
                                background: "transparent",
                                fontFamily: "inherit",
                                fontSize: "1rem",
                                color: "inherit",
                                outline: "none",
                                padding: "4px"
                              }}
                              placeholder="Supprimer l'étudiant..."
                            />
                          </td>
                          <td style={{ textAlign: "center", fontSize: "0.875rem", color: "#64748b" }}>
                            {savingId === student.dbId && <span style={{ color: "#eab308" }}>⏳</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
