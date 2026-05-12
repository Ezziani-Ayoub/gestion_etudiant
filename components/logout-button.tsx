"use client";

import { logoutAction } from "@/app/actions/auth";
import { useState } from "react";

export function LogoutButton() {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    await logoutAction();
  };

  return (
    <button
      className="logout-btn"
      onClick={handleLogout}
      disabled={loading}
    >
      {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : "↩"}
      {loading ? "Déconnexion..." : "Se déconnecter"}
    </button>
  );
}
