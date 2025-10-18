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
} from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import { Link } from "react-router-dom"; // Importa o Link

const planos = [
  {
    id: "individual",
    nome: "Individual",
    preco: "R$ 29,90/mês",
    link: "/cadastro-dono?plano=individual", // Link de cadastro
    features: [
      "Apenas 1 dono",
      "Nenhum funcionário",
      "Agenda online",
      "Gestão de serviços e clientes",
      "Agendamentos ilimitados",
      "Suporte",
    ],
  },
  {
    id: "equipe",
    nome: "Equipe",
    preco: "R$ 79,90/mês",
    link: "/cadastro-dono?plano=equipe", // Link de cadastro
    features: [
      "Agenda online",
      "Gestão de serviços e clientes",
      "Gestão de equipe (até 3 funcionários)",
      "Relatório financeiro e análise",
      "Suporte",
    ],
  },
  {
    id: "premium",
    nome: "Premium",
    preco: "R$ 129,90/mês",
    link: "/cadastro-dono?plano=premium", // Link de cadastro
    features: [
      "Agenda online",
      "Gestão de serviços e clientes",
      "Gestão de equipe e funcionários ilimitados",
      "Relatório financeiro e análise",
      "Lembretes por WhatsApp",
      "Suporte prioritário",
    ],
  },
];

function PrecosPage() {
  return (
    <Container my="xl">
      <Title order={2} ta="center">
        Nossos Planos
      </Title>
      <Text c="dimmed" ta="center" mt="sm" mb="xl">
        Escolha o plano que melhor se adapta ao crescimento do seu negócio.
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
              component={Link} // Usa o componente Link do React Router
              to={plano.link} // Usa 'to' em vez de 'href'
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
  );
}

export default PrecosPage;
