"use client";

import { useState } from "react";
import { loginAction } from "@/app/actions/auth";
import type { UserRole } from "@/lib/auth";

export function LoginForm() {
  const [selectedRole, setSelectedRole] = useState<UserRole>("student");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 8) {
      setError("Le code doit contenir exactement 8 caractères.");
      return;
    }
    setLoading(true);
    setError("");
    const result = await loginAction(selectedRole, code);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="login-card">
      <div className="login-header">
        <h1 className="login-title">Portail de Connexion</h1>
        <p className="login-subtitle">Veuillez vous identifier pour accéder au système.</p>
      </div>

      <form onSubmit={handleSubmit} className="basic-login-form">
        <div className="form-group">
          <label htmlFor="role-select">Profil Utilisateur</label>
          <select
            id="role-select"
            value={selectedRole}
            onChange={(e) => {
              setSelectedRole(e.target.value as UserRole);
              setError("");
            }}
            className="basic-input"
          >
            <option value="student">Étudiant</option>
            <option value="teacher">Enseignant</option>
            <option value="administration">Administration</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="code-input">Code d&apos;accès personnel (8 caractères)</label>
          <input
            id="code-input"
            type="text"
            className="basic-input"
            maxLength={8}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
              setError("");
            }}
            placeholder="Ex: STUDENT1"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="submit-btn"
          disabled={code.length !== 8 || loading}
        >
          {loading ? "Connexion en cours..." : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
