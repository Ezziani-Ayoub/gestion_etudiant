"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import {
  AuthUser,
  getDefaultPathForRole,
  isPathAllowedForRole,
} from "../lib/auth";
import { logoutAction } from "../app/actions/auth";
import styles from "./DashboardLayout.module.css";

/** Read the client-readable cookie set by loginAction */
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

type NavItemDefinition = 
  | { type: "link"; href: string; label: string }
  | { type: "header"; label: string }
  | { type: "divider" };

const subscribeToHydration: (onStoreChange: () => void) => () => void = () => () => {};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isHydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const user = isHydrated ? getClientSession() : null;

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }

    if (!isPathAllowedForRole(user.role, pathname)) {
      router.replace(getDefaultPathForRole(user.role));
      return;
    }
  }, [pathname, router, user]);

  const navItems = useMemo<NavItemDefinition[]>(() => {
    if (!user) return [];

    if (user.role === "student") {
      return [
        { type: "link", href: "/student", label: "Emploi du temps" },
        { type: "link", href: "/student/grades", label: "Relevé de notes" },
        { type: "link", href: "/student/courses-devoirs", label: "Courses / Devoirs" },
        { type: "link", href: "/student/absences", label: "Absences" },
        { type: "link", href: "/student/controles-examens", label: "Contrôles / Examens" },
        { type: "link", href: "/student/vacances", label: "Vacances" },
        { type: "link", href: "/student/mesures-disciplinaires", label: "Mesure Disciplinaire" },
        { type: "link", href: "/student/evenements", label: "Événements" },
      ];
    }

    if (user.role === "administration") {
      return [
        { type: "header", label: "Administration" },
        { type: "link", href: "/admin", label: "Tableau de bord" },
        { type: "link", href: "/admin/teachers", label: "Professeurs / Modules" },
        { type: "link", href: "/admin/reunions", label: "Réunions" },
        { type: "link", href: "/admin/rapports", label: "Rapports / Parents" },
        { type: "link", href: "/admin/jours-feries", label: "Jours Fériés" },
        { type: "link", href: "/admin/examens", label: "Contrôles / Examens" },
        { type: "link", href: "/admin/justificatifs", label: "Justificatifs d'Absence" },
        { type: "link", href: "/admin/evenements", label: "Événements" },
      ];
    }

    // Teacher Role
    return [
      { type: "header", label: "Student Management" },
      { type: "link", href: "/", label: "Tableau de bord" },
      { type: "link", href: "/grades", label: "Registre des Notes" },
      { type: "link", href: "/lessons", label: "Leçons et Devoirs" },
      { type: "link", href: "/absences", label: "Suivi des Absences" },
      { type: "divider" },
      { type: "header", label: "Administrative" },
      { type: "link", href: "/admin/reunions", label: "Réunions" },
      { type: "link", href: "/admin/rapports", label: "Rapports / Parents" },
      { type: "link", href: "/admin/jours-feries", label: "Jours Fériés" },
      { type: "link", href: "/admin/examens", label: "Contrôles / Examens" },
      { type: "link", href: "/admin/justificatifs", label: "Justificatifs d'Absence" },
      { type: "link", href: "/admin/evenements", label: "Événements" },
    ];
  }, [user]);

  const handleLogout = async () => {
    await logoutAction();
  };

  if (!isHydrated || !user) {
    return <div className={styles.loadingShell}>Vérification de votre session...</div>;
  }

  return (
    <div className={styles.layoutContainer}>
      {/* LEFT SIDEBAR */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2>Gestion Académique</h2>
        </div>
        
        <div className={styles.sidebarScrollable}>
          <nav className={styles.sidebarNav}>
            {navItems.map((item, index) => {
              if (item.type === "header") {
                return <div key={index} className={styles.navSectionTitle}>{item.label}</div>;
              }
              if (item.type === "divider") {
                return <div key={index} className={styles.navSectionDivider} />;
              }

              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navItem} ${isActive ? styles.active : ""}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className={styles.sidebarFooter}>
          <div className={styles.userAvatar}>{user.name.charAt(0).toUpperCase()}</div>
          <div>
            <div style={{ fontWeight: 600 }}>{user.name}</div>
            <div style={{ color: "#9ca3af", fontSize: "0.75rem", marginBottom: "0.4rem", textTransform: "capitalize" }}>
              {user.role === "teacher" && user.module ? user.module : user.role}
            </div>
            <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
              Se déconnecter
            </button>
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
