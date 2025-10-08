import React, { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  TextInput,
  Button,
  Paper,
  Title,
  Container,
  Alert,
  Stack,
  Select,
  Text,
} from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [tipo, setTipo] = useState("profissional"); // 'profissional' ou 'cliente'
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setSuccess("");
    try {
      await axios.post("http://localhost:3001/esqueci-senha", { email, tipo });
      setSuccess(
        "Se um usuário com este email existir em nosso sistema, um link de recuperação de senha foi enviado para ele."
      );
    } catch (err) {
      // Mesmo em caso de erro, mostramos uma mensagem genérica por segurança
      setSuccess(
        "Se um usuário com este email existir em nosso sistema, um link de recuperação de senha foi enviado para ele."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center">Recuperar Senha</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Enviaremos um link para o seu email para você criar uma nova senha.
      </Text>
      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        {!success ? (
          <form onSubmit={handleSubmit}>
            <Stack>
              <Select
                label="Eu sou um"
                value={tipo}
                onChange={setTipo}
                data={[
                  { value: "profissional", label: "Profissional / Admin" },
                  { value: "cliente", label: "Cliente" },
                ]}
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
              <Button fullWidth mt="md" type="submit" loading={loading}>
                Enviar Link de Recuperação
              </Button>
            </Stack>
          </form>
        ) : (
          <Alert
            icon={<IconCheck size={24} />}
            title="Verifique seu Email!"
            color="green"
          >
            {success} Visualizar o email.
          </Alert>
        )}
        <Text ta="center" mt="md" size="sm">
          Lembrou a senha?{" "}
          <Link to={tipo === "profissional" ? "/login" : "/cliente/login"}>
            Voltar para o Login
          </Link>
        </Text>
      </Paper>
    </Container>
  );
}

export default EsqueciSenhaPage;
