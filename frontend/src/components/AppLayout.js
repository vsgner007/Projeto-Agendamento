import React from "react";
import { AppShell, Title, NavLink, Burger, Group, Image } from "@mantine/core";
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
  IconAddressBook,
  IconReportMoney,
  IconCrown,
} from "@tabler/icons-react";
import useAuth from "../hooks/useAuth";

const AppLayout = () => {
  const [opened, { toggle }] = useDisclosure();
  const navigate = useNavigate();
  const { user } = useAuth(); // Pega o usuário, que agora tem 'plano'

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  // --- LÓGICA DE MENU BASEADA EM PLANO ---
  const navLinks = [
    {
      icon: <IconClipboardList size="1rem" />,
      label: "Serviços",
      path: "/dashboard",
    },
    { icon: <IconCalendar size="1rem" />, label: "Agenda", path: "/agenda" },
  ];

  if (
    user?.role === "funcionario" &&
    ["equipe", "premium"].includes(user?.plano)
  ) {
    navLinks.push({
      icon: <IconReportMoney size="1rem" />,
      label: "Meu Financeiro",
      path: "/meu-faturamento",
    });
  }

  if (user?.role === "dono" || user?.role === "recepcionista") {
    navLinks.push({
      icon: <IconAddressBook size="1rem" />,
      label: "Clientes",
      path: "/clientes",
    });
  }

  if (user?.role === "dono") {
    // Funcionalidades dos planos 'equipe' ou 'premium'
    if (["equipe", "premium"].includes(user?.plano)) {
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
        { icon: <IconUsers size="1rem" />, label: "Equipe", path: "/equipe" }
      );
    }

    // Funcionalidade exclusiva do plano 'premium'
    if (user?.plano === "premium") {
      // Ex: navLinks.push({ label: 'Notificações WhatsApp', path: '/notificacoes' });
    }

    // Links visíveis para o dono em qualquer plano
    navLinks.push(
      { icon: <IconCrown size="1rem" />, label: "Assinatura", path: "/planos" },
      {
        icon: <IconSettings size="1rem" />,
        label: "Configurações",
        path: "/configuracoes",
      }
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
          <Group gap="xs" align="center">
            <Image src="/logoBooki192.png" h={30} w="auto" fit="contain" />
            <Title order={3}>Painel do Profissional</Title>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md">
        <AppShell.Section grow>
          {navLinks
            .sort((a, b) => a.label.localeCompare(b.label))
            .map((link) => (
              <NavLink
                key={link.label}
                label={link.label}
                leftSection={link.icon}
                component={RouterNavLink}
                to={link.path}
                onClick={toggle}
              />
            ))}
        </AppShell.Section>
        <AppShell.Section>
          <NavLink
            label="Sair"
            leftSection={<IconLogout size="1rem" />}
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
