"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import DashboardLayout from "../../components/DashboardLayout";
import { db } from "../../lib/firebase";
import { collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";

interface Lesson {
  id: string;
  title: string;
  url: string;
  type: string;
  category: "Cours" | "Devoir";
  size: number;
  uploadedAt: number;
}

export default function LessonsPage() {
  const userName = "Professeur";
  
  const [selectedClass, setSelectedClass] = useState<"G4" | "G6" | "G8">("G4");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadCategory, setUploadCategory] = useState<"Cours" | "Devoir">("Cours");

  useEffect(() => {
    const fetchLessons = async () => {
      setLoading(true);
      try {
        const lessonsRef = collection(db, `classes/${selectedClass}/lessons`);
        const snap = await getDocs(lessonsRef);
        const fetchedLessons = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<Lesson, "id">) })) as Lesson[];
        
        fetchedLessons.sort((a, b) => b.uploadedAt - a.uploadedAt);
        setLessons(fetchedLessons);
      } catch (error) {
        console.error("Error fetching lessons:", error);
      }
      setLoading(false);
    };
    fetchLessons();
  }, [selectedClass]);

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cet élément ?")) return;
    
    try {
      await deleteDoc(doc(db, `classes/${selectedClass}/lessons`, lessonId));
      setLessons(prev => prev.filter(l => l.id !== lessonId));
    } catch (error) {
      console.error("Error deleting lesson:", error);
      alert("Erreur lors de la suppression.");
    }
  };

  const handleUploadClick = (category: "Cours" | "Devoir") => {
    setUploadCategory(category);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "gestion_lessons"); 
      
      // Try to maintain original filename
      const originalName = file.name.replace(/\.[^/.]+$/, "");
      formData.append("public_id", originalName);

      const res = await fetch("https://api.cloudinary.com/v1_1/dlk9cx0id/auto/upload", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      
      if (data.secure_url) {
        const newLesson = {
          title: file.name,
          url: data.secure_url,
          type: file.type.includes("pdf") ? "PDF" : file.type.includes("video") ? "Video" : "Document",
          category: uploadCategory,
          size: file.size,
          uploadedAt: Date.now()
        };

        const lessonsRef = collection(db, `classes/${selectedClass}/lessons`);
        const docRef = await addDoc(lessonsRef, newLesson);

        setLessons(prev => [{ id: docRef.id, ...newLesson }, ...prev]);
      } else {
        alert(`Échec de l'upload: ${data.error?.message || "Vérifiez vos paramètres Cloudinary."}`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Une erreur s'est produite lors de l'upload.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const formatSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const cours = lessons.filter(l => l.category !== "Devoir");
  const devoirs = lessons.filter(l => l.category === "Devoir");

  return (
    <DashboardLayout>
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
            <h1 className={styles.pageTitle} style={{ margin: 0 }}>Référentiel : Classe {selectedClass}</h1>
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className={styles.hiddenInput} 
            accept=".pdf,video/mp4,video/x-m4v,video/*"
          />

          {loading ? (
            <div className={styles.loadingState}>Chargement du référentiel...</div>
          ) : (
            <div style={{ maxWidth: "800px" }}>
              
              {/* COURS SECTION */}
              <div className={styles.sectionHeader}>
                <h3>Matériel de Cours</h3>
                <button 
                  className={styles.primaryBtn} 
                  onClick={() => handleUploadClick("Cours")} 
                  disabled={uploading}
                >
                  {uploading && uploadCategory === "Cours" ? "Upload..." : "Ajouter Cours"}
                </button>
              </div>
              
              <div className={styles.lessonList}>
                {cours.length === 0 ? (
                  <div className={styles.emptyState}>Aucun cours n&apos;a été ajouté.</div>
                ) : (
                  cours.map(lesson => (
                    <div key={lesson.id} className={styles.lessonItem}>
                      <div className={styles.lessonInfo}>
                        <h4 className={styles.lessonTitle}>{lesson.title}</h4>
                        <p className={styles.lessonMeta}>
                          {lesson.type} • {formatSize(lesson.size)} • Ajouté le {new Date(lesson.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className={styles.lessonActions}>
                        <a href={lesson.url} target="_blank" rel="noopener noreferrer" className={styles.downloadLink}>Ouvrir</a>
                        <button className={styles.deleteTextBtn} onClick={() => handleDeleteLesson(lesson.id)}>Supprimer</button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <hr className={styles.divider} />

              {/* DEVOIRS SECTION */}
              <div className={styles.sectionHeader}>
                <h3>Devoirs Assignés</h3>
                <button 
                  className={styles.primaryBtn} 
                  onClick={() => handleUploadClick("Devoir")} 
                  disabled={uploading}
                >
                  {uploading && uploadCategory === "Devoir" ? "Upload..." : "Ajouter Devoir"}
                </button>
              </div>
              
              <div className={styles.lessonList}>
                {devoirs.length === 0 ? (
                  <div className={styles.emptyState}>Aucun devoir n&apos;a été ajouté.</div>
                ) : (
                  devoirs.map(lesson => (
                    <div key={lesson.id} className={styles.lessonItem}>
                      <div className={styles.lessonInfo}>
                        <h4 className={styles.lessonTitle}>{lesson.title}</h4>
                        <p className={styles.lessonMeta}>
                          {lesson.type} • {formatSize(lesson.size)} • Ajouté le {new Date(lesson.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className={styles.lessonActions}>
                        <a href={lesson.url} target="_blank" rel="noopener noreferrer" className={styles.downloadLink}>Ouvrir</a>
                        <button className={styles.deleteTextBtn} onClick={() => handleDeleteLesson(lesson.id)}>Supprimer</button>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}
        </main>
    </DashboardLayout>
  );
}
