import React, { useState, useEffect } from "react";
import axios from "axios"; // A LINHA QUE FALTAVA
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
  Checkbox,
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

const AdminAppointmentModal = ({ opened, onClose, onAppointmentCreated }) => {
  const { user } = useAuth();

  const [profissionais, setProfissionais] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [selectedProfissionalId, setSelectedProfissionalId] = useState("");
  const [selectedServices, setSelectedServices] = useState([]);
  const [days, setDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [nomeCliente, setNomeCliente] = useState("");
  const [telefoneCliente, setTelefoneCliente] = useState("");
  const [emailCliente, setEmailCliente] = useState("");

  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (opened) {
      // Reseta tudo ao abrir
      setSelectedServices([]);
      setSelectedDate(null);
      setSelectedSlot(null);
      setNomeCliente("");
      setTelefoneCliente("");
      setEmailCliente("");
      setError("");
      setDays(getNextDays(14));
      setLoadingData(true);

      const token = localStorage.getItem("token");

      const fetchInitialData = async () => {
        try {
          const [servicosRes, equipeRes] = await Promise.all([
            axios.get("http://localhost:3001/servicos", {
              headers: { Authorization: `Bearer ${token}` },
            }),
            ["dono", "recepcionista"].includes(user?.role)
              ? axios.get("http://localhost:3001/profissionais", {
                  headers: { Authorization: `Bearer ${token}` },
                })
              : Promise.resolve({ data: [] }),
          ]);

          setServicos(servicosRes.data);

          if (["dono", "recepcionista"].includes(user?.role)) {
            const equipeFiltrada = equipeRes.data.filter(
              (p) => p.role === "dono" || p.role === "funcionario"
            );
            setProfissionais(
              equipeFiltrada.map((p) => ({ value: p.id, label: p.nome }))
            );
            setSelectedProfissionalId(user.id);
          } else if (user) {
            setSelectedProfissionalId(user.id);
          }
        } catch (err) {
          setError("Não foi possível carregar os dados.");
        } finally {
          setLoadingData(false);
        }
      };
      fetchInitialData();
    }
  }, [opened, user]);

  const handleDateChange = async (date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    if (selectedServices.length === 0) return;

    const professionalToQuery = ["dono", "recepcionista"].includes(user?.role)
      ? selectedProfissionalId
      : user.id;
    if (!professionalToQuery) return;

    setSlotsLoading(true);
    setAvailableSlots([]);
    setError("");
    const dateString = date.toISOString().split("T")[0];

    try {
      const response = await axios.get(
        `http://localhost:3001/publico/agenda/${professionalToQuery}?data=${dateString}`
      );
      const { horariosOcupados, horarioTrabalho } = response.data;

      const duracaoTotal = selectedServices.reduce((total, serviceId) => {
        const servico = servicos.find((s) => s.id === serviceId);
        return total + (servico ? servico.duracao_minutos : 0);
      }, 0);

      if (duracaoTotal > 0 && horarioTrabalho) {
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
              slotAtual.getTime() + duracaoTotal * 60000
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
      setError("Não foi possível buscar os horários.");
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError("");
    if (
      !selectedServices.length ||
      !selectedSlot ||
      !nomeCliente ||
      !telefoneCliente ||
      !emailCliente ||
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
          servicos_ids: selectedServices,
          nome_cliente: nomeCliente,
          telefone_cliente: telefoneCliente,
          email_cliente: emailCliente,
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

  if (loadingData) {
    return (
      <Modal
        opened={opened}
        onClose={onClose}
        title="Adicionar Novo Agendamento"
        centered
      >
        <Center>
          <Loader />
        </Center>
      </Modal>
    );
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Adicionar Novo Agendamento"
      size="lg"
      centered
    >
      <Stack>
        {["dono", "recepcionista"].includes(user?.role) && (
          <Select
            label="Profissional"
            placeholder="Selecione um profissional"
            data={profissionais}
            value={selectedProfissionalId}
            onChange={(value) => {
              setSelectedProfissionalId(value);
              setSelectedServices([]);
              setSelectedDate(null);
              setSelectedSlot(null);
            }}
            required
          />
        )}

        <Checkbox.Group
          label="Serviço(s)"
          description="Selecione um ou mais serviços"
          value={selectedServices}
          onChange={(values) => {
            setSelectedServices(values);
            setSelectedDate(null);
            setSelectedSlot(null);
          }}
        >
          <Group mt="xs">
            {servicos.map((s) => (
              <Checkbox key={s.id} value={s.id} label={s.nome_servico} />
            ))}
          </Group>
        </Checkbox.Group>

        {selectedServices.length > 0 && (
          <div>
            <Text size="sm" fw={500} mb="sm" mt="md">
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
              placeholder="Email do cliente"
              value={emailCliente}
              onChange={(e) => setEmailCliente(e.currentTarget.value)}
              mt="sm"
              required
              type="email"
            />
            <TextInput
              placeholder="Telefone do cliente"
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
            disabled={
              !nomeCliente ||
              !telefoneCliente ||
              !emailCliente ||
              !selectedSlot ||
              !selectedServices.length
            }
          >
            Confirmar Agendamento
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default AdminAppointmentModal;
