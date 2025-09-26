// frontend/src/components/ProtectedRoute.js
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import Header from "./Header"; // Importe o Header

const ProtectedRoute = () => {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" />;
  }

  // Renderiza o Header e em seguida o conteúdo da página protegida
  return (
    <div>
      <Header />
      <main style={{ padding: "20px" }}>
        <Outlet />
      </main>
    </div>
  );
};

export default ProtectedRoute;
