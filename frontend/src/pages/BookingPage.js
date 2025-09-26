// frontend/src/pages/BookingPage.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

function BookingPage() {
  const { profissionalId } = useParams();

  // Estados do fluxo
  const [servicos, setServicos] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null); // Guarda o horário selecionado
  const [bookingSuccess, setBookingSuccess] = useState(false); // Controla a mensagem de sucesso

  // Estados do formulário final
  const [nomeCliente, setNomeCliente] = useState("");
  const [telefoneCliente, setTelefoneCliente] = useState("");

  // Estados de controle
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState("");

  // ... (useEffect de busca de serviços e a função calculateAvailableSlots continuam exatamente iguais)
  useEffect(() => {
    const fetchServicos = async () => {
      try {
        const response = await axios.get(
          `http://localhost:3001/publico/servicos/${profissionalId}`
        );
        setServicos(response.data);
      } catch (err) {
        setError("Não foi possível carregar os serviços deste profissional.");
      } finally {
        setLoading(false);
      }
    };
    fetchServicos();
  }, [profissionalId]);

  const calculateAvailableSlots = (
    horarioTrabalho,
    horariosOcupados,
    duracaoServico
  ) => {
    const slots = [];
    const diaInicio = new Date(`${selectedDate}T09:00:00`);
    const diaFim = new Date(`${selectedDate}T18:00:00`);
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

  useEffect(() => {
    if (selectedDate && selectedService) {
      const fetchAvailability = async () => {
        setSlotsLoading(true);
        setAvailableSlots([]);
        try {
          const response = await axios.get(
            `http://localhost:3001/publico/agenda/${profissionalId}?data=${selectedDate}`
          );
          const { horarioTrabalho, horariosOcupados } = response.data;
          const slots = calculateAvailableSlots(
            horarioTrabalho,
            horariosOcupados,
            selectedService.duracao_minutos
          );
          setAvailableSlots(slots);
        } catch (err) {
          setError("Não foi possível buscar os horários.");
        } finally {
          setSlotsLoading(false);
        }
      };
      fetchAvailability();
    }
  }, [selectedDate, selectedService, profissionalId]);

  // Funções de manipulação do fluxo
  const handleServiceClick = (servico) => {
    setSelectedService(servico);
    setSelectedDate("");
    setSelectedSlot(null);
    setAvailableSlots([]);
  };

  const handleSlotClick = (slot) => {
    setSelectedSlot(slot);
  };

  // Função final para confirmar o agendamento
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `http://localhost:3001/publico/agendamentos/${profissionalId}`,
        {
          servico_id: selectedService.id,
          nome_cliente: nomeCliente,
          telefone_cliente: telefoneCliente,
          data_hora_inicio: selectedSlot.toISOString(),
        }
      );
      setBookingSuccess(true); // Ativa a tela de sucesso
    } catch (err) {
      setError(
        "Ocorreu um erro ao confirmar seu agendamento. Tente novamente."
      );
    }
  };

  // Renderização condicional
  if (loading) return <p>Carregando informações...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  // Tela de Sucesso
  if (bookingSuccess) {
    return (
      <div>
        <h1>Agendamento Confirmado!</h1>
        <p>
          Seu horário para **{selectedService.nome_servico}** no dia **
          {new Date(selectedSlot).toLocaleDateString("pt-BR")}** às **
          {new Date(selectedSlot).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
          ** foi confirmado com sucesso.
        </p>
      </div>
    );
  }

  // Fluxo de Agendamento
  return (
    <div>
      <h1>Agende seu Horário</h1>

      {/* Passo 1: Seleção de Serviço */}
      {!selectedService && <p>Passo 1: Selecione um serviço</p>}
      <div>
        {servicos.map((servico) => (
          <button
            key={servico.id}
            onClick={() => handleServiceClick(servico)}
            disabled={selectedService?.id === servico.id}
          >
            {servico.nome_servico} ({servico.duracao_minutos} min)
          </button>
        ))}
      </div>

      {/* Passo 2: Seleção de Data */}
      {selectedService && !selectedSlot && (
        <div style={{ marginTop: "20px" }}>
          <h2>Passo 2: Escolha o dia e horário</h2>
          <p>
            Você selecionou: <strong>{selectedService.nome_servico}</strong>
          </p>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
          />
        </div>
      )}

      {/* Exibição dos Horários */}
      {slotsLoading && <p>Buscando horários...</p>}
      {!slotsLoading && selectedDate && availableSlots.length > 0 && (
        <div style={{ marginTop: "10px" }}>
          {availableSlots.map((slot, index) => (
            <button key={index} onClick={() => handleSlotClick(slot)}>
              {slot.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </button>
          ))}
        </div>
      )}

      {/* Passo 3: Confirmação Final */}
      {selectedSlot && (
        <div style={{ marginTop: "30px" }}>
          <h3>Passo 3: Confirme seus dados</h3>
          <p>
            Horário selecionado:{" "}
            <strong>
              {selectedSlot.toLocaleString("pt-BR", {
                dateStyle: "full",
                timeStyle: "short",
              })}
            </strong>
          </p>
          <form onSubmit={handleBookingSubmit}>
            <div>
              <label>Seu Nome:</label>
              <input
                type="text"
                value={nomeCliente}
                onChange={(e) => setNomeCliente(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Seu Telefone (WhatsApp):</label>
              <input
                type="text"
                value={telefoneCliente}
                onChange={(e) => setTelefoneCliente(e.target.value)}
                required
              />
            </div>
            <button type="submit">Confirmar Agendamento</button>
          </form>
        </div>
      )}
    </div>
  );
}

export default BookingPage;
