import React, { useState } from "react";
import api from "../api";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Title,
  Container,
  Alert,
  Text,
} from "@mantine/core";
import { IconCheck, IconAlertCircle } from "@tabler/icons-react";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const successMessage = location.state?.successMessage;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/login", {
        email: email,
        senha: senha,
      });

      const token = response.data.token;
      localStorage.setItem("token", token);
      navigate("/dashboard");
    } catch (err) {
      setError("Email ou senha inválidos. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center">Painel do Profissional</Title>

      {successMessage && (
        <Alert
          icon={<IconCheck size={16} />}
          title="Sucesso!"
          color="green"
          withCloseButton
          onClose={() => navigate("/login", { replace: true, state: {} })}
          mt="md"
        >
          {successMessage}
        </Alert>
      )}

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={handleSubmit}>
          <TextInput
            label="Email"
            placeholder="seu@email.com"
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
            required
          />

          <PasswordInput
            label="Senha"
            placeholder="Sua senha"
            value={senha}
            onChange={(event) => setSenha(event.currentTarget.value)}
            required
            mt="md"
          />

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

          <Button fullWidth mt="xl" type="submit" loading={loading}>
            Entrar
          </Button>

          {/* A linha de "Cadastre-se" foi removida daqui */}

          <Text ta="center" mt="md" c="dimmed" size="xs">
            <Link to="/cliente/login">
              É um cliente? Acesse a Área do Cliente
            </Link>
          </Text>
          <Text ta="center" size="sm" mt="md">
            <Link to="/esqueci-senha">Esqueci minha senha</Link>
          </Text>
        </form>
      </Paper>
    </Container>
  );
}

export default LoginPage;
