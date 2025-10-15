// frontend/src/components/DateTimePickerModal.js
import React, { useState, useEffect } from "react";
import api from "../api";
import {
  Modal,
  Text,
  SimpleGrid,
  Button,
  Group,
  Center,
  Loader,
} from "@mantine/core";

// Gera os próximos N dias para o seletor de data
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

const DateTimePickerModal = ({
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

  // Gera a lista de dias uma vez
  useEffect(() => {
    setDays(getNextDays(14)); // Vamos mostrar os próximos 14 dias
  }, []);

  // Busca horários quando uma data é selecionada
  useEffect(() => {
    if (selectedDate && service) {
      const fetchAvailability = async () => {
        setSlotsLoading(true);
        setAvailableSlots([]);
        const dateString = selectedDate.toISOString().split("T")[0];
        try {
          const response = await api.get(
            `http://localhost:3001/publico/agenda/${profissionalId}?data=${dateString}`
          );
          const { horariosOcupados } = response.data;

          const slots = calculateAvailableSlots(
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

  // A mesma lógica de cálculo de antes
  const calculateAvailableSlots = (horariosOcupados, duracaoServico, date) => {
    const slots = [];
    if (!date) return slots;
    const diaInicio = new Date(`${date.toISOString().split("T")[0]}T09:00:00`);
    const diaFim = new Date(`${date.toISOString().split("T")[0]}T18:00:00`);
    let slotAtual = diaInicio;
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

  const handleSelectDate = (date) => {
    setSelectedDate(date);
  };

  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Selecione data e hora"
      centered
      size="lg"
    >
      <Group mb="md">
        {days.map((day) => (
          <Button
            key={day.toISOString()}
            variant={
              selectedDate?.getDate() === day.getDate() ? "filled" : "outline"
            }
            onClick={() => handleSelectDate(day)}
            style={{
              display: "flex",
              flexDirection: "column",
              height: "auto",
              padding: "10px",
            }}
          >
            <Text size="xs">{dayNames[day.getDay()]}</Text>
            <Text size="lg" fw={700}>
              {day.getDate()}
            </Text>
          </Button>
        ))}
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
            <SimpleGrid cols={{ base: 3, sm: 4 }} spacing="xs">
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

export default DateTimePickerModal;
