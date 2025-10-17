import React, { useState } from "react";
import api from "../api";
import {
  useNavigate,
  Link,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Title,
  Container,
  Alert,
  Text,
  Anchor,
  Group,
} from "@mantine/core";
import { IconCheck, IconAlertCircle } from "@tabler/icons-react";

function ClienteLoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const successMessage = location.state?.successMessage;
  const redirectToSubdomain = searchParams.get("redirectTo"); // Pega o subdomínio da URL

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await api.post("/clientes/login", { email, senha });
      localStorage.setItem("clienteToken", response.data.token);

      if (redirectToSubdomain) {
        // Se veio de uma página de agendamento, reconstrói a URL e volta para lá
        const domain = window.location.host.includes("localhost")
          ? "localhost:3000"
          : window.location.host;

        window.location.href = `${window.location.protocol}//${redirectToSubdomain}.${domain}/agendar`;
      } else {
        // Se não, vai para o dashboard padrão do cliente
        navigate("/meus-agendamentos");
      }
    } catch (err) {
      setError("Email ou senha inválidos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center">Área do Cliente</Title>
      {successMessage && (
        <Alert
          icon={<IconCheck size={16} />}
          title="Sucesso!"
          color="green"
          withCloseButton
          onClose={() =>
            navigate("/cliente/login", { replace: true, state: {} })
          }
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
          <Group justify="flex-end" mt="sm">
            <Anchor component={Link} to="/esqueci-senha" size="xs">
              Esqueci minha senha
            </Anchor>
          </Group>
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
          <Button fullWidth mt="lg" type="submit" loading={loading}>
            Entrar
          </Button>
          <Text ta="center" mt="md">
            Não tem uma conta? <Link to="/cliente/cadastro">Cadastre-se</Link>
          </Text>
        </form>
      </Paper>
    </Container>
  );
}

export default ClienteLoginPage;
