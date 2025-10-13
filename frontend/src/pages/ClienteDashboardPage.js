import React, { useState, useEffect } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import {
  Title,
  Text,
  Container,
  Loader,
  Alert,
  Card,
  Group,
  Button,
  Badge,
  SimpleGrid,
  Stack,
  SegmentedControl,
  Paper,
} from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import BookingFlow from "../components/BookingFlow";

function ClienteDashboardPage() {
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [view, setView] = useState("meusAgendamentos");

  const fetchAgendamentos = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("clienteToken");
      if (!token) {
        navigate("/cliente/login");
        return;
      }
      const response = await api.get("/clientes/meus-agendamentos", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAgendamentos(response.data);
    } catch (err) {
      setError("Não foi possível carregar seus agendamentos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === "meusAgendamentos") {
      fetchAgendamentos();
    }
  }, [view]);

  const handleCancel = async (agendamentoId) => {
    if (
      !window.confirm("Você tem certeza que deseja cancelar este agendamento?")
    )
      return;
    try {
      const token = localStorage.getItem("clienteToken");
      await axios.delete(
        `http://localhost:3001/clientes/agendamentos/${agendamentoId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setAgendamentos(agendamentos.filter((ag) => ag.id !== agendamentoId));
    } catch (err) {
      setError("Não foi possível cancelar o agendamento.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("clienteToken");
    navigate("/cliente/login");
  };

  const hoje = new Date();
  const proximosAgendamentos = agendamentos.filter(
    (ag) => new Date(ag.data_hora_inicio) >= hoje
  );
  const historicoAgendamentos = agendamentos.filter(
    (ag) => new Date(ag.data_hora_inicio) < hoje
  );

  return (
    <Container my="lg">
      <Group justify="space-between" mb="xl">
        <Title order={2}>Área do Cliente</Title>
        <Button variant="outline" onClick={handleLogout}>
          Sair
        </Button>
      </Group>

      <SegmentedControl
        value={view}
        onChange={setView}
        data={[
          { label: "Meus Agendamentos", value: "meusAgendamentos" },
          { label: "Novo Agendamento", value: "novoAgendamento" },
        ]}
        fullWidth
        mb="xl"
      />

      {view === "novoAgendamento" && (
        <BookingFlow onBookingSuccess={() => setView("meusAgendamentos")} />
      )}

      {view === "meusAgendamentos" && (
        <>
          {loading ? (
            <Loader />
          ) : error ? (
            <Alert color="red" icon={<IconAlertCircle />}>
              {error}
            </Alert>
          ) : (
            <>
              <Title order={3}>Próximos Compromissos</Title>
              <SimpleGrid cols={{ base: 1, sm: 2 }} mt="md">
                {proximosAgendamentos.length > 0 ? (
                  proximosAgendamentos.map((ag) => (
                    <Card
                      shadow="sm"
                      padding="lg"
                      radius="md"
                      withBorder
                      key={ag.id}
                    >
                      <Text fw={500}>{ag.nome_servico}</Text>
                      <Text size="sm" c="dimmed">
                        com {ag.nome_profissional} ({ag.nome_filial})
                      </Text>
                      <Text mt="sm">
                        Data:{" "}
                        {new Date(ag.data_hora_inicio).toLocaleString("pt-BR", {
                          dateStyle: "full",
                          timeStyle: "short",
                        })}
                      </Text>
                      <Badge
                        color={ag.status === "agendado" ? "blue" : "gray"}
                        mt="md"
                      >
                        {ag.status}
                      </Badge>
                      <Button
                        variant="light"
                        color="red"
                        fullWidth
                        mt="md"
                        radius="md"
                        onClick={() => handleCancel(ag.id)}
                      >
                        Cancelar Agendamento
                      </Button>
                    </Card>
                  ))
                ) : (
                  <Text>Você não tem nenhum agendamento futuro.</Text>
                )}
              </SimpleGrid>

              <Title order={3} mt="xl">
                Histórico
              </Title>
              <Stack mt="md">
                {historicoAgendamentos.length > 0 ? (
                  historicoAgendamentos.map((ag) => (
                    <Card
                      shadow="sm"
                      padding="lg"
                      radius="md"
                      withBorder
                      key={ag.id}
                    >
                      <Group justify="space-between">
                        <div>
                          <Text fw={500}>{ag.nome_servico}</Text>
                          <Text size="sm" c="dimmed">
                            com {ag.nome_profissional}
                          </Text>
                          <Text size="sm" c="dimmed">
                            em{" "}
                            {new Date(ag.data_hora_inicio).toLocaleDateString(
                              "pt-BR"
                            )}
                          </Text>
                        </div>
                        <Badge
                          color={ag.status === "concluido" ? "green" : "red"}
                          variant="light"
                        >
                          {ag.status}
                        </Badge>
                      </Group>
                    </Card>
                  ))
                ) : (
                  <Text>Nenhum agendamento no seu histórico.</Text>
                )}
              </Stack>
            </>
          )}
        </>
      )}
    </Container>
  );
}

export default ClienteDashboardPage;
