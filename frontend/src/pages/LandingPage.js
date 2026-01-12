import React from "react";
import {
  Container,
  Title,
  Text,
  Card,
  Button,
  Group,
  ThemeIcon,
  Stack,
  AppShell,
  Burger,
  Drawer,
  Image,
  Center,
  Badge,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCheck, IconHelp, IconStar } from "@tabler/icons-react";
import { Link } from "react-router-dom";

// DADOS DO PLANO ÚNICO
const planoUnico = {
  id: "pro",
  nome: "Acesso Total",
  preco: "R$ 49,90/mês",
  link: "/cadastro-dono?plano=pro", // Backend deve tratar qualquer registro como Full
  features: [
    "Agenda online 24h",
    "Gestão de serviços e clientes",
    "Equipe e funcionários ilimitados",
    "Relatórios financeiros detalhados",
    "Lembretes automáticos via WhatsApp",
    "Suporte prioritário via WhatsApp",
    "Página de agendamento personalizada",
  ],
};

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
          <Group gap="xs" align="center">
            <Image src="/logoBooki192.png" h={30} w="auto" fit="contain" />
            <Title order={3}>Booki</Title>
          </Group>

          {/* MENU DESKTOP */}
          <Group visibleFrom="sm">
            <Button
              component="a"
              href="mailto: vsgner032@gmail.com"
              variant="default"
              leftSection={<IconHelp size={16} />}
            >
              Suporte
            </Button>
            <Button component={Link} to="/login">
              Acesso Profissional
            </Button>
          </Group>

          {/* BOTÃO HAMBÚRGUER MOBILE */}
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" />
        </Group>

        {/* --- MENU MOBILE --- */}
        <Drawer
          opened={opened}
          onClose={close}
          padding="md"
          size="auto"
          title="Navegação"
        >
          <Stack>
            <Button
              component="a"
              href="mailto: vsgner032@gmail.com"
              variant="default"
              leftSection={<IconHelp size={16} />}
              onClick={close}
            >
              Suporte
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
              lembretes automáticos. Tudo o que você precisa em um único lugar.
            </Text>
          </Stack>

          {/* SEÇÃO DE PREÇO ÚNICO */}
          <Container my="xl" pt="lg" id="planos">
            <Stack align="center" mb="xl">
              <Title order={2} ta="center">
                Simples e Completo
              </Title>
              <Text c="dimmed" ta="center">
                Sem taxas escondidas. Sem limites de funcionalidades.
              </Text>
            </Stack>

            {/* CARD ÚNICO CENTRALIZADO */}
            <Center>
              <Card
                shadow="md"
                padding="xl"
                radius="md"
                withBorder
                w="100%"
                maw={450} // Largura máxima para não ficar gigante
                style={{
                  borderTop: "4px solid var(--mantine-color-blue-6)", // Destaque visual no topo
                }}
              >
                <Group justify="center" mb="xs">
                  <Badge
                    variant="gradient"
                    gradient={{ from: "blue", to: "cyan" }}
                    size="lg"
                  >
                    TUDO INCLUÍDO
                  </Badge>
                </Group>

                <Title order={3} ta="center" mt="sm">
                  {planoUnico.nome}
                </Title>
                
                <Text size="xl" fw={700} my="md" ta="center" fz={32}>
                  {planoUnico.preco}
                </Text>

                <Stack mt="xl" gap="md">
                  {planoUnico.features.map((feature) => (
                    <Group key={feature} gap="sm" wrap="nowrap">
                      <ThemeIcon color="green" size={24} radius="xl">
                        <IconCheck size={16} />
                      </ThemeIcon>
                      <Text size="md">{feature}</Text>
                    </Group>
                  ))}
                </Stack>

                <Button
                  component={Link}
                  to={planoUnico.link}
                  fullWidth
                  mt={30}
                  radius="md"
                  size="lg"
                  variant="gradient"
                  gradient={{ from: "blue", to: "cyan" }}
                >
                  Começar Agora
                </Button>
                
                <Group justify="center" mt="md" gap={5}>
                   <IconStar size={14} color="gray" />
                   <Text size="xs" c="dimmed">Cancele quando quiser</Text>
                </Group>
              </Card>
            </Center>
          </Container>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}

export default LandingPage;