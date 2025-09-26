import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Importação de todas as páginas e componentes
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import AgendaPage from "./pages/AgendaPage";
import RelatorioPage from "./pages/RelatorioPage";
import BookingPage from "./pages/BookingPage";
import ProtectedRoute from "./components/ProtectedRoute";

import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          {/* === Rotas Públicas === */}
          {/* O usuário não precisa estar logado para ver estas páginas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<RegisterPage />} />
          <Route path="/agendar" element={<BookingPage />} />

          {/* Rota raiz: por padrão, leva para o login */}
          <Route path="/" element={<Navigate to="/login" />} />

          {/* === Rotas Protegidas === */}
          {/* O usuário precisa estar logado. O <ProtectedRoute> cuida disso. */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/agenda" element={<AgendaPage />} />
            <Route path="/relatorios" element={<RelatorioPage />} />
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
