// frontend/src/pages/AgendaPage.js
import React, { useState, useEffect } from "react"; // LINHA CORRIGIDA
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
} from "@mantine/core";

function AgendaPage() {
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchAgendamentos = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:3001/agendamentos", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const sortedData = response.data.agendamentos.sort(
        (a, b) => new Date(a.data_hora_inicio) - new Date(b.data_hora_inicio)
      );
      setAgendamentos(sortedData);
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
      const token = localStorage.getItem("token");
      await axios.put(
        `http://localhost:3001/agendamentos/${agendamentoId}`,
        { status: novoStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchAgendamentos();
    } catch (err) {
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

  const rows = agendamentos.map((ag) => (
    <Table.Tr key={ag.id}>
      <Table.Td>
        {new Date(ag.data_hora_inicio).toLocaleString("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
        })}
      </Table.Td>
      <Table.Td>{ag.nome_cliente}</Table.Td>
      <Table.Td>{ag.nome_servico}</Table.Td>
      <Table.Td>
        <Badge
          color={ag.status === "concluido" ? "green" : "blue"}
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
          <Button
            variant="light"
            color="red"
            size="xs"
            onClick={() => handleCancelAppointment(ag.id)}
          >
            Cancelar
          </Button>
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

      <Title order={3} mt="xl" mb="md">
        Próximos Compromissos
      </Title>

      <Table striped withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Data e Hora</Table.Th>
            <Table.Th>Cliente</Table.Th>
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
              <Table.Td colSpan={5} align="center">
                Nenhum agendamento encontrado.
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>

      <AddAppointmentModal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAppointmentCreated={handleAppointmentCreated}
      />
    </div>
  );
}

export default AgendaPage;
