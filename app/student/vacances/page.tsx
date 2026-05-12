"use client";

import DashboardLayout from "../../../components/DashboardLayout";
import styles from "../page.module.css";

const HOLIDAYS_2027 = [
  { id: "1", name: "Nouvel An", date: "1 Janvier 2027", duration: 1 },
  { id: "2", name: "Manifeste de l'Indépendance", date: "11 Janvier 2027", duration: 1 },
  { id: "3", name: "Aïd Al Fitr", date: "9 Mars 2027 (Estimé)", duration: 2 },
  { id: "4", name: "Fête du Travail", date: "1 Mai 2027", duration: 1 },
  { id: "5", name: "Aïd Al Adha", date: "16 Mai 2027 (Estimé)", duration: 2 },
  { id: "6", name: "1er Moharram", date: "6 Juin 2027 (Estimé)", duration: 1 },
  { id: "7", name: "Fête du Trône", date: "30 Juillet 2027", duration: 1 },
  { id: "8", name: "Oued Ed-Dahab", date: "14 Août 2027", duration: 1 },
  { id: "9", name: "Révolution du Roi et du Peuple", date: "20 Août 2027", duration: 1 },
  { id: "10", name: "Fête de la Jeunesse", date: "21 Août 2027", duration: 1 },
  { id: "11", name: "Marche Verte", date: "6 Novembre 2027", duration: 1 },
  { id: "12", name: "Fête de l'Indépendance", date: "18 Novembre 2027", duration: 1 },
];

export default function StudentVacancesPage() {
  return (
    <DashboardLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Vacances</h1>
            <p className={styles.subtitle}>Même calendrier que les jours fériés</p>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Jours Fériés</h2>
          </div>
          <table className={styles.gradesTable}>
            <thead>
              <tr>
                <th>Événement</th>
                <th>Date</th>
                <th>Durée</th>
              </tr>
            </thead>
            <tbody>
              {HOLIDAYS_2027.map((holiday) => (
                <tr key={holiday.id}>
                  <td>{holiday.name}</td>
                  <td>{holiday.date}</td>
                  <td>
                    {holiday.duration} {holiday.duration > 1 ? "jours" : "jour"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
