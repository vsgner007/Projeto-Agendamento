// frontend/src/components/CreateServiceForm.js
import React, { useState } from "react";
import axios from "axios";
import {
  TextInput,
  NumberInput,
  Button,
  Paper,
  Title,
  Group,
  Alert,
} from "@mantine/core";
import { IconCheck, IconAlertCircle } from "@tabler/icons-react";

const CreateServiceForm = ({ onServiceCreated }) => {
  const [nome, setNome] = useState("");
  const [duracao, setDuracao] = useState("");
  const [preco, setPreco] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:3001/servicos",
        {
          nome_servico: nome,
          duracao_minutos: parseInt(duracao),
          preco: parseFloat(preco),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setNome("");
      setDuracao("");
      setPreco("");
      setSuccess("Serviço cadastrado com sucesso!");
      onServiceCreated(response.data);
    } catch (err) {
      setError("Erro ao cadastrar serviço. Verifique os dados.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper withBorder shadow="sm" p="lg" mt="md" radius="md">
      <Title order={4}>Cadastrar Novo Serviço</Title>
      <form onSubmit={handleSubmit} style={{ marginTop: "20px" }}>
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
          required
          mt="md"
        />
        <NumberInput
          label="Preço (R$)"
          placeholder="Ex: 50.00"
          value={preco}
          onChange={setPreco}
          precision={2}
          step={0.5}
          required
          mt="md"
        />
        <Button type="submit" mt="lg" loading={loading}>
          Cadastrar Serviço
        </Button>
        {error && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Erro"
            color="red"
            mt="md"
          >
            {error}
          </Alert>
        )}
        {success && (
          <Alert
            icon={<IconCheck size={16} />}
            title="Sucesso"
            color="green"
            mt="md"
          >
            {success}
          </Alert>
        )}
      </form>
    </Paper>
  );
};

export default CreateServiceForm;
