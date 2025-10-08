import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Páginas do Painel de Admin
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import AgendaPage from "./pages/AgendaPage";
import ClientesPage from "./pages/ClientesPage";
import RelatorioPage from "./pages/RelatorioPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import ConfiguracoesPage from "./pages/ConfiguracoesPage";
import EquipePage from "./pages/EquipePage";
import ProtectedRoute from "./components/ProtectedRoute";

// Páginas Públicas e da Área do Cliente
import BookingPage from "./pages/BookingPage";
import ClienteLoginPage from "./pages/ClienteLoginPage";
import ClienteCadastroPage from "./pages/ClienteCadastroPage";
import ClienteDashboardPage from "./pages/ClienteDashboardPage";
import ProtectedClienteRoute from "./components/ProtectedClienteRoute";
import EsqueciSenhaPage from "./pages/EsqueciSenhaPage";
import ResetarSenhaPage from "./pages/ResetarSenhaPage";

import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* === ROTAS PÚBLICAS E DE AUTENTICAÇÃO === */}
        <Route path="/agendar" element={<BookingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cliente/login" element={<ClienteLoginPage />} />
        <Route path="/cliente/cadastro" element={<ClienteCadastroPage />} />
        <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
        <Route path="/resetar-senha/:token" element={<ResetarSenhaPage />} />

        {/* Rota Raiz: Redireciona para o login do profissional por padrão */}
        <Route path="/" element={<Navigate to="/login" />} />

        {/* === ÁREA PROTEGIDA DO CLIENTE === */}
        <Route element={<ProtectedClienteRoute />}>
          <Route path="/meus-agendamentos" element={<ClienteDashboardPage />} />
        </Route>

        {/* === PAINEL PROTEGIDO DO PROFISSIONAL === */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/agenda" element={<AgendaPage />} />
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/relatorios" element={<RelatorioPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/configuracoes" element={<ConfiguracoesPage />} />
          <Route path="/equipe" element={<EquipePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
