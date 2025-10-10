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
  AppShellHeader,
} from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import { Link } from "react-router-dom";

const planos = [
  {
    nome: "Individual",
    preco: "R$ 29,90/mês",
    link: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=dbdd6d20e2f447c68a6a4b58c8262ce3",
    features: [
      "1 Usuário (Dono)",
      "Agenda Online",
      "Gestão de Serviços e Clientes",
      "Limite de 50 agendamentos/mês",
    ],
  },
  {
    nome: "Equipe",
    preco: "R$ 79,90/mês",
    link: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=7bd36f48c3c54a2ca25d46b6e635f551",
    features: [
      "Tudo do plano Individual",
      "Agendamentos Ilimitados",
      "Gestão de Equipe (até 5 membros)",
      "Relatórios Financeiros e Análises",
    ],
  },
  {
    nome: "Premium",
    preco: "R$ 129,90/mês",
    link: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=75d0d3c4fec54bc8a48b91311c4def1b",
    features: [
      "Tudo do plano Equipe",
      "Membros da equipe ilimitados",
      "Lembretes por WhatsApp (Em breve)",
      "Suporte Prioritário",
    ],
  },
];

function LandingPage() {
  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Group
          justify="space-between"
          style={{ height: "100%", paddingLeft: "20px", paddingRight: "20px" }}
        >
          <Title order={3}>Agendamento SaaS</Title>
          <Group>
            <Button component={Link} to="/cliente/login" variant="default">
              Login do Cliente
            </Button>
            <Button component={Link} to="/login">
              Acesso Profissional
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Container>
          <Stack align="center" mt="xl" pt="xl">
            <Title order={1} ta="center" size="4rem">
              Transforme seu Salão com Agendamentos Inteligentes
            </Title>
            <Text c="dimmed" size="xl" ta="center" maw={600}>
              Organize sua equipe, gerencie seus clientes e reduza faltas com
              lembretes automáticos. Tudo em um só lugar.
            </Text>
          </Stack>

          <Container my="xl" pt="xl" id="planos">
            <Title order={2} ta="center">
              Nossos Planos
            </Title>
            <Text c="dimmed" ta="center" mt="sm" mb="xl">
              Escolha o plano que melhor se adapta ao crescimento do seu
              negócio.
            </Text>

            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xl">
              {planos.map((plano) => (
                <Card
                  shadow="sm"
                  padding="lg"
                  radius="md"
                  withBorder
                  key={plano.nome}
                  style={{ display: "flex", flexDirection: "column" }}
                >
                  <Title order={3}>{plano.nome}</Title>
                  <Text size="xl" fw={700} my="md">
                    {plano.preco}
                  </Text>

                  <Stack mt="md" gap="sm" style={{ flex: 1 }}>
                    {plano.features.map((feature) => (
                      <Group key={feature} gap="sm">
                        <ThemeIcon color="green" size={20} radius="xl">
                          <IconCheck size={14} />
                        </ThemeIcon>
                        <Text size="sm">{feature}</Text>
                      </Group>
                    ))}
                  </Stack>

                  <Button
                    component="a"
                    href={plano.link}
                    target="_blank"
                    fullWidth
                    mt="xl"
                    radius="md"
                    size="lg"
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
