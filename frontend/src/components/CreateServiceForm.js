import React, { useState } from "react";
import api from "../api"; // CORREÇÃO: Usa a instância centralizada da API
import {
  TextInput,
  Button,
  Paper,
  Title,
  NumberInput,
  Group,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck } from "@tabler/icons-react";

const CreateServiceForm = ({ onServiceCreated }) => {
  const [nome, setNome] = useState("");
  const [duracao, setDuracao] = useState(30);
  const [preco, setPreco] = useState(50.0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await api.post(
        "/servicos",
        {
          // CORREÇÃO: Usa 'api' e a URL relativa
          nome_servico: nome,
          duracao_minutos: duracao,
          preco: preco,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      notifications.show({
        title: "Sucesso!",
        message: "O novo serviço foi cadastrado.",
        color: "green",
        icon: <IconCheck />,
      });

      onServiceCreated(response.data);
      setNome("");
      setDuracao(30);
      setPreco(50.0);
    } catch (err) {
      setError("Erro ao cadastrar serviço. Verifique os dados.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper withBorder shadow="sm" p="lg" mt="lg" radius="md">
      <Title order={4}>Cadastrar Novo Serviço</Title>
      <form onSubmit={handleSubmit}>
        <Group grow align="flex-end" mt="md">
          <TextInput
            label="Nome do Serviço"
            placeholder="Ex: Corte Masculino"
            value={nome}
            onChange={(e) => setNome(e.currentTarget.value)}
            required
          />
          <NumberInput
            label="Duração (minutos)"
            placeholder="Ex: 30"
            value={duracao}
            onChange={setDuracao}
            min={5}
            step={5}
            required
          />
          <NumberInput
            label="Preço (R$)"
            placeholder="Ex: 50.00"
            value={preco}
            onChange={setPreco}
            decimalScale={2}
            fixedDecimalScale
            min={0}
            step={5}
            required
          />
          <Button type="submit" loading={loading}>
            Cadastrar Serviço
          </Button>
        </Group>
        {error && (
          <Text c="red" size="sm" mt="sm">
            {error}
          </Text>
        )}
      </form>
    </Paper>
  );
};

export default CreateServiceForm;
