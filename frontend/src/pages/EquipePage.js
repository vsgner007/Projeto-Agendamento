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
  Text,
} from "@mantine/core";
import { IconPencil, IconTrash, IconListDetails } from "@tabler/icons-react";
import AddFuncionarioModal from "../components/AddFuncionarioModal";
import EditFuncionarioModal from "../components/EditFuncionarioModal";
import GerenciarServicosModal from "../components/GerenciarServicosModal";
import useAuth from "../hooks/useAuth";

function EquipePage() {
  const { user } = useAuth();
  const [equipe, setEquipe] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingFuncionario, setEditingFuncionario] = useState(null);
  const [managingServicos, setManagingServicos] = useState(null);

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

  const handleFuncionarioAdded = (novoFuncionario) => {
    setEquipe((currentEquipe) => [...currentEquipe, novoFuncionario]);
  };

  const handleFuncionarioUpdated = (funcionarioAtualizado) => {
    setEquipe((currentEquipe) =>
      currentEquipe.map((func) =>
        func.id === funcionarioAtualizado.id ? funcionarioAtualizado : func
      )
    );
    setEditingFuncionario(null); // Fecha o modal
  };

  const handleDeleteFuncionario = async (id) => {
    if (
      !window.confirm("Tem certeza que deseja excluir este membro da equipe?")
    )
      return;
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/profissionais/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEquipe(equipe.filter((func) => func.id !== id));
    } catch (err) {
      setError("Erro ao excluir membro da equipe.");
    }
  };

  if (loading) return <Loader />;
  if (error)
    return (
      <Alert color="red" title="Erro">
        {error}
      </Alert>
    );

  const rows = equipe.map((func) => (
    <Table.Tr key={func.id}>
      <Table.Td>{func.nome}</Table.Td>
      <Table.Td>{func.email}</Table.Td>
      <Table.Td>{func.role}</Table.Td>
      {/* Célula da Nova Coluna "Especialidade" */}
      <Table.Td>{func.especialidade || "N/A"}</Table.Td>
      <Table.Td>
        <Group gap="sm">
          {func.role === "funcionario" && (
            <Tooltip label="Gerenciar Serviços">
              <ActionIcon
                variant="light"
                onClick={() => setManagingServicos(func)}
              >
                <IconListDetails size={16} />
              </ActionIcon>
            </Tooltip>
          )}
          <Tooltip label="Editar Membro">
            <ActionIcon
              variant="light"
              color="blue"
              onClick={() => setEditingFuncionario(func)}
            >
              <IconPencil size={16} />
            </ActionIcon>
          </Tooltip>
          {func.id !== user.id && (
            <Tooltip label="Excluir Membro">
              <ActionIcon
                variant="light"
                color="red"
                onClick={() => handleDeleteFuncionario(func.id)}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <div>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Gestão de Equipe</Title>
        <Button onClick={() => setIsAddModalOpen(true)}>
          Adicionar Membro
        </Button>
      </Group>

      <Table.ScrollContainer minWidth={800}>
        <Table striped withTableBorder withColumnBorders highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nome</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Papel</Table.Th>
              {/* Cabeçalho da Nova Coluna "Especialidade" */}
              <Table.Th>Especialidade</Table.Th>
              <Table.Th>Ações</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.length > 0 ? (
              rows
            ) : (
              <Table.Tr>
                <Table.Td colSpan={5} align="center">
                  <Text>Nenhum membro na equipe ainda.</Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      <AddFuncionarioModal
        opened={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onFuncionarioAdded={handleFuncionarioAdded}
      />
      <EditFuncionarioModal
        funcionario={editingFuncionario}
        onClose={() => setEditingFuncionario(null)}
        onFuncionarioUpdated={handleFuncionarioUpdated}
      />
      <GerenciarServicosModal
        funcionario={managingServicos}
        onClose={() => setManagingServicos(null)}
      />
    </div>
  );
}

export default EquipePage;
