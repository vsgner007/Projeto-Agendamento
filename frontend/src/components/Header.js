// frontend/src/components/Header.js
import React from "react";
import { Link, useNavigate } from "react-router-dom";

const Header = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  // Estilos para o cabeçalho (pode ser movido para um arquivo CSS no futuro)
  const headerStyle = {
    background: "#2c3e50", // Um azul escuro mais moderno
    color: "#fff",
    padding: "15px 30px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  };

  const navStyle = {
    display: "flex",
    gap: "20px", // Espaçamento entre os links
  };

  const linkStyle = {
    color: "white",
    textDecoration: "none",
    fontSize: "16px",
    fontWeight: "500",
    padding: "5px 10px",
    borderRadius: "5px",
    transition: "background-color 0.3s",
  };

  const buttonStyle = {
    background: "#e74c3c", // Vermelho para o botão de sair
    color: "white",
    border: "none",
    padding: "8px 15px",
    borderRadius: "5px",
    cursor: "pointer",
    fontWeight: "bold",
    transition: "background-color 0.3s",
  };

  return (
    <header style={headerStyle}>
      <nav style={navStyle}>
        <Link to="/dashboard" style={linkStyle}>
          Serviços
        </Link>
        <Link to="/agenda" style={linkStyle}>
          Agenda
        </Link>
        <Link to="/relatorios" style={linkStyle}>
          Financeiro
        </Link>
      </nav>
      <button
        onClick={handleLogout}
        style={buttonStyle}
        onMouseOver={(e) => (e.currentTarget.style.background = "#c0392b")}
        onMouseOut={(e) => (e.currentTarget.style.background = "#e74c3c")}
      >
        Sair
      </button>
    </header>
  );
};

export default Header;
