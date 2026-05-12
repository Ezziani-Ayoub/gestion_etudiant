"use client";

import { useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import styles from "./page.module.css";
import type { AuthUser } from "../../lib/auth";

// A static mock schedule representing a typical week
const SCHEDULE = [
  { time: "08:30 - 10:30", mon: "Mathématiques", tue: "Français", wed: "Physique-Chimie", thu: "Mathématiques", fri: "SVT" },
  { time: "10:45 - 12:45", mon: "Anglais", tue: "Histoire-Géographie", wed: "Informatique", thu: "SVT", fri: "Français" },
  { time: "14:30 - 16:30", mon: "Physique-Chimie", tue: "Mathématiques", wed: "Sport", thu: "Anglais", fri: "Informatique" },
  { time: "16:45 - 18:45", mon: "SVT", tue: "Informatique", wed: "Libre", thu: "Histoire-Géographie", fri: "Libre" },
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

export default function StudentDashboard() {
  const [user] = useState<AuthUser | null>(() => getClientSession());

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
            <h1 className={styles.title}>Espace Étudiant</h1>
            <p className={styles.subtitle}>Bienvenue, {user.name} (Classe {user.classId})</p>
          </div>
        </div>

        {/* SCHEDULE SECTION */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Emploi du Temps</h2>
          </div>
          <table className={styles.scheduleTable}>
            <thead>
              <tr>
                <th>Horaire</th>
                <th>Lundi</th>
                <th>Mardi</th>
                <th>Mercredi</th>
                <th>Jeudi</th>
                <th>Vendredi</th>
              </tr>
            </thead>
            <tbody>
              {SCHEDULE.map((slot, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600 }}>{slot.time}</td>
                  <td className={slot.mon !== "Libre" && slot.mon !== "Sport" ? styles.moduleCell : ""}>{slot.mon}</td>
                  <td className={slot.tue !== "Libre" && slot.tue !== "Sport" ? styles.moduleCell : ""}>{slot.tue}</td>
                  <td className={slot.wed !== "Libre" && slot.wed !== "Sport" ? styles.moduleCell : ""}>{slot.wed}</td>
                  <td className={slot.thu !== "Libre" && slot.thu !== "Sport" ? styles.moduleCell : ""}>{slot.thu}</td>
                  <td className={slot.fri !== "Libre" && slot.fri !== "Sport" ? styles.moduleCell : ""}>{slot.fri}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
