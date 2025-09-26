// frontend/src/components/AddAppointmentModal.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Modal, Button, Group, Select, TextInput } from "@mantine/core";
import { DateTimePicker } from "@mantine/dates"; // Importamos o componente principal

const AddAppointmentModal = ({ opened, onClose, onAppointmentCreated }) => {
  // Estados do formulário, agora mais simples
  const [servicos, setServicos] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [dataHora, setDataHora] = useState(null); // Apenas um estado para data e hora
  const [nomeCliente, setNomeCliente] = useState("");
  const [telefoneCliente, setTelefoneCliente] = useState("");

  // Busca a lista de serviços para o dropdown (sem alteração)
  useEffect(() => {
    if (opened) {
      // Reseta o formulário ao abrir
      setSelectedService(null);
      setDataHora(null);
      setNomeCliente("");
      setTelefoneCliente("");

      const fetchServicos = async () => {
        try {
          const token = localStorage.getItem("token");
          const response = await axios.get("http://localhost:3001/servicos", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const formattedServicos = response.data.map((s) => ({
            value: s.id,
            label: s.nome_servico,
          }));
          setServicos(formattedServicos);
        } catch (err) {
          console.error("Erro ao buscar serviços", err);
        }
      };
      fetchServicos();
    }
  }, [opened]);

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:3001/agendamentos",
        {
          servico_id: selectedService,
          nome_cliente: nomeCliente,
          telefone_cliente: telefoneCliente,
          data_hora_inicio: dataHora.toISOString(),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      onAppointmentCreated();
      onClose();
    } catch (err) {
      console.error("Erro ao criar agendamento", err);
      // Aqui poderíamos adicionar um alerta de erro
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Adicionar Novo Agendamento"
      centered
    >
      <Select
        label="Serviço"
        placeholder="Escolha um serviço"
        data={servicos}
        value={selectedService}
        onChange={setSelectedService}
        mb="md"
        required
      />
      <DateTimePicker
        label="Data e Hora"
        placeholder="Digite ou selecione a data e hora"
        value={dataHora}
        onChange={setDataHora}
        mb="md"
        required
      />
      <TextInput
        label="Nome do Cliente"
        placeholder="Nome do cliente"
        value={nomeCliente}
        onChange={(e) => setNomeCliente(e.currentTarget.value)}
        mb="md"
        required
      />
      <TextInput
        label="Telefone do Cliente"
        placeholder="(XX) XXXXX-XXXX"
        value={telefoneCliente}
        onChange={(e) => setTelefoneCliente(e.currentTarget.value)}
        mb="md"
        required
      />
      <Group justify="flex-end" mt="xl">
        <Button variant="default" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={
            !selectedService || !dataHora || !nomeCliente || !telefoneCliente
          }
        >
          Confirmar Agendamento
        </Button>
      </Group>
    </Modal>
  );
};

export default AddAppointmentModal;
