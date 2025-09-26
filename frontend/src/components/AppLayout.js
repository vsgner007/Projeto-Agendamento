// frontend/src/components/AppLayout.js
import React from "react";
import { AppShell, Title, NavLink } from "@mantine/core";
import {
  NavLink as RouterNavLink,
  Outlet,
  useNavigate,
} from "react-router-dom";
import {
  IconGauge,
  IconClipboardList,
  IconCalendar,
  IconLogout,
} from "@tabler/icons-react";

const AppLayout = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const navLinks = [
    {
      icon: <IconClipboardList size="1rem" />,
      label: "Serviços",
      path: "/dashboard",
    },
    { icon: <IconCalendar size="1rem" />, label: "Agenda", path: "/agenda" },
    {
      icon: <IconGauge size="1rem" />,
      label: "Financeiro",
      path: "/relatorios",
    },
  ];

  return (
    <AppShell
      padding="md"
      header={{ height: 60 }} // Estrutura de prop atualizada
      navbar={{
        width: 300,
        breakpoint: "sm", // O menu será escondido em telas menores que 'sm'
      }}
    >
      {/* Cabeçalho Superior */}
      <AppShell.Header>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            height: "100%",
            padding: "0 20px",
          }}
        >
          <Title order={3}>Painel do Profissional</Title>
        </div>
      </AppShell.Header>

      {/* Menu de Navegação Lateral */}
      <AppShell.Navbar p="md">
        <AppShell.Section grow>
          {navLinks.map((link) => (
            <NavLink
              key={link.label}
              label={link.label}
              icon={link.icon}
              component={RouterNavLink}
              to={link.path}
              active={window.location.pathname === link.path}
            />
          ))}
        </AppShell.Section>
        <AppShell.Section>
          <NavLink
            label="Sair"
            icon={<IconLogout size="1rem" />}
            onClick={handleLogout}
          />
        </AppShell.Section>
      </AppShell.Navbar>

      {/* Área de Conteúdo Principal */}
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
};

export default AppLayout;
