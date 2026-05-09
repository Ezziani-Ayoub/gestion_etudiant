import { LoginForm } from "@/components/login-form";
import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Connexion — GestionÉtudiant",
  description: "Connectez-vous à votre espace GestionÉtudiant",
};

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    if (session.role === "teacher") redirect("/");
    if (session.role === "student") redirect("/student");
    if (session.role === "administration") redirect("/admin");
  }

  return (
    <main className="login-page">

      <LoginForm />

      <p className="login-footer">
        © {new Date().getFullYear()} GestionÉtudiant — Tous droits réservés
      </p>
    </main>
  );
}
