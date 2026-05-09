"use server";

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { setSession, clearSession } from "@/lib/auth-server";
import type { UserRole } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const CLIENT_SESSION_COOKIE = "client_session";

export async function loginAction(role: UserRole, code: string): Promise<{ error: string } | void> {
  const trimmedCode = code.trim().toUpperCase();

  if (trimmedCode.length !== 8) {
    return { error: "Le code doit contenir exactement 8 caractères." };
  }

  const collectionName = role === "administration" ? "administration" : role + "s";
  const colRef = collection(db, collectionName);
  const q = query(colRef, where("code", "==", trimmedCode));

  let snap;
  try {
    snap = await getDocs(q);
  } catch {
    return { error: "Erreur de connexion à la base de données." };
  }

  if (snap.empty) {
    return { error: "Code invalide. Veuillez réessayer." };
  }

  const userDoc = snap.docs[0].data();

  // Set secure HttpOnly cookie for server-side session
  await setSession({
    name: userDoc.name,
    role,
    code: trimmedCode,
    classId: userDoc.classId,
    studentId: userDoc.studentId,
    module: userDoc.module,
  });

  // Set readable client cookie so DashboardLayout can access user info
  const cookieStore = await cookies();
  cookieStore.set(CLIENT_SESSION_COOKIE, JSON.stringify({
    name: userDoc.name,
    role,
    classId: userDoc.classId,
    studentId: userDoc.studentId,
    module: userDoc.module,
  }), {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });

  // Redirect based on role
  if (role === "teacher") redirect("/");
  if (role === "student") redirect("/student");
  if (role === "administration") redirect("/admin");
}

export async function logoutAction() {
  await clearSession();
  const cookieStore = await cookies();
  cookieStore.delete(CLIENT_SESSION_COOKIE);
  redirect("/login");
}
