import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Páginas do Admin
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import AgendaPage from "./pages/AgendaPage";
import RelatorioPage from "./pages/RelatorioPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import ConfiguracoesPage from "./pages/ConfiguracoesPage";
import EquipePage from "./pages/EquipePage";
import ProtectedRoute from "./components/ProtectedRoute";

// Páginas Públicas e do Cliente
import BookingPage from "./pages/BookingPage";
import ClienteLoginPage from "./pages/ClienteLoginPage";
import ClienteCadastroPage from "./pages/ClienteCadastroPage";
import ClienteDashboardPage from "./pages/ClienteDashboardPage";
import ProtectedClienteRoute from "./components/ProtectedClienteRoute";

import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          {/* === ROTAS PÚBLICAS E DO PAINEL DE ADMIN === */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<RegisterPage />} />
          <Route path="/agendar" element={<BookingPage />} />

          {/* --- MUDANÇA APLICADA AQUI --- */}
          {/* Rota raiz: por padrão, agora leva para o login do profissional */}
          <Route path="/" element={<Navigate to="/login" />} />

          {/* === ROTAS DA ÁREA DO CLIENTE === */}
          <Route path="/cliente/login" element={<ClienteLoginPage />} />
          <Route path="/cliente/cadastro" element={<ClienteCadastroPage />} />
          <Route element={<ProtectedClienteRoute />}>
            <Route
              path="/meus-agendamentos"
              element={<ClienteDashboardPage />}
            />
          </Route>

          {/* === ROTAS PROTEGIDAS DO PAINEL DE ADMIN === */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/agenda" element={<AgendaPage />} />
            <Route path="/relatorios" element={<RelatorioPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/configuracoes" element={<ConfiguracoesPage />} />
            <Route path="/equipe" element={<EquipePage />} />
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
