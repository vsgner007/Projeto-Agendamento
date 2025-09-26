// frontend/src/components/ProtectedRoute.js
import React from "react";
import { Navigate } from "react-router-dom";
import AppLayout from "./AppLayout"; // Importa o novo Layout

const ProtectedRoute = () => {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" />;
  }

  // Se o usuário está logado, renderiza o AppLayout.
  // O AppLayout, por sua vez, vai renderizar a página correta através do <Outlet/>.
  return <AppLayout />;
};

export default ProtectedRoute;
