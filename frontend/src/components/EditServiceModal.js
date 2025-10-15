import React, { useState, useEffect } from "react";
import api from "../api";
import {
  Modal,
  TextInput,
  NumberInput,
  Button,
  Group,
  Stack,
} from "@mantine/core";

const EditServiceModal = ({ service, onClose, onServiceUpdated }) => {
  const [nome, setNome] = useState("");
  const [duracao, setDuracao] = useState("");
  const [preco, setPreco] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (service) {
      setNome(service.nome_servico);
      setDuracao(service.duracao_minutos);
      setPreco(service.preco);
    }
  }, [service]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await api.put(
        `/servicos/${service.id}`,
        {
          nome_servico: nome,
          duracao_minutos: parseInt(duracao),
          preco: parseFloat(preco),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onServiceUpdated(response.data);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={!!service} onClose={onClose} title="Editar Serviço" centered>
      <form onSubmit={handleSubmit}>
        <Stack>
          <TextInput
            label="Nome do Serviço"
            value={nome}
            onChange={(e) => setNome(e.currentTarget.value)}
            required
          />
          <NumberInput
            label="Duração (minutos)"
            value={duracao}
            onChange={setDuracao}
            required
            min={0}
          />
          <NumberInput
            label="Preço (R$)"
            value={preco}
            onChange={setPreco}
            precision={2}
            step={0.5}
            required
            min={0}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Salvar Alterações
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};

export default EditServiceModal;
