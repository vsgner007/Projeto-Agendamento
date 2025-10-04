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
  Stack,
  Text,
} from "@mantine/core"; // Linha corrigida
import { IconAlertCircle } from "@tabler/icons-react";

function ClienteCadastroPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await axios.post("http://localhost:3001/clientes/cadastro", {
        nome,
        email,
        telefone,
        senha,
      });
      navigate("/cliente/login", {
        state: {
          successMessage:
            "Cadastro realizado com sucesso! Por favor, faça o login.",
        },
      });
    } catch (err) {
      if (err.response && err.response.status === 409) {
        setError("Este email já está cadastrado.");
      } else {
        setError("Ocorreu um erro ao realizar o cadastro. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center">Crie sua Conta</Title>
      <Text ta="center" c="dimmed" mt="sm">
        Faça seu cadastro para agendar e gerenciar seus horários.
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={handleSubmit}>
          <Stack>
            <TextInput
              label="Nome Completo"
              placeholder="Seu nome"
              value={nome}
              onChange={(e) => setNome(e.currentTarget.value)}
              required
            />
            <TextInput
              label="Email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              required
              type="email"
            />
            <TextInput
              label="Telefone (WhatsApp)"
              placeholder="(XX) XXXXX-XXXX"
              value={telefone}
              onChange={(e) => setTelefone(e.currentTarget.value)}
              required
            />
            <PasswordInput
              label="Crie uma Senha"
              placeholder="Sua senha"
              value={senha}
              onChange={(e) => setSenha(e.currentTarget.value)}
              required
            />

            {error && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                color="red"
                title="Erro"
              >
                {error}
              </Alert>
            )}

            <Button fullWidth mt="md" type="submit" loading={loading}>
              Cadastrar
            </Button>
            <Text ta="center" size="sm">
              Já tem uma conta? <Link to="/cliente/login">Faça o login</Link>
            </Text>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}

export default ClienteCadastroPage;
