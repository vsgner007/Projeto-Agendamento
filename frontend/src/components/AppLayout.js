import React from "react";
import { AppShell, Title, NavLink, Burger, Group } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
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
  IconChartPie,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react";
import useAuth from "../hooks/useAuth"; // Importa nosso hook de autenticação

const AppLayout = () => {
  const [opened, { toggle }] = useDisclosure();
  const navigate = useNavigate();
  const { user } = useAuth(); // Usa o hook para pegar os dados do usuário

  // --- NOSSO SEGUNDO ESPIÃO ---
  // Vamos ver o que o hook está retornando
  console.log("DADOS DO USUÁRIO NO AppLayout:", user);
  console.log("O 'role' do usuário é:", user?.role);
  // -----------------------------

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  // Links base, visíveis para todos
  const navLinks = [
    {
      icon: <IconClipboardList size="1rem" />,
      label: "Serviços",
      path: "/dashboard",
    },
    { icon: <IconCalendar size="1rem" />, label: "Agenda", path: "/agenda" },
  ];

  // Lógica condicional com logs para sabermos a decisão
  if (user?.role === "dono") {
    console.log(
      "CONDIÇÃO VERDADEIRA: O usuário é 'dono'. Adicionando links de admin."
    );
    navLinks.push(
      {
        icon: <IconGauge size="1rem" />,
        label: "Financeiro",
        path: "/relatorios",
      },
      {
        icon: <IconChartPie size="1rem" />,
        label: "Análises",
        path: "/analytics",
      },
      { icon: <IconUsers size="1rem" />, label: "Equipe", path: "/equipe" },
      {
        icon: <IconSettings size="1rem" />,
        label: "Configurações",
        path: "/configuracoes",
      }
    );
  } else {
    console.log(
      "CONDIÇÃO FALSA: O usuário NÃO é 'dono' ou o 'role' não foi encontrado."
    );
  }

  return (
    <AppShell
      padding="md"
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Title order={3}>Painel do Profissional</Title>
        </Group>
      </AppShell.Header>

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
              onClick={toggle}
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

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
};

export default AppLayout;
