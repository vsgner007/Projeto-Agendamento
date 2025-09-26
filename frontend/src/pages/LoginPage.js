// frontend/src/pages/LoginPage.js
import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link, useLocation } from "react-router-dom";

// Importando componentes do Mantine, incluindo o Alert e os ícones
import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Title,
  Container,
  Alert,
} from "@mantine/core";
import { IconCheck, IconAlertCircle } from "@tabler/icons-react";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Pega a mensagem de sucesso que pode ter vindo da página de cadastro
  const successMessage = location.state?.successMessage;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post("http://localhost:3001/login", {
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
      <Title ta="center">Bem-vindo!</Title>

      {/* Exibe a mensagem de sucesso do cadastro, se houver */}
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

          {/* Exibe a mensagem de erro de login, se houver */}
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

          <div style={{ textAlign: "center", marginTop: "20px" }}>
            <p>
              Não tem uma conta? <Link to="/cadastro">Cadastre-se</Link>
            </p>
          </div>
        </form>
      </Paper>
    </Container>
  );
}

export default LoginPage;
