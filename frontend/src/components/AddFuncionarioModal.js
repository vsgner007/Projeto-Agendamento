// frontend/src/components/AddFuncionarioModal.js
import React, { useState } from "react";
import axios from "axios";
import {
  Modal,
  Button,
  Group,
  Select,
  TextInput,
  PasswordInput,
  Stack,
  Alert,
} from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";

const AddFuncionarioModal = ({ opened, onClose, onFuncionarioCreated }) => {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [role, setRole] = useState("funcionario"); // Padrão é 'funcionario'

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:3001/profissionais",
        { nome, email, senha, role },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onFuncionarioCreated(); // Avisa o componente pai para atualizar a lista
      onClose(); // Fecha o modal
    } catch (err) {
      if (err.response && err.response.status === 409) {
        setError("Este email já está em uso.");
      } else {
        setError("Não foi possível criar o funcionário.");
      }
      console.error(err);
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
        />
        <PasswordInput
          label="Senha Provisória"
          placeholder="Uma senha para o primeiro acesso"
          value={senha}
          onChange={(e) => setSenha(e.currentTarget.value)}
          required
        />
        <Select
          label="Papel (Permissão)"
          data={[
            {
              value: "funcionario",
              label: "Funcionário (Acesso à própria agenda)",
            },
            { value: "dono", label: "Dono (Acesso total)" },
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
            Adicionar Membro
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default AddFuncionarioModal;
