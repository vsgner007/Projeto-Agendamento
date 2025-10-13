// frontend/src/components/EditFuncionarioModal.js
import React, { useState, useEffect } from "react";
import api from "../api";
import {
  Modal,
  Button,
  Group,
  Select,
  TextInput,
  Stack,
  Alert,
} from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";

const EditFuncionarioModal = ({
  funcionario,
  onClose,
  onFuncionarioUpdated,
}) => {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("funcionario");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Preenche o formulário com os dados do funcionário quando o modal abre
  useEffect(() => {
    if (funcionario) {
      setNome(funcionario.nome);
      setEmail(funcionario.email);
      setRole(funcionario.role);
    }
  }, [funcionario]);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await api.put(
        `/profissionais/${funcionario.id}`,
        { nome, email, role },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onFuncionarioUpdated(response.data);
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Não foi possível atualizar o funcionário."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!funcionario) return null;

  return (
    <Modal
      opened={!!funcionario}
      onClose={onClose}
      title={`Editar Membro: ${funcionario.nome}`}
      centered
    >
      <Stack>
        <TextInput
          label="Nome Completo"
          value={nome}
          onChange={(e) => setNome(e.currentTarget.value)}
          required
        />
        <TextInput
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
          required
        />
        <Select
          label="Papel (Permissão)"
          data={[
            { value: "funcionario", label: "Funcionário" },
            { value: "dono", label: "Dono" },
          ]}
          value={role}
          onChange={setRole}
          required
        />
        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" title="Erro">
            {error}
          </Alert>
        )}
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Salvar Alterações
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default EditFuncionarioModal;
