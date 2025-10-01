import React, { useState, useEffect } from "react";
import axios from "axios";
import AddAppointmentModal from "../components/AddAppointmentModal";
import {
  Title,
  Table,
  Button,
  Group,
  Loader,
  Alert,
  Badge,
  SegmentedControl,
  Paper,
} from "@mantine/core";
import useAuth from "../hooks/useAuth";

function AgendaPage() {
  const { user } = useAuth();
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState("agendado");

  const fetchAgendamentos = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:3001/agendamentos", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data && Array.isArray(response.data.agendamentos)) {
        setAgendamentos(response.data.agendamentos);
      } else {
        setAgendamentos([]);
      }
    } catch (err) {
      setError("Não foi possível carregar os agendamentos.");
      console.error("Erro ao buscar agendamentos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgendamentos();
  }, []);

  const handleAppointmentCreated = () => {
    fetchAgendamentos();
  };

  const handleCancelAppointment = async (agendamentoId) => {
    if (!window.confirm("Tem certeza que deseja cancelar este agendamento?"))
      return;
    try {
      setError("");
      const token = localStorage.getItem("token");
      await axios.delete(
        `http://localhost:3001/agendamentos/${agendamentoId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setAgendamentos(agendamentos.filter((ag) => ag.id !== agendamentoId));
    } catch (err) {
      setError("Erro ao cancelar o agendamento.");
    }
  };

  const handleUpdateStatus = async (agendamentoId, novoStatus) => {
    try {
      setError("");
      const token = localStorage.getItem("token");
      await axios.put(
        `http://localhost:3001/agendamentos/${agendamentoId}`,
        { status: novoStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchAgendamentos();
    } catch (err) {
      console.error("ERRO DETALHADO AO ATUALIZAR STATUS:", err);
      setError("Erro ao atualizar o status.");
    }
  };

  if (loading) return <Loader />;
  if (error)
    return (
      <Alert color="red" title="Erro">
        {error}
      </Alert>
    );

  const agendamentosFiltrados = agendamentos
    .filter((ag) => {
      if (filtroStatus === "concluido") {
        return ag.status === "concluido";
      }
      return ag.status !== "concluido";
    })
    .sort(
      (a, b) => new Date(a.data_hora_inicio) - new Date(b.data_hora_inicio)
    );

  const rows = agendamentosFiltrados.map((ag) => (
    <Table.Tr key={ag.id}>
      <Table.Td>
        {new Date(ag.data_hora_inicio).toLocaleString("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
        })}
      </Table.Td>
      <Table.Td>{ag.nome_cliente}</Table.Td>
      {user?.role === "dono" && <Table.Td>{ag.nome_profissional}</Table.Td>}
      <Table.Td>{ag.nome_servico}</Table.Td>
      <Table.Td>
        <Badge
          color={
            ag.status === "concluido"
              ? "green"
              : ag.status === "cancelado"
              ? "red"
              : "blue"
          }
          variant="light"
        >
          {ag.status}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Group>
          {ag.status === "agendado" && (
            <Button
              variant="light"
              size="xs"
              onClick={() => handleUpdateStatus(ag.id, "concluido")}
            >
              Concluir
            </Button>
          )}
          {ag.status !== "concluido" && (
            <Button
              variant="light"
              color="red"
              size="xs"
              onClick={() => handleCancelAppointment(ag.id)}
            >
              Cancelar
            </Button>
          )}
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <div>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Gestão da Agenda</Title>
        <Button onClick={() => setIsModalOpen(true)}>
          Adicionar Novo Agendamento
        </Button>
      </Group>

      <Paper withBorder p="md" radius="md">
        <SegmentedControl
          value={filtroStatus}
          onChange={setFiltroStatus}
          data={[
            { label: "Agendamentos Pendentes", value: "agendado" },
            { label: "Serviços Finalizados", value: "concluido" },
          ]}
          fullWidth
        />
      </Paper>

      <Title order={3} mt="xl" mb="md">
        {filtroStatus === "agendado"
          ? "Próximos Compromissos"
          : "Histórico de Serviços Finalizados"}
      </Title>

      <Table.ScrollContainer minWidth={900}>
        <Table striped withTableBorder withColumnBorders highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Data e Hora</Table.Th>
              <Table.Th>Cliente</Table.Th>
              {user?.role === "dono" && <Table.Th>Profissional</Table.Th>}
              <Table.Th>Serviço</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Ações</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.length > 0 ? (
              rows
            ) : (
              <Table.Tr>
                <Table.Td
                  colSpan={user?.role === "dono" ? 7 : 6}
                  align="center"
                >
                  Nenhum agendamento encontrado para este filtro.
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      <AddAppointmentModal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAppointmentCreated={handleAppointmentCreated}
      />
    </div>
  );
}

export default AgendaPage;
