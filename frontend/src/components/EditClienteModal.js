import React, { useState, useEffect } from "react";
import { Modal, Button, TextInput, Stack, Alert } from "@mantine/core";
import api from "../api";

const EditClienteModal = ({ cliente, onClose, onClienteUpdated }) => {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Preenche o formulário quando um cliente é selecionado
  useEffect(() => {
    if (cliente) {
      setNome(cliente.nome_cliente);
      setEmail(cliente.email_contato);
      setTelefone(cliente.telefone_contato);
      setError("");
    }
  }, [cliente]);

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await api.put(
        `/clientes/${cliente.id}`,
        {
          nome_cliente: nome,
          email_contato: email,
          telefone_contato: telefone,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      onClienteUpdated(response.data); // Envia os dados atualizados de volta para a página
      onClose(); // Fecha o modal
    } catch (err) {
      setError(
        err.response?.data?.message || "Não foi possível salvar as alterações."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!cliente) return null;

  return (
    <Modal opened={!!cliente} onClose={onClose} title="Editar Cliente" centered>
      <Stack>
        <TextInput
          label="Nome Completo"
          value={nome}
          onChange={(e) => setNome(e.currentTarget.value)}
          required
        />
        <TextInput
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
          required
          type="email"
        />
        <TextInput
          label="Telefone (WhatsApp)"
          value={telefone}
          onChange={(e) => setTelefone(e.currentTarget.value)}
          required
        />
        {error && <Alert color="red">{error}</Alert>}
        <Button onClick={handleSubmit} loading={loading}>
          Salvar Alterações
        </Button>
      </Stack>
    </Modal>
  );
};

export default EditClienteModal;
