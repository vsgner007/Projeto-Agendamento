import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import AgendaPage from "./pages/AgendaPage";
import RelatorioPage from "./pages/RelatorioPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import ConfiguracoesPage from "./pages/ConfiguracoesPage";
import EquipePage from "./pages/EquipePage";
import ClientesPage from "./pages/ClientesPage"; // Novo
import BookingPage from "./pages/BookingPage";
import ProtectedRoute from "./components/ProtectedRoute";
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
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<RegisterPage />} />
          <Route path="/agendar" element={<BookingPage />} />
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/cliente/login" element={<ClienteLoginPage />} />
          <Route path="/cliente/cadastro" element={<ClienteCadastroPage />} />
          <Route element={<ProtectedClienteRoute />}>
            <Route
              path="/meus-agendamentos"
              element={<ClienteDashboardPage />}
            />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/agenda" element={<AgendaPage />} />
            <Route path="/clientes" element={<ClientesPage />} /> {/* Novo */}
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
