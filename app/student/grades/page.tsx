"use client";

import { useState, useRef, useEffect } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import styles from "../page.module.css";
import type { AuthUser } from "../../../lib/auth";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../../../lib/firebase";

const MODULES = [
  "Mathématiques",
  "Physique-Chimie",
  "SVT",
  "Français",
  "Anglais",
  "Histoire-Géographie",
  "Informatique"
];

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

export default function StudentGrades() {
  const [user] = useState<AuthUser | null>(() => getClientSession());
  const [grades, setGrades] = useState<Record<string, { control?: string; exam?: string }>>({});
  const [loading, setLoading] = useState(true);
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchGrades = async () => {
      if (!user?.classId || !user?.studentId) {
        setLoading(false);
        return;
      }
      try {
        const studentRef = doc(db, `classes/${user.classId}/students`, user.studentId);
        const snap = await getDoc(studentRef);
        if (snap.exists()) {
          setGrades(snap.data().grades || {});
        }
      } catch (error) {
        console.error("Error fetching grades:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchGrades();
  }, [user?.classId, user?.studentId]);

  const calculateAverage = (controlStr?: string, examStr?: string) => {
    const control = parseFloat(controlStr || "");
    const exam = parseFloat(examStr || "");
    
    if (isNaN(control) && isNaN(exam)) return "--";
    if (isNaN(control)) return exam.toFixed(2);
    if (isNaN(exam)) return control.toFixed(2);

    const avg = (control * 0.4) + (exam * 0.6);
    return avg.toFixed(2);
  };

  const calculateGeneralAverage = () => {
    const displayedModules = [...new Set([...MODULES, ...Object.keys(grades)])];
    const validAverages = displayedModules
      .map((module) => {
        const modGrades = grades[module] || {};
        const avg = calculateAverage(modGrades.control, modGrades.exam);
        return parseFloat(avg as string);
      })
      .filter((value) => !isNaN(value));

    if (validAverages.length === 0) return "--";
    const total = validAverages.reduce((sum, value) => sum + value, 0);
    return (total / validAverages.length).toFixed(2);
  };

  const generalAverage = calculateGeneralAverage();

  const handleDownloadPDF = async () => {
    if (!pdfRef.current || !user) return;
    
    try {
      const canvas = await html2canvas(pdfRef.current, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.text(`Relevé de Notes - ${user.name}`, 14, 15);
      pdf.addImage(imgData, "PNG", 0, 25, pdfWidth, pdfHeight);
      pdf.save(`Releve_de_Notes_${user.name.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error("Erreur lors de la génération du PDF", err);
      alert("Une erreur est survenue lors de la génération du PDF.");
    }
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className={styles.loading}>Chargement de votre relevé...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Relevé de Notes</h1>
            <p className={styles.subtitle}>Étudiant: {user.name} (Classe {user.classId})</p>
          </div>
        </div>

        {/* GRADES SECTION */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Semestre 1</h2>
            <button className={styles.downloadBtn} onClick={handleDownloadPDF}>
              📄 Télécharger en PDF
            </button>
          </div>
          
          <div ref={pdfRef} style={{ padding: "10px", backgroundColor: "#fff" }}>
            <table className={styles.gradesTable}>
              <thead>
                <tr>
                  <th>Module</th>
                  <th style={{ width: "20%" }}>Contrôle Continu</th>
                  <th style={{ width: "20%" }}>Examen Final</th>
                  <th style={{ width: "20%" }}>Moyenne</th>
                </tr>
              </thead>
              <tbody>
                {[...new Set([...MODULES, ...Object.keys(grades)])].map((module) => {
                  const modGrades = grades[module] || {};
                  const avg = calculateAverage(modGrades.control, modGrades.exam);
                  const avgNum = parseFloat(avg as string);
                  
                  let avgColor = "#111827";
                  if (!isNaN(avgNum)) {
                    avgColor = avgNum >= 10 ? "#059669" : "#dc2626";
                  }

                  return (
                    <tr key={module}>
                      <td className={styles.moduleName}>{module}</td>
                      <td>{modGrades.control || "--"}</td>
                      <td>{modGrades.exam || "--"}</td>
                      <td style={{ color: avgColor, fontWeight: 600 }}>
                        {avg} {avg !== "--" && "/ 20"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} style={{ textAlign: "right", fontWeight: 700, padding: "0.75rem" }}>
                    Moyenne générale
                  </td>
                  <td style={{ fontWeight: 700, padding: "0.75rem", color: generalAverage === "--" ? "#6b7280" : "#111827" }}>
                    {generalAverage} {generalAverage !== "--" ? "/ 20" : ""}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
