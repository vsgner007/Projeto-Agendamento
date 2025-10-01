import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Importação de todas as páginas e componentes
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import AgendaPage from "./pages/AgendaPage";
import RelatorioPage from "./pages/RelatorioPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import ConfiguracoesPage from "./pages/ConfiguracoesPage";
import EquipePage from "./pages/EquipePage"; // A nova página de Equipe
import BookingPage from "./pages/BookingPage";
import ProtectedRoute from "./components/ProtectedRoute";

import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          {/* === Rotas Públicas === */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<RegisterPage />} />
          <Route path="/agendar" element={<BookingPage />} />
          <Route path="/" element={<Navigate to="/login" />} />

          {/* === Rotas Protegidas === */}
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
