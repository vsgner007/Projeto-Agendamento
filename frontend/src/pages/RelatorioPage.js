// frontend/src/pages/RelatorioPage.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Title, Table, Paper, Loader, Alert } from "@mantine/core";

function RelatorioPage() {
  const [relatorioData, setRelatorioData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchRelatorio = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          "http://localhost:3001/relatorios/servicos-realizados",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const groupedData = response.data.reduce((acc, servico) => {
          const data = new Date(servico.data_hora_inicio);
          const monthYear = data.toLocaleString("pt-BR", {
            month: "long",
            year: "numeric",
          });
          if (!acc[monthYear]) {
            acc[monthYear] = { servicos: [], total: 0 };
          }
          acc[monthYear].servicos.push(servico);
          acc[monthYear].total += parseFloat(servico.preco);
          return acc;
        }, {});

        setRelatorioData(groupedData);
      } catch (err) {
        setError("Não foi possível carregar o relatório.");
      } finally {
        setLoading(false);
      }
    };
    fetchRelatorio();
  }, []);

  if (loading) return <Loader />;
  if (error)
    return (
      <Alert color="red" title="Erro">
        {error}
      </Alert>
    );

  return (
    <div>
      <Title order={2}>Relatório Financeiro</Title>
      <p>
        Aqui estão todos os serviços marcados como "concluído", agrupados por
        mês.
      </p>

      {Object.keys(relatorioData).length > 0 ? (
        Object.keys(relatorioData).map((mes) => (
          <Paper withBorder shadow="sm" p="lg" mt="xl" radius="md" key={mes}>
            <Title order={4}>
              {mes.charAt(0).toUpperCase() + mes.slice(1)}
            </Title>
            <Table striped withTableBorder withColumnBorders mt="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Data</Table.Th>
                  <Table.Th>Cliente</Table.Th>
                  <Table.Th>Serviço</Table.Th>
                  <Table.Th>Valor (R$)</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {relatorioData[mes].servicos.map((servico) => (
                  <Table.Tr key={servico.id}>
                    <Table.Td>
                      {new Date(servico.data_hora_inicio).toLocaleDateString(
                        "pt-BR"
                      )}
                    </Table.Td>
                    <Table.Td>{servico.nome_cliente}</Table.Td>
                    <Table.Td>{servico.nome_servico}</Table.Td>
                    <Table.Td>{parseFloat(servico.preco).toFixed(2)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
            <Title order={5} mt="md" style={{ textAlign: "right" }}>
              Total do Mês: R$ {relatorioData[mes].total.toFixed(2)}
            </Title>
          </Paper>
        ))
      ) : (
        <Paper withBorder p="lg" mt="md">
          <p>Nenhum serviço concluído encontrado para gerar o relatório.</p>
        </Paper>
      )}
    </div>
  );
}

export default RelatorioPage;
