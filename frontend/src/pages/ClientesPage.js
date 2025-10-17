import React, { useState, useEffect } from "react";
import api from "../api";
import {
  Title,
  Table,
  Loader,
  Alert,
  Paper,
  Text,
  Group,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { IconUsers, IconPencil } from "@tabler/icons-react";
import EditClienteModal from "../components/EditClienteModal"; // 1. Importa o novo modal

function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingCliente, setEditingCliente] = useState(null); // 2. Estado para controlar o modal

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await api.get("/clientes", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setClientes(response.data);
      } catch (err) {
        setError("Não foi possível carregar a lista de clientes.");
      } finally {
        setLoading(false);
      }
    };
    fetchClientes();
  }, []);

  // 3. Função para atualizar a lista no frontend após a edição
  const handleClienteUpdated = (clienteAtualizado) => {
    setClientes(
      clientes.map((c) =>
        c.id === clienteAtualizado.id ? clienteAtualizado : c
      )
    );
    setEditingCliente(null); // Fecha o modal
  };

  if (loading) return <Loader />;
  if (error)
    return (
      <Alert color="red" title="Erro">
        {error}
      </Alert>
    );

  const rows = clientes.map((cliente) => (
    <Table.Tr key={cliente.id}>
      <Table.Td>{cliente.nome_cliente}</Table.Td>
      <Table.Td>{cliente.email_contato}</Table.Td>
      <Table.Td>{cliente.telefone_contato}</Table.Td>
      {/* 4. Adiciona a coluna de Ações */}
      <Table.Td>
        <Tooltip label="Editar Cliente">
          <ActionIcon
            variant="light"
            onClick={() => setEditingCliente(cliente)}
          >
            <IconPencil size={16} />
          </ActionIcon>
        </Tooltip>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <div>
      <Title order={2} mb="lg">
        Gestão de Clientes
      </Title>
      <Text c="dimmed" mb="xl">
        Aqui está a lista de todos os clientes que já realizaram pelo menos um
        agendamento.
      </Text>
      <Paper withBorder shadow="sm" radius="md">
        <Table.ScrollContainer minWidth={600}>
          <Table striped withTableBorder highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nome</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Telefone</Table.Th>
                <Table.Th>Ações</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.length > 0 ? (
                rows
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={4} align="center">
                    <Group justify="center" p="lg">
                      <IconUsers size={24} />
                      <Text>Nenhum cliente encontrado.</Text>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      {/* 5. Renderiza o modal */}
      <EditClienteModal
        cliente={editingCliente}
        onClose={() => setEditingCliente(null)}
        onClienteUpdated={handleClienteUpdated}
      />
    </div>
  );
}

export default ClientesPage;
