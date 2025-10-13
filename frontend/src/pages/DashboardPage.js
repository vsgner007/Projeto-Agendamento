import React, { useState, useEffect } from "react";
import api from "../api";
import {
  Title,
  Table,
  Group,
  Loader,
  Alert,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import CreateServiceForm from "../components/CreateServiceForm";
import EditServiceModal from "../components/EditServiceModal";
import useAuth from "../hooks/useAuth"; // 1. Importe o hook de autenticação

function DashboardPage() {
  const { user } = useAuth(); // 2. Use o hook para pegar os dados do usuário
  const [servicos, setServicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingService, setEditingService] = useState(null);

  // ... (toda a lógica de fetch, handleCreate, handleDelete, etc., continua a mesma)
  useEffect(() => {
    fetchServicos();
  }, []);

  const fetchServicos = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await api.get("/servicos", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setServicos(response.data);
    } catch (err) {
      setError("Não foi possível carregar os serviços.");
    } finally {
      setLoading(false);
    }
  };

  const handleServiceCreated = (novoServico) => {
    setServicos([novoServico, ...servicos]);
  };

  const handleDeleteService = async (servicoId) => {
    if (!window.confirm("Tem certeza que deseja deletar este serviço?")) return;
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/servicos/${servicoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setServicos(servicos.filter((servico) => servico.id !== servicoId));
    } catch (err) {
      setError("Erro ao deletar o serviço.");
    }
  };

  const handleServiceUpdated = (servicoAtualizado) => {
    setServicos(
      servicos.map((s) =>
        s.id === servicoAtualizado.id ? servicoAtualizado : s
      )
    );
  };

  if (loading) return <Loader />;
  if (error)
    return (
      <Alert color="red" title="Erro">
        {error}
      </Alert>
    );

  const rows = servicos.map((servico) => (
    <Table.Tr key={servico.id}>
      <Table.Td>{servico.nome_servico}</Table.Td>
      <Table.Td>{servico.duracao_minutos} min</Table.Td>
      <Table.Td>R$ {parseFloat(servico.preco).toFixed(2)}</Table.Td>

      {/* 3. Ações só são renderizadas se o usuário for 'dono' */}
      {user?.role === "dono" && (
        <Table.Td>
          <Group gap="sm">
            <Tooltip label="Editar Serviço">
              <ActionIcon
                variant="light"
                onClick={() => setEditingService(servico)}
              >
                <IconPencil size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Deletar Serviço">
              <ActionIcon
                variant="light"
                color="red"
                onClick={() => handleDeleteService(servico.id)}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Table.Td>
      )}
    </Table.Tr>
  ));

  return (
    <div>
      <Title order={2}>Gestão de Serviços</Title>

      {/* 4. Formulário só é renderizado se o usuário for 'dono' */}
      {user?.role === "dono" && (
        <CreateServiceForm onServiceCreated={handleServiceCreated} />
      )}

      <Title order={3} mt="xl" mb="md">
        Serviços Cadastrados
      </Title>

      <Table.ScrollContainer minWidth={500}>
        <Table striped withTableBorder withColumnBorders highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nome</Table.Th>
              <Table.Th>Duração</Table.Th>
              <Table.Th>Preço</Table.Th>
              {/* 5. Cabeçalho da coluna só aparece para o 'dono' */}
              {user?.role === "dono" && <Table.Th>Ações</Table.Th>}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      <EditServiceModal
        service={editingService}
        onClose={() => setEditingService(null)}
        onServiceUpdated={handleServiceUpdated}
      />
    </div>
  );
}

export default DashboardPage;
