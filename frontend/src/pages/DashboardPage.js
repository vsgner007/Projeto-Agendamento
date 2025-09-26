// frontend/src/pages/DashboardPage.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Title, Table, Button, Group, Loader, Alert } from "@mantine/core";
import CreateServiceForm from "../components/CreateServiceForm";
import EditServiceModal from "../components/EditServiceModal";

function DashboardPage() {
  const [servicos, setServicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingService, setEditingService] = useState(null);

  useEffect(() => {
    fetchServicos();
  }, []);

  const fetchServicos = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:3001/servicos", {
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
      await axios.delete(`http://localhost:3001/servicos/${servicoId}`, {
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
      <Table.Td>
        <Group>
          <Button
            variant="light"
            size="xs"
            onClick={() => setEditingService(servico)}
          >
            Editar
          </Button>
          <Button
            variant="light"
            color="red"
            size="xs"
            onClick={() => handleDeleteService(servico.id)}
          >
            Deletar
          </Button>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <div>
      <Title order={2}>Gestão de Serviços</Title>

      <CreateServiceForm onServiceCreated={handleServiceCreated} />

      <Title order={3} mt="xl" mb="md">
        Seus Serviços Cadastrados
      </Title>

      <Table striped withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Nome</Table.Th>
            <Table.Th>Duração</Table.Th>
            <Table.Th>Preço</Table.Th>
            <Table.Th>Ações</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>

      <EditServiceModal
        service={editingService}
        onClose={() => setEditingService(null)}
        onServiceUpdated={handleServiceUpdated}
      />
    </div>
  );
}

export default DashboardPage;
