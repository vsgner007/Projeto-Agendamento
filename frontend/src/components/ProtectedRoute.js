import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import AppLayout from "./AppLayout";
import useAuth from "../hooks/useAuth";

const ProtectedRoute = () => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    // Se não há usuário, redireciona para o login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // --- CORREÇÃO DE SEGURANÇA APLICADA AQUI ---
  if (user.plano === "pendente_pagamento") {
    // Se o plano está pendente, redireciona para a página de pagamento
    return <Navigate to="/pagamento-pendente" replace />;
  }

  // Se o usuário está logado e o plano está ativo, mostra o painel
  return <AppLayout />;
};

export default ProtectedRoute;
