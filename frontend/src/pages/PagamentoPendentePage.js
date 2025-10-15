import React from "react";
import { Container, Title, Text, Paper, Button } from "@mantine/core";
import { Link } from "react-router-dom";

function PagamentoPendentePage() {
  return (
    <Container size={420} my={40}>
      <Title ta="center">Pagamento Pendente</Title>
      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Text ta="center">
          Sua conta foi criada com sucesso, mas sua assinatura ainda não está
          ativa.
        </Text>
        <Text ta="center" mt="md">
          Por favor, conclua o pagamento para ter acesso a todas as
          funcionalidades do seu plano.
        </Text>
        <Button component={Link} to="/" fullWidth mt="xl">
          Ver Planos e Pagar
        </Button>
      </Paper>
    </Container>
  );
}

export default PagamentoPendentePage;
