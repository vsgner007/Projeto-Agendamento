import React, { useState, useEffect } from "react";
import axios from "axios";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Pie } from "react-chartjs-2";
import {
  Title,
  Paper,
  Loader,
  Alert,
  Center,
  Text,
  Group,
  Select,
} from "@mantine/core";
import useAuth from "../hooks/useAuth";

ChartJS.register(ArcElement, Tooltip, Legend);

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

function AnalyticsPage() {
  const { user } = useAuth();
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Estados para os filtros
  const [selectedMonth, setSelectedMonth] = useState(
    (new Date().getMonth() + 1).toString()
  );
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString()
  );
  const [profissionais, setProfissionais] = useState([]);
  const [selectedProfissionalId, setSelectedProfissionalId] = useState("todos");

  // Busca a lista de profissionais para o filtro
  useEffect(() => {
    const fetchEquipe = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          "http://localhost:3001/profissionais",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const equipeCompleta = [
          { id: user.id, nome: user.nome },
          ...response.data,
        ];
        const formattedProfissionais = equipeCompleta.map((p) => ({
          value: p.id,
          label: p.nome,
        }));
        setProfissionais([
          { value: "todos", label: "Todos os Profissionais" },
          ...formattedProfissionais,
        ]);
      } catch (err) {
        console.error("Erro ao buscar equipe para filtro", err);
      }
    };
    if (user?.role === "dono") fetchEquipe();
  }, [user]);

  // useEffect que busca os dados do gráfico, agora depende de todos os filtros
  useEffect(() => {
    if (!selectedMonth || !selectedYear) return;

    const fetchChartData = async () => {
      setLoading(true);
      setError("");
      setChartData(null);
      try {
        const token = localStorage.getItem("token");
        let url = `http://localhost:3001/relatorios/faturamento-por-servico?mes=${selectedMonth}&ano=${selectedYear}`;

        if (selectedProfissionalId && selectedProfissionalId !== "todos") {
          url += `&profissionalId=${selectedProfissionalId}`;
        }

        const response = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const dataFromApi = response.data;
        if (dataFromApi.length > 0) {
          setChartData({
            labels: dataFromApi.map((d) => d.nome_servico),
            datasets: [
              {
                label: "Faturamento R$",
                data: dataFromApi.map((d) => parseFloat(d.faturamento_total)),
                backgroundColor: [
                  "rgba(54, 162, 235, 0.6)",
                  "rgba(255, 99, 132, 0.6)",
                  "rgba(255, 206, 86, 0.6)",
                  "rgba(75, 192, 192, 0.6)",
                  "rgba(153, 102, 255, 0.6)",
                  "rgba(255, 159, 64, 0.6)",
                ],
                borderWidth: 1,
              },
            ],
          });
        }
      } catch (err) {
        setError(
          "Não foi possível carregar os dados do gráfico para este período."
        );
      } finally {
        setLoading(false);
      }
    };
    fetchChartData();
  }, [selectedMonth, selectedYear, selectedProfissionalId]);

  const monthLabel =
    monthOptions.find((m) => m.value === selectedMonth)?.label || "";
  const profissionalLabel =
    profissionais.find((p) => p.value === selectedProfissionalId)?.label || "";

  return (
    <div>
      <Title order={2} mb="lg">
        Análises de Faturamento
      </Title>
      <Paper withBorder shadow="sm" p="lg" radius="md">
        <Group>
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
          <Select
            label="Profissional"
            data={profissionais}
            value={selectedProfissionalId}
            onChange={setSelectedProfissionalId}
          />
        </Group>

        <Title order={4} mt="xl">
          Faturamento por Serviço ({profissionalLabel} em {monthLabel} de{" "}
          {selectedYear})
        </Title>

        {loading ? (
          <Center mt="md">
            <Loader />
          </Center>
        ) : chartData ? (
          <Center
            style={{ maxWidth: "400px", margin: "auto", marginTop: "20px" }}
          >
            <Pie data={chartData} />
          </Center>
        ) : (
          <Text mt="md">
            Nenhum serviço concluído encontrado para este período.
          </Text>
        )}
      </Paper>
      {error && (
        <Alert color="red" title="Erro" mt="md">
          {error}
        </Alert>
      )}
    </div>
  );
}

export default AnalyticsPage;
