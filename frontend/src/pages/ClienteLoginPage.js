import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Title,
  Container,
  Alert,
  Text,
} from "@mantine/core"; // Linha corrigida
import { IconAlertCircle } from "@tabler/icons-react";

function ClienteLoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:3001/clientes/login",
        { email, senha }
      );
      localStorage.setItem("clienteToken", response.data.token); // Salva o token do cliente
      navigate("/meus-agendamentos"); // Redireciona para o painel do cliente
    } catch (err) {
      setError("Email ou senha inválidos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center">Área do Cliente</Title>
      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={handleSubmit}>
          <TextInput
            label="Email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            required
          />
          <PasswordInput
            label="Senha"
            placeholder="Sua senha"
            value={senha}
            onChange={(e) => setSenha(e.currentTarget.value)}
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
          <Text ta="center" mt="md">
            Não tem uma conta? <Link to="/cliente/cadastro">Cadastre-se</Link>
          </Text>
          <Text ta="center" mt="md">
            <Link to="/login">Acesso Profissional</Link>
          </Text>
        </form>
      </Paper>
    </Container>
  );
}

export default ClienteLoginPage;
