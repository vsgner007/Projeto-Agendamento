import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ProtectedRoute from "./components/ProtectedRoute";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/login" />} />{" "}
          {/* Rota raiz redireciona para login */}
          {/* Rotas Protegidas */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            {/* Adicione outras rotas que precisam de login aqui dentro no futuro */}
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
