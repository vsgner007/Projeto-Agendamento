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
import useAuth from "../hooks/useAuth";

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

function RelatorioPage() {
  const { user } = useAuth();
  const [servicosRealizados, setServicosRealizados] = useState([]);
  const [totalDoPeriodo, setTotalDoPeriodo] = useState(0);
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
          `http://localhost:3001/relatorios/servicos-realizados?mes=${selectedMonth}&ano=${selectedYear}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setServicosRealizados(response.data);

        const total = response.data.reduce(
          (acc, servico) => acc + parseFloat(servico.preco),
          0
        );
        setTotalDoPeriodo(total);
      } catch (err) {
        setError("Não foi possível carregar o relatório para este período.");
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

  const rows = servicosRealizados.map((servico) => (
    <Table.Tr key={servico.id}>
      <Table.Td>
        {new Date(servico.data_hora_inicio).toLocaleDateString("pt-BR")}
      </Table.Td>
      <Table.Td>{servico.nome_cliente}</Table.Td>
      <Table.Td>{servico.nome_profissional}</Table.Td>
      <Table.Td>{servico.nome_servico}</Table.Td>
      <Table.Td>{parseFloat(servico.preco).toFixed(2)}</Table.Td>
    </Table.Tr>
  ));

  return (
    <div>
      <Title order={2}>Relatório Financeiro</Title>
      <p>
        Filtre os serviços concluídos por período para analisar seu faturamento.
      </p>

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
          <Table.ScrollContainer minWidth={800}>
            <Table striped withTableBorder withColumnBorders mt="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Data</Table.Th>
                  <Table.Th>Cliente</Table.Th>
                  <Table.Th>Profissional</Table.Th>
                  <Table.Th>Serviço(s)</Table.Th>
                  <Table.Th>Valor (R$)</Table.Th>
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
          <Title order={5} mt="md" style={{ textAlign: "right" }}>
            Total do Período: R$ {totalDoPeriodo.toFixed(2)}
          </Title>
        </Paper>
      )}
    </div>
  );
}

export default RelatorioPage;
