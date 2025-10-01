import React, { useState, useEffect, useCallback } from "react";
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

          const formattedServicos = servicosRes.data.map((s) => ({
            value: s.id,
            label: s.nome_servico,
            duracao: s.duracao_minutos,
          }));
          setServicos(formattedServicos);

          if (user?.role === "dono") {
            const equipeCompleta = [
              { id: user.id, nome: user.nome },
              ...equipeRes.data,
            ];
            const formattedProfissionais = equipeCompleta.map((p) => ({
              value: p.id,
              label: p.nome,
            }));
            setProfissionais(formattedProfissionais);
            setSelectedProfissionalId(user.id);
          } else if (user) {
            setSelectedProfissionalId(user.id);
          }
        } catch (err) {
          console.error("Erro ao buscar dados iniciais do modal", err);
          setError("Não foi possível carregar os dados necessários.");
        }
      };

      fetchInitialData();
    }
  }, [opened, user]);

  const calculateAvailableSlots = useCallback(
    (horarioTrabalho, horariosOcupados, duracaoServico) => {
      const slots = [];
      if (!selectedDate || !horarioTrabalho) return slots;
      const dayNames = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
      const diaDaSemana = dayNames[selectedDate.getDay()];
      const horarioDoDia = horarioTrabalho[diaDaSemana];
      if (!horarioDoDia) return slots;
      const [inicioStr, fimStr] = horarioDoDia.split("-");
      const [inicioHora, inicioMin] = inicioStr.split(":").map(Number);
      const [fimHora, fimMin] = fimStr.split(":").map(Number);
      const diaInicio = new Date(selectedDate);
      diaInicio.setHours(inicioHora, inicioMin, 0, 0);
      const diaFim = new Date(selectedDate);
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
    },
    [selectedDate]
  );

  useEffect(() => {
    const professionalToQuery =
      user?.role === "dono" ? selectedProfissionalId : user?.id;
    if (
      selectedDate &&
      selectedService &&
      professionalToQuery &&
      servicos.length > 0
    ) {
      const fetchAvailability = async () => {
        setSlotsLoading(true);
        setAvailableSlots([]);
        const dateString = selectedDate.toISOString().split("T")[0];
        try {
          const response = await axios.get(
            `http://localhost:3001/publico/agenda/${professionalToQuery}?data=${dateString}`
          );
          const { horariosOcupados, horarioTrabalho } = response.data;
          const servicoSelecionado = servicos.find(
            (s) => s.value === selectedService
          );
          if (servicoSelecionado) {
            const slots = calculateAvailableSlots(
              horarioTrabalho,
              horariosOcupados,
              servicoSelecionado.duracao
            );
            setAvailableSlots(slots);
          }
        } catch (e) {
          console.error("Erro ao buscar disponibilidade", e);
          setError("Não foi possível buscar os horários disponíveis.");
        } finally {
          setSlotsLoading(false);
        }
      };
      fetchAvailability();
    }
    // --- CORREÇÃO PRINCIPAL ESTÁ AQUI ---
    // A lista de dependências foi ajustada para quebrar o loop infinito.
  }, [
    selectedDate,
    selectedService,
    selectedProfissionalId,
    user,
    calculateAvailableSlots,
  ]);

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
              setSelectedDate(null);
              setSelectedSlot(null);
              setSelectedService(null);
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
            setSelectedDate(new Date());
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
