import React, { useState, useEffect } from "react";
import api from "../api";
import {
  Title,
  Paper,
  Loader,
  Alert,
  Group,
  Text,
  Switch,
  Button,
  NumberInput,
  Stack,
} from "@mantine/core";
import { TimeInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { IconCheck } from "@tabler/icons-react";

const diasDaSemana = [
  { key: "seg", label: "Segunda-feira" },
  { key: "ter", label: "Terça-feira" },
  { key: "qua", label: "Quarta-feira" },
  { key: "qui", label: "Quinta-feira" },
  { key: "sex", label: "Sexta-feira" },
  { key: "sab", label: "Sábado" },
  { key: "dom", label: "Domingo" },
];

function ConfiguracoesPage() {
  const [horarios, setHorarios] = useState(null);
  const [comissao, setComissao] = useState(0); // Novo estado para a comissão
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchConfiguracoes = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await api.get("/configuracoes", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setHorarios(response.data.horarios);
        setComissao(response.data.comissao); // Salva a comissão no estado
      } catch (err) {
        setError("Não foi possível carregar as configurações.");
      } finally {
        setLoading(false);
      }
    };
    fetchConfiguracoes();
  }, []);

  const handleTimeChange = (dia, tipo, valor) => {
    const horarioDia = horarios[dia] || "00:00-00:00";
    let [inicio, fim] = horarioDia.split("-");
    if (tipo === "inicio") {
      inicio = valor;
    } else {
      fim = valor;
    }
    setHorarios((prev) => ({ ...prev, [dia]: `${inicio}-${fim}` }));
  };

  const handleFolgaToggle = (dia, isFolga) => {
    if (isFolga) {
      setHorarios((prev) => ({ ...prev, [dia]: null }));
    } else {
      setHorarios((prev) => ({ ...prev, [dia]: "09:00-18:00" }));
    }
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      // Agora envia ambos, horários e comissão
      await axios.put(
        "http://localhost:3001/configuracoes",
        { horarios, comissao: parseInt(comissao) },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      notifications.show({
        title: "Sucesso!",
        message: "Suas configurações foram salvas.",
        color: "green",
        icon: <IconCheck />,
      });
    } catch (err) {
      setError("Não foi possível salvar as alterações.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;
  if (error)
    return (
      <Alert color="red" title="Erro">
        {error}
      </Alert>
    );

  return (
    <div>
      <Title order={2} mb="lg">
        Configurações Gerais
      </Title>

      <Paper withBorder shadow="sm" p="lg" radius="md" mt="xl">
        <Title order={4}>Comissão da Filial</Title>
        <Text size="sm" c="dimmed" mb="md">
          Defina a porcentagem que o salão retém dos serviços realizados por
          funcionários.
        </Text>
        <NumberInput
          label="Comissão do Salão (%)"
          value={comissao}
          onChange={setComissao}
          min={0}
          max={100}
          step={5}
        />
      </Paper>

      <Paper withBorder shadow="sm" p="lg" radius="md" mt="xl">
        <Title order={4}>Horários de Trabalho</Title>
        <Text size="sm" c="dimmed" mb="md">
          Defina os horários de funcionamento. Isso afetará os horários
          disponíveis para agendamento para todos os profissionais.
        </Text>
        {horarios &&
          diasDaSemana.map(({ key, label }) => {
            const horarioDoDia = horarios[key];
            const isFolga = horarioDoDia === null;
            const [inicio, fim] = isFolga
              ? ["09:00", "18:00"]
              : horarioDoDia.split("-");
            return (
              <Group
                key={key}
                justify="space-between"
                mt="md"
                p="sm"
                style={{ border: "1px solid #e9ecef", borderRadius: "4px" }}
              >
                <Text fw={500}>{label}</Text>
                <Group>
                  <Switch
                    label={isFolga ? "Folga" : "Trabalha"}
                    checked={!isFolga}
                    onChange={(event) =>
                      handleFolgaToggle(key, !event.currentTarget.checked)
                    }
                  />
                  <TimeInput
                    label="Início"
                    value={inicio}
                    onChange={(e) =>
                      handleTimeChange(key, "inicio", e.currentTarget.value)
                    }
                    disabled={isFolga}
                  />
                  <TimeInput
                    label="Fim"
                    value={fim}
                    onChange={(e) =>
                      handleTimeChange(key, "fim", e.currentTarget.value)
                    }
                    disabled={isFolga}
                  />
                </Group>
              </Group>
            );
          })}
      </Paper>

      <Group justify="flex-end" mt="xl">
        <Button onClick={handleSaveChanges} loading={saving} size="md">
          Salvar Todas as Alterações
        </Button>
      </Group>
    </div>
  );
}

export default ConfiguracoesPage;
