import React, { useState, useEffect } from "react";
import api from "../api";
import {
  Modal,
  Text,
  Loader,
  Alert,
  List,
  ActionIcon,
  Group,
  Tooltip,
} from "@mantine/core"; // Linha corrigida
import { IconCirclePlus, IconCircleMinus } from "@tabler/icons-react";

const GerenciarServicosModal = ({ funcionario, onClose }) => {
  const [todosServicos, setTodosServicos] = useState([]);
  const [servicosAssociados, setServicosAssociados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (funcionario) {
      const fetchData = async () => {
        setLoading(true);
        setError("");
        const token = localStorage.getItem("token");
        try {
          const resTodosServicos = await api.get("/servicos", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const resServicosAssociados = await api.get(
            `/profissionais/${funcionario.id}/servicos`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          setTodosServicos(resTodosServicos.data);
          setServicosAssociados(resServicosAssociados.data);
        } catch (err) {
          setError("Não foi possível carregar os dados.");
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [funcionario]);

  const handleAssociar = async (servicoId) => {
    const token = localStorage.getItem("token");
    try {
      await api.post(
        `/profissionais/${funcionario.id}/servicos`,
        { servico_id: servicoId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const servicoAdicionado = todosServicos.find((s) => s.id === servicoId);
      setServicosAssociados([...servicosAssociados, servicoAdicionado]);
    } catch (err) {
      console.error("Erro ao associar serviço", err);
    }
  };

  const handleDesassociar = async (servicoId) => {
    const token = localStorage.getItem("token");
    try {
      await api.delete(
        `/profissionais/${funcionario.id}/servicos/${servicoId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setServicosAssociados(
        servicosAssociados.filter((s) => s.id !== servicoId)
      );
    } catch (err) {
      console.error("Erro ao desassociar serviço", err);
    }
  };

  const servicosDisponiveis = todosServicos.filter(
    (servicoGeral) =>
      !servicosAssociados.some(
        (servicoAssociado) => servicoAssociado.id === servicoGeral.id
      )
  );

  return (
    <Modal
      opened={!!funcionario}
      onClose={onClose}
      title={`Gerenciar Serviços de ${funcionario?.nome}`}
      size="lg"
      centered
    >
      {loading && <Loader />}
      {error && <Alert color="red">{error}</Alert>}
      {!loading && !error && (
        <Group align="flex-start">
          <div style={{ flex: 1 }}>
            <Text fw={500}>Serviços Realizados</Text>
            <List spacing="xs" size="sm" mt="sm">
              {servicosAssociados.map((servico) => (
                <List.Item
                  key={servico.id}
                  icon={
                    <Tooltip label="Desassociar">
                      <ActionIcon
                        color="red"
                        size="sm"
                        variant="light"
                        onClick={() => handleDesassociar(servico.id)}
                      >
                        <IconCircleMinus size={16} />
                      </ActionIcon>
                    </Tooltip>
                  }
                >
                  {servico.nome_servico}
                </List.Item>
              ))}
              {servicosAssociados.length === 0 && (
                <Text c="dimmed" size="sm">
                  Nenhum serviço associado.
                </Text>
              )}
            </List>
          </div>

          <div style={{ flex: 1 }}>
            <Text fw={500}>Serviços Disponíveis</Text>
            <List spacing="xs" size="sm" mt="sm">
              {servicosDisponiveis.map((servico) => (
                <List.Item
                  key={servico.id}
                  icon={
                    <Tooltip label="Associar">
                      <ActionIcon
                        color="blue"
                        size="sm"
                        variant="light"
                        onClick={() => handleAssociar(servico.id)}
                      >
                        <IconCirclePlus size={16} />
                      </ActionIcon>
                    </Tooltip>
                  }
                >
                  {servico.nome_servico}
                </List.Item>
              ))}
              {servicosDisponiveis.length === 0 && (
                <Text c="dimmed" size="sm">
                  Todos os serviços já foram associados.
                </Text>
              )}
            </List>
          </div>
        </Group>
      )}
    </Modal>
  );
};

export default GerenciarServicosModal;
