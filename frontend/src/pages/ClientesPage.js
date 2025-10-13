import React, { useState, useEffect } from "react";
import api from "../api";
import { Title, Table, Loader, Alert, Paper, Text, Group } from "@mantine/core"; // 'Group' foi adicionado aqui
import { IconUsers } from "@tabler/icons-react";

function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await api.get("/clientes", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setClientes(response.data);
      } catch (err) {
        setError("Não foi possível carregar la lista de clientes.");
        console.error("Erro ao buscar clientes:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchClientes();
  }, []);

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
        <Table.ScrollContainer minWidth={500}>
          <Table striped withTableBorder highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nome</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Telefone</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.length > 0 ? (
                rows
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={3} align="center">
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
    </div>
  );
}

export default ClientesPage;
