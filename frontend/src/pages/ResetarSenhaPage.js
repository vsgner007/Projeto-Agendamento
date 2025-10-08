import React, { useState } from "react";
import axios from "axios";
import {
  useParams,
  useSearchParams,
  useNavigate,
  Link,
} from "react-router-dom";
import {
  PasswordInput,
  Button,
  Paper,
  Title,
  Container,
  Alert,
  Stack,
  Text,
} from "@mantine/core";
import { IconCheck, IconAlertCircle } from "@tabler/icons-react";

function ResetarSenhaPage() {
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const tipo = searchParams.get("tipo");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (senha !== confirmarSenha) {
      setError("As senhas não conferem.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      await axios.post("http://localhost:3001/resetar-senha", {
        token,
        tipo,
        senha,
      });
      setSuccess("Sua senha foi atualizada com sucesso!");
      setTimeout(() => {
        const loginPath = tipo === "profissional" ? "/login" : "/cliente/login";
        navigate(loginPath);
      }, 3000);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Ocorreu um erro. O link pode ter expirado."
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Container size={420} my={40}>
        <Alert icon={<IconCheck size={24} />} title="Sucesso!" color="green">
          {success} Você será redirecionado para a página de login.
        </Alert>
      </Container>
    );
  }

  return (
    <Container size={420} my={40}>
      <Title ta="center">Crie sua Nova Senha</Title>
      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={handleSubmit}>
          <Stack>
            <PasswordInput
              label="Nova Senha"
              placeholder="Digite a nova senha"
              value={senha}
              onChange={(e) => setSenha(e.currentTarget.value)}
              required
            />
            <PasswordInput
              label="Confirme a Nova Senha"
              placeholder="Digite novamente"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.currentTarget.value)}
              required
            />
            {error && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                title="Erro"
                color="red"
              >
                {error}
              </Alert>
            )}
            <Button fullWidth mt="md" type="submit" loading={loading}>
              Salvar Nova Senha
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}

export default ResetarSenhaPage;
