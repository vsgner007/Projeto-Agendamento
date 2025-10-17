import React, { useState } from "react";
import api from "../api";
import {
  Modal,
  Button,
  TextInput,
  PasswordInput,
  Select,
  Stack,
  Alert,
} from "@mantine/core";

const AddFuncionarioModal = ({ opened, onClose, onFuncionarioAdded }) => {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [role, setRole] = useState("funcionario");
  const [especialidade, setEspecialidade] = useState(""); // Novo estado
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await api.post(
        "/profissionais",
        {
          nome,
          email,
          senha,
          role,
          especialidade, // Envia a nova informação
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      onFuncionarioAdded(response.data);
      onClose(); // Fecha o modal
      // Limpa os campos
      setNome("");
      setEmail("");
      setSenha("");
      setRole("funcionario");
      setEspecialidade("");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Não foi possível adicionar o funcionário."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Adicionar Novo Membro da Equipe"
      centered
    >
      <Stack>
        <TextInput
          label="Nome Completo"
          placeholder="Nome do funcionário"
          value={nome}
          onChange={(e) => setNome(e.currentTarget.value)}
          required
        />
        <TextInput
          label="Email"
          placeholder="email@exemplo.com"
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
          ]}
          required
        />
        <PasswordInput
          label="Senha Provisória"
          placeholder="Senha de acesso"
          value={senha}
          onChange={(e) => setSenha(e.currentTarget.value)}
          required
        />

        {error && <Alert color="red">{error}</Alert>}

        <Button onClick={handleSubmit} loading={loading}>
          Adicionar Membro
        </Button>
      </Stack>
    </Modal>
  );
};

export default AddFuncionarioModal;
