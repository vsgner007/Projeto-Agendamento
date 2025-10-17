import React, { useState } from "react";
import {
  Modal,
  TextInput,
  PasswordInput,
  Button,
  Alert,
  Stack,
} from "@mantine/core";
import api from "../api";
import { jwtDecode } from "jwt-decode";

const ClienteLoginModal = ({ opened, onClose, onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const response = await api.post("/clientes/login", { email, senha });
      const token = response.data.token;
      localStorage.setItem("clienteToken", token);
      const decodedUser = jwtDecode(token);
      onLoginSuccess(decodedUser); // Avisa o componente pai sobre o sucesso
    } catch (err) {
      setError("Email ou senha inválidos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Login do Cliente" centered>
      <Stack>
        <TextInput
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
          required
        />
        <PasswordInput
          label="Senha"
          value={senha}
          onChange={(e) => setSenha(e.currentTarget.value)}
          required
        />
        {error && (
          <Alert color="red" title="Erro">
            {error}
          </Alert>
        )}
        <Button onClick={handleSubmit} loading={loading}>
          Entrar
        </Button>
      </Stack>
    </Modal>
  );
};

export default ClienteLoginModal;
