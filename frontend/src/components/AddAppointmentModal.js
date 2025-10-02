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
import useAuth from "../hooks/useAuth";

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
  const { user } = useAuth();
  const [servicos, setServicos] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [selectedProfissionalId, setSelectedProfissionalId] = useState("");
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

  // Efeito ÚNICO para buscar dados iniciais quando o modal abre
  useEffect(() => {
    if (opened) {
      // Reseta todos os estados para um formulário limpo
      setSelectedService(null);
      setSelectedDate(null);
      setSelectedSlot(null);
      setNomeCliente("");
      setTelefoneCliente("");
      setError("");
      setDays(getNextDays(14));

      const token = localStorage.getItem("token");

      const fetchInitialData = async () => {
        try {
          const [servicosRes, equipeRes] = await Promise.all([
            axios.get("http://localhost:3001/servicos", {
              headers: { Authorization: `Bearer ${token}` },
            }),
            user?.role === "dono"
              ? axios.get("http://localhost:3001/profissionais", {
                  headers: { Authorization: `Bearer ${token}` },
                })
              : Promise.resolve({ data: [] }),
          ]);

          setServicos(
            servicosRes.data.map((s) => ({
              value: s.id,
              label: s.nome_servico,
              duracao: s.duracao_minutos,
            }))
          );

          if (user?.role === "dono") {
            const equipeCompleta = [
              { id: user.id, nome: user.nome },
              ...equipeRes.data,
            ];
            setProfissionais(
              equipeCompleta.map((p) => ({ value: p.id, label: p.nome }))
            );
            setSelectedProfissionalId(user.id);
          } else if (user) {
            setSelectedProfissionalId(user.id);
          }
        } catch (err) {
          setError("Não foi possível carregar os dados necessários.");
        }
      };

      fetchInitialData();
    }
  }, [opened, user]);

  // Função manual para buscar horários, chamada explicitamente ao clicar em uma data
  const handleDateChange = async (date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    if (!selectedService) return;

    const professionalToQuery =
      user?.role === "dono" ? selectedProfissionalId : user.id;
    if (!professionalToQuery) return;

    setSlotsLoading(true);
    setAvailableSlots([]);
    const dateString = date.toISOString().split("T")[0];

    try {
      const response = await axios.get(
        `http://localhost:3001/publico/agenda/${professionalToQuery}?data=${dateString}`
      );
      const { horariosOcupados, horarioTrabalho } = response.data;
      const servicoSelecionado = servicos.find(
        (s) => s.value === selectedService
      );

      if (servicoSelecionado && horarioTrabalho) {
        // Lógica de cálculo de horários
        const slots = [];
        const dayNames = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
        const diaDaSemana = dayNames[date.getDay()];
        const horarioDoDia = horarioTrabalho[diaDaSemana];

        if (horarioDoDia) {
          const [inicioStr, fimStr] = horarioDoDia.split("-");
          const [inicioHora, inicioMin] = inicioStr.split(":").map(Number);
          const [fimHora, fimMin] = fimStr.split(":").map(Number);

          const diaInicio = new Date(date);
          diaInicio.setHours(inicioHora, inicioMin, 0, 0);

          const diaFim = new Date(date);
          diaFim.setHours(fimHora, fimMin, 0, 0);

          let slotAtual = new Date(diaInicio);
          while (slotAtual < diaFim) {
            const slotFim = new Date(
              slotAtual.getTime() + servicoSelecionado.duracao * 60000
            );
            if (slotFim > diaFim) break;
            const isOcupado = horariosOcupados.some(
              (ocupado) =>
                new Date(ocupado.data_hora_inicio) < slotFim &&
                new Date(ocupado.data_hora_fim) > slotAtual
            );
            if (!isOcupado) {
              slots.push(new Date(slotAtual));
            }
            slotAtual.setMinutes(slotAtual.getMinutes() + 15);
          }
        }
        setAvailableSlots(slots);
      }
    } catch (e) {
      setError("Não foi possível buscar os horários disponíveis.");
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError("");
    if (
      !selectedService ||
      !selectedSlot ||
      !nomeCliente ||
      !telefoneCliente ||
      !selectedProfissionalId
    ) {
      setError("Todos os campos devem ser preenchidos.");
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
          agendado_para_id: selectedProfissionalId,
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
        {user?.role === "dono" && (
          <Select
            label="Agendar Para o Profissional"
            placeholder="Escolha um profissional"
            data={profissionais}
            value={selectedProfissionalId}
            onChange={(value) => {
              setSelectedProfissionalId(value);
              setSelectedService(null);
              setSelectedDate(null);
              setSelectedSlot(null);
            }}
            withinPortal
            required
          />
        )}
        <Select
          label="Serviço"
          placeholder="Escolha um serviço"
          data={servicos}
          value={selectedService}
          onChange={(value) => {
            setSelectedService(value);
            setSelectedDate(null);
            setSelectedSlot(null);
          }}
          withinPortal
          required
        />

        {selectedService && (
          <div>
            <Text size="sm" fw={500} mb="sm">
              Data e Hora
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
                    onClick={() => handleDateChange(day)}
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
              Dados do Cliente
            </Text>
            <TextInput
              placeholder="Nome do cliente"
              value={nomeCliente}
              onChange={(e) => setNomeCliente(e.currentTarget.value)}
              mt="sm"
              required
            />
            <TextInput
              placeholder="(XX) XXXXX-XXXX"
              value={telefoneCliente}
              onChange={(e) => setTelefoneCliente(e.currentTarget.value)}
              mt="sm"
              required
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
