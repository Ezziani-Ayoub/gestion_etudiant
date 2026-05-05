import DashboardLayout from "../../../components/DashboardLayout";
import styles from "../../absences/page.module.css";

interface Holiday {
  id: string;
  name: string;
  date: string;
  duration: number;
}

export default function JoursFeriesPage() {
  const holidays: Holiday[] = [
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

  return (
    <DashboardLayout>
      <main className={styles.contentBody}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 className={styles.pageTitle} style={{ marginBottom: 0 }}>Calendrier des Jours Fériés - 2027</h1>
        </div>
        
        <div className={styles.panel} style={{ padding: "1.5rem" }}>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {holidays.map(holiday => (
              <div 
                key={holiday.id} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '1.25rem', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '8px', 
                  backgroundColor: 'white', 
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  transition: "transform 0.1s ease-in-out"
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: "#111827", fontSize: "1.1rem" }}>{holiday.name}</div>
                  <div style={{ color: "#4b5563", fontSize: "0.875rem", marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ backgroundColor: "#e0f2fe", color: "#0369a1", padding: "0.2rem 0.6rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600 }}>
                      {holiday.date}
                    </span>
                  </div>
                </div>
                <div style={{ 
                  backgroundColor: holiday.duration > 1 ? "#fef3c7" : "#f3f4f6", 
                  color: holiday.duration > 1 ? "#d97706" : "#4b5563", 
                  padding: "0.5rem 1rem", 
                  borderRadius: "6px", 
                  fontWeight: 600, 
                  fontSize: "0.875rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}>
                  ⏱️ {holiday.duration} {holiday.duration > 1 ? "Jours" : "Jour"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
