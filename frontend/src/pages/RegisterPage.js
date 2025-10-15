// frontend/src/pages/RegisterPage.js
import React, { useState } from "react";
import api from "../api";
import { useNavigate, Link } from "react-router-dom";
import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Title,
  Container,
} from "@mantine/core";

function RegisterPage() {
  const [nome, setNome] = useState("");
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
      await api.post("http://localhost:3001/profissionais", {
        nome,
        email,
        senha,
      });

      // Se o cadastro for bem-sucedido, redireciona para o login com uma mensagem de sucesso
      navigate("/login", {
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
      console.error("Erro no cadastro:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center">Crie sua Conta</Title>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={handleSubmit}>
          <TextInput
            label="Seu Nome Completo"
            placeholder="Nome Sobrenome"
            value={nome}
            onChange={(event) => setNome(event.currentTarget.value)}
            required
          />

          <TextInput
            label="Email"
            placeholder="seu@email.com"
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
            required
            mt="md"
          />

          <PasswordInput
            label="Senha"
            placeholder="Crie uma senha"
            value={senha}
            onChange={(event) => setSenha(event.currentTarget.value)}
            required
            mt="md"
          />

          {error && (
            <p style={{ color: "red", textAlign: "center", marginTop: "10px" }}>
              {error}
            </p>
          )}

          <Button fullWidth mt="xl" type="submit" loading={loading}>
            Cadastrar
          </Button>

          <div style={{ textAlign: "center", marginTop: "20px" }}>
            <p>
              Já tem uma conta? <Link to="/login">Faça o login</Link>
            </p>
          </div>
        </form>
      </Paper>
    </Container>
  );
}

export default RegisterPage;
