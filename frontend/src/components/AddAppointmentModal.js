import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Modal,
  Button,
  Group,
  Select,
  TextInput,
  Text,
  SimpleGrid,
  Loader,
  Center,
  UnstyledButton,
  Alert,
  Stack,
} from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";

const getNextDays = (numberOfDays) => {
  const days = [];
  const today = new Date();
  for (let i = 0; i < numberOfDays; i++) {
    const nextDay = new Date(today);
    nextDay.setDate(today.getDate() + i);
    days.push(nextDay);
  }
  return days;
};

const AddAppointmentModal = ({ opened, onClose, onAppointmentCreated }) => {
  const [servicos, setServicos] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [days, setDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [nomeCliente, setNomeCliente] = useState("");
  const [telefoneCliente, setTelefoneCliente] = useState("");
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (opened) {
      setSelectedService(null);
      setSelectedDate(null);
      setSelectedSlot(null);
      setNomeCliente("");
      setTelefoneCliente("");
      setError("");
      setDays(getNextDays(14));
      const fetchServicos = async () => {
        try {
          const token = localStorage.getItem("token");
          const response = await axios.get("http://localhost:3001/servicos", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const formattedServicos = response.data.map((s) => ({
            value: s.id,
            label: s.nome_servico,
            duracao: s.duracao_minutos,
          }));
          setServicos(formattedServicos);
        } catch (err) {
          console.error("Erro ao buscar serviços", err);
        }
      };
      fetchServicos();
    }
  }, [opened]);

  useEffect(() => {
    const calculateAvailableSlots = (
      horarioTrabalho,
      horariosOcupados,
      duracaoServico,
      date
    ) => {
      const slots = [];
      if (!date || !horarioTrabalho) return slots;
      const dayNames = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
      const diaDaSemana = dayNames[date.getDay()];
      const horarioDoDia = horarioTrabalho[diaDaSemana];
      if (!horarioDoDia) return slots;
      const [inicioStr, fimStr] = horarioDoDia.split("-");
      const [inicioHora, inicioMin] = inicioStr.split(":").map(Number);
      const [fimHora, fimMin] = fimStr.split(":").map(Number);
      const diaInicio = new Date(date);
      diaInicio.setHours(inicioHora, inicioMin, 0, 0);
      const diaFim = new Date(date);
      diaFim.setHours(fimHora, fimMin, 0, 0);
      let slotAtual = new Date(diaInicio);
      while (slotAtual < diaFim) {
        const slotFim = new Date(slotAtual.getTime() + duracaoServico * 60000);
        if (slotFim > diaFim) break;
        const isOcupado = horariosOcupados.some((ocupado) => {
          const ocupadoInicio = new Date(ocupado.data_hora_inicio);
          const ocupadoFim = new Date(ocupado.data_hora_fim);
          return slotAtual < ocupadoFim && slotFim > ocupadoInicio;
        });
        if (!isOcupado) {
          slots.push(new Date(slotAtual));
        }
        slotAtual.setMinutes(slotAtual.getMinutes() + 15);
      }
      return slots;
    };

    if (selectedDate && selectedService) {
      const fetchAvailability = async () => {
        setSlotsLoading(true);
        setAvailableSlots([]);
        const dateString = selectedDate.toISOString().split("T")[0];
        const token = localStorage.getItem("token");
        try {
          const response = await axios.get(
            `http://localhost:3001/agendamentos?data=${dateString}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const { agendamentos: horariosOcupados, horarioTrabalho } =
            response.data;
          const servicoSelecionado = servicos.find(
            (s) => s.value === selectedService
          );
          if (servicoSelecionado) {
            const slots = calculateAvailableSlots(
              horarioTrabalho,
              horariosOcupados,
              servicoSelecionado.duracao,
              selectedDate
            );
            setAvailableSlots(slots);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setSlotsLoading(false);
        }
      };
      fetchAvailability();
    }
  }, [selectedDate, selectedService, servicos]);

  const handleSubmit = async () => {
    setError("");
    if (!selectedService || !selectedSlot || !nomeCliente || !telefoneCliente) {
      setError("Alguns dados foram perdidos. Por favor, preencha novamente.");
      return;
    }
    setSubmitLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:3001/agendamentos",
        {
          servico_id: selectedService,
          nome_cliente: nomeCliente,
          telefone_cliente: telefoneCliente,
          data_hora_inicio: selectedSlot.toISOString(),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onAppointmentCreated();
      onClose();
    } catch (err) {
      setError("Não foi possível criar o agendamento.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Adicionar Novo Agendamento"
      size="lg"
      centered
    >
      <Stack>
        <Select
          label="1. Selecione o Serviço"
          placeholder="Escolha um serviço"
          data={servicos}
          value={selectedService}
          onChange={(value) => {
            setSelectedService(value);
            setSelectedDate(new Date());
            setSelectedSlot(null);
          }}
          // --- CORREÇÃO FINAL APLICADA AQUI ---
          withinPortal
          mb="md"
        />

        {selectedService && (
          <div>
            <Text size="sm" fw={500} mb="sm">
              2. Selecione a Data e Hora
            </Text>
            <Group
              grow
              preventGrowOverflow={false}
              wrap="nowrap"
              style={{ overflowX: "auto", paddingBottom: "15px" }}
            >
              {days.map((day) => {
                const isSelected =
                  selectedDate?.toDateString() === day.toDateString();
                return (
                  <UnstyledButton
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    style={{
                      minWidth: "60px",
                      padding: "10px",
                      textAlign: "center",
                      border: `1px solid ${isSelected ? "#228be6" : "#ced4da"}`,
                      borderRadius: "8px",
                      backgroundColor: isSelected ? "#228be6" : "transparent",
                      color: isSelected ? "white" : "black",
                    }}
                  >
                    <Text size="xs">{dayNames[day.getDay()]}</Text>
                    <Text size="lg" fw={700}>
                      {day.getDate()}
                    </Text>
                  </UnstyledButton>
                );
              })}
            </Group>

            {slotsLoading ? (
              <Center mt="md">
                <Loader />
              </Center>
            ) : (
              selectedDate && (
                <SimpleGrid cols={{ base: 4, sm: 5 }} spacing="sm" mt="md">
                  {availableSlots.length > 0 ? (
                    availableSlots.map((slot, i) => (
                      <Button
                        key={i}
                        variant={
                          selectedSlot?.getTime() === slot.getTime()
                            ? "filled"
                            : "outline"
                        }
                        onClick={() => setSelectedSlot(slot)}
                      >
                        {slot.toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Button>
                    ))
                  ) : (
                    <Text size="sm" c="dimmed">
                      Nenhum horário livre para esta data.
                    </Text>
                  )}
                </SimpleGrid>
              )
            )}
          </div>
        )}

        {selectedSlot && (
          <div>
            <Text size="sm" fw={500} mt="md">
              3. Dados do Cliente
            </Text>
            <TextInput
              placeholder="Nome do cliente"
              value={nomeCliente}
              onChange={(e) => setNomeCliente(e.currentTarget.value)}
              mt="sm"
            />
            <TextInput
              placeholder="(XX) XXXXX-XXXX"
              value={telefoneCliente}
              onChange={(e) => setTelefoneCliente(e.currentTarget.value)}
              mt="sm"
            />
          </div>
        )}

        {error && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            color="red"
            title="Erro"
            mt="md"
          >
            {error}
          </Alert>
        )}

        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            loading={submitLoading}
            disabled={!nomeCliente || !telefoneCliente || !selectedSlot}
          >
            Confirmar Agendamento
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default AddAppointmentModal;
