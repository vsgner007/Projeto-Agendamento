import React, { useState, useEffect } from "react";
import api from "../api";
import {
  Title,
  Paper,
  Loader,
  Alert,
  Group,
  Select,
  Table,
  Text,
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

function RelatorioPage() {
  const [servicosRealizados, setServicosRealizados] = useState([]);
  const [faturamentoProfissionais, setFaturamentoProfissionais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(
    (new Date().getMonth() + 1).toString()
  );
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString()
  );

  useEffect(() => {
    const fetchRelatorios = async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");
        const params = { mes: selectedMonth, ano: selectedYear };
        const headers = { headers: { Authorization: `Bearer ${token}` } };

        // Busca os dois relatórios em paralelo para mais eficiência
        const [resServicos, resProfissionais] = await Promise.all([
          api.get("/relatorios/servicos-realizados", { params, ...headers }),
          api.get("/relatorios/faturamento-por-profissional", {
            params,
            ...headers,
          }),
        ]);

        setServicosRealizados(resServicos.data);
        setFaturamentoProfissionais(resProfissionais.data);
      } catch (err) {
        setError("Não foi possível carregar os relatórios.");
      } finally {
        setLoading(false);
      }
    };
    fetchRelatorios();
  }, [selectedMonth, selectedYear]);

  // Agrupa os serviços realizados por mês para exibição
  const servicosAgrupados = servicosRealizados.reduce((acc, servico) => {
    const data = new Date(servico.data_hora_inicio);
    const mesAno = `${
      data.toLocaleString("pt-BR", { month: "long" }).charAt(0).toUpperCase() +
      data.toLocaleString("pt-BR", { month: "long" }).slice(1)
    } de ${data.getFullYear()}`;
    if (!acc[mesAno]) {
      acc[mesAno] = {
        servicos: [],
        total: 0,
      };
    }
    acc[mesAno].servicos.push(servico);
    acc[mesAno].total += parseFloat(servico.preco);
    return acc;
  }, {});

  // Renderiza as linhas da nova tabela de faturamento por profissional
  const profissionalRows = faturamentoProfissionais.map((prof) => (
    <Table.Tr key={prof.profissional_id}>
      <Table.Td>{prof.nome_profissional}</Table.Td>
      <Table.Td>R$ {prof.faturamento_bruto}</Table.Td>
      <Table.Td>R$ {prof.valor_a_receber}</Table.Td>
    </Table.Tr>
  ));

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
      <Text c="dimmed">Acompanhe o desempenho do seu negócio mês a mês.</Text>

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

      <Paper withBorder shadow="sm" p="lg" mt="xl" radius="md">
        <Title order={4}>Faturamento por Profissional</Title>
        <Text size="sm" c="dimmed">
          Detalhes do faturamento bruto e o valor a ser repassado para cada
          profissional no período selecionado.
        </Text>
        <Table.ScrollContainer minWidth={500}>
          <Table striped withTableBorder mt="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Profissional</Table.Th>
                <Table.Th>Faturamento Bruto (R$)</Table.Th>
                <Table.Th>Repasse ao Profissional (R$)</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {profissionalRows.length > 0 ? (
                profissionalRows
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={3} align="center">
                    Nenhum faturamento encontrado para este período.
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      <Title order={3} mt="xl">
        Histórico de Serviços Concluídos
      </Title>
      {Object.keys(servicosAgrupados).length > 0 ? (
        Object.entries(servicosAgrupados).map(([mesAno, dados]) => (
          <Paper withBorder shadow="sm" p="lg" mt="md" radius="md" key={mesAno}>
            <Title order={4}>{mesAno}</Title>
            <Table.ScrollContainer minWidth={700}>
              <Table striped withTableBorder mt="md">
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
                  {dados.servicos.map((servico) => (
                    <Table.Tr key={servico.id}>
                      <Table.Td>
                        {new Date(servico.data_hora_inicio).toLocaleDateString(
                          "pt-BR"
                        )}
                      </Table.Td>
                      <Table.Td>{servico.nome_cliente}</Table.Td>
                      <Table.Td>{servico.nome_profissional}</Table.Td>
                      <Table.Td>{servico.nome_servico}</Table.Td>
                      <Table.Td>
                        {parseFloat(servico.preco).toFixed(2)}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
            <Group justify="flex-end" mt="md">
              <Text fw={500}>Total do Mês: R$ {dados.total.toFixed(2)}</Text>
            </Group>
          </Paper>
        ))
      ) : (
        <Text mt="md">
          Nenhum serviço concluído encontrado para este período.
        </Text>
      )}
    </div>
  );
}

export default RelatorioPage;
