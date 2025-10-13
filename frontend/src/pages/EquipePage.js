import React, { useState, useEffect } from "react";
import api from "../api";
import {
  Title,
  Table,
  Button,
  Group,
  Loader,
  Alert,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { IconTrash, IconPencil, IconLicense } from "@tabler/icons-react";
import AddFuncionarioModal from "../components/AddFuncionarioModal";
import GerenciarServicosModal from "../components/GerenciarServicosModal";
import EditFuncionarioModal from "../components/EditFuncionarioModal";

function EquipePage() {
  const [equipe, setEquipe] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [managingFuncionario, setManagingFuncionario] = useState(null);
  const [editingFuncionario, setEditingFuncionario] = useState(null);

  const fetchEquipe = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await api.get("/profissionais", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEquipe(response.data);
    } catch (err) {
      setError("Não foi possível carregar a equipe.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipe();
  }, []);

  const handleFuncionarioCreated = () => {
    fetchEquipe(); // Busca a lista atualizada após criar um novo
  };

  const handleFuncionarioUpdated = (funcionarioAtualizado) => {
    // Atualiza a lista na tela sem precisar buscar novamente na API
    setEquipe(
      equipe.map((m) =>
        m.id === funcionarioAtualizado.id ? funcionarioAtualizado : m
      )
    );
  };

  const handleDeleteFuncionario = async (funcionarioId) => {
    if (
      !window.confirm(
        "Atenção: deletar um profissional também removerá todos os seus agendamentos associados. Deseja continuar?"
      )
    )
      return;
    try {
      setError("");
      const token = localStorage.getItem("token");
      await api.delete(`/profissionais/${funcionarioId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Remove o funcionário da lista na tela instantaneamente
      setEquipe(equipe.filter((m) => m.id !== funcionarioId));
    } catch (err) {
      setError("Erro ao deletar funcionário.");
    }
  };

  if (loading) return <Loader />;
  if (error)
    return (
      <Alert color="red" title="Erro">
        {error}
      </Alert>
    );

  const rows = equipe.map((membro) => (
    <Table.Tr key={membro.id}>
      <Table.Td>{membro.nome}</Table.Td>
      <Table.Td>{membro.email}</Table.Td>
      <Table.Td>{membro.role}</Table.Td>
      <Table.Td>
        <Group gap="sm">
          <Tooltip label="Gerenciar Serviços">
            <ActionIcon
              variant="light"
              color="teal"
              onClick={() => setManagingFuncionario(membro)}
            >
              <IconLicense size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Editar Funcionário">
            <ActionIcon
              variant="light"
              onClick={() => setEditingFuncionario(membro)}
            >
              <IconPencil size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Deletar Funcionário">
            <ActionIcon
              variant="light"
              color="red"
              onClick={() => handleDeleteFuncionario(membro.id)}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <div>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Gestão de Equipe</Title>
        <Button onClick={() => setIsAddModalOpen(true)}>
          Adicionar Funcionário
        </Button>
      </Group>

      <Table.ScrollContainer minWidth={600}>
        <Table striped withTableBorder highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nome</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Papel</Table.Th>
              <Table.Th>Ações</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.length > 0 ? (
              rows
            ) : (
              <Table.Tr>
                <Table.Td colSpan={4} align="center">
                  Nenhum funcionário cadastrado.
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      <AddFuncionarioModal
        opened={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onFuncionarioCreated={handleFuncionarioCreated}
      />

      <GerenciarServicosModal
        funcionario={managingFuncionario}
        onClose={() => setManagingFuncionario(null)}
      />

      <EditFuncionarioModal
        funcionario={editingFuncionario}
        onClose={() => setEditingFuncionario(null)}
        onFuncionarioUpdated={handleFuncionarioUpdated}
      />
    </div>
  );
}

export default EquipePage;
