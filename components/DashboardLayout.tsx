"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./DashboardLayout.module.css";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const userName = "Professeur";

  return (
    <div className={styles.layoutContainer}>
      {/* LEFT SIDEBAR */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2>Gestion Académique</h2>
        </div>
        
        <div className={styles.sidebarScrollable}>
          <nav className={styles.sidebarNav}>
            <Link href="/" className={`${styles.navItem} ${pathname === "/" ? styles.active : ""}`}>Tableau de bord</Link>
            <Link href="/grades" className={`${styles.navItem} ${pathname === "/grades" ? styles.active : ""}`}>Registre des Notes</Link>
            <Link href="/lessons" className={`${styles.navItem} ${pathname === "/lessons" ? styles.active : ""}`}>Leçons et Devoirs</Link>
            <Link href="/absences" className={`${styles.navItem} ${pathname === "/absences" ? styles.active : ""}`}>Suivi des Absences</Link>
            
            {/* ADMINISTRATION SECTION */}
            <div className={styles.navSectionDivider}></div>
            <div className={styles.navSectionTitle}>Administration</div>
            
            <Link href="/admin/reunions" className={`${styles.navItem} ${pathname.includes("/admin/reunions") ? styles.active : ""}`}>Réunions</Link>
            <Link href="/admin/rapports" className={`${styles.navItem} ${pathname.includes("/admin/rapports") ? styles.active : ""}`}>Rapports / Parents</Link>
            <Link href="/admin/jours-feries" className={`${styles.navItem} ${pathname.includes("/admin/jours-feries") ? styles.active : ""}`}>Jours Fériés</Link>
            <Link href="/admin/examens" className={`${styles.navItem} ${pathname.includes("/admin/examens") ? styles.active : ""}`}>Contrôles / Examens</Link>
            <Link href="/admin/justificatifs" className={`${styles.navItem} ${pathname.includes("/admin/justificatifs") ? styles.active : ""}`}>Justificatifs d'Absence</Link>
          </nav>
        </div>

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
        {children}
      </div>
    </div>
  );
}
