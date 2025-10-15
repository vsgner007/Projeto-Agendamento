import React from "react";
import {
  Container,
  Title,
  Text,
  SimpleGrid,
  Card,
  Button,
  Group,
  ThemeIcon,
  Stack,
  AppShell,
  Burger,
  Drawer,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCheck } from "@tabler/icons-react";
import { Link } from "react-router-dom";

const planos = [
  {
    id: "individual",
    nome: "Individual",
    preco: "R$ 29,90/mês",
    link: "/cadastro-dono?plano=individual",
    features: [
      "1 Usuário (Dono)",
      "Agenda Online",
      "Gestão de Serviços e Clientes",
      "Limite de 50 agendamentos/mês",
    ],
  },
  {
    id: "equipe",
    nome: "Equipe",
    preco: "R$ 79,90/mês",
    link: "/cadastro-dono?plano=equipe",
    features: [
      "Tudo do plano Individual",
      "Agendamentos Ilimitados",
      "Gestão de Equipe (até 5 membros)",
      "Relatórios Financeiros e Análises",
    ],
  },
  {
    id: "premium",
    nome: "Premium",
    preco: "R$ 129,90/mês",
    link: "/cadastro-dono?plano=premium",
    features: [
      "Tudo do plano Equipe",
      "Membros da equipe ilimitados",
      "Lembretes por WhatsApp (Em breve)",
      "Suporte Prioritário",
    ],
  },
];

function LandingPage() {
  const [opened, { toggle, close }] = useDisclosure(false);

  return (
    <AppShell header={{ height: 60 }} padding="md">
      {/* HEADER RESPONSIVO */}
      <AppShell.Header>
        <Group
          justify="space-between"
          style={{ height: "100%", padding: "0 16px" }}
        >
          <Title order={3}>Booki</Title>

          {/* MENU DESKTOP */}
          <Group visibleFrom="sm">
            <Button component={Link} to="/login">
              Acesso Profissional
            </Button>
          </Group>

          {/* BOTÃO HAMBÚRGUER MOBILE */}
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" />
        </Group>

        {/* MENU MOBILE */}
        <Drawer opened={opened} onClose={close} padding="md" size="xs">
          <Stack>
            <Button
              component={Link}
              to="/cliente/login"
              variant="default"
              onClick={close}
            >
              Login do Cliente
            </Button>
            <Button component={Link} to="/login" onClick={close}>
              Acesso Profissional
            </Button>
          </Stack>
        </Drawer>
      </AppShell.Header>

      {/* CONTEÚDO PRINCIPAL */}
      <AppShell.Main>
        <Container>
          <Stack align="center" mt="xl" pt="xl" px="sm">
            <Title
              order={1}
              ta="center"
              style={{
                fontSize: "clamp(1.8rem, 4vw, 4rem)",
                lineHeight: 1.2,
              }}
            >
              Transforme seu Salão com Agendamentos Inteligentes
            </Title>
            <Text
              c="dimmed"
              size="lg"
              ta="center"
              maw={700}
              px="sm"
              style={{ fontSize: "clamp(1rem, 2vw, 1.3rem)" }}
            >
              Organize sua equipe, gerencie seus clientes e reduza faltas com
              lembretes automáticos. Tudo em um só lugar.
            </Text>
          </Stack>

          {/* SEÇÃO DE PLANOS */}
          <Container my="xl" pt="xl" id="planos">
            <Title order={2} ta="center">
              Nossos Planos
            </Title>
            <Text c="dimmed" ta="center" mt="sm" mb="xl">
              Escolha o plano que melhor se adapta ao crescimento do seu
              negócio.
            </Text>

            {/* GRID RESPONSIVO */}
            <SimpleGrid
              cols={{ base: 1, sm: 2, md: 3 }}
              spacing={{ base: "lg", sm: "xl" }}
            >
              {planos.map((plano) => (
                <Card
                  key={plano.id}
                  shadow="sm"
                  padding="lg"
                  radius="md"
                  withBorder
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    height: "100%",
                  }}
                >
                  <Title order={3} ta="center">
                    {plano.nome}
                  </Title>
                  <Text size="xl" fw={700} my="md" ta="center">
                    {plano.preco}
                  </Text>
                  <Stack mt="md" gap="sm" style={{ flex: 1 }}>
                    {plano.features.map((feature) => (
                      <Group key={feature} gap="sm" wrap="nowrap">
                        <ThemeIcon color="green" size={22} radius="xl">
                          <IconCheck size={14} />
                        </ThemeIcon>
                        <Text size="sm">{feature}</Text>
                      </Group>
                    ))}
                  </Stack>
                  <Button
                    component={Link}
                    to={plano.link}
                    fullWidth
                    mt="xl"
                    radius="md"
                    size="md"
                  >
                    Assinar Agora
                  </Button>
                </Card>
              ))}
            </SimpleGrid>
          </Container>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}

export default LandingPage;
