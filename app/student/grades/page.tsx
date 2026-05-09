"use client";

import { useState, useRef } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import styles from "../page.module.css";
import type { AuthUser } from "../../../lib/auth";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { getStudentGradesFromLocalStorage, type GradesMap } from "../../../lib/local-grades";
import Link from "next/link";

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
  const [grades] = useState<GradesMap>(() => {
    const session = getClientSession();
    if (session?.classId && session?.studentId) {
      const fromStudentId = getStudentGradesFromLocalStorage(session.classId, session.studentId);
      return fromStudentId;
    }
    return {};
  });
  const pdfRef = useRef<HTMLDivElement>(null);

  const calculateAverage = (controlStr?: string, examStr?: string) => {
    const control = parseFloat(controlStr || "");
    const exam = parseFloat(examStr || "");
    
    if (isNaN(control) && isNaN(exam)) return "--";
    if (isNaN(control)) return exam.toFixed(2);
    if (isNaN(exam)) return control.toFixed(2);

    const avg = (control * 0.4) + (exam * 0.6);
    return avg.toFixed(2);
  };

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
            </table>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Continuer</h2>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link href="/student/courses-devoirs" className={styles.downloadBtn}>
              Courses / Devoirs
            </Link>
            <Link href="/student/absences" className={styles.downloadBtn}>
              Absences
            </Link>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
