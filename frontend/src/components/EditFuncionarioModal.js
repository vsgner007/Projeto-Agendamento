import React, { useState, useEffect } from "react";
import api from "../api";
import { Modal, Button, TextInput, Select, Stack, Alert } from "@mantine/core";

const EditFuncionarioModal = ({
  funcionario,
  onClose,
  onFuncionarioUpdated,
}) => {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("funcionario");
  const [especialidade, setEspecialidade] = useState(""); // Novo estado
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (funcionario) {
      setNome(funcionario.nome);
      setEmail(funcionario.email);
      setRole(funcionario.role);
      setEspecialidade(funcionario.especialidade || ""); // Preenche o campo
      setError("");
    }
  }, [funcionario]);

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await api.put(
        `/profissionais/${funcionario.id}`,
        {
          nome,
          email,
          role,
          especialidade, // Envia a atualização
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      onFuncionarioUpdated(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message || "Não foi possível salvar as alterações."
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
      title="Editar Membro da Equipe"
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
          type="email"
        />

        <TextInput
          label="Especialidade / Cargo"
          placeholder="Ex: Barbeiro, Manicure, Esteticista"
          value={especialidade}
          onChange={(e) => setEspecialidade(e.currentTarget.value)}
        />

        <Select
          label="Papel no Sistema"
          value={role}
          onChange={setRole}
          data={[
            {
              value: "funcionario",
              label: "Funcionário (Barbeiro, Manicure, etc.)",
            },
            { value: "recepcionista", label: "Recepcionista" },
            { value: "dono", label: "Dono" },
          ]}
          required
        />
        {error && <Alert color="red">{error}</Alert>}
        <Button onClick={handleSubmit} loading={loading}>
          Salvar Alterações
        </Button>
      </Stack>
    </Modal>
  );
};

export default EditFuncionarioModal;
