import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Title,
  Table,
  Paper,
  Loader,
  Alert,
  Group,
  Select,
  Text,
  Center,
} from "@mantine/core";

const getYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear; i >= currentYear - 5; i--) {
    years.push({ value: i.toString(), label: i.toString() });
  }
  return years;
};

const monthOptions = [
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

function MeuFaturamentoPage() {
  const [relatorio, setRelatorio] = useState([]);
  const [comissao, setComissao] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(
    (new Date().getMonth() + 1).toString()
  );
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString()
  );

  useEffect(() => {
    const fetchRelatorio = async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `http://localhost:3001/profissionais/meu-relatorio-financeiro?mes=${selectedMonth}&ano=${selectedYear}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setRelatorio(response.data.relatorio);
        setComissao(response.data.comissao);
      } catch (err) {
        setError("Não foi possível carregar seu relatório financeiro.");
      } finally {
        setLoading(false);
      }
    };
    fetchRelatorio();
  }, [selectedMonth, selectedYear]);

  if (error)
    return (
      <Alert color="red" title="Erro">
        {error}
      </Alert>
    );

  const monthLabel =
    monthOptions.find((m) => m.value === selectedMonth)?.label || "";

  const totalBruto = relatorio.reduce(
    (acc, item) => acc + parseFloat(item.preco_total),
    0
  );
  const totalLiquido = relatorio.reduce(
    (acc, item) => acc + parseFloat(item.valor_a_receber),
    0
  );

  const rows = relatorio.map((item) => (
    <Table.Tr key={item.id}>
      <Table.Td>
        {new Date(item.data_hora_inicio).toLocaleDateString("pt-BR")}
      </Table.Td>
      <Table.Td>{item.nome_cliente}</Table.Td>
      <Table.Td>{item.nome_servico}</Table.Td>
      <Table.Td>R$ {parseFloat(item.preco_total).toFixed(2)}</Table.Td>
      <Table.Td>R$ {parseFloat(item.valor_a_receber).toFixed(2)}</Table.Td>
    </Table.Tr>
  ));

  return (
    <div>
      <Title order={2}>Meu Relatório Financeiro</Title>
      <Text c="dimmed">Veja seus ganhos com base nos serviços concluídos.</Text>

      <Paper withBorder p="md" mt="md" radius="md">
        <Group grow>
          <Select
            label="Mês"
            data={monthOptions}
            value={selectedMonth}
            onChange={setSelectedMonth}
          />
          <Select
            label="Ano"
            data={getYearOptions()}
            value={selectedYear}
            onChange={setSelectedYear}
          />
        </Group>
      </Paper>

      {loading ? (
        <Center mt="xl">
          <Loader />
        </Center>
      ) : (
        <Paper withBorder shadow="sm" p="lg" mt="xl" radius="md">
          <Title order={4}>
            Serviços Concluídos em {monthLabel} de {selectedYear}
          </Title>
          <Text size="sm" c="dimmed">
            A comissão do salão para este período é de {comissao}%.
          </Text>
          <Table.ScrollContainer minWidth={700}>
            <Table striped withTableBorder withColumnBorders mt="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Data</Table.Th>
                  <Table.Th>Cliente</Table.Th>
                  <Table.Th>Serviço(s)</Table.Th>
                  <Table.Th>Valor Total (R$)</Table.Th>
                  <Table.Th>Seu Valor (R$)</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.length > 0 ? (
                  rows
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={5} align="center">
                      Nenhum serviço concluído encontrado neste período.
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          <Group justify="flex-end" mt="md">
            <Text fw={500}>
              Total Faturado (Bruto): R$ {totalBruto.toFixed(2)}
            </Text>
            <Title order={4}>
              Total a Receber (Líquido): R$ {totalLiquido.toFixed(2)}
            </Title>
          </Group>
        </Paper>
      )}
    </div>
  );
}

export default MeuFaturamentoPage;
