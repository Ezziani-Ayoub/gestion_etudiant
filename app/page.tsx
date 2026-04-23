import styles from "./page.module.css";

export const metadata = {
  title: "Gestion Étudiant - Teacher Portal",
  description: "Teacher Management System",
};

export default function TeacherDashboard() {
  return (
    <div className={styles.container}>
      {/* Top Navigation Bar */}
      <header className={styles.topBar}>
        <div className={styles.logo}>
          <h2>Gestion Étudiant</h2>
        </div>
        
        <nav className={styles.topNav}>
          <a href="#" className={`${styles.navItem} ${styles.active}`}>Home</a>
          <a href="#" className={styles.navItem}>Classes</a>
          <a href="#" className={styles.navItem}>Lessons</a>
          <a href="#" className={styles.navItem}>Assignments</a>
          <a href="#" className={styles.navItem}>Absences</a>
        </nav>

        <div className={styles.userInfo}>
          <span className={styles.userAvatar}>T</span>
          <span>Teacher User</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        <div className={styles.welcomeSection}>
          <h1>Welcome to the Teacher Portal</h1>
          <p>
            Please use the top navigation menu to manage your classes, upload lesson materials, 
            grade assignments, and track student absences.
          </p>
        </div>
        
        {/* Placeholder for future content when a tab is clicked */}
        <div className={styles.contentPlaceholder}>
          <p>Select an option from the menu above to get started.</p>
        </div>
      </main>
    </div>
  );
}
