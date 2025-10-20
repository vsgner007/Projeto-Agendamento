// https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=dbdd6d20e2f447c68a6a4b58c8262ce3
// https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=7bd36f48c3c54a2ca25d46b6e635f551
// https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=75d0d3c4fec54bc8a48b91311c4def1b

import React, { useState } from "react";
import api from "../api";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
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
} from "@mantine/core"; // 'Text' foi adicionado aqui
import { IconAlertCircle } from "@tabler/icons-react";

// Mapeamento dos links estáticos de checkout do Mercado Pago
// IMPORTANTE: Cole aqui os links corretos dos seus planos
const linksDosPlanos = {
  individual: "https://go.hotmart.com/B102516426Y?off=fiit6bbd",
  equipe: "https://go.hotmart.com/B102516426Y?off=ybntddyn",
  premium: "https://go.hotmart.com/B102516426Y?off=6lphtre7",
};

function DonoCadastroPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const planoId = searchParams.get("plano");

  // Estados do formulário
  const [nomeDono, setNomeDono] = useState("");
  const [emailDono, setEmailDono] = useState("");
  const [senhaDono, setSenhaDono] = useState("");
  const [nomeFilial, setNomeFilial] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!planoId || !linksDosPlanos[planoId]) {
    return (
      <Container size={420} my={40}>
        <Alert color="red" title="Erro">
          Plano de assinatura inválido ou não especificado.
        </Alert>
        <Button component={Link} to="/" mt="md">
          Voltar para a página inicial
        </Button>
      </Container>
    );
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Chama a "super-rota" no backend
      await api.post("/registrar-negocio", {
        nomeDono,
        emailDono,
        senhaDono,
        nomeFilial,
        planoId,
      });

      // Se o cadastro no backend deu certo, redireciona para o pagamento
      const linkPagamento = linksDosPlanos[planoId];
      window.location.href = linkPagamento;
    } catch (err) {
      setError(
        err.response?.data?.message || "Ocorreu um erro ao realizar o cadastro."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center">Crie a Conta do seu Negócio</Title>
      <Text ta="center" c="dimmed" mt="sm">
        Você está assinando o <strong>Plano {planoId}</strong>.
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={handleSubmit}>
          <Stack>
            <TextInput
              label="Nome do Salão/Barbearia"
              placeholder="Minha Barbearia"
              value={nomeFilial}
              onChange={(e) => setNomeFilial(e.currentTarget.value)}
              required
            />
            <TextInput
              label="Seu Nome Completo"
              placeholder="Seu nome"
              value={nomeDono}
              onChange={(e) => setNomeDono(e.currentTarget.value)}
              required
            />
            <TextInput
              label="Seu Email de Acesso"
              placeholder="seu@email.com"
              value={emailDono}
              onChange={(e) => setEmailDono(e.currentTarget.value)}
              required
              type="email"
            />
            <PasswordInput
              label="Crie uma Senha"
              placeholder="Sua senha"
              value={senhaDono}
              onChange={(e) => setSenhaDono(e.currentTarget.value)}
              required
            />

            {error && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                color="red"
                title="Erro de Cadastro"
              >
                {error}
              </Alert>
            )}

            <Button fullWidth mt="md" type="submit" loading={loading}>
              Cadastrar e Ir para Pagamento
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}

export default DonoCadastroPage;
