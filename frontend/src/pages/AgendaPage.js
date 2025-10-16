import React, { useState, useEffect } from "react";
import api from "../api";
import AdminAppointmentModal from "../components/AdminAppointmentModal";
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
  Text,
  CopyButton,
  TextInput,
  Modal,
  Textarea,
} from "@mantine/core";
import { IconShare, IconCheck } from "@tabler/icons-react";
import useAuth from "../hooks/useAuth";

function AgendaPage() {
  const { user } = useAuth();
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState("agendado");

  // Estados para o modal de cancelamento
  const [cancelingAppointment, setCancelingAppointment] = useState(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");

  // Constrói o link de agendamento exclusivo
  let linkAgendamento = "";
  if (user?.subdomain) {
    const domain = window.location.host.includes("localhost")
      ? "localhost:3000"
      : "booki-agendamentos.vercel.app";
    const protocol = window.location.protocol;
    linkAgendamento = `${protocol}//${user.subdomain}.${domain}/agendar`;
  }

  const fetchAgendamentos = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await api.get("/agendamentos", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAgendamentos(response.data.agendamentos || []);
    } catch (err) {
      setError("Não foi possível carregar os agendamentos.");
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

  const handleConfirmCancel = async () => {
    if (!motivoCancelamento) {
      alert("Por favor, insira um motivo para o cancelamento.");
      return;
    }
    try {
      setError("");
      const token = localStorage.getItem("token");
      await api.delete(`/agendamentos/${cancelingAppointment.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { motivo: motivoCancelamento },
      });
      fetchAgendamentos();
      setCancelingAppointment(null);
      setMotivoCancelamento("");
    } catch (err) {
      setError("Erro ao cancelar o agendamento.");
    }
  };

  const handleUpdateStatus = async (agendamentoId, novoStatus) => {
    try {
      setError("");
      const token = localStorage.getItem("token");
      await api.put(
        `/agendamentos/${agendamentoId}`,
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

  const rolesComVisaoCompleta = ["dono", "recepcionista"];

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
    <Table.Tr
      key={ag.id}
      style={{
        backgroundColor: ag.status === "cancelado" ? "#fff5f5" : "transparent",
      }}
    >
      <Table.Td>
        {new Date(ag.data_hora_inicio).toLocaleString("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
        })}
      </Table.Td>
      <Table.Td>{ag.nome_cliente}</Table.Td>
      <Table.Td>{ag.telefone_contato}</Table.Td>
      {rolesComVisaoCompleta.includes(user?.role) && (
        <Table.Td>{ag.nome_profissional}</Table.Td>
      )}
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
      {filtroStatus !== "concluido" && (
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
            {ag.status !== "cancelado" && (
              <Button
                variant="light"
                color="red"
                size="xs"
                onClick={() => setCancelingAppointment(ag)}
              >
                Cancelar
              </Button>
            )}
          </Group>
        </Table.Td>
      )}
    </Table.Tr>
  ));

  let colSpan = 5;
  if (rolesComVisaoCompleta.includes(user?.role)) colSpan++;
  if (filtroStatus !== "concluido") colSpan++;

  return (
    <div>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Gestão da Agenda</Title>
        {rolesComVisaoCompleta.includes(user?.role) && (
          <Button onClick={() => setIsModalOpen(true)}>
            Adicionar Novo Agendamento
          </Button>
        )}
      </Group>

      {user?.role === "dono" && user?.subdomain && (
        <Paper withBorder p="md" radius="md" mb="xl">
          <Group>
            <IconShare size={24} />
            <Text fw={500}>Link de Agendamento para seus Clientes</Text>
          </Group>
          <Text size="sm" c="dimmed" mt={4}>
            Compartilhe este link em suas redes sociais para que seus clientes
            possam agendar online.
          </Text>
          <Group mt="sm">
            <TextInput value={linkAgendamento} readOnly style={{ flex: 1 }} />
            <CopyButton value={linkAgendamento} timeout={2000}>
              {({ copied, copy }) => (
                <Button
                  color={copied ? "teal" : "blue"}
                  leftSection={copied ? <IconCheck size={16} /> : null}
                  onClick={copy}
                >
                  {copied ? "Copiado!" : "Copiar Link"}
                </Button>
              )}
            </CopyButton>
          </Group>
        </Paper>
      )}

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

      <Table.ScrollContainer minWidth={1000}>
        <Table striped withTableBorder withColumnBorders highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Data e Hora</Table.Th>
              <Table.Th>Cliente</Table.Th>
              <Table.Th>Telefone</Table.Th>
              {rolesComVisaoCompleta.includes(user?.role) && (
                <Table.Th>Profissional</Table.Th>
              )}
              <Table.Th>Serviço(s)</Table.Th>
              <Table.Th>Status</Table.Th>
              {filtroStatus !== "concluido" && <Table.Th>Ações</Table.Th>}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.length > 0 ? (
              rows
            ) : (
              <Table.Tr>
                <Table.Td colSpan={colSpan} align="center">
                  Nenhum agendamento encontrado para este filtro.
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      <AdminAppointmentModal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAppointmentCreated={handleAppointmentCreated}
      />

      <Modal
        opened={!!cancelingAppointment}
        onClose={() => setCancelingAppointment(null)}
        title="Cancelar Agendamento"
        centered
      >
        <Text>
          Por favor, insira o motivo do cancelamento para o agendamento de{" "}
          <strong>{cancelingAppointment?.nome_cliente}</strong>.
        </Text>
        <Textarea
          placeholder="Ex: Cliente desmarcou, não compareceu, etc."
          value={motivoCancelamento}
          onChange={(event) => setMotivoCancelamento(event.currentTarget.value)}
          mt="md"
        />
        <Group justify="flex-end" mt="lg">
          <Button
            variant="default"
            onClick={() => setCancelingAppointment(null)}
          >
            Fechar
          </Button>
          <Button color="red" onClick={handleConfirmCancel}>
            Confirmar Cancelamento
          </Button>
        </Group>
      </Modal>
    </div>
  );
}

export default AgendaPage;
