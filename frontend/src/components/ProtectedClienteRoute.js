// frontend/src/components/ProtectedClienteRoute.js
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

// Este componente é um layout simples para o cliente logado
const ClienteLayout = () => {
  // No futuro, podemos ter um header específico para o cliente aqui
  return <Outlet />;
};

const ProtectedClienteRoute = () => {
  const token = localStorage.getItem("clienteToken"); // Buscamos o token do cliente

  if (token) {
    const decodedToken = jwtDecode(token);
    // Verificamos se o token é do tipo 'cliente'
    if (decodedToken.tipo === "cliente") {
      return <ClienteLayout />;
    }
  }

  // Se não houver token ou for do tipo errado, redireciona para o login do cliente
  return <Navigate to="/cliente/login" />;
};

export default ProtectedClienteRoute;
