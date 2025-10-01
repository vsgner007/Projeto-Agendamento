import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Modal,
  Text,
  SimpleGrid,
  Button,
  Group,
  Center,
  Loader,
  UnstyledButton,
} from "@mantine/core";

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

const HorarioModal = ({
  opened,
  onClose,
  onSelectSlot,
  profissionalId,
  service,
}) => {
  const [days, setDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    if (opened) {
      setDays(getNextDays(14));
      setSelectedDate(new Date());
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

    if (selectedDate && service && profissionalId) {
      const fetchAvailability = async () => {
        setSlotsLoading(true);
        setAvailableSlots([]);
        const dateString = selectedDate.toISOString().split("T")[0];
        try {
          const response = await axios.get(
            `http://localhost:3001/publico/agenda/${profissionalId}?data=${dateString}`
          );

          // --- CORREÇÃO APLICADA AQUI ---
          // Agora lemos corretamente tanto os horários ocupados quanto o horário de trabalho
          const { horariosOcupados, horarioTrabalho } = response.data;

          const slots = calculateAvailableSlots(
            horarioTrabalho,
            horariosOcupados,
            service.duracao_minutos,
            selectedDate
          );
          setAvailableSlots(slots);
        } catch (err) {
          console.error("Não foi possível buscar os horários.", err);
        } finally {
          setSlotsLoading(false);
        }
      };
      fetchAvailability();
    }
  }, [selectedDate, service, profissionalId]);

  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Selecione data e hora"
      centered
      size="md"
    >
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

      {selectedDate && (
        <>
          <Text my="md">
            Horários disponíveis no dia{" "}
            {selectedDate.toLocaleDateString("pt-BR")}:
          </Text>
          {slotsLoading ? (
            <Center>
              <Loader />
            </Center>
          ) : (
            <SimpleGrid cols={{ base: 3, sm: 4 }} spacing="md">
              {availableSlots.length > 0 ? (
                availableSlots.map((slot, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    onClick={() => onSelectSlot(slot)}
                  >
                    {slot.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Button>
                ))
              ) : (
                <Text size="sm">Nenhum horário livre para esta data.</Text>
              )}
            </SimpleGrid>
          )}
        </>
      )}
    </Modal>
  );
};

export default HorarioModal;
